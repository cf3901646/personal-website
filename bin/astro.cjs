#!/usr/bin/env node
const { spawn } = require('child_process');
const child = spawn('npx', ['vite', 'build'], {
  stdio: 'inherit',
  shell: true
});
child.on('exit', (code) => {
  process.exit(code === null ? 1 : code);
});
