#!/bin/bash
cd /home/z/my-project
while true; do
  echo "[$(date)] Starting dev server..."
  node node_modules/.bin/next dev -p 3000 2>&1 &
  SERVER_PID=$!
  # Wait for the server to be ready
  sleep 5
  # Wait until the server dies
  while kill -0 $SERVER_PID 2>/dev/null; do
    sleep 2
  done
  echo "[$(date)] Server died (PID $SERVER_PID), restarting in 3s..."
  sleep 3
done
