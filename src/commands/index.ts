// Command registry and exports
import { commandRegistry } from "./registry.js";

// Import all commands
import { helpCommand, guideCommand } from "./help.js";
import { menuCommand } from "./menu.js";
import {
  portsCommand,
  connectCommand,
  disconnectCommand,
  statusCommand,
  observationCommand,
} from "./robot.js";
import {
  teleopConnectCommand,
  teleopDisconnectCommand,
  teleopStartCommand,
  teleopStopCommand,
} from "./teleop.js";
import {
  datasetsCommand,
  datasetSearchCommand,
  datasetDownloadCommand,
  datasetPushCommand,
} from "./dataset.js";
import { recordCommand, recordCommandPreview } from "./record.js";
import { replayCommand, replayStopCommand, replayStatusCommand } from "./replay.js";
import { envCommand, telemetryCommand, clearCommand, quitCommand, exitCommand, returnCommand, splashCommand } from "./system.js";

// Register all commands
export function registerAllCommands(): void {
  // System commands
  commandRegistry.register(helpCommand);
  commandRegistry.register(guideCommand);
  commandRegistry.register(menuCommand);
  commandRegistry.register(clearCommand);
  commandRegistry.register(quitCommand);
  commandRegistry.register(exitCommand);
  commandRegistry.register(returnCommand);
  commandRegistry.register(splashCommand);
  commandRegistry.register(envCommand);
  commandRegistry.register(telemetryCommand);

  // Robot commands
  commandRegistry.register(portsCommand);
  commandRegistry.register(connectCommand);
  commandRegistry.register(disconnectCommand);
  commandRegistry.register(statusCommand);
  commandRegistry.register(observationCommand);

  // Teleop commands
  commandRegistry.register(teleopConnectCommand);
  commandRegistry.register(teleopDisconnectCommand);
  commandRegistry.register(teleopStartCommand);
  commandRegistry.register(teleopStopCommand);

  // Dataset commands
  commandRegistry.register(datasetsCommand);
  commandRegistry.register(datasetSearchCommand);
  commandRegistry.register(datasetDownloadCommand);
  commandRegistry.register(datasetPushCommand);

  // Recording commands
  commandRegistry.register(recordCommand);
  commandRegistry.register(recordCommandPreview);

  // Replay commands
  commandRegistry.register(replayCommand);
  commandRegistry.register(replayStopCommand);
  commandRegistry.register(replayStatusCommand);
}

// Re-export
export { commandRegistry } from "./registry.js";
export type { CommandDefinition, CommandContext, CommandResult } from "./types.js";
