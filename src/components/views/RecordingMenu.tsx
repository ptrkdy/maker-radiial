import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import Spinner from "ink-spinner";
import TextInput from "ink-text-input";
import { Menu, MenuItem } from "../common/Menu.js";
import { Panel } from "../common/Panel.js";
import { ProgressBar } from "../common/ProgressBar.js";
import { useToast } from "../common/Toast.js";
import { useUIStore } from "../../stores/uiStore.js";
import { useRobotStore } from "../../stores/robotStore.js";
import { useRecordingStore } from "../../stores/recordingStore.js";
import {
  recordEpisode,
  buildRecordCommand,
  type RecordingConfig,
  ROBOT_TYPES,
} from "../../lerobot/index.js";

type SubView = "menu" | "configure" | "recording" | "output";

interface ConfigFormState {
  repoId: string;
  taskDescription: string;
  fps: string;
  episodeDurationS: string;
  resetTimeS: string;
  numEpisodes: string;
  cameraIndex: string;
  pushToHub: boolean;
  resume: boolean;
}

export function RecordingMenu() {
  const { goBack } = useUIStore();
  const { robot, teleop } = useRobotStore();
  const {
    phase,
    currentEpisode,
    totalEpisodes,
    isRunning,
    output,
    config,
    setPhase,
    setProgress,
    setConfig,
    setIsRunning,
    appendOutput,
    clearOutput,
    reset,
  } = useRecordingStore();
  const { addToast } = useToast();

  const [subView, setSubView] = useState<SubView>("menu");
  const [formState, setFormState] = useState<ConfigFormState>({
    repoId: "local/my-dataset",
    taskDescription: "Pick and place demonstration",
    fps: "30",
    episodeDurationS: "30",
    resetTimeS: "5",
    numEpisodes: "1",
    cameraIndex: "0",
    pushToHub: false,
    resume: false,
  });
  const [activeField, setActiveField] = useState(0);

  const formFields = [
    { key: "repoId" as const, label: "Dataset ID", placeholder: "local/my-dataset" },
    { key: "taskDescription" as const, label: "Task Description", placeholder: "Describe the task" },
    { key: "fps" as const, label: "FPS", placeholder: "30" },
    { key: "episodeDurationS" as const, label: "Episode Duration (s)", placeholder: "30" },
    { key: "resetTimeS" as const, label: "Reset Time (s)", placeholder: "5" },
    { key: "numEpisodes" as const, label: "Number of Episodes", placeholder: "1" },
    { key: "cameraIndex" as const, label: "Camera Index", placeholder: "0" },
  ];

  useInput((input, key) => {
    if (subView === "configure") {
      if (key.upArrow && activeField > 0) {
        setActiveField(activeField - 1);
      } else if (key.downArrow && activeField < formFields.length - 1) {
        setActiveField(activeField + 1);
      } else if (key.escape) {
        setSubView("menu");
      }
    }
  });

  const handleStartRecording = async () => {
    if (!robot) {
      addToast("error", "No robot connected");
      return;
    }

    const recordingConfig: RecordingConfig = {
      repoId: formState.repoId,
      robotType: robot.robotType as never,
      robotPort: robot.port,
      teleopType: teleop?.deviceType as never,
      teleopPort: teleop?.port,
      fps: parseInt(formState.fps) || 30,
      episodeDurationS: parseInt(formState.episodeDurationS) || 30,
      resetTimeS: parseInt(formState.resetTimeS) || 5,
      numEpisodes: parseInt(formState.numEpisodes) || 1,
      taskDescription: formState.taskDescription,
      cameras: [
        {
          type: "opencv",
          indexOrPath: parseInt(formState.cameraIndex) || 0,
          width: 640,
          height: 480,
          fps: parseInt(formState.fps) || 30,
        },
      ],
      pushToHub: formState.pushToHub,
      resume: formState.resume,
    };

    setConfig(recordingConfig);
    setIsRunning(true);
    setPhase("pre-recording");
    clearOutput();
    setSubView("recording");

    addToast("info", "Starting recording...");

    const result = await recordEpisode(recordingConfig, (line) => {
      appendOutput(line);

      // Parse progress from output
      if (line.includes("Recording episode")) {
        setPhase("recording");
        const match = line.match(/episode (\d+)/);
        if (match) {
          setProgress(parseInt(match[1]), recordingConfig.numEpisodes);
        }
      } else if (line.includes("Post-processing")) {
        setPhase("post-recording");
      }
    });

    setIsRunning(false);
    setPhase("idle");

    if (result.success) {
      addToast("success", "Recording completed successfully");
    } else {
      addToast("error", result.error || "Recording failed");
    }

    setSubView("menu");
  };

  const handleStopRecording = () => {
    // In a real implementation, we'd need to signal the subprocess to stop
    addToast("warning", "Stopping recording...");
    reset();
    setSubView("menu");
  };

  const menuItems: MenuItem[] = [
    { label: "Configure Recording", value: "configure" },
    { label: "Start Recording", value: "start", disabled: !robot },
    { label: "View Command", value: "view-command" },
    { label: "Back", value: "back" },
  ];

  const handleMenuSelect = (item: MenuItem) => {
    switch (item.value) {
      case "configure":
        setSubView("configure");
        break;
      case "start":
        handleStartRecording();
        break;
      case "view-command":
        if (robot) {
          const cmd = buildRecordCommand({
            repoId: formState.repoId,
            robotType: robot.robotType as never,
            robotPort: robot.port,
            teleopType: teleop?.deviceType as never,
            teleopPort: teleop?.port,
            fps: parseInt(formState.fps) || 30,
            episodeDurationS: parseInt(formState.episodeDurationS) || 30,
            resetTimeS: parseInt(formState.resetTimeS) || 5,
            numEpisodes: parseInt(formState.numEpisodes) || 1,
            taskDescription: formState.taskDescription,
            cameras: [
              {
                type: "opencv",
                indexOrPath: parseInt(formState.cameraIndex) || 0,
                width: 640,
                height: 480,
                fps: parseInt(formState.fps) || 30,
              },
            ],
            pushToHub: formState.pushToHub,
            resume: formState.resume,
          });
          addToast("info", cmd.join(" ").substring(0, 100) + "...");
        }
        break;
      case "back":
        goBack();
        break;
    }
  };

  if (subView === "recording") {
    const progress =
      totalEpisodes > 0 ? (currentEpisode / totalEpisodes) * 100 : 0;

    return (
      <Box flexDirection="column" gap={1}>
        <Panel title="Recording in Progress">
          <Box flexDirection="column" gap={1}>
            <Box gap={2}>
              <Text>Phase:</Text>
              <Text color="cyan">{phase}</Text>
            </Box>
            <Box gap={2}>
              <Text>Episode:</Text>
              <Text>
                {currentEpisode} / {totalEpisodes}
              </Text>
            </Box>
            <ProgressBar
              value={progress}
              label="Progress:"
              color={phase === "recording" ? "red" : "cyan"}
            />
          </Box>
        </Panel>

        <Panel title="Output">
          <Box flexDirection="column" height={10} overflow="hidden">
            {output.slice(-10).map((line, i) => (
              <Text key={i} color="gray" wrap="truncate">
                {line}
              </Text>
            ))}
          </Box>
        </Panel>

        <Box>
          <Text color="gray">[Ctrl+C] Stop Recording</Text>
        </Box>
      </Box>
    );
  }

  if (subView === "configure") {
    return (
      <Panel title="Configure Recording">
        <Box flexDirection="column" gap={1}>
          {formFields.map((field, index) => (
            <Box key={field.key} gap={1}>
              <Text color={index === activeField ? "cyan" : "gray"}>
                {index === activeField ? "›" : " "}
              </Text>
              <Text color={index === activeField ? "white" : "gray"}>
                {field.label}:
              </Text>
              {index === activeField ? (
                <TextInput
                  value={formState[field.key]}
                  onChange={(value) =>
                    setFormState((prev) => ({ ...prev, [field.key]: value }))
                  }
                  placeholder={field.placeholder}
                />
              ) : (
                <Text color="gray">{formState[field.key] || field.placeholder}</Text>
              )}
            </Box>
          ))}

          <Box marginTop={1} gap={2}>
            <Text color="gray">[↑↓] Navigate | [Enter] Confirm | [Esc] Back</Text>
          </Box>

          <Box marginTop={1}>
            <Menu
              items={[
                { label: "Start Recording", value: "start" },
                { label: "Cancel", value: "cancel" },
              ]}
              onSelect={(item) => {
                if (item.value === "start") {
                  handleStartRecording();
                } else {
                  setSubView("menu");
                }
              }}
            />
          </Box>
        </Box>
      </Panel>
    );
  }

  return (
    <Box flexDirection="column" gap={1}>
      <Panel title="Recording Configuration">
        <Box flexDirection="column" gap={1}>
          <Box gap={2}>
            <Text color="gray">Dataset:</Text>
            <Text>{formState.repoId}</Text>
          </Box>
          <Box gap={2}>
            <Text color="gray">Robot:</Text>
            <Text color={robot ? "green" : "red"}>
              {robot ? `${robot.robotType} @ ${robot.port}` : "Not connected"}
            </Text>
          </Box>
          <Box gap={2}>
            <Text color="gray">Teleop:</Text>
            <Text color={teleop ? "green" : "yellow"}>
              {teleop ? teleop.deviceType : "None"}
            </Text>
          </Box>
          <Box gap={2}>
            <Text color="gray">Episodes:</Text>
            <Text>{formState.numEpisodes}</Text>
          </Box>
          <Box gap={2}>
            <Text color="gray">Duration:</Text>
            <Text>{formState.episodeDurationS}s</Text>
          </Box>
        </Box>
      </Panel>

      <Panel title="Actions">
        <Menu items={menuItems} onSelect={handleMenuSelect} />
      </Panel>
    </Box>
  );
}
