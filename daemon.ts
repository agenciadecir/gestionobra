// Simple daemon that keeps next.js dev server alive
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const logFile = path.join('/home/z/my-project', 'daemon.log');

function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync(logFile, line);
  process.stdout.write(line);
}

log('Daemon starting...');

function startServer() {
  log('Starting Next.js dev server...');
  const child = spawn('bun', ['run', 'dev'], {
    cwd: '/home/z/my-project',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env },
  });

  child.stdout?.on('data', (data) => {
    fs.appendFileSync(logFile, data.toString());
  });

  child.stderr?.on('data', (data) => {
    fs.appendFileSync(logFile, data.toString());
  });

  child.on('exit', (code) => {
    log(`Server exited with code ${code}. Restarting in 3s...`);
    setTimeout(startServer, 3000);
  });

  child.on('error', (err) => {
    log(`Server error: ${err.message}. Restarting in 3s...`);
    setTimeout(startServer, 3000);
  });

  return child;
}

startServer();

// Keep daemon alive
process.on('SIGTERM', () => {
  log('Daemon received SIGTERM, exiting...');
  process.exit(0);
});

// Prevent the process from exiting
setInterval(() => {}, 60000);
