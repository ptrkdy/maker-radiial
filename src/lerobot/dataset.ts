import { spawn } from "bun";
import { readdir, stat } from "fs/promises";
import { join } from "path";
import { homedir } from "os";
import type { DatasetInfo } from "./types.js";

const LEROBOT_CACHE_DIR = join(homedir(), ".cache", "huggingface", "lerobot");

export interface DatasetListResult {
  datasets: DatasetInfo[];
  error?: string;
}

/**
 * List local datasets from the LeRobot cache directory
 */
export async function listLocalDatasets(): Promise<DatasetListResult> {
  try {
    const datasets: DatasetInfo[] = [];

    // Check if cache directory exists
    try {
      await stat(LEROBOT_CACHE_DIR);
    } catch {
      return { datasets: [] };
    }

    // List all directories in the cache
    const entries = await readdir(LEROBOT_CACHE_DIR, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      // Check for subdirectories (org/repo structure)
      const orgPath = join(LEROBOT_CACHE_DIR, entry.name);
      const orgEntries = await readdir(orgPath, { withFileTypes: true });

      for (const repoEntry of orgEntries) {
        if (!repoEntry.isDirectory()) continue;

        const repoId = `${entry.name}/${repoEntry.name}`;
        const repoPath = join(orgPath, repoEntry.name);

        // Try to read dataset info
        const info = await getDatasetInfoFromPath(repoPath, repoId);
        if (info) {
          datasets.push(info);
        }
      }
    }

    return { datasets };
  } catch (error) {
    return {
      datasets: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get dataset info from a local path
 */
async function getDatasetInfoFromPath(
  path: string,
  repoId: string
): Promise<DatasetInfo | null> {
  try {
    // Try to read meta.json or info.json
    const metaPath = join(path, "meta.json");
    const infoPath = join(path, "info.json");

    let metadata: Record<string, unknown> | null = null;

    try {
      const metaContent = await Bun.file(metaPath).text();
      metadata = JSON.parse(metaContent);
    } catch {
      try {
        const infoContent = await Bun.file(infoPath).text();
        metadata = JSON.parse(infoContent);
      } catch {
        // No metadata file found
      }
    }

    // Count episodes by looking for episode directories or parquet files
    let numEpisodes = 0;
    try {
      const dataPath = join(path, "data");
      const dataEntries = await readdir(dataPath);
      numEpisodes = dataEntries.filter(
        (e) => e.startsWith("episode_") || e.endsWith(".parquet")
      ).length;
    } catch {
      // No data directory
    }

    return {
      repoId,
      fps: (metadata?.fps as number) || 30,
      numEpisodes,
      numFrames: (metadata?.total_frames as number) || 0,
      robotType: metadata?.robot_type as string | undefined,
      features: (metadata?.features as string[]) || [],
    };
  } catch {
    return null;
  }
}

/**
 * Search for datasets on HuggingFace Hub
 */
export async function searchHubDatasets(query: string): Promise<DatasetListResult> {
  try {
    const proc = spawn({
      cmd: [
        "python",
        "-c",
        `
import json
from huggingface_hub import HfApi
api = HfApi()
datasets = api.list_datasets(search="${query}", limit=20)
results = []
for ds in datasets:
  if hasattr(ds, 'id'):
    results.append({"repo_id": ds.id, "likes": getattr(ds, 'likes', 0)})
print(json.dumps(results))
`,
      ],
      stdout: "pipe",
      stderr: "pipe",
    });

    const output = await new Response(proc.stdout).text();
    await proc.exited;

    const results = JSON.parse(output) as Array<{ repo_id: string; likes: number }>;

    return {
      datasets: results.map((r) => ({
        repoId: r.repo_id,
        fps: 0,
        numEpisodes: 0,
        numFrames: 0,
        features: [],
      })),
    };
  } catch (error) {
    return {
      datasets: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Push a local dataset to HuggingFace Hub
 */
export async function pushDatasetToHub(
  localRepoId: string,
  hubRepoId: string,
  onOutput?: (line: string) => void
): Promise<{ success: boolean; error?: string }> {
  try {
    const proc = spawn({
      cmd: [
        "python",
        "-c",
        `
from lerobot.datasets.lerobot_dataset import LeRobotDataset
dataset = LeRobotDataset("${localRepoId}")
dataset.push_to_hub(repo_id="${hubRepoId}")
print("Successfully pushed to Hub")
`,
      ],
      stdout: "pipe",
      stderr: "pipe",
    });

    const decoder = new TextDecoder();
    const reader = proc.stdout.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value);
      text.split("\n").filter((l) => l.trim()).forEach((line) => onOutput?.(line));
    }

    const exitCode = await proc.exited;

    return {
      success: exitCode === 0,
      error: exitCode !== 0 ? `Push failed with exit code ${exitCode}` : undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Create a new dataset
 */
export async function createDataset(config: {
  repoId: string;
  fps: number;
  robotType: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const proc = spawn({
      cmd: [
        "python",
        "-c",
        `
from lerobot.datasets.lerobot_dataset import LeRobotDataset
dataset = LeRobotDataset.create(
    repo_id="${config.repoId}",
    fps=${config.fps},
    robot_type="${config.robotType}",
    use_videos=True
)
print(f"Created dataset at {dataset.root}")
`,
      ],
      stdout: "pipe",
      stderr: "pipe",
    });

    await proc.exited;
    const exitCode = await proc.exited;

    return {
      success: exitCode === 0,
      error: exitCode !== 0 ? "Failed to create dataset" : undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
