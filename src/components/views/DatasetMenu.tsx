import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import TextInput from "ink-text-input";
import { Menu, MenuItem } from "../common/Menu.js";
import { Panel } from "../common/Panel.js";
import { Table } from "../common/Table.js";
import { useToast } from "../common/Toast.js";
import { useUIStore } from "../../stores/uiStore.js";
import { useDatasetStore } from "../../stores/datasetStore.js";
import {
  listLocalDatasets,
  searchHubDatasets,
  pushDatasetToHub,
  downloadDataset,
  type DatasetInfo,
} from "../../lerobot/index.js";

type SubView = "menu" | "list" | "search" | "push" | "download";

export function DatasetMenu() {
  const { goBack } = useUIStore();
  const {
    datasets,
    activeDataset,
    isLoading,
    isPushing,
    setDatasets,
    setActiveDataset,
    setIsLoading,
    setIsPushing,
  } = useDatasetStore();
  const { addToast } = useToast();

  const [subView, setSubView] = useState<SubView>("menu");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<DatasetInfo[]>([]);
  const [hubRepoId, setHubRepoId] = useState("");
  const [selectedDataset, setSelectedDataset] = useState<DatasetInfo | null>(null);

  // Load local datasets on mount
  useEffect(() => {
    loadLocalDatasets();
  }, []);

  const loadLocalDatasets = async () => {
    setIsLoading(true);
    const result = await listLocalDatasets();
    setDatasets(result.datasets);
    setIsLoading(false);

    if (result.error) {
      addToast("error", result.error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    const result = await searchHubDatasets(searchQuery);
    setSearchResults(result.datasets);
    setIsLoading(false);

    if (result.error) {
      addToast("error", result.error);
    }
  };

  const handlePushToHub = async () => {
    if (!selectedDataset || !hubRepoId) return;

    setIsPushing(true);
    const result = await pushDatasetToHub(
      selectedDataset.repoId,
      hubRepoId,
      (line) => {
        // Could show progress here
      }
    );
    setIsPushing(false);

    if (result.success) {
      addToast("success", `Pushed to ${hubRepoId}`);
      setSubView("menu");
    } else {
      addToast("error", result.error || "Failed to push");
    }
  };

  const handleDownload = async (repoId: string) => {
    setIsLoading(true);
    addToast("info", `Downloading ${repoId}...`);

    const result = await downloadDataset(repoId);
    setIsLoading(false);

    if (result.success) {
      addToast("success", `Downloaded to ${result.path}`);
      loadLocalDatasets(); // Refresh list
      setSubView("menu");
    } else {
      addToast("error", result.error || "Failed to download");
    }
  };

  const menuItems: MenuItem[] = [
    { label: "List Local Datasets", value: "list" },
    { label: "Search Hub", value: "search" },
    { label: "Push to Hub", value: "push", disabled: datasets.length === 0 },
    { label: "Refresh", value: "refresh" },
    { label: "Back", value: "back" },
  ];

  const handleMenuSelect = (item: MenuItem) => {
    switch (item.value) {
      case "list":
        setSubView("list");
        break;
      case "search":
        setSubView("search");
        break;
      case "push":
        setSubView("push");
        break;
      case "refresh":
        loadLocalDatasets();
        break;
      case "back":
        goBack();
        break;
    }
  };

  if (isLoading && subView === "menu") {
    return (
      <Panel title="Datasets">
        <Box gap={2}>
          <Spinner type="dots" />
          <Text>Loading datasets...</Text>
        </Box>
      </Panel>
    );
  }

  if (subView === "list") {
    return (
      <Box flexDirection="column" gap={1}>
        <Panel title="Local Datasets">
          {datasets.length === 0 ? (
            <Text color="gray">No local datasets found</Text>
          ) : (
            <Table
              data={datasets}
              columns={[
                { header: "Repository ID", key: "repoId", width: 30 },
                { header: "Episodes", key: "numEpisodes", width: 10, align: "right" },
                { header: "FPS", key: "fps", width: 6, align: "right" },
                { header: "Robot", key: (d) => d.robotType || "unknown", width: 12 },
              ]}
            />
          )}
        </Panel>

        <Panel title="Actions">
          <Menu
            items={[
              ...datasets.map((d) => ({
                label: `Select: ${d.repoId}`,
                value: d.repoId,
              })),
              { label: "Back", value: "back" },
            ]}
            onSelect={(item) => {
              if (item.value === "back") {
                setSubView("menu");
              } else {
                const dataset = datasets.find((d) => d.repoId === item.value);
                if (dataset) {
                  setSelectedDataset(dataset);
                  setActiveDataset(dataset);
                  addToast("success", `Selected ${dataset.repoId}`);
                }
              }
            }}
          />
        </Panel>
      </Box>
    );
  }

  if (subView === "search") {
    return (
      <Box flexDirection="column" gap={1}>
        <Panel title="Search HuggingFace Hub">
          <Box flexDirection="column" gap={1}>
            <Box gap={1}>
              <Text>Query:</Text>
              <TextInput
                value={searchQuery}
                onChange={setSearchQuery}
                onSubmit={handleSearch}
                placeholder="e.g., lerobot"
              />
            </Box>
            <Text color="gray">[Enter] Search | [Esc] Back</Text>
          </Box>
        </Panel>

        {searchResults.length > 0 && (
          <Panel title="Search Results">
            <Menu
              items={[
                ...searchResults.slice(0, 10).map((d) => ({
                  label: d.repoId,
                  value: d.repoId,
                })),
                { label: "Back", value: "back" },
              ]}
              onSelect={(item) => {
                if (item.value === "back") {
                  setSubView("menu");
                } else {
                  handleDownload(item.value);
                }
              }}
            />
          </Panel>
        )}

        {searchResults.length === 0 && searchQuery && !isLoading && (
          <Panel title="Results">
            <Text color="gray">No results found</Text>
          </Panel>
        )}

        {isLoading && (
          <Box gap={2}>
            <Spinner type="dots" />
            <Text>Searching...</Text>
          </Box>
        )}
      </Box>
    );
  }

  if (subView === "push") {
    return (
      <Box flexDirection="column" gap={1}>
        <Panel title="Push Dataset to Hub">
          <Box flexDirection="column" gap={1}>
            <Box gap={1}>
              <Text>Local dataset:</Text>
            </Box>
            <Menu
              items={datasets.map((d) => ({
                label: d.repoId,
                value: d.repoId,
              }))}
              onSelect={(item) => {
                const dataset = datasets.find((d) => d.repoId === item.value);
                if (dataset) {
                  setSelectedDataset(dataset);
                }
              }}
            />

            {selectedDataset && (
              <>
                <Box gap={1} marginTop={1}>
                  <Text>Hub repository ID:</Text>
                  <TextInput
                    value={hubRepoId}
                    onChange={setHubRepoId}
                    placeholder="username/dataset-name"
                  />
                </Box>

                <Box marginTop={1}>
                  <Menu
                    items={[
                      { label: "Push", value: "push" },
                      { label: "Cancel", value: "cancel" },
                    ]}
                    onSelect={(item) => {
                      if (item.value === "push") {
                        handlePushToHub();
                      } else {
                        setSubView("menu");
                      }
                    }}
                  />
                </Box>
              </>
            )}
          </Box>
        </Panel>

        {isPushing && (
          <Box gap={2}>
            <Spinner type="dots" />
            <Text>Pushing to Hub...</Text>
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box flexDirection="column" gap={1}>
      <Panel title="Datasets Overview">
        <Box flexDirection="column" gap={1}>
          <Box gap={2}>
            <Text color="gray">Local datasets:</Text>
            <Text>{datasets.length}</Text>
          </Box>
          {activeDataset && (
            <Box gap={2}>
              <Text color="gray">Active:</Text>
              <Text color="cyan">{activeDataset.repoId}</Text>
            </Box>
          )}
        </Box>
      </Panel>

      <Panel title="Actions">
        <Menu items={menuItems} onSelect={handleMenuSelect} />
      </Panel>
    </Box>
  );
}
