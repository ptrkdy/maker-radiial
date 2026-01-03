import * as client from "./client.js";
import type { RobotConnection, RobotType, RobotObservation } from "./types.js";

/**
 * Connect to a robot via the Python server
 */
export async function connectRobot(
  robotType: RobotType,
  port: string
): Promise<{ success: boolean; robot?: RobotConnection; error?: string }> {
  const result = await client.connectRobot(robotType, port);

  if (result.success && result.robot) {
    return {
      success: true,
      robot: {
        id: result.robot.id,
        robotType: result.robot.robot_type,
        port: result.robot.port,
        state: "connected",
        cameras: {},
      },
    };
  }

  return {
    success: false,
    error: result.error || "Failed to connect to robot",
  };
}

/**
 * Disconnect from a robot
 */
export async function disconnectRobot(
  robotId: string
): Promise<{ success: boolean; error?: string }> {
  return client.disconnectRobot(robotId);
}

/**
 * Get robot observation (joint positions, camera frames)
 */
export async function getRobotObservation(
  robotId?: string
): Promise<{ observation?: RobotObservation; error?: string }> {
  const result = await client.getRobotObservation(robotId);

  if (result.success && result.observations) {
    // Return the first robot's observation if no ID specified
    const observations = Object.values(result.observations);
    if (observations.length > 0) {
      return { observation: observations[0] as RobotObservation };
    }
    return { error: "No observations available" };
  }

  return { error: result.error };
}

/**
 * Get robot status
 */
export async function getRobotStatus(
  robotId?: string
): Promise<{
  connected: boolean;
  robotType?: string;
  port?: string;
  error?: string;
}> {
  const result = await client.getRobotStatus();

  if (result.success && result.robots) {
    if (robotId && result.robots[robotId]) {
      const robot = result.robots[robotId];
      return {
        connected: robot.is_connected,
        robotType: robot.robot_type,
        port: robot.port,
      };
    }

    // Return first robot if no ID specified
    const robots = Object.values(result.robots);
    if (robots.length > 0) {
      const robot = robots[0];
      return {
        connected: robot.is_connected,
        robotType: robot.robot_type,
        port: robot.port,
      };
    }

    return { connected: false };
  }

  return { connected: false, error: result.error };
}
