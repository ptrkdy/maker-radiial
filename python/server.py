#!/usr/bin/env python3
"""
Maker Robot Server - Flask server that wraps lerobot for robot control.
This server provides HTTP endpoints for connecting to and controlling robot arms.
"""

import json
import logging
import os
import sys
from pathlib import Path
from typing import Any

from flask import Flask, jsonify, request

# Add lerobot to path
LEROBOT_PATH = Path(__file__).parent.parent.parent / "lerobot" / "src"
if LEROBOT_PATH.exists():
    sys.path.insert(0, str(LEROBOT_PATH))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("maker-server")

app = Flask(__name__)

# Global state for connected devices
connected_robots: dict[str, Any] = {}
connected_teleops: dict[str, Any] = {}


def get_robot_class(robot_type: str):
    """Get the robot class for a given robot type."""
    if robot_type == "uj201_follower":
        from lerobot.robots.uj201_follower import UJ201Follower, UJ201FollowerConfig
        return UJ201Follower, UJ201FollowerConfig
    elif robot_type == "so100_follower" or robot_type == "so100":
        from lerobot.robots.so100_follower import SO100Follower, SO100FollowerConfig
        return SO100Follower, SO100FollowerConfig
    elif robot_type == "so101_follower" or robot_type == "so101":
        from lerobot.robots.so101_follower import SO101Follower, SO101FollowerConfig
        return SO101Follower, SO101FollowerConfig
    elif robot_type == "koch_follower" or robot_type == "koch":
        from lerobot.robots.koch_follower import KochFollower, KochFollowerConfig
        return KochFollower, KochFollowerConfig
    else:
        raise ValueError(f"Unknown robot type: {robot_type}")


def get_teleop_class(teleop_type: str):
    """Get the teleoperator class for a given teleop type."""
    if teleop_type == "uj201_leader":
        from lerobot.teleoperators.uj201_leader import UJ201Leader, UJ201LeaderConfig
        return UJ201Leader, UJ201LeaderConfig
    elif teleop_type == "so100_leader":
        from lerobot.teleoperators.so100_leader import SO100Leader, SO100LeaderConfig
        return SO100Leader, SO100LeaderConfig
    elif teleop_type == "so101_leader":
        from lerobot.teleoperators.so101_leader import SO101Leader, SO101LeaderConfig
        return SO101Leader, SO101LeaderConfig
    elif teleop_type == "koch_leader":
        from lerobot.teleoperators.koch_leader import KochLeader, KochLeaderConfig
        return KochLeader, KochLeaderConfig
    else:
        raise ValueError(f"Unknown teleop type: {teleop_type}")


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({"status": "ok", "version": "0.1.0"})


@app.route("/ports", methods=["GET"])
def list_ports():
    """List available serial ports."""
    try:
        from serial.tools import list_ports

        ports = []
        for port in list_ports.comports():
            is_likely_robot = (
                (port.manufacturer and "qinheng" in port.manufacturer.lower()) or
                (port.manufacturer and "ftdi" in port.manufacturer.lower()) or
                (port.manufacturer and "silicon" in port.manufacturer.lower()) or
                port.vid == 0x1A86 or  # QinHeng (CH340)
                port.vid == 0x0403 or  # FTDI
                port.vid == 0x10C4 or  # Silicon Labs
                "ttyUSB" in port.device or
                "ttyACM" in port.device or
                "usbserial" in port.device or
                "usbmodem" in port.device
            )
            ports.append({
                "device": port.device,
                "description": port.description or port.manufacturer or "Unknown",
                "hwid": f"{port.vid:04x}:{port.pid:04x}" if port.vid else "",
                "manufacturer": port.manufacturer,
                "serial_number": port.serial_number,
                "is_likely_robot": is_likely_robot,
            })

        return jsonify({"success": True, "ports": ports})
    except Exception as e:
        logger.exception("Error listing ports")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/robot/connect", methods=["POST"])
def robot_connect():
    """Connect to a robot."""
    try:
        data = request.json
        robot_type = data.get("robot_type")
        port = data.get("port")
        robot_id = data.get("id") or f"{robot_type}_{port.split('/')[-1]}"
        calibrate = data.get("calibrate", False)  # Default to False for non-interactive

        if not robot_type or not port:
            return jsonify({"success": False, "error": "robot_type and port are required"}), 400

        if robot_id in connected_robots:
            return jsonify({"success": False, "error": f"Robot {robot_id} already connected"}), 400

        RobotClass, ConfigClass = get_robot_class(robot_type)

        # Create config and robot instance
        config = ConfigClass(port=port)
        robot = RobotClass(config)

        # Connect (without interactive calibration by default)
        robot.connect(calibrate=calibrate)

        connected_robots[robot_id] = {
            "robot": robot,
            "robot_type": robot_type,
            "port": port,
        }

        logger.info(f"Connected to robot {robot_id} ({robot_type}) on {port}")

        return jsonify({
            "success": True,
            "id": robot_id,
            "robot_type": robot_type,
            "port": port,
            "is_calibrated": robot.is_calibrated,
        })
    except Exception as e:
        logger.exception("Error connecting to robot")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/robot/disconnect", methods=["POST"])
