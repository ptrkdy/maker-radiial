import React from "react";
import { Box, Text } from "ink";

interface ProgressBarProps {
  value: number; // 0-100
  width?: number;
  showPercentage?: boolean;
  label?: string;
  color?: string;
  backgroundColor?: string;
}

export function ProgressBar({
  value,
  width = 30,
  showPercentage = true,
  label,
  color = "cyan",
  backgroundColor = "gray",
}: ProgressBarProps) {
  const clampedValue = Math.max(0, Math.min(100, value));
  const filledWidth = Math.round((clampedValue / 100) * width);
  const emptyWidth = width - filledWidth;

  const filled = "█".repeat(filledWidth);
  const empty = "░".repeat(emptyWidth);

  return (
    <Box gap={1}>
      {label && <Text color="white">{label}</Text>}
      <Text>
        <Text color={color}>{filled}</Text>
        <Text color={backgroundColor}>{empty}</Text>
      </Text>
      {showPercentage && (
        <Text color="gray">{Math.round(clampedValue)}%</Text>
      )}
    </Box>
  );
}
