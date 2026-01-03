#!/bin/bash
# Start the Maker Robot Server
#
# This script activates the virtual environment and starts the Flask server.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
VENV_DIR="$PROJECT_DIR/.venv"

# Check if venv exists
if [ ! -d "$VENV_DIR" ]; then
    echo "Virtual environment not found. Running setup..."
    "$SCRIPT_DIR/setup-server.sh"
fi

# Activate venv
source "$VENV_DIR/bin/activate"

# Set environment variables
export MAKER_SERVER_HOST="${MAKER_SERVER_HOST:-127.0.0.1}"
export MAKER_SERVER_PORT="${MAKER_SERVER_PORT:-5577}"

echo "Starting Maker Robot Server on $MAKER_SERVER_HOST:$MAKER_SERVER_PORT..."

# Run the server
exec python "$PROJECT_DIR/python/server.py"
