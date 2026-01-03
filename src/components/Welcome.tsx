import React from "react";
import { Box, Text } from "ink";

// ASCII art for MAKER
const MAKER_ASCII = `
 ███╗   ███╗ █████╗ ██╗  ██╗███████╗██████╗
 ████╗ ████║██╔══██╗██║ ██╔╝██╔════╝██╔══██╗
 ██╔████╔██║███████║█████╔╝ █████╗  ██████╔╝
 ██║╚██╔╝██║██╔══██║██╔═██╗ ██╔══╝  ██╔══██╗
 ██║ ╚═╝ ██║██║  ██║██║  ██╗███████╗██║  ██║
 ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝
`;

interface WelcomeProps {
  compact?: boolean;
}

export function Welcome({ compact = false }: WelcomeProps) {
  if (compact) {
    return (
      <Box flexDirection="column" alignItems="center">
        <Text bold color="cyan">
          MAKER
        </Text>
        <Text color="gray">by Radiial</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" alignItems="center">
      <Text color="cyan">{MAKER_ASCII}</Text>
      <Text color="gray">by Radiial</Text>
      <Box marginTop={1}>
        <Text color="white">
          LeRobot CLI for demonstration recording and robot control
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text color="gray">
          Type <Text color="cyan">/help</Text> for commands or{" "}
          <Text color="cyan">/menu</Text> to open the interactive menu
        </Text>
      </Box>
    </Box>
  );
}
