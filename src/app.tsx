import React, { useCallback } from "react";
import { Box, Text, useApp, useInput } from "ink";
import { Layout } from "./components/Layout.js";
import { CommandLine } from "./components/CommandLine.js";
import { MainMenu } from "./components/views/MainMenu.js";
import { RobotMenu } from "./components/views/RobotMenu.js";
import { RecordingMenu } from "./components/views/RecordingMenu.js";
import { DatasetMenu } from "./components/views/DatasetMenu.js";
import { TelemetryView } from "./components/views/TelemetryView.js";
import { ToastProvider, ToastContainer } from "./components/common/Toast.js";
import { useUIStore } from "./stores/uiStore.js";

export default function App() {
  const { exit } = useApp();
  const { currentView, goBack, inMenuMode, enterMenuMode } = useUIStore();

  // Global keyboard shortcuts
  useInput((input, key) => {
    if (input === "q" && key.ctrl) {
      exit();
    }
    // Escape only works in menu mode
    if (key.escape && inMenuMode) {
      goBack();
    }
  });

  const handleNavigateToMenu = useCallback(() => {
    enterMenuMode();
  }, [enterMenuMode]);

  const renderView = () => {
    switch (currentView) {
      case "command":
        return <CommandLine onNavigateToMenu={handleNavigateToMenu} />;
      case "main":
        return <MainMenu />;
      case "robot":
        return <RobotMenu />;
      case "recording":
        return <RecordingMenu />;
      case "dataset":
        return <DatasetMenu />;
      case "telemetry":
        return <TelemetryView />;
      default:
        return <CommandLine onNavigateToMenu={handleNavigateToMenu} />;
    }
  };

  // Command line and main menu use splash-style layout (no Layout wrapper)
  if (currentView === "command" || currentView === "main") {
    return (
      <ToastProvider>
        {renderView()}
        <ToastContainer />
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <Layout>
        {renderView()}
      </Layout>
      <ToastContainer />
    </ToastProvider>
  );
}
