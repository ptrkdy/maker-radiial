import { create } from "zustand";
import type { RecordingConfig } from "../lerobot/types.js";

export type RecordingPhase = "idle" | "pre-recording" | "recording" | "post-recording";

interface RecordingState {
  // Recording status
  phase: RecordingPhase;
  currentEpisode: number;
  totalEpisodes: number;
  elapsedTime: number;
  remainingTime: number;

  // Configuration
  config: RecordingConfig | null;

  // Process state
  isRunning: boolean;
  output: string[];

  // Error state
  error: string | null;

  // Actions
  setPhase: (phase: RecordingPhase) => void;
  setProgress: (current: number, total: number) => void;
  setTiming: (elapsed: number, remaining: number) => void;
  setConfig: (config: RecordingConfig) => void;
  setIsRunning: (running: boolean) => void;
  appendOutput: (line: string) => void;
  clearOutput: () => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useRecordingStore = create<RecordingState>((set) => ({
  phase: "idle",
  currentEpisode: 0,
  totalEpisodes: 0,
  elapsedTime: 0,
  remainingTime: 0,
  config: null,
  isRunning: false,
  output: [],
  error: null,

  setPhase: (phase) => set({ phase }),
  setProgress: (current, total) =>
    set({ currentEpisode: current, totalEpisodes: total }),
  setTiming: (elapsed, remaining) =>
    set({ elapsedTime: elapsed, remainingTime: remaining }),
  setConfig: (config) => set({ config }),
  setIsRunning: (running) => set({ isRunning: running }),
  appendOutput: (line) =>
    set((state) => ({ output: [...state.output.slice(-100), line] })),
  clearOutput: () => set({ output: [] }),
  setError: (error) => set({ error }),
  reset: () =>
    set({
      phase: "idle",
      currentEpisode: 0,
      totalEpisodes: 0,
      elapsedTime: 0,
      remainingTime: 0,
      isRunning: false,
      output: [],
      error: null,
    }),
}));
