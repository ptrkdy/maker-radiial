import React from "react";
import { Box, Text } from "ink";
import { theme } from "../theme.js";

// Combined [R/] MAKER ASCII art - single row layout with aligned text
const BANNER_ASCII = `
 ╭──────────╮
 │ ██████╗  │  ███╗   ███╗ █████╗ ██╗  ██╗███████╗██████╗
 │ ██╔══██╗ │  ████╗ ████║██╔══██╗██║ ██╔╝██╔════╝██╔══██╗
 │ ██████╔╝ │  ██╔████╔██║███████║█████╔╝ █████╗  ██████╔╝
 │ ██╔══██╗ │  ██║╚██╔╝██║██╔══██║██╔═██╗ ██╔══╝  ██╔══██╗
 │ ██║  ██║ │  ██║ ╚═╝ ██║██║  ██║██║  ██╗███████╗██║  ██║
 │ ╚═╝  ╚═╝ │  ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝
 ╰──────────╯`;

interface WelcomeProps {
  compact?: boolean;
}

export function Welcome({ compact = false }: WelcomeProps) {
  if (compact) {
    return (
      <Box flexDirection="column" alignItems="center">
        <Text bold color={theme.accent}>
          [R/] MAKER
        </Text>
        <Text color="gray">by Radiial</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" alignItems="center">
      <Text color={theme.accent}>{BANNER_ASCII}</Text>
      <Text color="gray">by Radiial</Text>
      <Box marginTop={1}>
        <Text color="white">
          LeRobot CLI for demonstration recording and robot control
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text color="gray">
          Type <Text color={theme.accent}>/help</Text> for commands or{" "}
          <Text color={theme.accent}>/menu</Text> to open the interactive menu
        </Text>
      </Box>
    </Box>
  );
}