def robot_disconnect():
    """Disconnect from a robot."""
    try:
        data = request.json
        robot_id = data.get("id")

        if not robot_id:
            # Disconnect all robots
            for rid in list(connected_robots.keys()):
                try:
                    connected_robots[rid]["robot"].disconnect()
                except Exception as e:
                    logger.warning(f"Error disconnecting robot {rid}: {e}")
                del connected_robots[rid]
            return jsonify({"success": True, "message": "All robots disconnected"})

        if robot_id not in connected_robots:
            return jsonify({"success": False, "error": f"Robot {robot_id} not connected"}), 404

        connected_robots[robot_id]["robot"].disconnect()
        del connected_robots[robot_id]

        logger.info(f"Disconnected robot {robot_id}")
        return jsonify({"success": True})
    except Exception as e:
        logger.exception("Error disconnecting robot")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/robot/observation", methods=["GET"])
def robot_observation():
    """Get current robot observation (joint positions)."""
    try:
        robot_id = request.args.get("id")

        if robot_id:
            if robot_id not in connected_robots:
                return jsonify({"success": False, "error": f"Robot {robot_id} not connected"}), 404
            robots_to_read = {robot_id: connected_robots[robot_id]}
        else:
            robots_to_read = connected_robots

        if not robots_to_read:
            return jsonify({"success": False, "error": "No robots connected"}), 404

        observations = {}
        for rid, rdata in robots_to_read.items():
            obs = rdata["robot"].get_observation()
            # Convert observation to JSON-serializable format
            obs_json = {}
            for key, value in obs.items():
                if hasattr(value, "tolist"):  # numpy array
                    obs_json[key] = value.tolist()
                elif hasattr(value, "shape"):  # image/tensor - skip for now
                    obs_json[key] = f"<image {value.shape}>"
                else:
                    obs_json[key] = value
            observations[rid] = obs_json

        return jsonify({"success": True, "observations": observations})
    except Exception as e:
        logger.exception("Error getting robot observation")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/robot/action", methods=["POST"])
def robot_action():
    """Send action to robot."""
    try:
        data = request.json
        robot_id = data.get("id")
        action = data.get("action")

        if not action:
            return jsonify({"success": False, "error": "action is required"}), 400

        if robot_id:
            if robot_id not in connected_robots:
                return jsonify({"success": False, "error": f"Robot {robot_id} not connected"}), 404
            robot = connected_robots[robot_id]["robot"]
        else:
            if not connected_robots:
                return jsonify({"success": False, "error": "No robots connected"}), 404
            robot = list(connected_robots.values())[0]["robot"]

        sent_action = robot.send_action(action)
        return jsonify({"success": True, "action_sent": sent_action})
    except Exception as e:
        logger.exception("Error sending action")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/robot/status", methods=["GET"])
def robot_status():
    """Get status of connected robots."""
    try:
        status = {}
        for robot_id, rdata in connected_robots.items():
            robot = rdata["robot"]
            status[robot_id] = {
                "robot_type": rdata["robot_type"],
                "port": rdata["port"],
                "is_connected": robot.is_connected,
                "is_calibrated": robot.is_calibrated,
            }

        return jsonify({
            "success": True,
            "robots": status,
            "count": len(status),
        })
    except Exception as e:
        logger.exception("Error getting robot status")
        return jsonify({"success": False, "error": str(e)}), 500


# === Teleoperator endpoints ===

@app.route("/teleop/connect", methods=["POST"])
def teleop_connect():
    """Connect to a teleoperator (leader arm)."""
    try:
        data = request.json
        teleop_type = data.get("teleop_type")
        port = data.get("port")
        teleop_id = data.get("id") or f"{teleop_type}_{port.split('/')[-1]}"
        calibrate = data.get("calibrate", False)

        if not teleop_type or not port:
            return jsonify({"success": False, "error": "teleop_type and port are required"}), 400

        if teleop_id in connected_teleops:
            return jsonify({"success": False, "error": f"Teleop {teleop_id} already connected"}), 400

        TeleopClass, ConfigClass = get_teleop_class(teleop_type)

        config = ConfigClass(port=port)
        teleop = TeleopClass(config)
        teleop.connect(calibrate=calibrate)

        connected_teleops[teleop_id] = {
            "teleop": teleop,
            "teleop_type": teleop_type,
            "port": port,
        }

        logger.info(f"Connected to teleop {teleop_id} ({teleop_type}) on {port}")

        return jsonify({
            "success": True,
            "id": teleop_id,
            "teleop_type": teleop_type,
            "port": port,
            "is_calibrated": teleop.is_calibrated,
        })
    except Exception as e:
        logger.exception("Error connecting to teleop")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/teleop/disconnect", methods=["POST"])
