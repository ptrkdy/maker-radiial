import type { CommandDefinition } from "./types.js";
import { commandRegistry } from "./registry.js";

export const guideCommand: CommandDefinition = {
  name: "guide",
  aliases: ["tutorial", "howto", "getting-started"],
  description: "Show a getting started guide for new users",
  usage: "/guide",
  execute: async () => {
    const output = [
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      "  MAKER - Getting Started Guide",
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      "",
      "MAKER is a CLI tool for LeRobot demonstration recording",
      "and robot control. Here's how to get started:",
      "",
      "┌─────────────────────────────────────────────────────┐",
      "│  STEP 1: Connect Your Hardware                     │",
      "└─────────────────────────────────────────────────────┘",
      "",
      "  1. Plug in your robot arm (e.g., SO-100, Koch)",
      "  2. Plug in your teleop device (e.g., leader arm)",
      "  3. Find available ports:",
      "     /ports",
      "",
      "  4. Connect the robot:",
      "     /connect <robot-type> <port>",
      "     Example: /connect so100 /dev/tty.usbmodem1234",
      "",
      "  5. Connect the teleop device:",
      "     /teleop-connect <device-type> <port>",
      "     Example: /teleop-connect so100 /dev/tty.usbmodem5678",
      "",
      "┌─────────────────────────────────────────────────────┐",
      "│  STEP 2: Record a Dataset                          │",
      "└─────────────────────────────────────────────────────┘",
      "",
      "  1. Start a teleop session to control robot manually:",
      "     /teleop-start",
      "",
      "  2. Begin recording episodes:",
      "     /record <dataset-name>",
      "     Example: /record my_pick_and_place",
      "",
      "  3. Follow the on-screen prompts to record episodes",
      "  4. Press the configured key to end each episode",
      "",
      "┌─────────────────────────────────────────────────────┐",
      "│  STEP 3: Manage Datasets                           │",
      "└─────────────────────────────────────────────────────┘",
      "",
      "  • List local datasets: /datasets",
      "  • Search HuggingFace Hub: /dataset-search <query>",
      "  • Download from Hub: /dataset-download <repo-id>",
      "  • Push to Hub: /dataset-push <repo-id>",
      "",
      "┌─────────────────────────────────────────────────────┐",
      "│  STEP 4: Replay Episodes                           │",
      "└─────────────────────────────────────────────────────┘",
      "",
      "  • Replay a recorded episode:",
      "    /replay <dataset> <episode-number>",
      "    Example: /replay my_pick_and_place 0",
      "",
      "  • Check replay status: /replay-status",
      "  • Stop replay: /replay-stop",
      "",
      "┌─────────────────────────────────────────────────────┐",
      "│  Useful Commands                                   │",
      "└─────────────────────────────────────────────────────┘",
      "",
      "  /status      - Check robot connection status",
      "  /obs         - Get current robot observation",
      "  /telemetry   - View live telemetry data",
      "  /env         - Check environment (LeRobot, PyTorch)",
      "  /menu        - Open interactive menu interface",
      "  /help        - List all available commands",
      "",
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      "  Tip: Type /help <command> for detailed help",
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    ];

    return { success: true, output };
  },
};

export const helpCommand: CommandDefinition = {
  name: "help",
  aliases: ["h", "?"],
  description: "Show available commands or help for a specific command",
  usage: "/help [command]",
  examples: ["/help", "/help connect", "/help record"],
  args: [
    {
      name: "command",
      description: "Command to get help for",
      required: false,
    },
  ],
  execute: async (args) => {
    if (args.length > 0) {
      // Help for specific command
      const cmd = commandRegistry.get(args[0]);
      if (!cmd) {
        return {
          success: false,
          error: `Unknown command: ${args[0]}`,
        };
      }

      const output = [
        `/${cmd.name} - ${cmd.description}`,
        "",
        `Usage: ${cmd.usage}`,
      ];

      if (cmd.aliases && cmd.aliases.length > 0) {
        output.push(`Aliases: ${cmd.aliases.map((a) => "/" + a).join(", ")}`);
      }

      if (cmd.args && cmd.args.length > 0) {
        output.push("", "Arguments:");
        for (const arg of cmd.args) {
          const req = arg.required ? " (required)" : "";
          output.push(`  ${arg.name}${req} - ${arg.description}`);
          if (arg.choices) {
            output.push(`    Options: ${arg.choices.join(", ")}`);
          }
        }
      }

      if (cmd.examples && cmd.examples.length > 0) {
        output.push("", "Examples:");
        for (const ex of cmd.examples) {
          output.push(`  ${ex}`);
        }
      }

      return { success: true, output };
    }

    // List all commands
    const commands = commandRegistry.getAll();
    const output = [
      "Available Commands:",
      "",
      ...commands.map((cmd) => {
        const aliases = cmd.aliases ? ` (${cmd.aliases.map((a) => "/" + a).join(", ")})` : "";
        return `  /${cmd.name}${aliases}`;
      }),
      "",
      "Type /help <command> for detailed help",
    ];

    return { success: true, output };
  },
};
