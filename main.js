const path = require('path');
const { app, BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const { shell } = require('electron');

let minerProcess = null;
let currentMinerType = null; // 'cpu' or 'srb'

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('start-miner', (event, { wallet, type }) => {
  if (minerProcess) {
    event.reply('miner-output', '⚠️ Miner already running.\n');
    return;
  }

  currentMinerType = type;

  if (type === 'cpu') {
    const exePath = path.join(__dirname, 'miner', 'cpu-miner', 'cpuminer.exe');
    const args = [
      '-a', 'rinhash',
      '-o', 'stratum+tcp://rinhash.eu.mine.zergpool.com:7148',
      '-u', `${wallet}.worker`,
      '-p', 'x',
    ];

    minerProcess = spawn(exePath, args, {
      shell: false,
      detached: false,
      windowsHide: true
    });

    if (minerProcess.stdout) {
      minerProcess.stdout.on('data', data => {
        event.reply('miner-output', data.toString());
      });
    }

    if (minerProcess.stderr) {
      minerProcess.stderr.on('data', data => {
        event.reply('miner-output', '❌ ' + data.toString());
      });
    }

    minerProcess.on('close', code => {
      event.reply('miner-output', `\n🛑 cpuminer exited with code ${code}`);
      minerProcess = null;
      currentMinerType = null;
    });

  } else if (type === 'srb') {
    const srbDir = path.join(__dirname, 'miner', 'srb-miner');
    const templatePath = path.join(srbDir, 'start-rinhash-template.bat');
    const tempBatPath = path.join(srbDir, 'start-rinhash.bat');

    let batContent = fs.readFileSync(templatePath, 'utf-8');
    batContent = batContent.replace('YOUR_WALLET', wallet);
    fs.writeFileSync(tempBatPath, batContent);

   minerProcess = spawn('cmd.exe', ['/c', 'start', 'start-rinhash.bat'], {
    cwd: srbDir,
    windowsHide: false 
  });

  
    minerProcess.on('close', code => {
      event.reply('miner-output', `\n🛑 SRBMiner exited with code ${code}`);
      minerProcess = null;
      currentMinerType = null;
    });
  }

  event.reply('miner-output', `⛏️ Starting ${type === 'cpu' ? 'cpuminer-avx' : 'SRBMiner'}...\n`);
});

ipcMain.on('stop-miner', event => {
  if (minerProcess && currentMinerType === 'cpu') {
    // Use taskkill for cpuminer
    const exeName = 'cpuminer.exe';
    spawn('taskkill', ['/f', '/im', exeName]).on('exit', () => {
      event.reply('miner-output', '\n🛑 cpuminer has been stopped using taskkill.');
      minerProcess = null;
      currentMinerType = null;
    });
  } else if (minerProcess && currentMinerType === 'srb') {
    // Let the user close the SRBMiner window manually
    event.reply('miner-output', '\nℹ️ SRBMiner must be closed manually.');
  } else {
    event.reply('miner-output', '\n⚠️ No miner is running.');
  }
});

// for opeining links

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadFile('index.html');

  // 🧠 Intercept new-window or navigation attempts
  win.webContents.setWindowOpenHandler(({ url }) => {
    // Open the URL in the default browser
    shell.openExternal(url);
    return { action: 'deny' }; // Prevent Electron from opening it in a new window
  });

  win.webContents.on('will-navigate', (event, url) => {
    const currentURL = win.webContents.getURL();
    if (url !== currentURL) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
}