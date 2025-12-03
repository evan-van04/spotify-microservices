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
const serviceRegistryPath = path.join(__dirname, 'service-registry', 'server.js');

// Run services (dotenv will load the .env automatically)
const serviceRegistryProc = runService('Service Registry', serviceRegistryPath, {
  PORT: '8082'
});

console.log('Starting Spotify Auth on port 8081...');
const authProc = runService('Spotify Auth', authPath, {
  PORT: '8081'
});
const mainProc = runService('Main Service', mainPath);


// Open the main UI in default browser
openBrowser('http://localhost:8080');
