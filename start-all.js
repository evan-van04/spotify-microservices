const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
require('dotenv').config({ path: path.join(__dirname, 'spotify-auth', '.env') });



// Helper to spawn a Node process
function runService(name, scriptPath, env = {}) {
  const proc = spawn('node', [scriptPath], {
    stdio: 'inherit',
    env: { ...process.env, ...env } // merge with current env
  });

  proc.on('close', code => {
    console.log(`${name} exited with code ${code}`);
    process.exit(code);
  });

  return proc;
}

// Cross-platform function to open browser
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

// Paths to server.js files
const authPath = path.join(__dirname, 'spotify-auth', 'server.js');
const mainPath = path.join(__dirname, 'server.js');

// Run services (dotenv will load the .env automatically)
const authProc = runService('Spotify Auth', authPath);
const mainProc = runService('Main Service', mainPath);

// Open the main UI in default browser
openBrowser('http://localhost:8080');
