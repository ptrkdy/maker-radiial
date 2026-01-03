// Slash command types

export interface CommandContext {
  // State setters for UI updates
  setOutput: (lines: string[]) => void;
  appendOutput: (line: string) => void;
  clearOutput: () => void;

  // Navigation
  navigateToMenu: () => void;

  // Toast notifications
  toast: (type: "info" | "success" | "warning" | "error", message: string) => void;

  // Robot state access
  getRobotState: () => {
    robot: { id: string; robotType: string; port: string } | null;
    teleop: { id: string; deviceType: string; port: string } | null;
    teleopSessionActive: boolean;
  };

  // Dataset state access
  getDatasetState: () => {
    datasets: Array<{ repoId: string; numEpisodes: number }>;
    activeDataset: { repoId: string } | null;
  };
}

export interface CommandResult {
  success: boolean;
  output?: string[];
  error?: string;
  // If true, the command output should be streamed line by line
  streaming?: boolean;
}

export interface CommandDefinition {
  name: string;
  aliases?: string[];
  description: string;
  usage: string;
  examples?: string[];
  args?: CommandArg[];
  execute: (args: string[], context: CommandContext) => Promise<CommandResult>;
}

export interface CommandArg {
  name: string;
  description: string;
  required?: boolean;
  type?: "string" | "number" | "boolean";
  choices?: string[];
}

// For MCP tool exposure
export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required?: string[];
  };
}
