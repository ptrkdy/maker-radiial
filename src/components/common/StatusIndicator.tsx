import React from "react";
import { Box, Text } from "ink";
import figures from "figures";

export type StatusType = "connected" | "disconnected" | "connecting" | "error" | "recording" | "idle";

interface StatusIndicatorProps {
  status: StatusType;
  label?: string;
  showLabel?: boolean;
}

const statusConfig: Record<StatusType, { color: string; symbol: string; text: string }> = {
  connected: { color: "green", symbol: figures.circleFilled, text: "Connected" },
  disconnected: { color: "gray", symbol: figures.circle, text: "Disconnected" },
  connecting: { color: "yellow", symbol: figures.circleDotted, text: "Connecting" },
  error: { color: "red", symbol: figures.cross, text: "Error" },
  recording: { color: "red", symbol: figures.circleFilled, text: "Recording" },
  idle: { color: "gray", symbol: figures.circle, text: "Idle" },
};

export function StatusIndicator({ status, label, showLabel = true }: StatusIndicatorProps) {
  const config = statusConfig[status];

  return (
    <Box gap={1}>
      <Text color={config.color}>{config.symbol}</Text>
      {showLabel && <Text color={config.color}>{label || config.text}</Text>}
    </Box>
  );
}
