import { create } from "zustand";
import type { DatasetInfo } from "../lerobot/types.js";

interface DatasetState {
  // Available datasets
  datasets: DatasetInfo[];

  // Active dataset for recording
  activeDataset: DatasetInfo | null;

  // Loading states
  isLoading: boolean;
  isPushing: boolean;

  // Error state
  error: string | null;

  // Actions
  setDatasets: (datasets: DatasetInfo[]) => void;
  setActiveDataset: (dataset: DatasetInfo | null) => void;
  addDataset: (dataset: DatasetInfo) => void;
  removeDataset: (repoId: string) => void;
  setIsLoading: (loading: boolean) => void;
  setIsPushing: (pushing: boolean) => void;
  setError: (error: string | null) => void;
}

export const useDatasetStore = create<DatasetState>((set) => ({
  datasets: [],
  activeDataset: null,
  isLoading: false,
  isPushing: false,
  error: null,

  setDatasets: (datasets) => set({ datasets, error: null }),
  setActiveDataset: (dataset) => set({ activeDataset: dataset }),
  addDataset: (dataset) =>
    set((state) => ({ datasets: [...state.datasets, dataset] })),
  removeDataset: (repoId) =>
    set((state) => ({
      datasets: state.datasets.filter((d) => d.repoId !== repoId),
      activeDataset:
        state.activeDataset?.repoId === repoId ? null : state.activeDataset,
    })),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setIsPushing: (pushing) => set({ isPushing: pushing }),
  setError: (error) => set({ error }),
}));
