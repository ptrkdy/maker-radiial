import type { CommandDefinition } from "./types.js";

export const menuCommand: CommandDefinition = {
  name: "menu",
  aliases: ["m"],
  description: "Open the interactive menu interface",
  usage: "/menu",
  execute: async (_args, context) => {
    context.navigateToMenu();
    return {
      success: true,
      output: ["Opening interactive menu..."],
    };
  },
};
