import React from "react";
import { Box, Text, useStdout } from "ink";

interface PanelProps {
  title?: string;
  children: React.ReactNode;
  width?: number | string;
  height?: number | string;
  borderColor?: string;
  padding?: number;
}

export function Panel({
  title,
  children,
  width,
  height,
  borderColor = "gray",
  padding = 1,
}: PanelProps) {
  const { stdout } = useStdout();
  const terminalWidth = stdout?.columns || 80;

  // Default to full width minus some margin, constrained to terminal
  const effectiveWidth = width ?? Math.min(terminalWidth - 4, 100);

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={borderColor}
      width={effectiveWidth}
      height={height}
      paddingX={padding}
      overflow="hidden"
    >
      {title && (
        <Box marginBottom={1}>
          <Text bold color="cyan" wrap="truncate">
            {title}
          </Text>
        </Box>
      )}
      <Box flexDirection="column" overflow="hidden">
        {children}
      </Box>
    </Box>
  );
}
