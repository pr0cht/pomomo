const { app, BrowserWindow, ipcMain, Notification } = require('electron');
const path = require('path');

let mainWindow;
let addBlockWindow;
let notificationWindow;
let settingsWindow;

const settings = {
  autoStartTask: false,
  soundEnabled: true,
  volume: 80,
  nativeNotification: true,
  theme: {
    name: 'Pastel Rose',
    bgMain: '#FCF8F8',
    cardBg: '#FFFFFF',
    accentColor: '#E87A7A',
    taskColor: '#FFF5F5',
    breakColor: '#48A87C',
    textColor: '#382A2A',
  },
};

function getThemeBg() {
  return (settings.theme && settings.theme.bgMain) ? settings.theme.bgMain : '#FCF8F8';
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 380,
    height: 780,
    minWidth: 380,
    minHeight: 780,
    maxHeight: 780,
    resizable: false,
    title: 'Pomomo',
    frame: false,
    backgroundColor: getThemeBg(),
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
    width: 460,
    height: 420,
    resizable: false,
    frame: false,
    title: 'Add block',
    parent: mainWindow,
    modal: true,
    backgroundColor: getThemeBg(),
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
    backgroundColor: getThemeBg(),
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
  if (key === 'theme' && value && value.bgMain) {
    BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed()) {
        try {
          win.setBackgroundColor(value.bgMain);
        } catch (e) {}
      }
    });
  }
  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win.isDestroyed()) {
      win.webContents.send('setting-updated', key, value);
    }
  });
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

ipcMain.on('show-native-notification', (_event, payload) => {
  if (Notification.isSupported()) {
    new Notification({
      title: payload.title || 'Pomomo',
      body: payload.body || '',
      icon: path.join(__dirname, 'assets', 'icons', 'timer.png'),
    }).show();
  }
});

function createSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 400,
    height: 580,
    minWidth: 360,
    minHeight: 480,
    resizable: false,
    frame: false,
    title: 'Settings',
    parent: mainWindow,
    modal: true,
    backgroundColor: getThemeBg(),
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
