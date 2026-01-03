// MCP Server that exposes all maker slash commands as tools
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { commandRegistry, registerAllCommands } from "../commands/index.js";
import type { CommandContext } from "../commands/types.js";
import path from "path";
import fs from "fs";
import os from "os";

// Register all commands
registerAllCommands();

// Track current working directory for shell commands
let currentWorkingDirectory = process.cwd();

// Execute a shell command and return the result
async function executeShellCommand(command: string): Promise<{
  success: boolean;
  output: string;
  exitCode: number;
}> {
  const trimmedCmd = command.trim();

  // Handle cd command specially
  if (trimmedCmd === "cd" || trimmedCmd.startsWith("cd ")) {
    let targetDir: string;

    if (trimmedCmd === "cd" || trimmedCmd === "cd ~") {
      targetDir = os.homedir();
    } else if (trimmedCmd === "cd -") {
      return {
        success: false,
        output: "cd -: OLDPWD not set",
        exitCode: 1,
      };
    } else {
      const targetPath = trimmedCmd.slice(3).trim();
      const expandedPath = targetPath.startsWith("~")
        ? path.join(os.homedir(), targetPath.slice(1))
        : targetPath;
      targetDir = path.resolve(currentWorkingDirectory, expandedPath);
    }

    try {
      const stat = fs.statSync(targetDir);
      if (!stat.isDirectory()) {
        return {
          success: false,
          output: `cd: not a directory: ${targetDir}`,
          exitCode: 1,
        };
      }
      currentWorkingDirectory = targetDir;
      return {
        success: true,
        output: targetDir,
        exitCode: 0,
      };
    } catch {
      return {
        success: false,
        output: `cd: no such file or directory: ${targetDir}`,
        exitCode: 1,
      };
    }
  }

  // Handle pwd command specially
  if (trimmedCmd === "pwd") {
    return {
      success: true,
      output: currentWorkingDirectory,
      exitCode: 0,
    };
  }

  // Execute other bash commands
  try {
    const proc = Bun.spawn(["bash", "-c", trimmedCmd], {
      cwd: currentWorkingDirectory,
      stdout: "pipe",
      stderr: "pipe",
    });

    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    await proc.exited;

    const output = [stdout.trim(), stderr.trim()].filter(Boolean).join("\n");

    return {
      success: proc.exitCode === 0,
      output: output || "(no output)",
      exitCode: proc.exitCode ?? 1,
    };
  } catch (error) {
    return {
      success: false,
      output: error instanceof Error ? error.message : String(error),
      exitCode: 1,
    };
  }
}

// Create a mock context for MCP execution (no UI)
function createMCPContext(): CommandContext {
  const output: string[] = [];

  return {
    setOutput: (lines: string[]) => {
      output.length = 0;
      output.push(...lines);
    },
    appendOutput: (line: string) => {
      output.push(line);
    },
    clearOutput: () => {
      output.length = 0;
    },
    navigateToMenu: () => {
      // No-op in MCP mode
    },
    toast: (_type, _message) => {
      // No-op in MCP mode
    },
    getRobotState: () => ({
      robot: null,
      teleop: null,
      teleopSessionActive: false,
    }),
    getDatasetState: () => ({
      datasets: [],
      activeDataset: null,
    }),
  };
}

