/**
 * File: start-all.js
 * Author: Mike Tran
 * Course: CS4471
 */

const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

// Load environment variables from spotify-auth/.env
require('dotenv').config({
  path: path.join(__dirname, 'spotify-auth', '.env')
});

/* ================================
   Section: Helper – Run a Service
   ================================ */
function runService(name, scriptPath, env = {}) {
  const proc = spawn('node', [scriptPath], {
    stdio: 'inherit',
    env: { ...process.env, ...env }
  });

  proc.on('close', code => {
    console.log(`${name} exited with code ${code}`);
    process.exit(code);
  });

  return proc;
}

/* ================================
   Section: Helper – Open Browser
   ================================ */
function openBrowser(url) {
  const platform = os.platform();
  let cmd;

  if (platform === 'win32') {
    cmd = 'start';
  } else if (platform === 'darwin') {
    cmd = 'open';
  } else {
    cmd = 'xdg-open';
  }

  spawn(cmd, [url], { shell: true, stdio: 'ignore' });
}

/* ================================
   Section: Paths to Services
   ================================ */
const authPath = path.join(__dirname, 'spotify-auth', 'server.js');
const mainPath = path.join(__dirname, 'server.js');
const serviceRegistryPath = path.join(__dirname, 'service-registry', 'server.js');

/* ================================
   Section: Run All Services
   ================================ */
const authProc = runService('Spotify Auth', authPath);
const mainProc = runService('Main Service', mainPath);
const serviceRegistryProc = runService('Service Registry', serviceRegistryPath);

/* ================================
   Section: Open Main UI
   ================================ */
openBrowser('http://localhost:8080');