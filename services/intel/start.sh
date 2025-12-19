#!/bin/bash
# Start script for Render deployment
# This ensures Python can find the app module
set -e  # Exit on error

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

# Set PYTHONPATH to current directory
export PYTHONPATH="$SCRIPT_DIR:$PYTHONPATH"

# Verify we're in the right place
if [ ! -d "app" ]; then
    echo "ERROR: 'app' directory not found in $(pwd)"
    ls -la
    exit 1
fi

if [ ! -f "app/main.py" ]; then
    echo "ERROR: 'app/main.py' not found"
    exit 1
fi

# Run uvicorn
exec python3 -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}

