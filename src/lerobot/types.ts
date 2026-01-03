// LeRobot types for CLI integration

export type ConnectionState = "disconnected" | "connecting" | "connected" | "error";

export interface RobotConnection {
  id: string;
  robotType: string;
  port: string;
  state: ConnectionState;
  cameras: Record<string, CameraConfig>;
  error?: string;
}

export interface TeleopConnection {
  id: string;
  deviceType: string;
  port: string;
  state: ConnectionState;
  error?: string;
}

export interface DatasetSession {
  id: string;
  repoId: string;
  isRecording: boolean;
  episodeCount: number;
}

export interface TeleopSession {
  robotId: string;
  teleopId: string;
  isActive: boolean;
}

export interface ReplaySession {
  datasetId: string;
  episode: number;
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
}

export interface CameraConfig {
  type: "opencv" | "intelrealsense";
  indexOrPath: number | string;
  width: number;
  height: number;
  fps: number;
}

export interface PortInfo {
  device: string;
  description: string;
  hwid: string;
  isLikelyRobot: boolean;
}

export interface RobotObservation {
  [key: string]: number[] | number;
}

export interface EnvironmentStatus {
  lerobotInstalled: boolean;
  lerobotVersion?: string;
  torchAvailable: boolean;
  cudaAvailable: boolean;
  rerunAvailable: boolean;
  connectedRobots: number;
  connectedTeleops: number;
  activeDatasets: number;
}

export interface DatasetInfo {
  repoId: string;
  fps: number;
  numEpisodes: number;
  numFrames: number;
  robotType?: string;
  features: string[];
}

// Supported robot types
export const ROBOT_TYPES = [
  { id: "so100", name: "SO-100", description: "5 DoF follower arm" },
  { id: "so100_follower", name: "SO-100 Follower", description: "5 DoF follower arm (explicit)" },
  { id: "so101", name: "SO-101", description: "6 DoF follower arm" },
  { id: "so101_follower", name: "SO-101 Follower", description: "6 DoF follower arm (explicit)" },
  { id: "koch", name: "Koch v1.1", description: "Koch follower arm" },
  { id: "koch_follower", name: "Koch Follower", description: "Koch follower arm (explicit)" },
  { id: "moss", name: "Moss", description: "Moss follower arm" },
  { id: "lekiwi", name: "LeKiwi", description: "Mobile robot" },
  { id: "uj201_follower", name: "UJ201 Follower", description: "UJ201 follower arm" },
] as const;

// Supported teleop device types
export const TELEOP_TYPES = [
  { id: "so100_leader", name: "SO-100 Leader", description: "SO-100 leader arm", requiresPort: true },
  { id: "so101_leader", name: "SO-101 Leader", description: "SO-101 leader arm", requiresPort: true },
  { id: "koch_leader", name: "Koch Leader", description: "Koch leader arm", requiresPort: true },
  { id: "uj201_leader", name: "UJ201 Leader", description: "UJ201 leader arm", requiresPort: true },
  { id: "gamepad", name: "Gamepad", description: "Xbox/PS4 controller", requiresPort: false },
  { id: "keyboard", name: "Keyboard", description: "Keyboard control", requiresPort: false },
] as const;

export type RobotType = (typeof ROBOT_TYPES)[number]["id"];
export type TeleopType = (typeof TELEOP_TYPES)[number]["id"];

// Telemetry types
export interface TimingStats {
  enabled: boolean;
  targetFps?: number;
  targetLoopMs?: number;
  actualFps?: number;
  loop?: {
    name: string;
    count: number;
    lastMs: number;
    avgMs: number;
    minMs: number;
    maxMs: number;
    stdMs: number;
    p95Ms: number;
  };
  operations?: Record<
    string,
    {
      name: string;
      count: number;
      lastMs: number;
      avgMs: number;
      minMs: number;
      maxMs: number;
      stdMs: number;
      p95Ms: number;
    }
  >;
  overheadMs?: number;
  jitter?: {
    stdMs: number;
    maxDeviationMs: number;
  };
  deadline?: {
    totalLoops: number;
    misses: number;
    missRate: number;
  };
}

export interface CameraTelemetry {
  connected: boolean;
  width?: number;
  height?: number;
  fps?: number;
  framesCaptured?: number;
  framesDropped?: number;
  dropRate?: number;
  lastCaptureMs?: number;
  avgCaptureMs?: number;
  frameAgeMs?: number;
}

export interface TelemetrySnapshot {
  timestamp: number;
  robotConnected: boolean;
  robotType?: string;
  robotPort?: string;
  joints?: Record<string, number>;
  jointsError?: string;
  readTimeMs?: number;
  cameras?: Record<string, CameraTelemetry>;
  camerasError?: string;
  timing?: {
    enabled: boolean;
    fps?: number;
    loopMs?: number;
    targetMs?: number;
    deadlineMissRate?: number;
    slowestOperations?: Array<{
      name: string;
      avgMs: number;
      lastMs: number;
    }>;
  };
  timingError?: string;
  teleopConnected: boolean;
  teleopType?: string;
  teleopPort?: string;
  recording?: {
    active: boolean;
    repoId?: string;
    episodeCount?: number;
    numFrames?: number;
  };
}

// Recording configuration
export interface RecordingConfig {
  repoId: string;
  robotType: RobotType;
  robotPort: string;
  teleopType?: TeleopType;
  teleopPort?: string;
  fps: number;
  episodeDurationS: number;
  resetTimeS: number;
  numEpisodes: number;
  taskDescription: string;
  cameras: CameraConfig[];
  pushToHub: boolean;
  resume: boolean;
}
