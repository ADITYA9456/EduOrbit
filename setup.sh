#!/usr/bin/env bash
# ============================================================
#  EduOrbit - One-click setup for macOS / Linux
#  Run:  bash setup.sh
# ============================================================
set -e

echo
echo "===== EduOrbit setup (macOS / Linux) ====="
echo

if ! command -v node >/dev/null 2>&1; then
  echo "[ERROR] Node.js is not installed."
  echo "Install the LTS version from https://nodejs.org and run this again."
  exit 1
fi

echo "Node version: $(node -v)"
echo

echo "Removing any old / corrupted dependencies..."
rm -rf node_modules .next

echo
echo "Installing dependencies (this can take a few minutes)..."
npm install

echo
echo "===== Done! Starting the dev server... ====="
echo "Open http://localhost:3000 in your browser."
echo "Press Ctrl+C to stop."
echo
npm run dev
