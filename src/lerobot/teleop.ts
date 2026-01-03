import * as client from "./client.js";
import type { TeleopConnection, TeleopType } from "./types.js";

/**
 * Connect to a teleop device (leader arm)
 */
export async function connectTeleop(
  teleopType: TeleopType,
  port?: string
): Promise<{ success: boolean; teleop?: TeleopConnection; error?: string }> {
  if (!port) {
    return { success: false, error: "Port is required for leader arm connection" };
  }

  const result = await client.connectTeleop(teleopType, port);

  if (result.success && result.teleop) {
    return {
      success: true,
      teleop: {
        id: result.teleop.id,
        deviceType: result.teleop.teleop_type,
        port: result.teleop.port,
        state: "connected",
      },
    };
  }

  return {
    success: false,
    error: result.error || "Failed to connect to teleop device",
  };
}

/**
 * Disconnect from a teleop device
 */
export async function disconnectTeleop(
  teleopId: string
): Promise<{ success: boolean; error?: string }> {
  return client.disconnectTeleop(teleopId);
}

/**
 * Start a teleoperation session (robot follows teleop)
 * This is now handled via teleopStep for single-step control
 */
export async function startTeleopSession(
  robotId: string,
  teleopId: string
): Promise<{ success: boolean; error?: string }> {
  // The new architecture uses step-based teleoperation
  // This function can be used to validate both devices are connected
  const robotStatus = await client.getRobotStatus();
  const teleopStatus = await client.getTeleopStatus();

  if (!robotStatus.success || !robotStatus.robots || Object.keys(robotStatus.robots).length === 0) {
    return { success: false, error: "No robot connected" };
  }

  if (!teleopStatus.success || !teleopStatus.teleops || Object.keys(teleopStatus.teleops).length === 0) {
    return { success: false, error: "No teleop connected" };
  }

  return { success: true };
}

/**
 * Stop the active teleoperation session
 */
export async function stopTeleopSession(): Promise<{
  success: boolean;
  error?: string;
}> {
  // In the new architecture, sessions are step-based
  // This function is a no-op but kept for API compatibility
  return { success: true };
}

/**
 * Get current action from teleop device (joint positions)
 */
export async function getTeleopAction(
  teleopId?: string
): Promise<{ action?: Record<string, number>; error?: string }> {
  const result = await client.getTeleopState(teleopId);

  if (result.success && result.states) {
    const states = Object.values(result.states);
    if (states.length > 0) {
      return { action: states[0] };
    }
    return { error: "No teleop state available" };
  }

  return { error: result.error };
}

/**
 * Execute a single teleoperation step: read leader, send to follower
 */
export async function teleopStep(
  robotId?: string,
  teleopId?: string
): Promise<{
  success: boolean;
  leader?: Record<string, number>;
  follower?: Record<string, number>;
  action_sent?: Record<string, number>;
  error?: string;
}> {
  const result = await client.teleopStep(robotId, teleopId);

  if (result.success && result.result) {
    return {
      success: true,
      leader: result.result.leader,
      follower: result.result.follower,
      action_sent: result.result.action_sent,
    };
  }

  return { success: false, error: result.error };
}
