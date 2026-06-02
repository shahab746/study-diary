#!/bin/bash
cd /home/z/my-project
export NODE_OPTIONS="--max-old-space-size=512"
while true; do
  echo "[$(date)] Starting next server..."
  node node_modules/.bin/next start -p 3000 2>&1
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE, restarting in 2s..."
  sleep 2
done
