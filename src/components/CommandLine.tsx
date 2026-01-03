import React, { useState, useCallback, useMemo } from "react";
import { Box, Text, useInput, useStdout, useApp } from "ink";
import TextInput from "ink-text-input";
import Spinner from "ink-spinner";
import path from "path";
import fs from "fs";
import os from "os";
import { Welcome } from "./Welcome.js";
import { commandRegistry, registerAllCommands } from "../commands/index.js";
import type { CommandContext } from "../commands/types.js";
import { useRobotStore } from "../stores/robotStore.js";
import { useDatasetStore } from "../stores/datasetStore.js";
import { useUIStore } from "../stores/uiStore.js";
import { useToast } from "./common/Toast.js";

// Register commands on import
registerAllCommands();

// Get path completions for bash tab completion
function getPathCompletions(partial: string, currentDir: string): string[] {
  try {
    // Expand ~ to home directory
    let expandedPartial = partial;
    let baseForExpansion = "";
    if (partial.startsWith("~")) {
      expandedPartial = path.join(os.homedir(), partial.slice(1));
      baseForExpansion = "~";
    }

    // Resolve the path relative to cwd
    const resolvedPath = path.resolve(currentDir, expandedPartial);
    const dirname = path.dirname(resolvedPath);
    const basename = path.basename(resolvedPath);

    // If partial ends with /, list directory contents
    if (partial.endsWith("/") || partial === "" || partial === ".") {
      const targetDir = partial === "" || partial === "." ? currentDir : resolvedPath;
      try {
        const entries = fs.readdirSync(targetDir);
        return entries
          .filter((e) => !e.startsWith(".")) // Hide dotfiles by default
          .slice(0, 20) // Limit results
          .map((e) => {
            const fullPath = path.join(targetDir, e);
            const isDir = fs.statSync(fullPath).isDirectory();
            const prefix = partial === "" || partial === "." ? "" : partial;
            return prefix + e + (isDir ? "/" : "");
          });
      } catch {
        return [];
      }
    }

    // Otherwise, complete based on prefix
    try {
      const entries = fs.readdirSync(dirname);
      const matches = entries
        .filter((e) => e.toLowerCase().startsWith(basename.toLowerCase()))
        .slice(0, 20);

      return matches.map((e) => {
        const fullPath = path.join(dirname, e);
        const isDir = fs.statSync(fullPath).isDirectory();
        // Reconstruct the path with original prefix style
        const dirPart = path.dirname(partial);
        const prefix = dirPart === "." ? "" : dirPart + "/";
        // Handle ~ expansion in output
        if (baseForExpansion === "~") {
          const relativeToDirname = path.relative(os.homedir(), dirname);
          const tildePath = relativeToDirname ? "~/" + relativeToDirname : "~";
          return tildePath + "/" + e + (isDir ? "/" : "");
        }
        return prefix + e + (isDir ? "/" : "");
      });
    } catch {
      return [];
    }
  } catch {
    return [];
  }
}

interface ChatMessage {
  id: string;
  type: "user" | "system" | "error" | "success";
  content: string[];
}

interface CommandLineProps {
  onNavigateToMenu: () => void;
}

