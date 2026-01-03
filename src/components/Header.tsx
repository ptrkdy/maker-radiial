import React from "react";
import { Box, Text, useStdout } from "ink";
import { StatusIndicator, StatusType } from "./common/StatusIndicator.js";
import { useRobotStore } from "../stores/robotStore.js";
import { useUIStore } from "../stores/uiStore.js";

export function Header() {
  const { robot, teleop } = useRobotStore();
  const { breadcrumb } = useUIStore();
  const { stdout } = useStdout();
  const width = stdout?.columns || 80;

  const robotStatus: StatusType = robot ? "connected" : "disconnected";
  const teleopStatus: StatusType = teleop ? "connected" : "disconnected";

  // Truncate breadcrumb if needed
  const breadcrumbText = breadcrumb.join(" > ");
  const maxBreadcrumbLen = Math.max(20, width - 50);
  const displayBreadcrumb =
    breadcrumbText.length > maxBreadcrumbLen
      ? breadcrumbText.slice(0, maxBreadcrumbLen - 3) + "..."
      : breadcrumbText;

  return (
    <Box
      flexDirection="row"
      justifyContent="space-between"
      paddingX={1}
      borderStyle="single"
      borderColor="gray"
      borderBottom
      borderLeft={false}
      borderRight={false}
      borderTop={false}
      width={width}
      overflow="hidden"
    >
      <Box gap={1} flexShrink={1}>
        <Text bold color="cyan">
          maker
        </Text>
        <Text color="gray">|</Text>
        <Text color="white" wrap="truncate">
          {displayBreadcrumb}
        </Text>
      </Box>
      <Box gap={2} flexShrink={0}>
        <Box gap={1}>
          <Text color="gray">R:</Text>
          <StatusIndicator status={robotStatus} showLabel={false} />
        </Box>
        <Box gap={1}>
          <Text color="gray">T:</Text>
          <StatusIndicator status={teleopStatus} showLabel={false} />
        </Box>
      </Box>
    </Box>
  );
}
