import { create } from "zustand";

export type ViewType = "command" | "main" | "robot" | "recording" | "dataset" | "telemetry";

interface UIState {
  currentView: ViewType;
  viewHistory: ViewType[];
  breadcrumb: string[];
  inMenuMode: boolean;

  // Actions
  navigateTo: (view: ViewType) => void;
  goBack: () => void;
  setBreadcrumb: (path: string[]) => void;
  enterMenuMode: () => void;
  exitMenuMode: () => void;
}

const viewLabels: Record<ViewType, string> = {
  command: "Command Line",
  main: "Main Menu",
  robot: "Robot",
  recording: "Recording",
  dataset: "Datasets",
  telemetry: "Telemetry",
};

export const useUIStore = create<UIState>((set, get) => ({
  currentView: "command",
  viewHistory: [],
  breadcrumb: ["Command Line"],
  inMenuMode: false,

  navigateTo: (view) => {
    const { currentView, viewHistory } = get();
    set({
      currentView: view,
      viewHistory: [...viewHistory, currentView],
      breadcrumb: view === "main" ? ["Main Menu"] : ["Main Menu", viewLabels[view]],
    });
  },

  goBack: () => {
    const { viewHistory, inMenuMode } = get();

    // If at main menu and pressing back, exit menu mode to command line
    if (viewHistory.length === 0 && inMenuMode) {
      set({
        currentView: "command",
        inMenuMode: false,
        breadcrumb: ["Command Line"],
      });
      return;
    }

    if (viewHistory.length === 0) return;

    const previousView = viewHistory[viewHistory.length - 1];
    set({
      currentView: previousView,
      viewHistory: viewHistory.slice(0, -1),
      breadcrumb:
        previousView === "main"
          ? ["Main Menu"]
          : previousView === "command"
          ? ["Command Line"]
          : ["Main Menu", viewLabels[previousView]],
    });
  },

  setBreadcrumb: (path) => set({ breadcrumb: path }),

  enterMenuMode: () => set({
    currentView: "main",
    viewHistory: [],
    breadcrumb: ["Main Menu"],
    inMenuMode: true,
  }),

  exitMenuMode: () => set({
    currentView: "command",
    viewHistory: [],
    breadcrumb: ["Command Line"],
    inMenuMode: false,
  }),
}));
