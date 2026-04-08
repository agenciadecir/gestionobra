#!/bin/bash
while true; do
  bun run dev 2>&1
  echo "Server died, restarting in 3s..."
  sleep 3
done
