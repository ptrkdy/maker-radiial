import { spawn } from "bun";
import type { TelemetrySnapshot, EnvironmentStatus } from "./types.js";

/**
 * Get a telemetry snapshot from the robot
 * This calls into lerobot-mcp to get current state
 */
export async function getTelemetrySnapshot(): Promise<TelemetrySnapshot | null> {
  try {
    const proc = spawn({
      cmd: [
        "python",
        "-c",
        `
import json
import sys

try:
    from lerobot_mcp.tools.telemetry import get_telemetry_snapshot_impl
    result = get_telemetry_snapshot_impl()
    print(json.dumps(result))
except ImportError:
    # Fallback if lerobot_mcp is not installed
    print(json.dumps({
        "timestamp": 0,
        "robot_connected": False,
        "teleop_connected": False,
        "error": "lerobot_mcp not installed"
    }))
except Exception as e:
    print(json.dumps({
        "timestamp": 0,
        "robot_connected": False,
        "teleop_connected": False,
        "error": str(e)
    }))
`,
      ],
      stdout: "pipe",
      stderr: "pipe",
    });

    const output = await new Response(proc.stdout).text();
    await proc.exited;

    const data = JSON.parse(output);

    return {
      timestamp: data.timestamp || Date.now(),
      robotConnected: data.robot_connected || false,
      robotType: data.robot_type,
      robotPort: data.robot_port,
      joints: data.joints,
      jointsError: data.joints_error,
      readTimeMs: data.read_time_ms,
      cameras: data.cameras,
      camerasError: data.cameras_error,
      timing: data.timing,
      timingError: data.timing_error,
      teleopConnected: data.teleop_connected || false,
      teleopType: data.teleop_type,
      teleopPort: data.teleop_port,
      recording: data.recording,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Get environment status (lerobot installation, CUDA, etc.)
 */
export async function getEnvironmentStatus(): Promise<EnvironmentStatus> {
  try {
    const proc = spawn({
      cmd: [
        "python",
        "-c",
        `
import json
result = {
    "lerobot_installed": False,
    "lerobot_version": None,
    "torch_available": False,
    "cuda_available": False,
    "rerun_available": False,
    "connected_robots": 0,
    "connected_teleops": 0,
    "active_datasets": 0
}

try:
    import lerobot
    result["lerobot_installed"] = True
    result["lerobot_version"] = getattr(lerobot, "__version__", "unknown")
except ImportError:
    pass

try:
    import torch
    result["torch_available"] = True
    result["cuda_available"] = torch.cuda.is_available()
except ImportError:
    pass

try:
    import rerun
    result["rerun_available"] = True
except ImportError:
    pass

print(json.dumps(result))
`,
      ],
      stdout: "pipe",
      stderr: "pipe",
    });

    const output = await new Response(proc.stdout).text();
    await proc.exited;

    const data = JSON.parse(output);

    return {
      lerobotInstalled: data.lerobot_installed,
      lerobotVersion: data.lerobot_version,
      torchAvailable: data.torch_available,
      cudaAvailable: data.cuda_available,
      rerunAvailable: data.rerun_available,
      connectedRobots: data.connected_robots,
      connectedTeleops: data.connected_teleops,
      activeDatasets: data.active_datasets,
    };
  } catch {
    return {
      lerobotInstalled: false,
      torchAvailable: false,
      cudaAvailable: false,
      rerunAvailable: false,
      connectedRobots: 0,
      connectedTeleops: 0,
      activeDatasets: 0,
    };
  }
}
