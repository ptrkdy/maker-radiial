import React from "react";
import { Box, Text, useApp, useStdout } from "ink";
import SelectInput from "ink-select-input";
import { Welcome } from "../Welcome.js";
import { useUIStore } from "../../stores/uiStore.js";

export interface MenuItem {
  label: string;
  value: string;
}

export function MainMenu() {
  const { exit } = useApp();
  const { navigateTo, exitMenuMode } = useUIStore();
  const { stdout } = useStdout();
  const width = stdout?.columns || 80;
  const height = stdout?.rows || 24;

  const menuItems: MenuItem[] = [
    { label: "Robot", value: "robot" },
    { label: "Recording", value: "recording" },
    { label: "Datasets", value: "dataset" },
    { label: "Telemetry", value: "telemetry" },
    { label: "← Return to Splash", value: "return" },
    { label: "Exit", value: "exit" },
  ];

  const handleSelect = (item: { label: string; value: string }) => {
    if (item.value === "exit") {
      exit();
    } else if (item.value === "return") {
      exitMenuMode();
    } else {
      navigateTo(item.value as "robot" | "recording" | "dataset" | "telemetry");
    }
  };

  return (
    <Box flexDirection="column" width={width} height={height}>
      {/* Mini header */}
      <Box justifyContent="center" paddingY={0}>
        <Text color="gray" dimColor>
          <Text color="cyan">↑↓</Text> navigate •{" "}
          <Text color="cyan">Enter</Text> select •{" "}
          <Text color="cyan">Esc</Text> back
        </Text>
      </Box>

      {/* Welcome banner centered */}
      <Box flexDirection="column" alignItems="center" flexGrow={1} justifyContent="center">
        <Welcome />

        {/* Menu container - matches splash input style */}
        <Box
          flexDirection="column"
          marginTop={1}
          borderStyle="round"
          borderColor="cyan"
          width={54}
          paddingX={2}
          paddingY={1}
        >
          <Box marginBottom={1} justifyContent="center">
            <Text color="cyan" bold>
              Main Menu
            </Text>
          </Box>
          <SelectInput
            items={menuItems}
            onSelect={handleSelect}
            indicatorComponent={({ isSelected }) => (
              <Text color={isSelected ? "cyan" : "gray"}>
                {isSelected ? "❯ " : "  "}
              </Text>
            )}
            itemComponent={({ isSelected, label }) => (
              <Text color={isSelected ? "white" : "gray"} bold={isSelected}>
                {label}
              </Text>
            )}
          />
        </Box>
      </Box>
    </Box>
  );
}
