#!/usr/bin/env bash
# Automated first-time setup for the dictation server (bash / git bash / macOS / Linux).
#
# Usage:
#   cd dictation-server
#   bash setup.sh
#
# What it does:
#   1. Checks Python 3.10+ is available
#   2. Creates venv/ if missing
#   3. Activates the venv for the duration of this script
#   4. Installs dependencies from requirements.txt
#   5. Copies .env.example to .env if .env doesn't exist
#   6. Prints the command to start the server

set -euo pipefail

cd "$(dirname "$0")"

echo -e "\e[36m==> Checking Python...\e[0m"
PYTHON_BIN="python3"
if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
    PYTHON_BIN="python"
fi
if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
    echo -e "\e[31mERROR: Python not found. Install Python 3.10+ from https://python.org\e[0m"
    exit 1
fi

PY_VERSION="$($PYTHON_BIN --version 2>&1)"
echo "    $PY_VERSION"
PY_MAJOR=$(echo "$PY_VERSION" | sed -E 's/Python ([0-9]+)\.([0-9]+).*/\1/')
PY_MINOR=$(echo "$PY_VERSION" | sed -E 's/Python ([0-9]+)\.([0-9]+).*/\2/')
if [ "$PY_MAJOR" -lt 3 ] || { [ "$PY_MAJOR" -eq 3 ] && [ "$PY_MINOR" -lt 10 ]; }; then
    echo -e "\e[31mERROR: Python 3.10+ is required. Found $PY_VERSION\e[0m"
    exit 1
fi

echo -e "\e[36m==> Creating virtual environment in ./venv...\e[0m"
if [ -d venv ]; then
    echo "    venv/ already exists, reusing it."
else
    "$PYTHON_BIN" -m venv venv
    echo "    Created."
fi

# Pick the activation script for this shell
if [ -f venv/Scripts/activate ]; then
    # Git Bash on Windows
    ACTIVATE="venv/Scripts/activate"
else
    ACTIVATE="venv/bin/activate"
fi

echo -e "\e[36m==> Activating venv...\e[0m"
# shellcheck disable=SC1090
source "$ACTIVATE"

echo -e "\e[36m==> Installing dependencies (this takes ~2 minutes the first time)...\e[0m"
pip install --quiet --disable-pip-version-check -r requirements.txt
echo "    Done."

echo -e "\e[36m==> Checking .env...\e[0m"
if [ ! -f .env ]; then
    cp .env.example .env
    echo "    Created .env from .env.example."
else
    echo "    .env already exists, not overwriting."
fi

echo ""
echo -e "\e[32m============================================================\e[0m"
echo -e "\e[32mSetup complete.\e[0m"
echo -e "\e[32m============================================================\e[0m"
echo ""
echo -e "\e[33mTo start the server now, run:\e[0m"
echo "    uvicorn main:app --reload --port 8000"
echo ""
echo -e "\e[33mNext time, activate the venv first:\e[0m"
echo "    source $ACTIVATE"
echo "    uvicorn main:app --reload --port 8000"
echo ""
echo "First request will be slow (30-60s) while Whisper downloads the model."
