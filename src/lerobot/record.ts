import { spawn } from "bun";
import type { RecordingConfig, CameraConfig } from "./types.js";

export interface RecordResult {
  success: boolean;
  output: string;
  error?: string;
}

/**
 * Build the lerobot-record command from configuration
 */
export function buildRecordCommand(config: RecordingConfig): string[] {
  const args: string[] = [
    "lerobot-record",
    "--robot.type", config.robotType,
    "--robot.port", config.robotPort,
    "--dataset.repo_id", config.repoId,
    "--dataset.fps", String(config.fps),
    "--dataset.episode_time_s", String(config.episodeDurationS),
    "--dataset.reset_time_s", String(config.resetTimeS),
    "--dataset.num_episodes", String(config.numEpisodes),
  ];

  // Add teleop if configured
  if (config.teleopType) {
    args.push("--teleop.type", config.teleopType);
    if (config.teleopPort) {
      args.push("--teleop.port", config.teleopPort);
    }
  }

  // Add task description
  if (config.taskDescription) {
    args.push("--dataset.task", config.taskDescription);
  }

  // Add cameras
  config.cameras.forEach((camera, index) => {
    const prefix = `--robot.cameras.cam_${index}`;
    args.push(`${prefix}.type`, camera.type);
    args.push(`${prefix}.index`, String(camera.indexOrPath));
    args.push(`${prefix}.width`, String(camera.width));
    args.push(`${prefix}.height`, String(camera.height));
    args.push(`${prefix}.fps`, String(camera.fps));
  });

  // Add flags
  if (config.pushToHub) {
    args.push("--dataset.push_to_hub", "true");
  }

  if (config.resume) {
    args.push("--resume", "true");
  }

  return args;
}

/**
 * Run lerobot-record with the given configuration
 */
export async function recordEpisode(
  config: RecordingConfig,
  onOutput?: (line: string) => void
): Promise<RecordResult> {
  const args = buildRecordCommand(config);

  try {
    const proc = spawn({
      cmd: args,
      stdout: "pipe",
      stderr: "pipe",
    });

    // Collect output
    const stdoutPromise = new Response(proc.stdout).text();
    const stderrPromise = new Response(proc.stderr).text();

    // Stream output lines as they come (simplified approach)
    if (onOutput) {
      const decoder = new TextDecoder();
      const reader = proc.stdout.getReader();
      (async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const text = decoder.decode(value);
            text.split("\n").filter((l) => l.trim()).forEach(onOutput);
          }
        } catch {
          // Stream ended
        }
      })();
    }

    const [stdout, stderr] = await Promise.all([stdoutPromise, stderrPromise]);
    const exitCode = await proc.exited;

    return {
      success: exitCode === 0,
      output: stdout + stderr,
      error: exitCode !== 0 ? `Process exited with code ${exitCode}` : undefined,
    };
  } catch (error) {
    return {
      success: false,
      output: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Run optimized recording with extra thread/process settings
 */
export async function recordEpisodeOptimized(
  config: RecordingConfig,
  options: {
    imageWriterThreads?: number;
    imageWriterProcesses?: number;
  } = {},
  onOutput?: (line: string) => void
): Promise<RecordResult> {
  const args = buildRecordCommand(config);

  // Add optimized settings
  if (options.imageWriterThreads) {
    args.push("--dataset.image_writer_threads", String(options.imageWriterThreads));
  }
  if (options.imageWriterProcesses) {
    args.push("--dataset.image_writer_processes", String(options.imageWriterProcesses));
  }

  try {
    const proc = spawn({
      cmd: args,
      stdout: "pipe",
      stderr: "pipe",
    });

    // Stream output lines as they come
    if (onOutput) {
      const decoder = new TextDecoder();
      const reader = proc.stdout.getReader();
      (async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const text = decoder.decode(value);
            text.split("\n").filter((l) => l.trim()).forEach(onOutput);
          }
        } catch {
          // Stream ended
        }
      })();
    }

    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);

    const exitCode = await proc.exited;

    return {
      success: exitCode === 0,
      output: stdout + stderr,
      error: exitCode !== 0 ? `Process exited with code ${exitCode}` : undefined,
    };
  } catch (error) {
    return {
      success: false,
      output: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
