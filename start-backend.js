#!/usr/bin/env node

// Simple start script for Railway deployment
// This ensures only the backend starts without any concurrency issues

const { spawn } = require('child_process');
const path = require('path');

console.log('Starting backend server...');

const serverPath = path.join(__dirname, 'server', 'dist', 'index.js');

const server = spawn('node', [serverPath], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production'
  }
});

server.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

server.on('exit', (code) => {
  console.log(`Server exited with code ${code}`);
  process.exit(code);
});

// Handle termination signals
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  server.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down...');
  server.kill('SIGINT');
});