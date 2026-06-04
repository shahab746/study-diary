#!/bin/bash
# Double-fork daemon pattern
cd /home/z/my-project

(
  # First fork
  cd /home/z/my-project
  # Ensure env vars
  if ! grep -q "NEXTAUTH_SECRET" .env 2>/dev/null; then
    echo "NEXTAUTH_SECRET=lecture-diary-secret-key-2024-secure" >> .env
  fi
  
  while true; do
    echo "[$(date)] Starting Next.js server..." >> /home/z/my-project/dev.log
    NODE_OPTIONS="--max-old-space-size=384" \
      bun node_modules/next/dist/bin/next start -p 3000 -H 0.0.0.0 >> /home/z/my-project/dev.log 2>&1
    echo "[$(date)] Server exited, restarting in 3s..." >> /home/z/my-project/dev.log
    sleep 3
  done
) &
# Detach from parent
disown
