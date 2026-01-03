import type { CommandDefinition } from "./types.js";
import { recordEpisode, buildRecordCommand, ROBOT_TYPES } from "../lerobot/index.js";

export const recordCommand: CommandDefinition = {
  name: "record",
  aliases: ["rec"],
  description: "Record demonstration episodes",
  usage: "/record <repo-id> [options]",
  examples: [
    "/record local/my-demo",
    "/record local/my-demo --episodes 5 --duration 30",
  ],
  args: [
    {
      name: "repo_id",
      description: "Dataset repository ID",
      required: true,
    },
    {
      name: "episodes",
      description: "Number of episodes to record",
      required: false,
      type: "number",
    },
    {
      name: "duration",
      description: "Episode duration in seconds",
      required: false,
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

    if (args.length < 1) {
      return {
        success: false,
        error: "Usage: /record <repo-id>",
      };
    }

    // Parse args
    const repoId = args[0];
    let numEpisodes = 1;
    let duration = 30;

    // Simple arg parsing for --episodes and --duration
    for (let i = 1; i < args.length; i++) {
      if (args[i] === "--episodes" && args[i + 1]) {
        numEpisodes = parseInt(args[i + 1]) || 1;
        i++;
      } else if (args[i] === "--duration" && args[i + 1]) {
        duration = parseInt(args[i + 1]) || 30;
        i++;
      }
    }

    context.appendOutput(`Starting recording: ${repoId}`);
    context.appendOutput(`Episodes: ${numEpisodes}, Duration: ${duration}s`);
    context.toast("info", "Starting recording...");

    const config = {
      repoId,
      robotType: state.robot.robotType as never,
      robotPort: state.robot.port,
      teleopType: state.teleop?.deviceType as never,
      teleopPort: state.teleop?.port,
      fps: 30,
      episodeDurationS: duration,
      resetTimeS: 5,
      numEpisodes,
      taskDescription: "Demonstration recording",
      cameras: [
        {
          type: "opencv" as const,
          indexOrPath: 0,
          width: 640,
          height: 480,
          fps: 30,
        },
      ],
      pushToHub: false,
      resume: false,
    };

    const result = await recordEpisode(config, (line) => {
      context.appendOutput(line);
    });

    if (result.success) {
      context.toast("success", "Recording completed");
      return {
        success: true,
        output: ["Recording completed successfully"],
      };
    }

    return {
      success: false,
      error: result.error || "Recording failed",
    };
  },
};

export const recordCommandPreview: CommandDefinition = {
  name: "record-preview",
  aliases: ["rec-cmd"],
  description: "Preview the lerobot-record command that would be generated",
  usage: "/record-preview <repo-id>",
  args: [
    {
      name: "repo_id",
      description: "Dataset repository ID",
      required: true,
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

    if (args.length < 1) {
      return {
        success: false,
        error: "Usage: /record-preview <repo-id>",
      };
    }

    const repoId = args[0];

    const config = {
      repoId,
      robotType: state.robot.robotType as never,
      robotPort: state.robot.port,
      teleopType: state.teleop?.deviceType as never,
      teleopPort: state.teleop?.port,
      fps: 30,
      episodeDurationS: 30,
      resetTimeS: 5,
      numEpisodes: 1,
      taskDescription: "Demonstration recording",
      cameras: [
        {
          type: "opencv" as const,
          indexOrPath: 0,
          width: 640,
          height: 480,
          fps: 30,
        },
      ],
      pushToHub: false,
      resume: false,
    };

    const cmd = buildRecordCommand(config);

    return {
      success: true,
      output: [
        "Generated lerobot-record command:",
        "",
        cmd.join(" \\\n  "),
      ],
    };
  },
};
