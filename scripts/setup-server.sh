#!/bin/bash
# Setup script for Maker Robot Server
#
# This creates a Python virtual environment and installs all dependencies
# needed to run the robot control server.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LEROBOT_DIR="$(dirname "$PROJECT_DIR")/lerobot"
VENV_DIR="$PROJECT_DIR/.venv"

echo "=== Maker Robot Server Setup ==="
echo "Project: $PROJECT_DIR"
echo "LeRobot: $LEROBOT_DIR"
echo "Venv:    $VENV_DIR"
echo ""

# Check if lerobot exists
if [ ! -d "$LEROBOT_DIR" ]; then
    echo "ERROR: lerobot not found at $LEROBOT_DIR"
    echo "Please clone lerobot to ../lerobot"
    exit 1
fi

# Create virtual environment
if [ ! -d "$VENV_DIR" ]; then
    echo "Creating virtual environment..."
    python3 -m venv "$VENV_DIR"
fi

# Activate venv
source "$VENV_DIR/bin/activate"

echo "Installing dependencies..."

# Upgrade pip
pip install --upgrade pip

# Install base dependencies
pip install \
    flask>=3.0.0 \
    pyserial>=3.5 \
    feetech-servo-sdk

# Install lerobot in editable mode
echo "Installing lerobot from $LEROBOT_DIR..."
pip install -e "$LEROBOT_DIR"

echo ""
echo "=== Setup Complete ==="
echo ""
echo "To start the server:"
echo "  source $VENV_DIR/bin/activate"
echo "  python $PROJECT_DIR/python/server.py"
echo ""
echo "Or use the start script:"
echo "  $PROJECT_DIR/scripts/start-server.sh"