async function main() {
  const server = new Server(
    {
      name: "maker",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List all available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const commands = commandRegistry.getAll();

    // Shell execution tools
    const shellTools = [
      {
        name: "shell_exec",
        description:
          "Execute a shell command in the current working directory. Supports all bash commands. Use 'cd' to change directories, 'pwd' to show current directory. The working directory persists across calls.",
        inputSchema: {
          type: "object" as const,
          properties: {
            command: {
              type: "string",
              description: "The shell command to execute (e.g., 'ls -la', 'cat file.txt', 'cd src')",
            },
          },
          required: ["command"],
        },
      },
      {
        name: "shell_cwd",
        description: "Get the current working directory for shell commands",
        inputSchema: {
          type: "object" as const,
          properties: {},
          required: [],
        },
      },
      {
        name: "shell_ls",
        description: "List files and directories in the current or specified directory",
        inputSchema: {
          type: "object" as const,
          properties: {
            path: {
              type: "string",
              description: "Optional path to list (defaults to current directory)",
            },
            all: {
              type: "boolean",
              description: "Include hidden files (dotfiles)",
            },
            long: {
              type: "boolean",
              description: "Use long listing format with details",
            },
          },
          required: [],
        },
      },
      {
        name: "shell_read",
        description: "Read the contents of a file",
        inputSchema: {
          type: "object" as const,
          properties: {
            path: {
              type: "string",
              description: "Path to the file to read (relative to cwd or absolute)",
            },
          },
          required: ["path"],
        },
      },
      {
        name: "shell_write",
        description: "Write content to a file (creates or overwrites)",
        inputSchema: {
          type: "object" as const,
          properties: {
            path: {
              type: "string",
              description: "Path to the file to write (relative to cwd or absolute)",
            },
            content: {
              type: "string",
              description: "Content to write to the file",
            },
          },
          required: ["path", "content"],
        },
      },
    ];

    // Maker command tools
    const makerTools = commands.map((cmd) => ({
      name: `maker_${cmd.name}`,
      description: cmd.description,
      inputSchema: {
        type: "object" as const,
        properties: (cmd.args || []).reduce(
          (acc, arg) => ({
            ...acc,
            [arg.name]: {
              type: arg.type || "string",
              description: arg.description,
              ...(arg.choices ? { enum: arg.choices } : {}),
            },
          }),
          {} as Record<string, unknown>
        ),
        required: (cmd.args || [])
          .filter((arg) => arg.required)
          .map((arg) => arg.name),
      },
    }));

    return {
      tools: [...shellTools, ...makerTools],
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    // Handle shell tools
    if (name === "shell_exec") {
      const command = (args as { command?: string })?.command;
      if (!command) {
        return {
          content: [{ type: "text" as const, text: "Missing required argument: command" }],
          isError: true,
        };
      }
      const result = await executeShellCommand(command);
      return {
        content: [
          {
            type: "text" as const,
            text: `[cwd: ${currentWorkingDirectory}]\n[exit: ${result.exitCode}]\n\n${result.output}`,
          },
        ],
        isError: !result.success,
      };
    }

    if (name === "shell_cwd") {
      return {
        content: [{ type: "text" as const, text: currentWorkingDirectory }],
      };
    }

    if (name === "shell_ls") {
      const { path: targetPath, all, long } = (args as { path?: string; all?: boolean; long?: boolean }) || {};
      const flags = [long ? "-l" : "", all ? "-a" : ""].filter(Boolean).join("");
      const lsCommand = `ls ${flags} ${targetPath || "."}`.trim();
      const result = await executeShellCommand(lsCommand);
      return {
        content: [{ type: "text" as const, text: result.output }],
        isError: !result.success,
      };
    }

    if (name === "shell_read") {
      const filePath = (args as { path?: string })?.path;
      if (!filePath) {
        return {
          content: [{ type: "text" as const, text: "Missing required argument: path" }],
          isError: true,
        };
      }
      const fullPath = path.resolve(currentWorkingDirectory, filePath);
      try {
        const content = fs.readFileSync(fullPath, "utf-8");
        return {
          content: [{ type: "text" as const, text: content }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error reading file: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }

    if (name === "shell_write") {
      const { path: filePath, content } = (args as { path?: string; content?: string }) || {};
      if (!filePath) {
        return {
          content: [{ type: "text" as const, text: "Missing required argument: path" }],
          isError: true,
        };
      }
      if (content === undefined) {
        return {
          content: [{ type: "text" as const, text: "Missing required argument: content" }],
          isError: true,
        };
      }
      const fullPath = path.resolve(currentWorkingDirectory, filePath);
      try {
        // Ensure parent directory exists
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(fullPath, content, "utf-8");
        return {
          content: [{ type: "text" as const, text: `Successfully wrote ${content.length} bytes to ${fullPath}` }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error writing file: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }

    // Handle maker commands (with maker_ prefix)
    if (!name.startsWith("maker_")) {
      return {
        content: [{ type: "text" as const, text: `Unknown tool: ${name}` }],
        isError: true,
      };
    }

    const commandName = name.replace(/^maker_/, "");
    const command = commandRegistry.get(commandName);
    if (!command) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Unknown command: ${commandName}`,
          },
        ],
        isError: true,
      };
    }

    // Build args array from object
    const argList: string[] = [];
    if (args && command.args) {
      for (const argDef of command.args) {
        const value = (args as Record<string, unknown>)[argDef.name];
        if (value !== undefined) {
          argList.push(String(value));
        }
      }
    }

    // Execute the command
    const context = createMCPContext();
    try {
      const result = await command.execute(argList, context);

      if (result.success) {
        return {
          content: [
            {
              type: "text" as const,
              text: result.output?.join("\n") || "Command executed successfully",
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: "text" as const,
              text: result.error || "Command failed",
            },
          ],
          isError: true,
        };
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error executing command: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  });

  // Start the server
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("Maker MCP server started");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
