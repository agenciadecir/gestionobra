#!/bin/bash
cd /home/z/my-project
while true; do
  echo "[$(date)] Starting dev server..."
  bun run dev
  echo "[$(date)] Server stopped, restarting in 2s..."
  sleep 2
done
