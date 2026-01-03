/**
 * HTTP client for communicating with the Maker Robot Server (Python Flask).
 * Handles auto-launching the server if not running.
 */

import { spawn, type Subprocess } from "bun";
import path from "path";

const DEFAULT_SERVER_URL = "http://127.0.0.1:5577";
const SERVER_STARTUP_TIMEOUT_MS = 10000;
const HEALTH_CHECK_INTERVAL_MS = 500;

let serverProcess: Subprocess | null = null;
let serverUrl = DEFAULT_SERVER_URL;

/**
 * Set the server URL (for custom configurations)
 */
export function setServerUrl(url: string): void {
  serverUrl = url;
}

/**
 * Get the current server URL
 */
export function getServerUrl(): string {
  return serverUrl;
}

/**
 * Check if the server is running and healthy
 */
export async function isServerHealthy(): Promise<boolean> {
  try {
    const response = await fetch(`${serverUrl}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(2000),
    });
    if (response.ok) {
      const data = await response.json();
      return data.status === "ok";
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Start the Python server if not already running
 */
export async function ensureServerRunning(): Promise<{ success: boolean; error?: string }> {
  // Check if already running
  if (await isServerHealthy()) {
    return { success: true };
  }

  // Find the start script or Python server
  const scriptsDir = path.join(import.meta.dir, "../../scripts");
  const startScript = path.join(scriptsDir, "start-server.sh");
  const serverScript = path.join(import.meta.dir, "../../python/server.py");

  console.log(`Starting Maker Robot Server...`);

  try {
    // Check if we have a venv with the start script
    const fs = await import("fs");
    const useStartScript = fs.existsSync(startScript);

    if (useStartScript) {
      // Use the shell script which activates venv
      serverProcess = spawn({
        cmd: ["bash", startScript],
        stdout: "pipe",
        stderr: "pipe",
        env: {
          ...process.env,
          MAKER_SERVER_PORT: "5577",
          MAKER_SERVER_HOST: "127.0.0.1",
        },
      });
    } else {
      // Fall back to direct python3
      serverProcess = spawn({
        cmd: ["python3", serverScript],
        stdout: "pipe",
        stderr: "pipe",
        env: {
          ...process.env,
          MAKER_SERVER_PORT: "5577",
          MAKER_SERVER_HOST: "127.0.0.1",
        },
      });
    }

    // Wait for server to become healthy
    const startTime = Date.now();
    while (Date.now() - startTime < SERVER_STARTUP_TIMEOUT_MS) {
      if (await isServerHealthy()) {
        console.log("Maker Robot Server started successfully");
        return { success: true };
      }

      // Check if process died
      if (serverProcess.exitCode !== null) {
        const stderr = await new Response(serverProcess.stderr).text();
        return {
          success: false,
          error: `Server process exited with code ${serverProcess.exitCode}: ${stderr}`,
        };
      }

      await new Promise((resolve) => setTimeout(resolve, HEALTH_CHECK_INTERVAL_MS));
    }

    // Timeout
    serverProcess.kill();
    return { success: false, error: "Server startup timed out" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Stop the server if we started it
 */
export async function stopServer(): Promise<void> {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
}

/**
 * Make a request to the server, auto-starting if needed
 */
async function serverRequest<T>(
  endpoint: string,
  options: {
    method?: "GET" | "POST";
    body?: unknown;
    autoStart?: boolean;
  } = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  const { method = "GET", body, autoStart = true } = options;

  // Ensure server is running
  if (autoStart) {
    const startResult = await ensureServerRunning();
    if (!startResult.success) {
      return { success: false, error: startResult.error };
    }
  }

  try {
    const fetchOptions: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (body) {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(`${serverUrl}${endpoint}`, fetchOptions);
    const data = await response.json();

    if (!response.ok || !data.success) {
      return { success: false, error: data.error || `HTTP ${response.status}` };
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// === Port Discovery ===

export interface PortInfo {
  device: string;
  description: string;
  hwid: string;
  manufacturer?: string;
  serial_number?: string;
  is_likely_robot: boolean;
}

export async function listPorts(): Promise<{ success: boolean; ports?: PortInfo[]; error?: string }> {
  const result = await serverRequest<{ ports: PortInfo[] }>("/ports");
  if (result.success && result.data) {
    return { success: true, ports: result.data.ports };
  }
  return { success: false, error: result.error };
}

// === Robot Control ===

export interface RobotConnectionResult {
  id: string;
  robot_type: string;
  port: string;
  is_calibrated: boolean;
}

export async function connectRobot(
  robotType: string,
  port: string,
  options: { id?: string; calibrate?: boolean } = {}
): Promise<{ success: boolean; robot?: RobotConnectionResult; error?: string }> {
  const result = await serverRequest<RobotConnectionResult>("/robot/connect", {
    method: "POST",
    body: {
      robot_type: robotType,
      port,
      id: options.id,
      calibrate: options.calibrate ?? false,
    },
  });

  if (result.success && result.data) {
    return { success: true, robot: result.data };
  }
  return { success: false, error: result.error };
}

export async function disconnectRobot(robotId?: string): Promise<{ success: boolean; error?: string }> {
  const result = await serverRequest("/robot/disconnect", {
    method: "POST",
    body: { id: robotId },
  });
  return { success: result.success, error: result.error };
}

export async function getRobotObservation(
  robotId?: string
): Promise<{ success: boolean; observations?: Record<string, Record<string, number>>; error?: string }> {
  const query = robotId ? `?id=${encodeURIComponent(robotId)}` : "";
  const result = await serverRequest<{ observations: Record<string, Record<string, number>> }>(
    `/robot/observation${query}`
  );

  if (result.success && result.data) {
    return { success: true, observations: result.data.observations };
  }
  return { success: false, error: result.error };
}

export async function sendRobotAction(
  action: Record<string, number>,
  robotId?: string
): Promise<{ success: boolean; action_sent?: Record<string, number>; error?: string }> {
  const result = await serverRequest<{ action_sent: Record<string, number> }>("/robot/action", {
    method: "POST",
    body: { id: robotId, action },
  });

  if (result.success && result.data) {
    return { success: true, action_sent: result.data.action_sent };
  }
  return { success: false, error: result.error };
}

export interface RobotStatus {
  robot_type: string;
  port: string;
  is_connected: boolean;
  is_calibrated: boolean;
}

export async function getRobotStatus(): Promise<{
  success: boolean;
  robots?: Record<string, RobotStatus>;
  count?: number;
  error?: string;
}> {
  const result = await serverRequest<{ robots: Record<string, RobotStatus>; count: number }>("/robot/status");

  if (result.success && result.data) {
    return { success: true, robots: result.data.robots, count: result.data.count };
  }
  return { success: false, error: result.error };
}

// === Teleoperator Control ===

export interface TeleopConnectionResult {
  id: string;
  teleop_type: string;
  port: string;
  is_calibrated: boolean;
}

export async function connectTeleop(
  teleopType: string,
  port: string,
  options: { id?: string; calibrate?: boolean } = {}
): Promise<{ success: boolean; teleop?: TeleopConnectionResult; error?: string }> {
  const result = await serverRequest<TeleopConnectionResult>("/teleop/connect", {
    method: "POST",
    body: {
      teleop_type: teleopType,
      port,
      id: options.id,
      calibrate: options.calibrate ?? false,
    },
  });

  if (result.success && result.data) {
    return { success: true, teleop: result.data };
  }
  return { success: false, error: result.error };
}

export async function disconnectTeleop(teleopId?: string): Promise<{ success: boolean; error?: string }> {
  const result = await serverRequest("/teleop/disconnect", {
    method: "POST",
    body: { id: teleopId },
  });
  return { success: result.success, error: result.error };
}

export async function getTeleopState(
  teleopId?: string
): Promise<{ success: boolean; states?: Record<string, Record<string, number>>; error?: string }> {
  const query = teleopId ? `?id=${encodeURIComponent(teleopId)}` : "";
  const result = await serverRequest<{ states: Record<string, Record<string, number>> }>(`/teleop/read${query}`);

  if (result.success && result.data) {
    return { success: true, states: result.data.states };
  }
  return { success: false, error: result.error };
}

export interface TeleopStatus {
  teleop_type: string;
  port: string;
  is_connected: boolean;
  is_calibrated: boolean;
}

export async function getTeleopStatus(): Promise<{
  success: boolean;
  teleops?: Record<string, TeleopStatus>;
  count?: number;
  error?: string;
}> {
  const result = await serverRequest<{ teleops: Record<string, TeleopStatus>; count: number }>("/teleop/status");

  if (result.success && result.data) {
    return { success: true, teleops: result.data.teleops, count: result.data.count };
  }
  return { success: false, error: result.error };
}

// === Teleoperation Session ===

export interface TeleopSessionResult {
  leader: Record<string, number>;
  follower: Record<string, number>;
  action_sent: Record<string, number>;
}

export async function teleopStep(
  robotId?: string,
  teleopId?: string
): Promise<{ success: boolean; result?: TeleopSessionResult; error?: string }> {
  const response = await serverRequest<TeleopSessionResult>("/session/teleop", {
    method: "POST",
    body: { robot_id: robotId, teleop_id: teleopId },
  });

  if (response.success && response.data) {
    return { success: true, result: response.data };
  }
  return { success: false, error: response.error };
}
