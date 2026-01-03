import React from "react";
import SelectInput from "ink-select-input";
import { Box, Text, useStdout } from "ink";

export interface MenuItem {
  label: string;
  value: string;
  disabled?: boolean;
}

interface MenuProps {
  items: MenuItem[];
  onSelect: (item: MenuItem) => void;
  title?: string;
  maxWidth?: number;
}

export function Menu({ items, onSelect, title, maxWidth }: MenuProps) {
  const { stdout } = useStdout();
  const terminalWidth = stdout?.columns || 80;
  const effectiveMaxWidth = maxWidth ?? terminalWidth - 10;

  const handleSelect = (item: { label: string; value: string }) => {
    const menuItem = items.find((i) => i.value === item.value);
    if (menuItem && !menuItem.disabled) {
      onSelect(menuItem);
    }
  };

  const truncate = (str: string, max: number): string => {
    if (str.length <= max) return str;
    return str.slice(0, max - 3) + "...";
  };

  const formattedItems = items.map((item) => ({
    label: truncate(
      item.disabled ? `${item.label} (unavailable)` : item.label,
      effectiveMaxWidth - 4
    ),
    value: item.value,
  }));

  return (
    <Box flexDirection="column" overflow="hidden">
      {title && (
        <Box marginBottom={1}>
          <Text bold color="cyan" wrap="truncate">
            {title}
          </Text>
        </Box>
      )}
      <SelectInput
        items={formattedItems}
        onSelect={handleSelect}
        indicatorComponent={({ isSelected }) => (
          <Text color={isSelected ? "cyan" : "gray"}>
            {isSelected ? "> " : "  "}
          </Text>
        )}
        itemComponent={({ isSelected, label }) => (
          <Text color={isSelected ? "white" : "gray"} wrap="truncate">
            {label}
          </Text>
        )}
      />
    </Box>
  );
}
