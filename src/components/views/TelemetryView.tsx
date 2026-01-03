import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import Spinner from "ink-spinner";
import { Panel } from "../common/Panel.js";
import { Table } from "../common/Table.js";
import { StatusIndicator } from "../common/StatusIndicator.js";
import { ProgressBar } from "../common/ProgressBar.js";
import { useUIStore } from "../../stores/uiStore.js";
import { useRobotStore } from "../../stores/robotStore.js";
import {
  getTelemetrySnapshot,
  getEnvironmentStatus,
  type TelemetrySnapshot,
  type EnvironmentStatus,
} from "../../lerobot/index.js";

export function TelemetryView() {
  const { goBack } = useUIStore();
  const { robot, teleop } = useRobotStore();

  const [telemetry, setTelemetry] = useState<TelemetrySnapshot | null>(null);
  const [environment, setEnvironment] = useState<EnvironmentStatus | null>(null);
  const [isPolling, setIsPolling] = useState(true);
  const [pollInterval, setPollInterval] = useState(1000);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useInput((input, key) => {
    if (key.escape) {
      goBack();
    } else if (input === "p") {
      setIsPolling(!isPolling);
    } else if (input === "+") {
      setPollInterval(Math.max(100, pollInterval - 100));
    } else if (input === "-") {
      setPollInterval(Math.min(5000, pollInterval + 100));
    } else if (input === "r") {
      fetchTelemetry();
    }
  });

  const fetchTelemetry = async () => {
    const [telemetryData, envData] = await Promise.all([
      getTelemetrySnapshot(),
      getEnvironmentStatus(),
    ]);

    if (telemetryData) {
      setTelemetry(telemetryData);
    }
    if (envData) {
      setEnvironment(envData);
    }
    setLastUpdate(new Date());
  };

  // Poll for telemetry updates
  useEffect(() => {
    fetchTelemetry();

    if (!isPolling) return;

    const interval = setInterval(fetchTelemetry, pollInterval);
    return () => clearInterval(interval);
  }, [isPolling, pollInterval]);

  // Convert joints to table data
  const jointData = telemetry?.joints
    ? Object.entries(telemetry.joints).map(([name, value]) => ({
        name,
        value: typeof value === "number" ? value.toFixed(2) : String(value),
      }))
    : [];

  // Camera data
  const cameraData = telemetry?.cameras
    ? Object.entries(telemetry.cameras).map(([name, cam]) => ({
        name,
        status: cam.connected ? "Connected" : "Disconnected",
        fps: cam.fps?.toFixed(1) || "-",
        resolution: cam.width && cam.height ? `${cam.width}x${cam.height}` : "-",
        frameAge: cam.frameAgeMs?.toFixed(0) || "-",
      }))
    : [];

  return (
    <Box flexDirection="column" gap={1}>
      {/* Status Header */}
      <Panel title="Connection Status">
        <Box flexDirection="row" gap={4}>
          <Box gap={1}>
            <Text>Robot:</Text>
            <StatusIndicator
              status={telemetry?.robotConnected ? "connected" : "disconnected"}
              label={telemetry?.robotType || "None"}
            />
          </Box>
          <Box gap={1}>
            <Text>Teleop:</Text>
            <StatusIndicator
              status={telemetry?.teleopConnected ? "connected" : "disconnected"}
              label={telemetry?.teleopType || "None"}
            />
          </Box>
          <Box gap={1}>
            <Text>Polling:</Text>
            <StatusIndicator
              status={isPolling ? "connected" : "idle"}
              label={isPolling ? `${pollInterval}ms` : "Paused"}
            />
          </Box>
        </Box>
      </Panel>

      {/* Environment Info */}
      {environment && (
        <Panel title="Environment">
          <Box flexDirection="row" gap={4}>
            <Box gap={1}>
              <Text color="gray">LeRobot:</Text>
              <Text color={environment.lerobotInstalled ? "green" : "red"}>
                {environment.lerobotInstalled
                  ? environment.lerobotVersion || "Installed"
                  : "Not installed"}
              </Text>
            </Box>
            <Box gap={1}>
              <Text color="gray">PyTorch:</Text>
              <Text color={environment.torchAvailable ? "green" : "red"}>
                {environment.torchAvailable ? "Available" : "Not available"}
              </Text>
            </Box>
            <Box gap={1}>
              <Text color="gray">CUDA:</Text>
              <Text color={environment.cudaAvailable ? "green" : "yellow"}>
                {environment.cudaAvailable ? "Available" : "Not available"}
              </Text>
            </Box>
          </Box>
        </Panel>
      )}

      {/* Joint Positions */}
      <Panel title="Joint Positions">
        {jointData.length === 0 ? (
          <Text color="gray">
            {telemetry?.jointsError || "No joint data available"}
          </Text>
        ) : (
          <Table
            data={jointData}
            columns={[
              { header: "Joint", key: "name", width: 20 },
              { header: "Value", key: "value", width: 12, align: "right" },
            ]}
          />
        )}
      </Panel>

      {/* Camera Status */}
      <Panel title="Cameras">
        {cameraData.length === 0 ? (
          <Text color="gray">
            {telemetry?.camerasError || "No cameras connected"}
          </Text>
        ) : (
          <Table
            data={cameraData}
            columns={[
              { header: "Camera", key: "name", width: 15 },
              { header: "Status", key: "status", width: 12 },
              { header: "FPS", key: "fps", width: 8, align: "right" },
              { header: "Resolution", key: "resolution", width: 12 },
              { header: "Age (ms)", key: "frameAge", width: 10, align: "right" },
            ]}
          />
        )}
      </Panel>

      {/* Timing Stats */}
      {telemetry?.timing && (
        <Panel title="Timing">
          <Box flexDirection="column" gap={1}>
            <Box gap={4}>
              <Box gap={1}>
                <Text color="gray">FPS:</Text>
                <Text>{telemetry.timing.fps?.toFixed(1) || "-"}</Text>
              </Box>
              <Box gap={1}>
                <Text color="gray">Loop:</Text>
                <Text>{telemetry.timing.loopMs?.toFixed(1) || "-"}ms</Text>
              </Box>
              <Box gap={1}>
                <Text color="gray">Target:</Text>
                <Text>{telemetry.timing.targetMs?.toFixed(1) || "-"}ms</Text>
              </Box>
            </Box>
            {telemetry.timing.deadlineMissRate !== undefined && (
              <Box gap={1}>
                <Text color="gray">Deadline misses:</Text>
                <Text
                  color={telemetry.timing.deadlineMissRate > 0.1 ? "red" : "green"}
                >
                  {(telemetry.timing.deadlineMissRate * 100).toFixed(1)}%
                </Text>
              </Box>
            )}
          </Box>
        </Panel>
      )}

      {/* Recording Status */}
      {telemetry?.recording?.active && (
        <Panel title="Recording" borderColor="red">
          <Box flexDirection="column" gap={1}>
            <Box gap={2}>
              <StatusIndicator status="recording" label="Recording" />
            </Box>
            <Box gap={2}>
              <Text color="gray">Dataset:</Text>
              <Text>{telemetry.recording.repoId}</Text>
            </Box>
            <Box gap={2}>
              <Text color="gray">Episodes:</Text>
              <Text>{telemetry.recording.episodeCount}</Text>
            </Box>
            <Box gap={2}>
              <Text color="gray">Frames:</Text>
              <Text>{telemetry.recording.numFrames}</Text>
            </Box>
          </Box>
        </Panel>
      )}

      {/* Controls */}
      <Box marginTop={1} gap={3}>
        <Text color="gray">
          [P] {isPolling ? "Pause" : "Resume"} | [+/-] Interval | [R] Refresh |
          [Esc] Back
        </Text>
        {lastUpdate && (
          <Text color="gray">
            Last update: {lastUpdate.toLocaleTimeString()}
          </Text>
        )}
      </Box>
    </Box>
  );
}
