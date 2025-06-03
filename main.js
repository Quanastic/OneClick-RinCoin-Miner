const path = require('path');
console.log('SystemRoot:', process.env['SystemRoot']);
console.log('PATH:', process.env['PATH']);
const { app, BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const { shell } = require('electron');
const { autoUpdater } = require('electron-updater');

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

  // Handle external links
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    const currentURL = win.webContents.getURL();
    if (url !== currentURL) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  autoUpdater.checkForUpdatesAndNotify();
});

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
      detached: true,
      windowsHide: false
    });

    if (minerProcess.stdout) {
      minerProcess.stdout.on('data', data => {
        event.reply('miner-output', data.toString());
      });
    }

    minerProcess.on('close', code => {
      event.reply('miner-output', `\n🛑 Miner exited with code ${code}`);
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

  // Use full path to cmd.exe for reliability
  const cmdPath = path.join(process.env['SystemRoot'] || 'C:\\Windows', 'System32', 'cmd.exe');

  minerProcess = spawn('start start-rinhash.bat', {
  cwd: srbDir,
  shell: true,
  windowsHide: false
});


  minerProcess.on('close', code => {
    event.reply('miner-output', `\n🛑 SRBMiner exited with code ${code}`);
    minerProcess = null;
    currentMinerType = null;
  });
}});

ipcMain.on('stop-miner', event => {
  if (minerProcess && currentMinerType === 'srb') {
    event.reply('miner-output', '\nℹ️ SRBMiner must be closed manually.');
  } else {
    event.reply('miner-output', '\n⚠️ No miner is running.');
  }
});

// Auto-update listeners (optional: add renderer messaging later)
autoUpdater.on('update-available', () => {
  console.log('🔄 Update available.');
});

autoUpdater.on('update-downloaded', () => {
  console.log('✅ Update downloaded. Will install on app restart.');
});
