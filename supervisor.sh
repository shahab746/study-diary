#!/bin/bash
# Supervisor script for Next.js server
LOG="/home/z/my-project/dev.log"
RESTART_LOG="/home/z/my-project/restarts.log"

cd /home/z/my-project

while true; do
  echo "[$(date)] Starting server..." >> "$RESTART_LOG"
  NODE_OPTIONS="--max-old-space-size=384" NEXT_PRIVATE_WORKER=0 \
    node node_modules/next/dist/bin/next start -p 3000 -H 0.0.0.0 >> "$LOG" 2>&1
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE, restarting in 3s..." >> "$RESTART_LOG"
  sleep 3
done
