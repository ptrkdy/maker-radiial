import type { CommandDefinition } from "./types.js";
import {
  listLocalDatasets,
  searchHubDatasets,
  pushDatasetToHub,
  downloadDataset,
} from "../lerobot/index.js";

export const datasetsCommand: CommandDefinition = {
  name: "datasets",
  aliases: ["ds", "ls-datasets"],
  description: "List local datasets",
  usage: "/datasets",
  execute: async () => {
    const result = await listLocalDatasets();

    if (result.error) {
      return {
        success: false,
        error: result.error,
      };
    }

    if (result.datasets.length === 0) {
      return {
        success: true,
        output: ["No local datasets found", "", "Use /dataset-search to find datasets on Hub"],
      };
    }

    const output = [
      "Local Datasets:",
      "",
      ...result.datasets.map((d) => {
        return `  ${d.repoId} (${d.numEpisodes} episodes, ${d.fps} FPS)`;
      }),
    ];

    return { success: true, output };
  },
};

export const datasetSearchCommand: CommandDefinition = {
  name: "dataset-search",
  aliases: ["ds-search", "hub-search"],
  description: "Search for datasets on HuggingFace Hub",
  usage: "/dataset-search <query>",
  examples: ["/dataset-search lerobot", "/dataset-search aloha"],
  args: [
    {
      name: "query",
      description: "Search query",
      required: true,
    },
  ],
  execute: async (args, context) => {
    if (args.length < 1) {
      return {
        success: false,
        error: "Usage: /dataset-search <query>",
      };
    }

    const query = args.join(" ");
    context.appendOutput(`Searching Hub for "${query}"...`);

    const result = await searchHubDatasets(query);

    if (result.error) {
      return {
        success: false,
        error: result.error,
      };
    }

    if (result.datasets.length === 0) {
      return {
        success: true,
        output: [`No datasets found for "${query}"`],
      };
    }

    const output = [
      `Search Results for "${query}":`,
      "",
      ...result.datasets.slice(0, 10).map((d) => `  ${d.repoId}`),
      "",
      "Use /dataset-download <repo-id> to download a dataset",
    ];

    return { success: true, output };
  },
};

export const datasetDownloadCommand: CommandDefinition = {
  name: "dataset-download",
  aliases: ["ds-download", "hub-download"],
  description: "Download a dataset from HuggingFace Hub",
  usage: "/dataset-download <repo-id>",
  examples: ["/dataset-download lerobot/aloha_sim_insertion_human"],
  args: [
    {
      name: "repo_id",
      description: "HuggingFace repository ID",
      required: true,
    },
  ],
  execute: async (args, context) => {
    if (args.length < 1) {
      return {
        success: false,
        error: "Usage: /dataset-download <repo-id>",
      };
    }

    const repoId = args[0];
    context.appendOutput(`Downloading ${repoId}...`);
    context.toast("info", `Downloading ${repoId}...`);

    const result = await downloadDataset(repoId, (line) => {
      context.appendOutput(line);
    });

    if (result.success) {
      context.toast("success", `Downloaded ${repoId}`);
      return {
        success: true,
        output: [`Dataset downloaded to ${result.path}`],
      };
    }

    return {
      success: false,
      error: result.error || "Failed to download dataset",
    };
  },
};

export const datasetPushCommand: CommandDefinition = {
  name: "dataset-push",
  aliases: ["ds-push", "hub-push"],
  description: "Push a local dataset to HuggingFace Hub",
  usage: "/dataset-push <local-repo-id> <hub-repo-id>",
  examples: ["/dataset-push local/my-dataset username/my-dataset"],
  args: [
    {
      name: "local_repo_id",
      description: "Local dataset repository ID",
      required: true,
    },
    {
      name: "hub_repo_id",
      description: "Target HuggingFace repository ID",
      required: true,
    },
  ],
  execute: async (args, context) => {
    if (args.length < 2) {
      return {
        success: false,
        error: "Usage: /dataset-push <local-repo-id> <hub-repo-id>",
      };
    }

    const [localRepoId, hubRepoId] = args;
    context.appendOutput(`Pushing ${localRepoId} to ${hubRepoId}...`);
    context.toast("info", `Pushing to Hub...`);

    const result = await pushDatasetToHub(localRepoId, hubRepoId, (line) => {
      context.appendOutput(line);
    });

    if (result.success) {
      context.toast("success", `Pushed to ${hubRepoId}`);
      return {
        success: true,
        output: [`Successfully pushed ${localRepoId} to ${hubRepoId}`],
      };
    }

    return {
      success: false,
      error: result.error || "Failed to push dataset",
    };
  },
};
