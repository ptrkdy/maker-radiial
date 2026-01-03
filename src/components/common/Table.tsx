import React from "react";
import { Box, Text, useStdout } from "ink";

interface Column<T> {
  header: string;
  key: keyof T | ((row: T) => string | number);
  width?: number;
  align?: "left" | "right" | "center";
}

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  title?: string;
  maxWidth?: number;
}

export function Table<T extends object>({
  data,
  columns,
  title,
  maxWidth,
}: TableProps<T>) {
  const { stdout } = useStdout();
  const terminalWidth = stdout?.columns || 80;
  const effectiveMaxWidth = maxWidth ?? terminalWidth - 12;

  const getValue = (row: T, column: Column<T>): string => {
    if (typeof column.key === "function") {
      return String(column.key(row));
    }
    return String((row as Record<string, unknown>)[column.key as string] ?? "");
  };

  // Calculate column widths, respecting maxWidth constraint
  const getColumnWidths = (): number[] => {
    const baseWidths = columns.map((column) => {
      if (column.width) return column.width;
      const headerWidth = column.header.length;
      const maxDataWidth = Math.max(
        ...data.map((row) => getValue(row, column).length),
        0
      );
      return Math.max(headerWidth, maxDataWidth) + 2;
    });

    const totalWidth = baseWidths.reduce((a, b) => a + b, 0);

    // If total fits, use base widths
    if (totalWidth <= effectiveMaxWidth) {
      return baseWidths;
    }

    // Otherwise, scale down proportionally
    const scale = effectiveMaxWidth / totalWidth;
    return baseWidths.map((w) => Math.max(Math.floor(w * scale), 4));
  };

  const columnWidths = getColumnWidths();

  const truncateAndPad = (
    str: string,
    width: number,
    align: "left" | "right" | "center" = "left"
  ): string => {
    // Truncate if too long
    const truncated = str.length > width ? str.slice(0, width - 1) + "~" : str;
    const padding = width - truncated.length;

    if (padding <= 0) return truncated;

    switch (align) {
      case "right":
        return " ".repeat(padding) + truncated;
      case "center":
        const left = Math.floor(padding / 2);
        return " ".repeat(left) + truncated + " ".repeat(padding - left);
      default:
        return truncated + " ".repeat(padding);
    }
  };

  return (
    <Box flexDirection="column" overflow="hidden">
      {title && (
        <Box marginBottom={1}>
          <Text bold color="cyan" wrap="truncate">
            {title}
          </Text>
        </Box>
      )}
      {/* Header */}
      <Box>
        {columns.map((column, i) => (
          <Text key={i} bold color="white">
            {truncateAndPad(column.header, columnWidths[i], column.align)}
          </Text>
        ))}
      </Box>
      {/* Separator */}
      <Box>
        {columns.map((_, i) => (
          <Text key={i} color="gray">
            {"-".repeat(columnWidths[i])}
          </Text>
        ))}
      </Box>
      {/* Data rows */}
      {data.length === 0 ? (
        <Box>
          <Text color="gray" italic>
            No data
          </Text>
        </Box>
      ) : (
        data.map((row, rowIndex) => (
          <Box key={rowIndex}>
            {columns.map((column, colIndex) => (
              <Text key={colIndex} color="gray">
                {truncateAndPad(
                  getValue(row, column),
                  columnWidths[colIndex],
                  column.align
                )}
              </Text>
            ))}
          </Box>
        ))
      )}
    </Box>
  );
}
