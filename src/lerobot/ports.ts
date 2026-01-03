import { SerialPort } from "serialport";
import type { PortInfo } from "./types.js";
import * as client from "./client.js";

/**
 * Discover serial ports and identify likely robot connections.
 * Uses the Python server if available, falls back to serialport library.
 */
export async function findPorts(): Promise<PortInfo[]> {
  // Try using the Python server first (better detection)
  if (await client.isServerHealthy()) {
    const result = await client.listPorts();
    if (result.success && result.ports) {
      return result.ports.map((p) => ({
        device: p.device,
        description: p.description,
        hwid: p.hwid,
        isLikelyRobot: p.is_likely_robot,
      }));
    }
  }

  // Fallback to direct serialport
  try {
    const ports = await SerialPort.list();

    return ports.map((port) => {
      // Check if this looks like a robot connection
      const isLikelyRobot =
        port.manufacturer?.toLowerCase().includes("ftdi") ||
        port.manufacturer?.toLowerCase().includes("silicon") ||
        port.manufacturer?.toLowerCase().includes("qinheng") ||
        port.vendorId === "0403" || // FTDI
        port.vendorId === "10c4" || // Silicon Labs
        port.vendorId === "1a86" || // QinHeng (CH340)
        port.path.includes("ttyUSB") ||
        port.path.includes("ttyACM") ||
        port.path.includes("cu.usbserial") ||
        port.path.includes("cu.usbmodem");

      return {
        device: port.path,
        description: port.manufacturer || port.pnpId || "Unknown device",
        hwid: `${port.vendorId || ""}:${port.productId || ""}`,
        isLikelyRobot,
      };
    });
  } catch (error) {
    console.error("Error listing serial ports:", error);
    return [];
  }
}

/**
 * Check if a specific port exists and is accessible
 */
export async function checkPort(device: string): Promise<boolean> {
  try {
    const ports = await SerialPort.list();
    return ports.some((port) => port.path === device);
  } catch {
    return false;
  }
}

/**
 * Get ports filtered to likely robot connections
 */
export async function findRobotPorts(): Promise<PortInfo[]> {
  const ports = await findPorts();
  return ports.filter((port) => port.isLikelyRobot);
}
