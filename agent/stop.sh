#!/bin/bash

SESSION_NAME="wrapper"

# Check and terminate screen session
if screen -list | grep -q "$SESSION_NAME"; then
  screen -S "$SESSION_NAME" -X quit
  echo "[SUCCESS] Stopped screen session '$SESSION_NAME'."
else
  echo "[INFO] No running screen session named '$SESSION_NAME'."
fi
