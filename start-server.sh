#!/bin/bash
cd /home/z/my-project

# Ensure env vars
if ! grep -q "NEXTAUTH_SECRET" .env 2>/dev/null; then
  echo "NEXTAUTH_SECRET=lecture-diary-secret-key-2024-secure" >> .env
fi

# Start the server in a loop
while true; do
  echo "[$(date)] Starting Next.js server..."
  NODE_OPTIONS="--max-old-space-size=384" \
    bun node_modules/next/dist/bin/next start -p 3000 -H 0.0.0.0
  echo "[$(date)] Server exited, restarting in 3s..."
  sleep 3
done
