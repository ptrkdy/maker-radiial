import type { CommandDefinition } from "./types.js";
import { getEnvironmentStatus, getTelemetrySnapshot } from "../lerobot/index.js";

export const envCommand: CommandDefinition = {
  name: "env",
  aliases: ["environment", "info"],
  description: "Show environment status (LeRobot, PyTorch, CUDA)",
  usage: "/env",
  execute: async () => {
    const status = await getEnvironmentStatus();

    const output = [
      "Environment Status:",
      "",
      `  LeRobot: ${status.lerobotInstalled ? `Installed (${status.lerobotVersion || "unknown"})` : "Not installed"}`,
      `  PyTorch: ${status.torchAvailable ? "Available" : "Not available"}`,
      `  CUDA: ${status.cudaAvailable ? "Available" : "Not available"}`,
      `  Rerun: ${status.rerunAvailable ? "Available" : "Not available"}`,
      "",
      `  Connected Robots: ${status.connectedRobots}`,
      `  Connected Teleops: ${status.connectedTeleops}`,
      `  Active Datasets: ${status.activeDatasets}`,
    ];

    return { success: true, output };
  },
};

export const telemetryCommand: CommandDefinition = {
  name: "telemetry",
  aliases: ["telem", "tm"],
  description: "Get current telemetry snapshot",
  usage: "/telemetry",
  execute: async () => {
    const snapshot = await getTelemetrySnapshot();

    if (!snapshot) {
      return {
        success: false,
        error: "Failed to get telemetry",
      };
    }

    const output = ["Telemetry Snapshot:", ""];

    // Robot status
    if (snapshot.robotConnected) {
      output.push(`Robot: ${snapshot.robotType} @ ${snapshot.robotPort}`);

      if (snapshot.joints) {
        output.push("  Joints:");
        for (const [name, value] of Object.entries(snapshot.joints)) {
          output.push(`    ${name}: ${value.toFixed(3)}`);
        }
      }

      if (snapshot.readTimeMs) {
        output.push(`  Read time: ${snapshot.readTimeMs.toFixed(1)}ms`);
      }
    } else {
      output.push("Robot: Not connected");
    }

    output.push("");

    // Teleop status
    if (snapshot.teleopConnected) {
      output.push(`Teleop: ${snapshot.teleopType} @ ${snapshot.teleopPort}`);
    } else {
      output.push("Teleop: Not connected");
    }

    // Timing stats
    if (snapshot.timing?.enabled) {
      output.push("");
      output.push("Timing:");
      output.push(`  FPS: ${snapshot.timing.fps?.toFixed(1) || "N/A"}`);
      output.push(`  Loop: ${snapshot.timing.loopMs?.toFixed(1) || "N/A"}ms`);
      if (snapshot.timing.deadlineMissRate !== undefined) {
        output.push(`  Deadline misses: ${(snapshot.timing.deadlineMissRate * 100).toFixed(1)}%`);
      }
    }

    // Recording status
    if (snapshot.recording?.active) {
      output.push("");
      output.push("Recording: ACTIVE");
      output.push(`  Dataset: ${snapshot.recording.repoId}`);
      output.push(`  Episodes: ${snapshot.recording.episodeCount}`);
      output.push(`  Frames: ${snapshot.recording.numFrames}`);
    }

    return { success: true, output };
  },
};

export const clearCommand: CommandDefinition = {
  name: "clear",
  aliases: ["cls"],
  description: "Clear the output",
  usage: "/clear",
  execute: async (_args, context) => {
    context.clearOutput();
    return { success: true, output: [] };
  },
};

export const quitCommand: CommandDefinition = {
  name: "quit",
  aliases: ["q"],
  description: "Exit the application",
  usage: "/quit",
  execute: async () => {
    // This will be handled specially in the app
    process.exit(0);
  },
};

export const exitCommand: CommandDefinition = {
  name: "exit",
  description: "Exit the application",
  usage: "/exit",
  execute: async () => {
    // Handled specially in CommandLine component
    return { success: true, output: ["Exiting..."] };
  },
};

export const returnCommand: CommandDefinition = {
  name: "return",
  aliases: ["back", "home"],
  description: "Return to splash screen (clear conversation)",
  usage: "/return",
  execute: async () => {
    // Handled specially in CommandLine component
    return { success: true, output: [] };
  },
};

export const splashCommand: CommandDefinition = {
  name: "splash",
  aliases: ["reset"],
  description: "Return to splash screen and clear conversation",
  usage: "/splash",
  execute: async () => {
    // Handled specially in CommandLine component
    return { success: true, output: [] };
  },
};
