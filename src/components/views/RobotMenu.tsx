import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import { Menu, MenuItem } from "../common/Menu.js";
import { Panel } from "../common/Panel.js";
import { StatusIndicator } from "../common/StatusIndicator.js";
import { Table } from "../common/Table.js";
import { useToast } from "../common/Toast.js";
import { useUIStore } from "../../stores/uiStore.js";
import { useRobotStore } from "../../stores/robotStore.js";
import {
  findPorts,
  connectRobot,
  disconnectRobot,
  connectTeleop,
  disconnectTeleop,
  startTeleopSession,
  stopTeleopSession,
  ROBOT_TYPES,
  TELEOP_TYPES,
  type PortInfo,
} from "../../lerobot/index.js";

type SubView = "menu" | "select-robot-type" | "select-robot-port" | "select-teleop-type" | "select-teleop-port";

export function RobotMenu() {
  const { goBack } = useUIStore();
  const {
    robot,
    teleop,
    ports,
    teleopSessionActive,
    isConnectingRobot,
    isConnectingTeleop,
    isScanning,
    setRobot,
    setTeleop,
    setPorts,
    setTeleopSessionActive,
    setIsConnectingRobot,
    setIsConnectingTeleop,
    setIsScanning,
    setError,
  } = useRobotStore();
  const { addToast } = useToast();

  const [subView, setSubView] = useState<SubView>("menu");
  const [selectedRobotType, setSelectedRobotType] = useState<string>("");

  // Scan for ports on mount
  useEffect(() => {
    scanPorts();
  }, []);

  const scanPorts = async () => {
    setIsScanning(true);
    const foundPorts = await findPorts();
    setPorts(foundPorts);
    setIsScanning(false);
  };

  const handleConnectRobot = async (type: string, port: string) => {
    setIsConnectingRobot(true);
    const result = await connectRobot(type as never, port);
    setIsConnectingRobot(false);

    if (result.success && result.robot) {
      setRobot(result.robot);
      addToast("success", `Connected to ${type} on ${port}`);
    } else {
      setError(result.error || "Failed to connect");
      addToast("error", result.error || "Failed to connect");
    }
    setSubView("menu");
  };

  const handleDisconnectRobot = async () => {
    if (!robot) return;

    const result = await disconnectRobot(robot.id);
    if (result.success) {
      setRobot(null);
      addToast("success", "Robot disconnected");
    } else {
      addToast("error", result.error || "Failed to disconnect");
    }
  };

  const handleConnectTeleop = async (type: string, port?: string) => {
    setIsConnectingTeleop(true);
    const result = await connectTeleop(type as never, port);
    setIsConnectingTeleop(false);

    if (result.success && result.teleop) {
      setTeleop(result.teleop);
      addToast("success", `Connected to ${type}`);
    } else {
      setError(result.error || "Failed to connect");
      addToast("error", result.error || "Failed to connect");
    }
    setSubView("menu");
  };

  const handleDisconnectTeleop = async () => {
    if (!teleop) return;

    const result = await disconnectTeleop(teleop.id);
    if (result.success) {
      setTeleop(null);
      addToast("success", "Teleop disconnected");
    } else {
      addToast("error", result.error || "Failed to disconnect");
    }
  };

  const handleStartTeleopSession = async () => {
    if (!robot || !teleop) return;

    const result = await startTeleopSession(robot.id, teleop.id);
    if (result.success) {
      setTeleopSessionActive(true);
      addToast("success", "Teleoperation started");
    } else {
      addToast("error", result.error || "Failed to start teleoperation");
    }
  };

  const handleStopTeleopSession = async () => {
    const result = await stopTeleopSession();
    if (result.success) {
      setTeleopSessionActive(false);
      addToast("success", "Teleoperation stopped");
    } else {
      addToast("error", result.error || "Failed to stop teleoperation");
    }
  };

  // Build menu items based on current state
  const buildMenuItems = (): MenuItem[] => {
    const items: MenuItem[] = [];

    if (!robot) {
      items.push({ label: "Connect Robot...", value: "connect-robot" });
    } else {
      items.push({ label: `Disconnect Robot (${robot.robotType})`, value: "disconnect-robot" });
    }

    if (!teleop) {
      items.push({ label: "Connect Teleop...", value: "connect-teleop" });
    } else {
      items.push({ label: `Disconnect Teleop (${teleop.deviceType})`, value: "disconnect-teleop" });
    }

    if (robot && teleop) {
      if (!teleopSessionActive) {
        items.push({ label: "Start Teleoperation", value: "start-teleop" });
      } else {
        items.push({ label: "Stop Teleoperation", value: "stop-teleop" });
      }
    }

    items.push({ label: "Scan Ports", value: "scan-ports" });
    items.push({ label: "Back", value: "back" });

    return items;
  };

  const handleMenuSelect = (item: MenuItem) => {
    switch (item.value) {
      case "connect-robot":
        setSubView("select-robot-type");
        break;
      case "disconnect-robot":
        handleDisconnectRobot();
        break;
      case "connect-teleop":
        setSubView("select-teleop-type");
        break;
      case "disconnect-teleop":
        handleDisconnectTeleop();
        break;
      case "start-teleop":
        handleStartTeleopSession();
        break;
      case "stop-teleop":
        handleStopTeleopSession();
        break;
      case "scan-ports":
        scanPorts();
        break;
      case "back":
        goBack();
        break;
    }
  };

  const renderSubView = () => {
    switch (subView) {
      case "select-robot-type":
        return (
          <Panel title="Select Robot Type">
            <Menu
              items={[
                ...ROBOT_TYPES.map((t) => ({
                  label: `${t.name} - ${t.description}`,
                  value: t.id,
                })),
                { label: "Cancel", value: "cancel" },
              ]}
              onSelect={(item) => {
                if (item.value === "cancel") {
                  setSubView("menu");
                } else {
                  setSelectedRobotType(item.value);
                  setSubView("select-robot-port");
                }
              }}
            />
          </Panel>
        );

      case "select-robot-port":
        const robotPorts = ports.filter((p) => p.isLikelyRobot);
        return (
          <Panel title="Select Robot Port">
            {robotPorts.length === 0 ? (
              <Box flexDirection="column" gap={1}>
                <Text color="yellow">No robot ports detected</Text>
                <Text color="gray">Make sure your robot is connected via USB</Text>
              </Box>
            ) : (
              <Menu
                items={[
                  ...robotPorts.map((p) => ({
                    label: `${p.device} - ${p.description}`,
                    value: p.device,
                  })),
                  { label: "Cancel", value: "cancel" },
                ]}
                onSelect={(item) => {
                  if (item.value === "cancel") {
                    setSubView("menu");
                  } else {
                    handleConnectRobot(selectedRobotType, item.value);
                  }
                }}
              />
            )}
          </Panel>
        );

      case "select-teleop-type":
        return (
          <Panel title="Select Teleop Device">
            <Menu
              items={[
                ...TELEOP_TYPES.map((t) => ({
                  label: `${t.name} - ${t.description}`,
                  value: t.id,
                })),
                { label: "Cancel", value: "cancel" },
              ]}
              onSelect={(item) => {
                if (item.value === "cancel") {
                  setSubView("menu");
                } else {
                  const teleopType = TELEOP_TYPES.find((t) => t.id === item.value);
                  if (teleopType?.requiresPort) {
                    setSelectedRobotType(item.value); // Reuse for teleop type
                    setSubView("select-teleop-port");
                  } else {
                    handleConnectTeleop(item.value);
                  }
                }
              }}
            />
          </Panel>
        );

      case "select-teleop-port":
        const teleopPorts = ports.filter((p) => p.isLikelyRobot);
        return (
          <Panel title="Select Teleop Port">
            {teleopPorts.length === 0 ? (
              <Box flexDirection="column" gap={1}>
                <Text color="yellow">No teleop ports detected</Text>
                <Text color="gray">Make sure your leader arm is connected via USB</Text>
              </Box>
            ) : (
              <Menu
                items={[
                  ...teleopPorts.map((p) => ({
                    label: `${p.device} - ${p.description}`,
                    value: p.device,
                  })),
                  { label: "Cancel", value: "cancel" },
                ]}
                onSelect={(item) => {
                  if (item.value === "cancel") {
                    setSubView("menu");
                  } else {
                    handleConnectTeleop(selectedRobotType, item.value);
                  }
                }}
              />
            )}
          </Panel>
        );

      default:
        return null;
    }
  };

  if (isConnectingRobot || isConnectingTeleop) {
    return (
      <Panel title="Robot">
        <Box gap={2}>
          <Spinner type="dots" />
          <Text>Connecting...</Text>
        </Box>
      </Panel>
    );
  }

  if (subView !== "menu") {
    return renderSubView();
  }

  return (
    <Box flexDirection="column" gap={1}>
      <Panel title="Robot Status">
        <Box flexDirection="column" gap={1}>
          <Box gap={2}>
            <Text>Robot:</Text>
            <StatusIndicator
              status={robot ? "connected" : "disconnected"}
              label={robot ? `${robot.robotType} @ ${robot.port}` : "Not connected"}
            />
          </Box>
          <Box gap={2}>
            <Text>Teleop:</Text>
            <StatusIndicator
              status={teleop ? "connected" : "disconnected"}
              label={teleop ? `${teleop.deviceType}` : "Not connected"}
            />
          </Box>
          {robot && teleop && (
            <Box gap={2}>
              <Text>Session:</Text>
              <StatusIndicator
                status={teleopSessionActive ? "connected" : "idle"}
                label={teleopSessionActive ? "Active" : "Inactive"}
              />
            </Box>
          )}
        </Box>
      </Panel>

      <Panel title="Available Ports">
        {isScanning ? (
          <Box gap={2}>
            <Spinner type="dots" />
            <Text>Scanning...</Text>
          </Box>
        ) : ports.length === 0 ? (
          <Text color="gray">No ports found</Text>
        ) : (
          <Table
            data={ports}
            columns={[
              { header: "Device", key: "device", width: 20 },
              { header: "Description", key: "description", width: 30 },
              { header: "Robot?", key: (p) => (p.isLikelyRobot ? "Yes" : "No"), width: 8 },
            ]}
          />
        )}
      </Panel>

      <Panel title="Actions">
        <Menu items={buildMenuItems()} onSelect={handleMenuSelect} />
      </Panel>
    </Box>
  );
}
