const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;
let addBlockWindow;
let notificationWindow;
let settingsWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 380,
    height: 600,
    minWidth: 380,
    minHeight: 600,
    title: 'Pomomo',
    frame: false,
    backgroundColor: '#FCF8F8',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile('index.html');

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

function createAddBlockWindow() {
  if (addBlockWindow && !addBlockWindow.isDestroyed()) {
    addBlockWindow.focus();
    return;
  }

  addBlockWindow = new BrowserWindow({
    width: 520,
    height: 440,
    resizable: false,
    frame: false,
    title: 'Add block',
    parent: mainWindow,
    modal: true,
    backgroundColor: '#FCF8F8',
    icon: path.join(__dirname, 'assets', 'icons', 'add.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  addBlockWindow.loadFile('add-block.html');
}

function createNotificationWindow(finishedStep) {
  if (notificationWindow && !notificationWindow.isDestroyed()) {
    notificationWindow.focus();
    return;
  }

  notificationWindow = new BrowserWindow({
    width: 420,
    height: 220,
    resizable: false,
    frame: false,
    title: 'Block finished',
    parent: mainWindow,
    modal: true,
    alwaysOnTop: true,
    backgroundColor: '#FCF8F8',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  notificationWindow.loadFile('finished-notification.html');
  notificationWindow.once('ready-to-show', () => {
    notificationWindow.webContents.send('notification-data', finishedStep);
  });
}

ipcMain.on('open-add-block-window', () => {
  createAddBlockWindow();
});

ipcMain.on('open-settings-window', () => {
  createSettingsWindow();
});

ipcMain.on('minimize-window', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.on('pin-window', () => {
  if (mainWindow) {
    const currentTop = mainWindow.isAlwaysOnTop();
    mainWindow.setAlwaysOnTop(!currentTop, 'floating');
  }
});

ipcMain.on('update-setting', (_event, key, value) => {
  settings[key] = value;
});

ipcMain.handle('get-settings', () => {
  return settings;
});

ipcMain.on('add-block-submit', (_event, block) => {
  mainWindow.webContents.send('block-added', block);

  if (addBlockWindow && !addBlockWindow.isDestroyed()) {
    addBlockWindow.close();
  }
});

ipcMain.on('open-timer-notification', (_event, step) => {
  createNotificationWindow(step);
});

ipcMain.on('timer-action', (_event, action) => {
  mainWindow.webContents.send('timer-action', action);

  if (notificationWindow && !notificationWindow.isDestroyed()) {
    notificationWindow.close();
  }
});

const settings = {
  autoStartTask: false,
};

function createSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 340,
    height: 280,
    minWidth: 340,
    minHeight: 260,
    resizable: false,
    frame: false,
    title: 'Settings',
    parent: mainWindow,
    modal: true,
    backgroundColor: '#FCF8F8',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  settingsWindow.loadFile('settings.html');
  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
