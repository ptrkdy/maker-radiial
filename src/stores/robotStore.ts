import { create } from "zustand";
import type { RobotConnection, TeleopConnection, PortInfo } from "../lerobot/types.js";

interface RobotState {
  // Connection state
  robot: RobotConnection | null;
  teleop: TeleopConnection | null;

  // Available ports
  ports: PortInfo[];

  // Active teleoperation session
  teleopSessionActive: boolean;

  // Loading states
  isConnectingRobot: boolean;
  isConnectingTeleop: boolean;
  isScanning: boolean;

  // Error state
  error: string | null;

  // Actions
  setRobot: (robot: RobotConnection | null) => void;
  setTeleop: (teleop: TeleopConnection | null) => void;
  setPorts: (ports: PortInfo[]) => void;
  setTeleopSessionActive: (active: boolean) => void;
  setIsConnectingRobot: (loading: boolean) => void;
  setIsConnectingTeleop: (loading: boolean) => void;
  setIsScanning: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useRobotStore = create<RobotState>((set) => ({
  robot: null,
  teleop: null,
  ports: [],
  teleopSessionActive: false,
  isConnectingRobot: false,
  isConnectingTeleop: false,
  isScanning: false,
  error: null,

  setRobot: (robot) => set({ robot, error: null }),
  setTeleop: (teleop) => set({ teleop, error: null }),
  setPorts: (ports) => set({ ports }),
  setTeleopSessionActive: (active) => set({ teleopSessionActive: active }),
  setIsConnectingRobot: (loading) => set({ isConnectingRobot: loading }),
  setIsConnectingTeleop: (loading) => set({ isConnectingTeleop: loading }),
  setIsScanning: (loading) => set({ isScanning: loading }),
  setError: (error) => set({ error }),
  reset: () =>
    set({
      robot: null,
      teleop: null,
      teleopSessionActive: false,
      isConnectingRobot: false,
      isConnectingTeleop: false,
      error: null,
    }),
}));
