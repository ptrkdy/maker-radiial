import type { CommandDefinition } from "./types.js";
import { startReplay, stopReplay, getReplayStatus } from "../lerobot/index.js";

export const replayCommand: CommandDefinition = {
  name: "replay",
  aliases: ["play"],
  description: "Replay a recorded episode on the robot",
  usage: "/replay <dataset-id> <episode>",
  examples: ["/replay local/my-demo 0", "/replay lerobot/aloha_sim 5"],
  args: [
    {
      name: "dataset_id",
      description: "Dataset repository ID",
      required: true,
    },
    {
      name: "episode",
      description: "Episode number to replay",
      required: true,
      type: "number",
    },
  ],
  execute: async (args, context) => {
    const state = context.getRobotState();

    if (!state.robot) {
      return {
        success: false,
        error: "No robot connected. Connect a robot first with /connect",
      };
    }

    if (args.length < 2) {
      return {
        success: false,
        error: "Usage: /replay <dataset-id> <episode>",
      };
    }

    const [datasetId, episodeStr] = args;
    const episode = parseInt(episodeStr);

    if (isNaN(episode)) {
      return {
        success: false,
        error: "Episode must be a number",
      };
    }

    context.appendOutput(`Starting replay of ${datasetId} episode ${episode}...`);
    context.toast("info", "Starting replay...");

    const result = await startReplay(datasetId, episode, state.robot.id);

    if (result.success && result.session) {
      context.toast("success", "Replay started");
      return {
        success: true,
        output: [
          `Replaying ${datasetId} episode ${episode}`,
          `Total steps: ${result.session.totalSteps}`,
          "",
          "Use /replay-status to check progress",
          "Use /replay-stop to stop playback",
        ],
      };
    }

    return {
      success: false,
      error: result.error || "Failed to start replay",
    };
  },
};

export const replayStopCommand: CommandDefinition = {
  name: "replay-stop",
  description: "Stop the current replay",
  usage: "/replay-stop",
  execute: async (_args, context) => {
    const result = await stopReplay();

    if (result.success) {
      context.toast("success", "Replay stopped");
      return {
        success: true,
        output: ["Replay stopped"],
      };
    }

    return {
      success: false,
      error: result.error || "Failed to stop replay",
    };
  },
};

export const replayStatusCommand: CommandDefinition = {
  name: "replay-status",
  description: "Get current replay status",
  usage: "/replay-status",
  execute: async () => {
    const status = await getReplayStatus();

    if (!status.isActive) {
      return {
        success: true,
        output: ["No active replay session"],
      };
    }

    return {
      success: true,
      output: [
        "Replay Status:",
        "",
        `  Progress: ${status.currentStep} / ${status.totalSteps} (${status.progress.toFixed(1)}%)`,
        `  Active: ${status.isActive ? "Yes" : "No"}`,
      ],
    };
  },
};
