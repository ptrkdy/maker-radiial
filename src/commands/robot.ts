import type { CommandDefinition } from "./types.js";
import {
  findPorts,
  connectRobot,
  disconnectRobot,
  getRobotObservation,
  ROBOT_TYPES,
} from "../lerobot/index.js";

export const portsCommand: CommandDefinition = {
  name: "ports",
  aliases: ["ls-ports", "scan"],
  description: "List available serial ports",
  usage: "/ports",
  execute: async () => {
    const ports = await findPorts();

    if (ports.length === 0) {
      return {
        success: true,
        output: ["No serial ports found"],
      };
    }

    const output = [
      "Available Ports:",
      "",
      ...ports.map((p) => {
        const robot = p.isLikelyRobot ? " [likely robot]" : "";
        return `  ${p.device} - ${p.description}${robot}`;
      }),
    ];

    return { success: true, output };
  },
};

export const connectCommand: CommandDefinition = {
  name: "connect",
  aliases: ["c"],
  description: "Connect to a robot",
  usage: "/connect <robot-type> <port>",
  examples: [
    "/connect so100 /dev/ttyUSB0",
    "/connect koch /dev/cu.usbserial-1234",
  ],
  args: [
    {
      name: "robot_type",
      description: "Type of robot to connect",
      required: true,
      choices: ROBOT_TYPES.map((r) => r.id),
    },
    {
      name: "port",
      description: "Serial port path",
      required: true,
    },
  ],
  execute: async (args, context) => {
    if (args.length < 2) {
      return {
        success: false,
        error: "Usage: /connect <robot-type> <port>",
      };
    }

    const [robotType, port] = args;

    // Validate robot type
    const validType = ROBOT_TYPES.find((r) => r.id === robotType);
    if (!validType) {
      return {
        success: false,
        error: `Invalid robot type: ${robotType}. Valid types: ${ROBOT_TYPES.map((r) => r.id).join(", ")}`,
      };
    }

    context.appendOutput(`Connecting to ${robotType} on ${port}...`);

    const result = await connectRobot(robotType as never, port);

    if (result.success && result.robot) {
      context.toast("success", `Connected to ${robotType}`);
      return {
        success: true,
        output: [`Connected to ${robotType} on ${port}`, `Robot ID: ${result.robot.id}`],
      };
    }

    return {
      success: false,
      error: result.error || "Failed to connect",
    };
  },
};

export const disconnectCommand: CommandDefinition = {
  name: "disconnect",
  aliases: ["dc"],
  description: "Disconnect from a robot",
  usage: "/disconnect [robot-id]",
  args: [
    {
      name: "robot_id",
      description: "Robot ID to disconnect (uses default if not specified)",
      required: false,
    },
  ],
  execute: async (args, context) => {
    const state = context.getRobotState();

    if (!state.robot) {
      return {
        success: false,
        error: "No robot connected",
      };
    }

    const robotId = args[0] || state.robot.id;
    const result = await disconnectRobot(robotId);

    if (result.success) {
      context.toast("success", "Robot disconnected");
      return {
        success: true,
        output: ["Robot disconnected"],
      };
    }

    return {
      success: false,
      error: result.error || "Failed to disconnect",
    };
  },
};

export const statusCommand: CommandDefinition = {
  name: "status",
  aliases: ["s", "st"],
  description: "Show current connection status",
  usage: "/status",
  execute: async (_args, context) => {
    const state = context.getRobotState();

    const output = ["Connection Status:", ""];

    if (state.robot) {
      output.push(`Robot: ${state.robot.robotType} @ ${state.robot.port}`);
      output.push(`  ID: ${state.robot.id}`);
    } else {
      output.push("Robot: Not connected");
    }

    if (state.teleop) {
      output.push(`Teleop: ${state.teleop.deviceType} @ ${state.teleop.port}`);
      output.push(`  ID: ${state.teleop.id}`);
    } else {
      output.push("Teleop: Not connected");
    }

    if (state.teleopSessionActive) {
      output.push("", "Teleoperation: ACTIVE");
    }

    return { success: true, output };
  },
};

export const observationCommand: CommandDefinition = {
  name: "obs",
  aliases: ["observation", "joints"],
  description: "Get current robot observation (joint positions)",
  usage: "/obs",
  execute: async (_args, context) => {
    const state = context.getRobotState();

    if (!state.robot) {
      return {
        success: false,
        error: "No robot connected",
      };
    }

    const result = await getRobotObservation(state.robot.id);

    if (result.error) {
      return {
        success: false,
        error: result.error,
      };
    }

    if (!result.observation) {
      return {
        success: false,
        error: "No observation data available",
      };
    }

    const output = ["Robot Observation:", ""];

    for (const [key, value] of Object.entries(result.observation)) {
      if (Array.isArray(value)) {
        output.push(`  ${key}: [${value.map((v) => v.toFixed(3)).join(", ")}]`);
      } else if (typeof value === "number") {
        output.push(`  ${key}: ${value.toFixed(3)}`);
      } else {
        output.push(`  ${key}: ${value}`);
      }
    }

    return { success: true, output };
  },
};
