const path = require('path');
const { app, BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const { shell } = require('electron');
const { autoUpdater } = require('electron-updater');

let minerProcess = null;

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

ipcMain.on('start-miner', (event, { wallet }) => {
  if (minerProcess) {
    event.reply('miner-output', '⚠️ Miner already running.\n');
    return;
  }

  const srbDir = path.join(__dirname, 'miner', 'srb-miner');
  const templatePath = path.join(srbDir, 'start-rinhash-template.bat');
  const tempBatPath = path.join(srbDir, 'start-rinhash.bat');

  try {
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
    });

    event.reply('miner-output', `⛏️ Starting SRBMiner...\n`);
  } catch (err) {
    event.reply('miner-output', `❌ Failed to start miner: ${err.message}\n`);
  }
});

ipcMain.on('stop-miner', event => {
  if (minerProcess) {
    event.reply('miner-output', '\nℹ️ SRBMiner must be closed manually.');
  } else {
    event.reply('miner-output', '\n⚠️ No miner is running.');
  }
});

// Auto-update listeners
autoUpdater.on('update-available', () => {
  console.log('🔄 Update available.');
});

autoUpdater.on('update-downloaded', () => {
  console.log('✅ Update downloaded. Will install on app restart.');
});
