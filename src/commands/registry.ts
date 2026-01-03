import type { CommandDefinition, CommandContext, CommandResult, MCPToolDefinition } from "./types.js";

class CommandRegistry {
  private commands: Map<string, CommandDefinition> = new Map();
  private aliases: Map<string, string> = new Map();

  register(command: CommandDefinition): void {
    this.commands.set(command.name, command);

    // Register aliases
    if (command.aliases) {
      for (const alias of command.aliases) {
        this.aliases.set(alias, command.name);
      }
    }
  }

  get(name: string): CommandDefinition | undefined {
    // Check direct match first
    const direct = this.commands.get(name);
    if (direct) return direct;

    // Check aliases
    const aliasTarget = this.aliases.get(name);
    if (aliasTarget) {
      return this.commands.get(aliasTarget);
    }

    return undefined;
  }

  getAll(): CommandDefinition[] {
    return Array.from(this.commands.values());
  }

  has(name: string): boolean {
    return this.commands.has(name) || this.aliases.has(name);
  }

  async execute(
    input: string,
    context: CommandContext
  ): Promise<CommandResult> {
    const trimmed = input.trim();

    // Must start with /
    if (!trimmed.startsWith("/")) {
      return {
        success: false,
        error: "Commands must start with /",
      };
    }

    // Parse command and args
    const parts = trimmed.slice(1).split(/\s+/);
    const commandName = parts[0].toLowerCase();
    const args = parts.slice(1);

    // Find command
    const command = this.get(commandName);
    if (!command) {
      return {
        success: false,
        error: `Unknown command: /${commandName}. Type /help for available commands.`,
      };
    }

    // Execute
    try {
      return await command.execute(args, context);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // Convert commands to MCP tool definitions
  toMCPTools(): MCPToolDefinition[] {
    return this.getAll().map((cmd) => ({
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
          {}
        ),
        required: (cmd.args || [])
          .filter((arg) => arg.required)
          .map((arg) => arg.name),
      },
    }));
  }

  // Parse command line into structured args for MCP
  parseArgs(
    command: CommandDefinition,
    rawArgs: string[]
  ): Record<string, string | number | boolean> {
    const result: Record<string, string | number | boolean> = {};
    const args = command.args || [];

    // Simple positional parsing for now
    args.forEach((arg, index) => {
      if (index < rawArgs.length) {
        const value = rawArgs[index];
        if (arg.type === "number") {
          result[arg.name] = parseFloat(value);
        } else if (arg.type === "boolean") {
          result[arg.name] = value === "true" || value === "1" || value === "yes";
        } else {
          result[arg.name] = value;
        }
      }
    });

    return result;
  }
}

// Singleton instance
export const commandRegistry = new CommandRegistry();