export function CommandLine({ onNavigateToMenu }: CommandLineProps) {
  const { exit } = useApp();
  const [input, setInput] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [autocompleteIndex, setAutocompleteIndex] = useState(-1);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [cwd, setCwd] = useState(process.cwd());
  const [bashCompletions, setBashCompletions] = useState<string[]>([]);
  const [bashCompletionIndex, setBashCompletionIndex] = useState(-1);

  const { stdout } = useStdout();
  const width = stdout?.columns || 80;
  const height = stdout?.rows || 24;

  const { robot, teleop, teleopSessionActive } = useRobotStore();
  const { datasets, activeDataset } = useDatasetStore();
  const { addToast } = useToast();
  const { navigateTo, setBreadcrumb } = useUIStore();

  // Get all command names for preview
  const allCommands = useMemo(() => {
    return commandRegistry.getAll().map((cmd) => ({
      name: cmd.name,
      description: cmd.description,
      usage: cmd.usage,
      aliases: cmd.aliases || [],
    }));
  }, []);

  // Command preview based on current input
  const commandPreview = useMemo(() => {
    if (!input.startsWith("/") || input.length < 2) return null;

    const searchTerm = input.slice(1).toLowerCase().split(" ")[0];
    const matches = allCommands.filter(
      (cmd) =>
        cmd.name.toLowerCase().startsWith(searchTerm) ||
        cmd.aliases.some((a) => a.toLowerCase().startsWith(searchTerm))
    );

    return matches.slice(0, 6); // Show max 6 suggestions
  }, [input, allCommands]);

  const showCommandAutocomplete = commandPreview && commandPreview.length > 0 && !isExecuting;
  const showBashAutocomplete = bashCompletions.length > 0 && !isExecuting && !input.startsWith("/");
  const showAutocomplete = showCommandAutocomplete || showBashAutocomplete;
  const isLandingView = chatHistory.length === 0;

  // Calculate layout - chatbot style
  const headerHeight = 1;
  const welcomeHeight = isLandingView ? 12 : 0;
  const autocompleteItems = showCommandAutocomplete ? commandPreview?.length || 0 : bashCompletions.length;
  const autocompleteHeight = showAutocomplete ? autocompleteItems + 3 : 0;
  const inputHeight = 3;
  const availableForHistory = Math.max(
    3,
    height - headerHeight - welcomeHeight - autocompleteHeight - inputHeight - 2
  );

  const appendToChat = useCallback(
    (type: ChatMessage["type"], content: string[]) => {
      const id = Math.random().toString(36).substring(7);
      setChatHistory((prev) => [...prev, { id, type, content }]);
    },
    []
  );

  const clearChat = useCallback(() => {
    setChatHistory([]);
    setScrollOffset(0);
  }, []);

  const createContext = useCallback(
    (): CommandContext => ({
      setOutput: (lines: string[]) => {
        appendToChat("system", lines);
      },
      appendOutput: (line: string) => {
        appendToChat("system", [line]);
      },
      clearOutput: clearChat,
      navigateToMenu: () => {
        setBreadcrumb(["Main Menu"]);
        navigateTo("main");
        onNavigateToMenu();
      },
      toast: (type, message) => addToast(type, message),
      getRobotState: () => ({
        robot: robot
          ? { id: robot.id, robotType: robot.robotType, port: robot.port }
          : null,
        teleop: teleop
          ? { id: teleop.id, deviceType: teleop.deviceType, port: teleop.port }
          : null,
        teleopSessionActive,
      }),
      getDatasetState: () => ({
        datasets: datasets.map((d) => ({
          repoId: d.repoId,
          numEpisodes: d.numEpisodes,
        })),
        activeDataset: activeDataset ? { repoId: activeDataset.repoId } : null,
      }),
    }),
    [
      robot,
      teleop,
      teleopSessionActive,
      datasets,
      activeDataset,
      appendToChat,
      clearChat,
      addToast,
      onNavigateToMenu,
      navigateTo,
      setBreadcrumb,
    ]
  );

  const executeCommand = useCallback(
    async (cmd: string) => {
      if (!cmd.trim()) return;

      // Add to command history
      setCommandHistory((prev) => [...prev.filter((h) => h !== cmd), cmd]);
      setHistoryIndex(-1);
      setAutocompleteIndex(-1);

      // Add user message to chat
      appendToChat("user", [cmd]);

      // Handle /exit command specially
      if (cmd.trim().toLowerCase() === "/exit") {
        appendToChat("system", ["Goodbye!"]);
        setTimeout(() => exit(), 100);
        return;
      }

      // Handle /return and /splash commands specially - clear chat and return to splash
      const cmdLower = cmd.trim().toLowerCase();
      if (cmdLower === "/return" || cmdLower === "/splash" || cmdLower === "/reset") {
        clearChat();
        return;
      }

      setIsExecuting(true);
      try {
        // If command doesn't start with /, treat it as a bash command
        if (!cmd.trim().startsWith("/")) {
          const trimmedCmd = cmd.trim();

          // Handle cd command specially
          if (trimmedCmd === "cd" || trimmedCmd.startsWith("cd ")) {
            let targetDir: string;

            if (trimmedCmd === "cd" || trimmedCmd === "cd ~") {
              // cd with no args or cd ~ goes to home directory
              targetDir = os.homedir();
            } else if (trimmedCmd === "cd -") {
              // cd - is not supported without tracking previous directory
              appendToChat("error", ["cd -: OLDPWD not set"]);
              setIsExecuting(false);
              return;
            } else {
              // Extract the path argument
              const targetPath = trimmedCmd.slice(3).trim();

              // Expand ~ to home directory
              const expandedPath = targetPath.startsWith("~")
                ? path.join(os.homedir(), targetPath.slice(1))
                : targetPath;

              // Resolve relative to current working directory
              targetDir = path.resolve(cwd, expandedPath);
            }

            // Check if directory exists and is accessible
            try {
              const stat = fs.statSync(targetDir);
              if (!stat.isDirectory()) {
                appendToChat("error", [`cd: not a directory: ${targetDir}`]);
                setIsExecuting(false);
                return;
              }
              // Update cwd state
              setCwd(targetDir);
              appendToChat("system", [targetDir]);
            } catch (err) {
              appendToChat("error", [`cd: no such file or directory: ${targetDir}`]);
            }
            setIsExecuting(false);
            return;
          }

          // Handle pwd command specially to show tracked cwd
          if (trimmedCmd === "pwd") {
            appendToChat("system", [cwd]);
            setIsExecuting(false);
            return;
          }

          // Execute other bash commands in the tracked cwd
          const proc = Bun.spawn(["bash", "-c", trimmedCmd], {
            cwd: cwd,
            stdout: "pipe",
            stderr: "pipe",
          });

          const stdoutText = await new Response(proc.stdout).text();
          const stderrText = await new Response(proc.stderr).text();
          await proc.exited;

          const outputLines: string[] = [];
          if (stdoutText.trim()) {
            outputLines.push(...stdoutText.trim().split("\n"));
          }
          if (stderrText.trim()) {
            outputLines.push(...stderrText.trim().split("\n"));
          }

          if (proc.exitCode === 0) {
            if (outputLines.length > 0) {
              appendToChat("system", outputLines);
            } else {
              appendToChat("system", ["(no output)"]);
            }
          } else {
            appendToChat("error", outputLines.length > 0 ? outputLines : [`Exit code: ${proc.exitCode}`]);
          }
        } else {
          // Handle slash commands via registry
          const result = await commandRegistry.execute(cmd, createContext());

          if (result.success) {
            if (result.output && result.output.length > 0) {
              appendToChat("success", result.output);
            }
          } else {
            if (result.error) {
              appendToChat("error", [result.error]);
            }
          }
        }
      } catch (error) {
        appendToChat("error", [
          error instanceof Error ? error.message : String(error),
        ]);
      } finally {
        setIsExecuting(false);
      }
    },
    [appendToChat, createContext, exit, clearChat, cwd]
  );

  const handleInputChange = useCallback((value: string) => {
    setInput(value);
    setAutocompleteIndex(-1);
    setHistoryIndex(-1);
    // Clear bash completions when input changes
    setBashCompletions([]);
    setBashCompletionIndex(-1);
  }, []);

  const handleSubmit = useCallback(() => {
    if (isExecuting) return;

    if (input.trim()) {
      setScrollOffset(0); // Reset scroll on new command
      executeCommand(input);
      setInput("");
      setAutocompleteIndex(-1);
    }
  }, [input, isExecuting, executeCommand]);

  // Handle keyboard navigation
  useInput((char, key) => {
    // Page Up/Down for scrolling history (works even during execution)
    // PgUp scrolls toward top (decrease offset), PgDn scrolls toward bottom (increase offset)
    if (key.pageUp) {
      setScrollOffset((prev) => Math.max(prev - 5, 0));
      return;
    }
    if (key.pageDown) {
      setScrollOffset((prev) => Math.min(prev + 5, maxScrollOffset));
      return;
    }

    if (isExecuting) return;

    // Tab key for bash path completion
    if (key.tab && !input.startsWith("/")) {
      // If we already have completions shown, cycle through them
      if (bashCompletions.length > 0) {
        const nextIndex = (bashCompletionIndex + 1) % bashCompletions.length;
        setBashCompletionIndex(nextIndex);
        // Apply the completion to input
        const parts = input.split(/\s+/);
        parts[parts.length - 1] = bashCompletions[nextIndex];
        setInput(parts.join(" "));
      } else {
        // Get the last word being typed (the path to complete)
        const parts = input.split(/\s+/);
        const lastPart = parts[parts.length - 1] || "";
        const completions = getPathCompletions(lastPart, cwd);

        if (completions.length === 1) {
          // Single match - apply directly
          parts[parts.length - 1] = completions[0];
          setInput(parts.join(" "));
        } else if (completions.length > 1) {
          // Multiple matches - show dropdown
          setBashCompletions(completions.slice(0, 8)); // Limit to 8
          setBashCompletionIndex(0);
          // Apply first completion
          parts[parts.length - 1] = completions[0];
          setInput(parts.join(" "));
        }
      }
      return;
    }

    // Escape to close autocomplete
    if (key.escape && (autocompleteIndex >= 0 || bashCompletionIndex >= 0)) {
      setAutocompleteIndex(-1);
      setBashCompletions([]);
      setBashCompletionIndex(-1);
      return;
    }

    // Enter when bash completion is shown - accept and clear
    if (key.return && bashCompletionIndex >= 0) {
      setBashCompletions([]);
      setBashCompletionIndex(-1);
      // Don't return - let it fall through to execute the command
    }

    // Enter when command autocomplete item is selected
    if (key.return && autocompleteIndex >= 0 && showCommandAutocomplete && commandPreview) {
      const selectedCmd = commandPreview[autocompleteIndex];
      if (selectedCmd) {
        const currentParts = input.split(" ");
        const finalCommand = `/${selectedCmd.name}${currentParts.length > 1 ? " " + currentParts.slice(1).join(" ") : ""}`;
        setAutocompleteIndex(-1);
        setScrollOffset(0); // Reset scroll on new command
        executeCommand(finalCommand);
        setInput("");
      }
      return;
    }

    // Arrow navigation for bash completion dropdown
    if (showBashAutocomplete && bashCompletions.length > 0) {
      if (key.downArrow) {
        const nextIndex = bashCompletionIndex < bashCompletions.length - 1 ? bashCompletionIndex + 1 : bashCompletionIndex;
        setBashCompletionIndex(nextIndex);
        // Apply the completion to input
        const parts = input.split(/\s+/);
        parts[parts.length - 1] = bashCompletions[nextIndex];
        setInput(parts.join(" "));
        return;
      }
      if (key.upArrow) {
        if (bashCompletionIndex > 0) {
          const nextIndex = bashCompletionIndex - 1;
          setBashCompletionIndex(nextIndex);
          // Apply the completion to input
          const parts = input.split(/\s+/);
          parts[parts.length - 1] = bashCompletions[nextIndex];
          setInput(parts.join(" "));
          return;
        } else if (bashCompletionIndex === 0) {
          setBashCompletions([]);
          setBashCompletionIndex(-1);
          return;
        }
      }
    }

    // Arrow navigation for command autocomplete dropdown
    if (showCommandAutocomplete && commandPreview && commandPreview.length > 0) {
      if (key.downArrow) {
        setAutocompleteIndex((prev) =>
          prev < commandPreview.length - 1 ? prev + 1 : prev
        );
        return;
      }
      if (key.upArrow) {
        if (autocompleteIndex > 0) {
          setAutocompleteIndex((prev) => prev - 1);
          return;
        } else if (autocompleteIndex === 0) {
          setAutocompleteIndex(-1);
          return;
        }
      }
    }

    // Command history navigation (only when not in autocomplete)
    if (!showAutocomplete || (autocompleteIndex < 0 && bashCompletionIndex < 0)) {
      if (key.upArrow && commandHistory.length > 0) {
        const newIndex =
          historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex] || "");
      } else if (key.downArrow && historyIndex >= 0) {
        const newIndex = historyIndex > 0 ? historyIndex - 1 : -1;
        setHistoryIndex(newIndex);
        setInput(
          newIndex >= 0
            ? commandHistory[commandHistory.length - 1 - newIndex] || ""
            : ""
        );
      }
    }
  });

  const getMessageColor = (type: ChatMessage["type"]): string => {
    switch (type) {
      case "user":
        return "cyan";
      case "error":
        return "red";
      case "success":
        return "green";
      default:
        return "white";
    }
  };

  const getMessagePrefix = (type: ChatMessage["type"]): string => {
    switch (type) {
      case "user":
        return "❯ ";
      case "error":
        return "✗ ";
      case "success":
        return "";
      default:
        return "  ";
    }
  };

  // Flatten chat history for display
  const flatMessages = useMemo(() => {
    const lines: { text: string; type: ChatMessage["type"]; isFirst: boolean }[] = [];
    for (const msg of chatHistory) {
      msg.content.forEach((line, idx) => {
        lines.push({ text: line, type: msg.type, isFirst: idx === 0 });
      });
    }
    return lines;
  }, [chatHistory]);

  // Calculate max scroll offset
  const maxScrollOffset = Math.max(0, flatMessages.length - availableForHistory);

  // Get visible portion with scroll offset (scroll from top, like less -R)
  const visibleMessages = useMemo(() => {
    const effectiveOffset = Math.min(scrollOffset, maxScrollOffset);
    const startIndex = effectiveOffset;
    const endIndex = Math.min(flatMessages.length, startIndex + availableForHistory);
    return flatMessages.slice(startIndex, endIndex);
  }, [flatMessages, scrollOffset, maxScrollOffset, availableForHistory]);

  // Scroll indicator (reversed - down means more content below)
  const canScrollDown = scrollOffset < maxScrollOffset;
  const canScrollUp = scrollOffset > 0;

  // Get display input for autocomplete preview
  const displayInput = useMemo(() => {
    if (showAutocomplete && autocompleteIndex >= 0 && commandPreview) {
      const selectedCmd = commandPreview[autocompleteIndex];
      if (selectedCmd) {
        const currentParts = input.split(" ");
        return `/${selectedCmd.name}${currentParts.length > 1 ? " " + currentParts.slice(1).join(" ") : ""}`;
      }
    }
    return input;
  }, [input, showAutocomplete, autocompleteIndex, commandPreview]);

  // Landing view - splash screen with centered input
  if (isLandingView) {
    return (
      <Box flexDirection="column" width={width} height={height}>
        {/* Mini header */}
        <Box justifyContent="center" paddingY={0}>
          <Text color="gray" dimColor>
            <Text color="cyan">/help</Text> commands •{" "}
            <Text color="cyan">/menu</Text> interactive •{" "}
            <Text color="cyan">/exit</Text> quit
          </Text>
        </Box>

        {/* Welcome banner centered */}
        <Box flexDirection="column" alignItems="center" flexGrow={1} justifyContent="center">
          <Welcome />

          {/* Centered input area with autocomplete - single container */}
          <Box
            flexDirection="column"
            marginTop={1}
            borderStyle="round"
            borderColor="cyan"
            width={54}
          >
            {/* Input row - always at top, position stays fixed */}
            <Box paddingX={2} paddingY={0}>
              <Text color="cyan" bold>
                {"❯ "}
              </Text>
              {autocompleteIndex >= 0 ? (
                <Text color="white">{displayInput}</Text>
              ) : (
                <TextInput
                  value={input}
                  onChange={handleInputChange}
                  onSubmit={handleSubmit}
                  placeholder="Type a command or /guide..."
                />
              )}
            </Box>

            {/* Command autocomplete suggestions - appear below input within same box */}
            {showCommandAutocomplete && commandPreview && (
              <Box flexDirection="column" borderStyle="single" borderColor="gray" borderTop borderBottom={false} borderLeft={false} borderRight={false}>
                {commandPreview.map((cmd, idx) => {
                  const isSelected = idx === autocompleteIndex;
                  return (
                    <Box key={cmd.name} paddingX={2}>
                      <Text
                        color={isSelected ? "black" : "cyan"}
                        backgroundColor={isSelected ? "cyan" : undefined}
                        bold={isSelected}
                      >
                        /{cmd.name}
                      </Text>
                      <Text
                        color={isSelected ? "black" : "gray"}
                        backgroundColor={isSelected ? "cyan" : undefined}
                      >
                        {" "}- {cmd.description.slice(0, 35)}
                        {cmd.description.length > 35 ? "..." : ""}
                      </Text>
                    </Box>
                  );
                })}
                <Box paddingX={2}>
                  <Text color="white">
                    ↑↓ navigate • Enter select
                  </Text>
                </Box>
              </Box>
            )}

            {/* Bash path completions */}
            {showBashAutocomplete && (
              <Box flexDirection="column" borderStyle="single" borderColor="gray" borderTop borderBottom={false} borderLeft={false} borderRight={false}>
                {bashCompletions.map((completion, idx) => {
                  const isSelected = idx === bashCompletionIndex;
                  const isDir = completion.endsWith("/");
                  return (
                    <Box key={completion} paddingX={2}>
                      <Text
                        color={isSelected ? "black" : isDir ? "blue" : "white"}
                        backgroundColor={isSelected ? "cyan" : undefined}
                        bold={isSelected}
                      >
                        {completion}
                      </Text>
                    </Box>
                  );
                })}
                <Box paddingX={2}>
                  <Text color="white">
                    Tab cycle • ↑↓ navigate • Enter accept
                  </Text>
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    );
  }

  // Conversation view - chatbot style with centered layout
  return (
    <Box flexDirection="column" width={width} height={height} alignItems="center">
      {/* Mini header */}
      <Box justifyContent="center" width="100%" paddingY={0}>
        <Text color="gray" dimColor>
          <Text color="cyan">/help</Text> commands •{" "}
          <Text color="cyan">/menu</Text> interactive •{" "}
          <Text color="cyan">/splash</Text> reset •{" "}
          <Text color="cyan">/exit</Text> quit
        </Text>
      </Box>

      {/* Centered content column */}
      <Box flexDirection="column" alignItems="center" flexGrow={1} width={60}>
        {/* Conversation history - scrollable */}
        <Box
          flexDirection="column"
          flexGrow={1}
          overflow="hidden"
          width="100%"
        >
          {visibleMessages.map((line, index) => (
            <Text
              key={index}
              color={getMessageColor(line.type)}
              wrap="truncate"
            >
              {line.isFirst ? getMessagePrefix(line.type) : "  "}
              {line.text}
            </Text>
          ))}
        </Box>

        {/* Scroll hint and splash shortcut */}
        <Box justifyContent="center" width="100%">
          <Text color="white">
            {canScrollUp ? "▲ PgUp" : "      "} │ {canScrollDown ? "PgDn ▼" : "      "} │ <Text color="cyan">/splash</Text> reset
          </Text>
        </Box>

        {/* Input area with autocomplete - matches splash style */}
        <Box
          flexDirection="column"
          marginTop={1}
          borderStyle="round"
          borderColor="cyan"
          width={54}
        >
          {/* Input row */}
          <Box paddingX={2} paddingY={0}>
            {isExecuting ? (
              <Box>
                <Text color="cyan">
                  <Spinner type="dots" />
                </Text>
                <Text color="gray"> Processing...</Text>
              </Box>
            ) : (
              <>
                <Text color="cyan" bold>
                  {"❯ "}
                </Text>
                {autocompleteIndex >= 0 ? (
                  <Text color="white">{displayInput}</Text>
                ) : (
                  <TextInput
                    value={input}
                    onChange={handleInputChange}
                    onSubmit={handleSubmit}
                    placeholder="bash or /command..."
                  />
                )}
              </>
            )}
          </Box>

          {/* Command autocomplete suggestions - appear below input within same box */}
          {showCommandAutocomplete && commandPreview && (
            <Box flexDirection="column" borderStyle="single" borderColor="gray" borderTop borderBottom={false} borderLeft={false} borderRight={false}>
              {commandPreview.map((cmd, idx) => {
                const isSelected = idx === autocompleteIndex;
                return (
                  <Box key={cmd.name} paddingX={2}>
                    <Text
                      color={isSelected ? "black" : "cyan"}
                      backgroundColor={isSelected ? "cyan" : undefined}
                      bold={isSelected}
                    >
                      /{cmd.name}
                    </Text>
                    <Text
                      color={isSelected ? "black" : "gray"}
                      backgroundColor={isSelected ? "cyan" : undefined}
                    >
                      {" "}- {cmd.description.slice(0, 35)}
                      {cmd.description.length > 35 ? "..." : ""}
                    </Text>
                  </Box>
                );
              })}
              <Box paddingX={2}>
                <Text color="white">
                  ↑↓ navigate • Enter select
                </Text>
              </Box>
            </Box>
          )}

          {/* Bash path completions */}
          {showBashAutocomplete && (
            <Box flexDirection="column" borderStyle="single" borderColor="gray" borderTop borderBottom={false} borderLeft={false} borderRight={false}>
              {bashCompletions.map((completion, idx) => {
                const isSelected = idx === bashCompletionIndex;
                const isDir = completion.endsWith("/");
                return (
                  <Box key={completion} paddingX={2}>
                    <Text
                      color={isSelected ? "black" : isDir ? "blue" : "white"}
                      backgroundColor={isSelected ? "cyan" : undefined}
                      bold={isSelected}
                    >
                      {completion}
                    </Text>
                  </Box>
                );
              })}
              <Box paddingX={2}>
                <Text color="white">
                  Tab cycle • ↑↓ navigate • Enter accept
                </Text>
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
