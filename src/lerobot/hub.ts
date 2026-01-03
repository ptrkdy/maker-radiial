import { spawn } from "bun";

export interface HubSearchResult {
  repoId: string;
  likes: number;
  downloads?: number;
  description?: string;
}

/**
 * Search for datasets on HuggingFace Hub
 */
export async function searchHub(
  query: string,
  type: "dataset" | "model" = "dataset",
  limit = 20
): Promise<{ results: HubSearchResult[]; error?: string }> {
  try {
    const searchType = type === "dataset" ? "list_datasets" : "list_models";
    const proc = spawn({
      cmd: [
        "python",
        "-c",
        `
import json
from huggingface_hub import HfApi

api = HfApi()
results = []

try:
    items = api.${searchType}(search="${query}", limit=${limit})
    for item in items:
        results.append({
            "repo_id": item.id,
            "likes": getattr(item, "likes", 0),
            "downloads": getattr(item, "downloads", 0),
            "description": getattr(item, "description", None)
        })
except Exception as e:
    print(json.dumps({"error": str(e)}))
    exit(1)

print(json.dumps({"results": results}))
`,
      ],
      stdout: "pipe",
      stderr: "pipe",
    });

    const output = await new Response(proc.stdout).text();
    await proc.exited;

    const data = JSON.parse(output);

    if (data.error) {
      return { results: [], error: data.error };
    }

    return {
      results: data.results.map((r: Record<string, unknown>) => ({
        repoId: r.repo_id as string,
        likes: r.likes as number,
        downloads: r.downloads as number,
        description: r.description as string | undefined,
      })),
    };
  } catch (error) {
    return {
      results: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Download a dataset from HuggingFace Hub
 */
export async function downloadDataset(
  repoId: string,
  onOutput?: (line: string) => void
): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    const proc = spawn({
      cmd: [
        "python",
        "-c",
        `
import json
from lerobot.datasets.lerobot_dataset import LeRobotDataset

try:
    dataset = LeRobotDataset("${repoId}")
    print(json.dumps({"success": True, "path": str(dataset.root)}))
except Exception as e:
    print(json.dumps({"success": False, "error": str(e)}))
`,
      ],
      stdout: "pipe",
      stderr: "pipe",
    });

    const decoder = new TextDecoder();
    const reader = proc.stdout.getReader();
    let output = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value);
      output += text;
      text.split("\n").filter((l) => l.trim()).forEach((line) => onOutput?.(line));
    }

    await proc.exited;

    // Get the last line which should be our JSON result
    const lines = output.trim().split("\n");
    const resultLine = lines[lines.length - 1];
    const data = JSON.parse(resultLine);

    return {
      success: data.success,
      path: data.path,
      error: data.error,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check if user is logged in to HuggingFace Hub
 */
export async function checkHubAuth(): Promise<{
  authenticated: boolean;
  username?: string;
  error?: string;
}> {
  try {
    const proc = spawn({
      cmd: [
        "python",
        "-c",
        `
import json
from huggingface_hub import HfApi

try:
    api = HfApi()
    user = api.whoami()
    print(json.dumps({"authenticated": True, "username": user.get("name", user.get("fullname", "unknown"))}))
except Exception as e:
    print(json.dumps({"authenticated": False, "error": str(e)}))
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
      authenticated: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
