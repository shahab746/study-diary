#!/bin/bash
cd /home/z/my-project
while true; do
  NODE_OPTIONS="--max-old-space-size=384" NEXT_PRIVATE_WORKER=0 \
    node node_modules/next/dist/bin/next start -p 3000 -H 0.0.0.0 \
    >> /home/z/my-project/dev.log 2>&1
  echo "[$(date)] Server exited, restarting in 2s" >> /home/z/my-project/restarts.log
  sleep 2
done
