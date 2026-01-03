#!/usr/bin/env bun
import { render } from "ink";
import App from "./app.js";

// Clear screen and hide cursor for cleaner TUI experience
process.stdout.write("\x1B[2J\x1B[0f");

const { waitUntilExit } = render(<App />);

waitUntilExit().then(() => {
  // Show cursor again on exit
  process.stdout.write("\x1B[?25h");
  process.exit(0);
});
