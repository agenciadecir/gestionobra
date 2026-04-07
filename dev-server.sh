#!/bin/bash
cd /home/z/my-project
while true; do
  echo "=== Starting $(date) ===" >> /home/z/my-project/dev.log
  /usr/local/bin/bun run dev >> /home/z/my-project/dev.log 2>&1
  echo "=== Restarting $(date) ===" >> /home/z/my-project/dev.log
  sleep 1
done