def teleop_disconnect():
    """Disconnect from a teleoperator."""
    try:
        data = request.json
        teleop_id = data.get("id")

        if not teleop_id:
            for tid in list(connected_teleops.keys()):
                try:
                    connected_teleops[tid]["teleop"].disconnect()
                except Exception as e:
                    logger.warning(f"Error disconnecting teleop {tid}: {e}")
                del connected_teleops[tid]
            return jsonify({"success": True, "message": "All teleops disconnected"})

        if teleop_id not in connected_teleops:
            return jsonify({"success": False, "error": f"Teleop {teleop_id} not connected"}), 404

        connected_teleops[teleop_id]["teleop"].disconnect()
        del connected_teleops[teleop_id]

        logger.info(f"Disconnected teleop {teleop_id}")
        return jsonify({"success": True})
    except Exception as e:
        logger.exception("Error disconnecting teleop")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/teleop/read", methods=["GET"])
def teleop_read():
    """Read current teleop state (joint positions)."""
    try:
        teleop_id = request.args.get("id")

        if teleop_id:
            if teleop_id not in connected_teleops:
                return jsonify({"success": False, "error": f"Teleop {teleop_id} not connected"}), 404
            teleops_to_read = {teleop_id: connected_teleops[teleop_id]}
        else:
            teleops_to_read = connected_teleops

        if not teleops_to_read:
            return jsonify({"success": False, "error": "No teleops connected"}), 404

        states = {}
        for tid, tdata in teleops_to_read.items():
            state = tdata["teleop"].get_action()
            # Convert to JSON-serializable
            state_json = {}
            for key, value in state.items():
                if hasattr(value, "tolist"):
                    state_json[key] = value.tolist()
                else:
                    state_json[key] = value
            states[tid] = state_json

        return jsonify({"success": True, "states": states})
    except Exception as e:
        logger.exception("Error reading teleop state")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/teleop/status", methods=["GET"])
def teleop_status():
    """Get status of connected teleops."""
    try:
        status = {}
        for teleop_id, tdata in connected_teleops.items():
            teleop = tdata["teleop"]
            status[teleop_id] = {
                "teleop_type": tdata["teleop_type"],
                "port": tdata["port"],
                "is_connected": teleop.is_connected,
                "is_calibrated": teleop.is_calibrated,
            }

        return jsonify({
            "success": True,
            "teleops": status,
            "count": len(status),
        })
    except Exception as e:
        logger.exception("Error getting teleop status")
        return jsonify({"success": False, "error": str(e)}), 500


# === Teleoperation session endpoints ===

@app.route("/session/teleop", methods=["POST"])
def teleop_session():
    """Run a single teleoperation step: read leader, send to follower."""
    try:
        data = request.json or {}
        robot_id = data.get("robot_id")
        teleop_id = data.get("teleop_id")

        # Get robot
        if robot_id:
            if robot_id not in connected_robots:
                return jsonify({"success": False, "error": f"Robot {robot_id} not connected"}), 404
            robot = connected_robots[robot_id]["robot"]
        else:
            if not connected_robots:
                return jsonify({"success": False, "error": "No robots connected"}), 404
            robot = list(connected_robots.values())[0]["robot"]

        # Get teleop
        if teleop_id:
            if teleop_id not in connected_teleops:
                return jsonify({"success": False, "error": f"Teleop {teleop_id} not connected"}), 404
            teleop = connected_teleops[teleop_id]["teleop"]
        else:
            if not connected_teleops:
                return jsonify({"success": False, "error": "No teleops connected"}), 404
            teleop = list(connected_teleops.values())[0]["teleop"]

        # Read leader position
        leader_state = teleop.get_action()

        # Send to follower
        sent_action = robot.send_action(leader_state)

        # Read follower observation
        follower_obs = robot.get_observation()

        # Convert to JSON
        result = {
            "leader": {},
            "follower": {},
            "action_sent": {},
        }

        for key, value in leader_state.items():
            if hasattr(value, "tolist"):
                result["leader"][key] = value.tolist()
            elif not hasattr(value, "shape"):
                result["leader"][key] = value

        for key, value in follower_obs.items():
            if hasattr(value, "tolist"):
                result["follower"][key] = value.tolist()
            elif not hasattr(value, "shape"):
                result["follower"][key] = value

        for key, value in sent_action.items():
            if hasattr(value, "tolist"):
                result["action_sent"][key] = value.tolist()
            else:
                result["action_sent"][key] = value

        return jsonify({"success": True, **result})
    except Exception as e:
        logger.exception("Error in teleop session")
        return jsonify({"success": False, "error": str(e)}), 500


def main():
    """Run the server."""
    port = int(os.environ.get("MAKER_SERVER_PORT", 5577))
    host = os.environ.get("MAKER_SERVER_HOST", "127.0.0.1")
    debug = os.environ.get("MAKER_SERVER_DEBUG", "false").lower() == "true"

    logger.info(f"Starting Maker Robot Server on {host}:{port}")
    logger.info(f"lerobot path: {LEROBOT_PATH}")

    app.run(host=host, port=port, debug=debug, threaded=True)


if __name__ == "__main__":
    main()
