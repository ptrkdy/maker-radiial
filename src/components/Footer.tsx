import React from "react";
import { Box, Text, useStdout } from "ink";

export function Footer() {
  const { stdout } = useStdout();
  const width = stdout?.columns || 80;

  // Compact format for narrow terminals
  const isNarrow = width < 60;

  return (
    <Box
      flexDirection="row"
      justifyContent="center"
      paddingX={1}
      borderStyle="single"
      borderColor="gray"
      borderTop
      borderLeft={false}
      borderRight={false}
      borderBottom={false}
      width={width}
      overflow="hidden"
    >
      <Text color="gray">
        {isNarrow
          ? "[^Q]Quit [Esc]Back [Enter]Select"
          : "[Ctrl+Q] Quit  [Esc] Back  [Enter] Select  [↑↓] Navigate"}
      </Text>
    </Box>
  );
}
