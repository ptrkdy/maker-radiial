import { spawn } from "bun";
import type { ReplaySession } from "./types.js";

/**
 * Start replaying an episode from a dataset
 */
export async function startReplay(
  datasetId: string,
  episode: number,
  robotId?: string
): Promise<{ success: boolean; session?: ReplaySession; error?: string }> {
  try {
    const robotArg = robotId ? `"${robotId}"` : "None";
    const proc = spawn({
      cmd: [
        "python",
        "-c",
        `
import json
try:
    from lerobot_mcp.tools.replay import replay_start_impl
    result = replay_start_impl("${datasetId}", ${episode}, ${robotArg})
    print(json.dumps(result))
except ImportError:
    print(json.dumps({"success": False, "error": "lerobot_mcp not installed"}))
except Exception as e:
    print(json.dumps({"success": False, "error": str(e)}))
`,
      ],
      stdout: "pipe",
      stderr: "pipe",
    });

    const output = await new Response(proc.stdout).text();
    await proc.exited;

    const data = JSON.parse(output);

    if (data.success) {
      return {
        success: true,
        session: {
          datasetId,
          episode,
          isActive: true,
          currentStep: 0,
          totalSteps: data.total_steps || 0,
        },
      };
    }

    return {
      success: false,
      error: data.error || "Failed to start replay",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Stop the active replay session
 */
export async function stopReplay(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const proc = spawn({
      cmd: [
        "python",
        "-c",
        `
import json
try:
    from lerobot_mcp.tools.replay import replay_stop_impl
    result = replay_stop_impl()
    print(json.dumps(result))
except ImportError:
    print(json.dumps({"success": False, "error": "lerobot_mcp not installed"}))
except Exception as e:
    print(json.dumps({"success": False, "error": str(e)}))
`,
      ],
      stdout: "pipe",
      stderr: "pipe",
    });

    const output = await new Response(proc.stdout).text();
    await proc.exited;

    return JSON.parse(output);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get replay session status
 */
export async function getReplayStatus(): Promise<{
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  progress: number;
  error?: string;
}> {
  try {
    const proc = spawn({
      cmd: [
        "python",
        "-c",
        `
import json
try:
    from lerobot_mcp.tools.replay import replay_status_impl
    result = replay_status_impl()
    print(json.dumps(result))
except ImportError:
    print(json.dumps({"is_active": False, "error": "lerobot_mcp not installed"}))
except Exception as e:
    print(json.dumps({"is_active": False, "error": str(e)}))
`,
      ],
      stdout: "pipe",
      stderr: "pipe",
    });

    const output = await new Response(proc.stdout).text();
    await proc.exited;

    const data = JSON.parse(output);

    const currentStep = data.current_step || 0;
    const totalSteps = data.total_steps || 0;
    const progress = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;

    return {
      isActive: data.is_active || false,
      currentStep,
      totalSteps,
      progress,
      error: data.error,
    };
  } catch (error) {
    return {
      isActive: false,
      currentStep: 0,
      totalSteps: 0,
      progress: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
