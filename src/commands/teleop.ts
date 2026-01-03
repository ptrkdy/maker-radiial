import type { CommandDefinition } from "./types.js";
import {
  connectTeleop,
  disconnectTeleop,
  startTeleopSession,
  stopTeleopSession,
  TELEOP_TYPES,
} from "../lerobot/index.js";

export const teleopConnectCommand: CommandDefinition = {
  name: "teleop-connect",
  aliases: ["tc"],
  description: "Connect to a teleop device",
  usage: "/teleop-connect <device-type> [port]",
  examples: [
    "/teleop-connect so100_leader /dev/ttyUSB1",
    "/teleop-connect gamepad",
    "/teleop-connect keyboard",
  ],
  args: [
    {
      name: "device_type",
      description: "Type of teleop device",
      required: true,
      choices: TELEOP_TYPES.map((t) => t.id),
    },
    {
      name: "port",
      description: "Serial port (required for leader arms)",
      required: false,
    },
  ],
  execute: async (args, context) => {
    if (args.length < 1) {
      return {
        success: false,
        error: "Usage: /teleop-connect <device-type> [port]",
      };
    }

    const [deviceType, port] = args;

    // Validate device type
    const validType = TELEOP_TYPES.find((t) => t.id === deviceType);
    if (!validType) {
      return {
        success: false,
        error: `Invalid device type: ${deviceType}. Valid types: ${TELEOP_TYPES.map((t) => t.id).join(", ")}`,
      };
    }

    // Check if port is required
    if (validType.requiresPort && !port) {
      return {
        success: false,
        error: `${deviceType} requires a port. Usage: /teleop-connect ${deviceType} <port>`,
      };
    }

    context.appendOutput(`Connecting to ${deviceType}${port ? ` on ${port}` : ""}...`);

    const result = await connectTeleop(deviceType as never, port);

    if (result.success && result.teleop) {
      context.toast("success", `Connected to ${deviceType}`);
      return {
        success: true,
        output: [
          `Connected to ${deviceType}${port ? ` on ${port}` : ""}`,
          `Teleop ID: ${result.teleop.id}`,
        ],
      };
    }

    return {
      success: false,
      error: result.error || "Failed to connect",
    };
  },
};

export const teleopDisconnectCommand: CommandDefinition = {
  name: "teleop-disconnect",
  aliases: ["td"],
  description: "Disconnect teleop device",
  usage: "/teleop-disconnect",
  execute: async (_args, context) => {
    const state = context.getRobotState();

    if (!state.teleop) {
      return {
        success: false,
        error: "No teleop device connected",
      };
    }

    const result = await disconnectTeleop(state.teleop.id);

    if (result.success) {
      context.toast("success", "Teleop disconnected");
      return {
        success: true,
        output: ["Teleop device disconnected"],
      };
    }

    return {
      success: false,
      error: result.error || "Failed to disconnect",
    };
  },
};

export const teleopStartCommand: CommandDefinition = {
  name: "teleop-start",
  aliases: ["ts"],
  description: "Start teleoperation session (robot follows leader)",
  usage: "/teleop-start",
  execute: async (_args, context) => {
    const state = context.getRobotState();

    if (!state.robot) {
      return {
        success: false,
        error: "No robot connected. Connect a robot first with /connect",
      };
    }

    if (!state.teleop) {
      return {
        success: false,
        error: "No teleop device connected. Connect one with /teleop-connect",
      };
    }

    if (state.teleopSessionActive) {
      return {
        success: false,
        error: "Teleoperation session already active",
      };
    }

    const result = await startTeleopSession(state.robot.id, state.teleop.id);

    if (result.success) {
      context.toast("success", "Teleoperation started");
      return {
        success: true,
        output: [
          "Teleoperation session started",
          "The robot is now following the teleop device",
          "Use /teleop-stop to end the session",
        ],
      };
    }

    return {
      success: false,
      error: result.error || "Failed to start teleoperation",
    };
  },
};

export const teleopStopCommand: CommandDefinition = {
  name: "teleop-stop",
  aliases: ["tx"],
  description: "Stop teleoperation session",
  usage: "/teleop-stop",
  execute: async (_args, context) => {
    const state = context.getRobotState();

    if (!state.teleopSessionActive) {
      return {
        success: false,
        error: "No active teleoperation session",
      };
    }

    const result = await stopTeleopSession();

    if (result.success) {
      context.toast("success", "Teleoperation stopped");
      return {
        success: true,
        output: ["Teleoperation session stopped"],
      };
    }

    return {
      success: false,
      error: result.error || "Failed to stop teleoperation",
    };
  },
};
