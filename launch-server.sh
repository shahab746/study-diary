#!/bin/bash
# Double-fork to completely detach from parent
(   
    cd /home/z/my-project
    # Close all file descriptors
    exec 0<&-
    exec 1>/home/z/my-project/dev.log
    exec 2>&1
    
    # Set environment
    export NODE_OPTIONS="--max-old-space-size=384"
    
    # Auto-restart loop
    while true; do
        echo "[$(date)] Starting Next.js server..."
        bun node_modules/next/dist/bin/next start -p 3000 -H 0.0.0.0
        echo "[$(date)] Server exited, restarting in 3s..."
        sleep 3
    done
) &
# Disown the background process
disown $!
