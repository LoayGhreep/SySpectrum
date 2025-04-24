#!/bin/bash

SESSION_NAME="wrapper"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_CMD="node --max-old-space-size=128 index.js"
LOG_FILE="$SCRIPT_DIR/wrapper.log"
SLEEP_AFTER_EXIT=5

# Check if already running
if screen -list | grep -q "$SESSION_NAME"; then
  echo "[INFO] Screen session '$SESSION_NAME' is already running."
  exit 0
fi

# Define the actual runtime loop (inline as heredoc)
screen -dmS "$SESSION_NAME" bash -c "
  cd \"$SCRIPT_DIR\"
  while true; do
    NOW=\$(date '+%Y-%m-%d %H:%M:%S')
    echo \"[INFO] \$NOW - Starting Syspectrum Agent\" >> \"$LOG_FILE\"

    $APP_CMD
    EXIT_CODE=\$?

    NOW=\$(date '+%Y-%m-%d %H:%M:%S')
    echo \"[WARN] \$NOW - Agent exited (code \$EXIT_CODE), restarting in $SLEEP_AFTER_EXIT sec\" >> \"$LOG_FILE\"

    sleep $SLEEP_AFTER_EXIT
  done
"

echo "[SUCCESS] Agent started in screen session '$SESSION_NAME'."
