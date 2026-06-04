#!/bin/bash
cd /home/z/my-project

# Ensure NEXTAUTH_SECRET is in .env (start.sh may overwrite it with just DATABASE_URL)
if ! grep -q "NEXTAUTH_SECRET" .env 2>/dev/null; then
  echo "NEXTAUTH_SECRET=lecture-diary-secret-key-2024-secure" >> .env
fi
# Do NOT set NEXTAUTH_URL — let NextAuth auto-detect from the request origin
# This ensures redirects work correctly through the Caddy proxy (port 81)

# Build if needed
if [ ! -f ".next/BUILD_ID" ]; then
  echo "Building production bundle..."
  bun run build
fi

# Auto-restart loop using bun runtime (more memory-efficient than node)
while true; do
  echo "[$(date)] Starting Next.js server..."
  NODE_OPTIONS="--max-old-space-size=384" \
    bun node_modules/next/dist/bin/next start -p 3000 -H 0.0.0.0
  echo "[$(date)] Server exited, restarting in 3s..."
  sleep 3
done
