const { app, BrowserWindow, ipcMain, Notification, powerMonitor, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let addBlockWindow = null;
let notificationWindow = null;
let settingsWindow = null;

// ==========================================
// 1. Atomic Storage Engine
// ==========================================

const DEFAULT_SETTINGS = {
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

function getUserDataPath(...subpaths) {
  try {
    return path.join(app.getPath('userData'), ...subpaths);
  } catch (e) {
    return path.join(__dirname, ...subpaths);
  }
}

function safeReadJson(filePath, fallbackData) {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error(`[Storage] Failed reading ${filePath}:`, err);
  }
  return fallbackData;
}

function safeWriteJson(filePath, data) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tempPath = `${filePath}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;
    const payload = JSON.stringify(data, null, 2);
    fs.writeFileSync(tempPath, payload, 'utf8');

    try {
      fs.renameSync(tempPath, filePath);
    } catch (renameErr) {
      // Windows fallback if rename encounters target lock
      fs.copyFileSync(tempPath, filePath);
      try { fs.unlinkSync(tempPath); } catch (_) {}
    }
    return true;
  } catch (err) {
    console.error(`[Storage] Failed writing ${filePath}:`, err);
    return false;
  }
}

// Persistent Store Paths
const SETTINGS_FILE = getUserDataPath('settings.json');
const QUEUE_STATE_FILE = getUserDataPath('queue-state.json');
const PRESETS_FILE = getUserDataPath('presets.json');

let settings = (() => {
  const loaded = safeReadJson(SETTINGS_FILE, DEFAULT_SETTINGS);
  const merged = { ...DEFAULT_SETTINGS, ...loaded };
  if (loaded.theme) {
    merged.theme = { ...DEFAULT_SETTINGS.theme, ...loaded.theme };
  }
  return merged;
})();
safeWriteJson(SETTINGS_FILE, settings);

// ==========================================
// 2. Windows & Security Guards
// ==========================================

if (process.platform === 'win32') {
  app.setAppUserModelId('com.pomomo.app');
}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

const APP_ICON_PATH = path.join(__dirname, 'assets', 'icons', process.platform === 'win32' ? 'icon.ico' : 'icon.png');

function getThemeBg() {
  return (settings.theme && settings.theme.bgMain) ? settings.theme.bgMain : '#FCF8F8';
}

function attachSecurityGuards(win) {
  // Prevent arbitrary navigation or drag-and-drop file navigation
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) {
      event.preventDefault();
      if (url.startsWith('http://') || url.startsWith('https://')) {
        shell.openExternal(url);
      }
    }
  });

  // Block popup windows; route external links to OS browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
}

// IPC Sender Verification
function isAuthorizedSender(event) {
  if (!event || !event.senderFrame) return false;
  const url = event.senderFrame.url;
  return typeof url === 'string' && url.startsWith('file://');
}

// ==========================================
// 3. Window Factories
// ==========================================

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
    icon: APP_ICON_PATH,
    backgroundColor: getThemeBg(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  attachSecurityGuards(mainWindow);
  mainWindow.loadFile('index.html');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
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
    parent: mainWindow && !mainWindow.isDestroyed() ? mainWindow : null,
    modal: true,
    backgroundColor: getThemeBg(),
    icon: APP_ICON_PATH,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  attachSecurityGuards(addBlockWindow);
  addBlockWindow.loadFile('add-block.html');
  addBlockWindow.on('closed', () => {
    addBlockWindow = null;
  });
}

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
    parent: mainWindow && !mainWindow.isDestroyed() ? mainWindow : null,
    modal: true,
    icon: APP_ICON_PATH,
    backgroundColor: getThemeBg(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  attachSecurityGuards(settingsWindow);
  settingsWindow.loadFile('settings.html');
  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
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
    parent: mainWindow && !mainWindow.isDestroyed() ? mainWindow : null,
    modal: true,
    alwaysOnTop: true,
    icon: APP_ICON_PATH,
    backgroundColor: getThemeBg(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  attachSecurityGuards(notificationWindow);
  notificationWindow.loadFile('finished-notification.html');
  notificationWindow.once('ready-to-show', () => {
    if (notificationWindow && !notificationWindow.isDestroyed()) {
      notificationWindow.webContents.send('notification-data', finishedStep);
    }
  });
  notificationWindow.on('closed', () => {
    notificationWindow = null;
  });
}

// ==========================================
// 4. Secure IPC Handlers with Schema Validation
// ==========================================

// Window Actions
ipcMain.on('open-add-block-window', (event) => {
  if (!isAuthorizedSender(event)) return;
  createAddBlockWindow();
});

ipcMain.on('open-settings-window', (event) => {
  if (!isAuthorizedSender(event)) return;
  createSettingsWindow();
});

ipcMain.on('minimize-window', (event) => {
  if (!isAuthorizedSender(event)) return;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.minimize();
  }
});

ipcMain.on('pin-window', (event) => {
  if (!isAuthorizedSender(event)) return;
  if (mainWindow && !mainWindow.isDestroyed()) {
    const currentTop = mainWindow.isAlwaysOnTop();
    mainWindow.setAlwaysOnTop(!currentTop, 'floating');
  }
});

// External URL handler
ipcMain.handle('open-external', async (event, url) => {
  if (!isAuthorizedSender(event)) return false;
  if (typeof url === 'string' && (url.startsWith('https://') || url.startsWith('http://'))) {
    await shell.openExternal(url);
    return true;
  }
  return false;
});

// Settings Handlers
ipcMain.handle('get-settings', (event) => {
  if (!isAuthorizedSender(event)) return DEFAULT_SETTINGS;
  return settings;
});

let themeUpdateTimer = null;
ipcMain.on('update-setting', (event, key, value) => {
  if (!isAuthorizedSender(event)) return;
  const ALLOWED_KEYS = ['autoStartTask', 'soundEnabled', 'volume', 'nativeNotification', 'theme'];
  if (!ALLOWED_KEYS.includes(key)) return;

  // Key validations
  if (key === 'volume' && (typeof value !== 'number' || value < 0 || value > 100)) return;
  if (['autoStartTask', 'soundEnabled', 'nativeNotification'].includes(key) && typeof value !== 'boolean') return;
  if (key === 'theme' && (typeof value !== 'object' || !value)) return;

  settings[key] = value;
  safeWriteJson(SETTINGS_FILE, settings);

  if (key === 'theme' && value && value.bgMain) {
    clearTimeout(themeUpdateTimer);
    themeUpdateTimer = setTimeout(() => {
      BrowserWindow.getAllWindows().forEach((win) => {
        if (!win.isDestroyed()) {
          try { win.setBackgroundColor(value.bgMain); } catch (_) {}
        }
      });
    }, 40);
  }

  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win.isDestroyed()) {
      win.webContents.send('setting-updated', key, value);
    }
  });
});

// Atomic Queue State Handlers (Disk-Backed)
ipcMain.handle('get-queue-state', (event) => {
  if (!isAuthorizedSender(event)) return null;
  return safeReadJson(QUEUE_STATE_FILE, null);
});

ipcMain.handle('save-queue-state', (event, queueState) => {
  if (!isAuthorizedSender(event)) return false;
  if (!queueState || typeof queueState !== 'object') return false;
  return safeWriteJson(QUEUE_STATE_FILE, queueState);
});

// Atomic Presets Handlers (Disk-Backed)
ipcMain.handle('get-presets', (event) => {
  if (!isAuthorizedSender(event)) return [];
  const presets = safeReadJson(PRESETS_FILE, []);
  return Array.isArray(presets) ? presets : [];
});

ipcMain.handle('save-presets', (event, presets) => {
  if (!isAuthorizedSender(event)) return false;
  if (!Array.isArray(presets)) return false;
  return safeWriteJson(PRESETS_FILE, presets);
});

// Block Creation
ipcMain.on('add-block-submit', (event, block) => {
  if (!isAuthorizedSender(event)) return;
  if (!block || typeof block !== 'object') return;

  const sanitizedBlock = {
    type: block.type === 'break' ? 'break' : 'task',
    label: typeof block.label === 'string' ? block.label.slice(0, 80).trim() : 'Task',
    duration: Math.max(1, Math.min(360, Number(block.duration) || 25)),
  };

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('block-added', sanitizedBlock);
  }

  if (addBlockWindow && !addBlockWindow.isDestroyed()) {
    addBlockWindow.close();
  }
});

// Timer Notifications
ipcMain.on('open-timer-notification', (event, step) => {
  if (!isAuthorizedSender(event)) return;
  const safeStep = {
    type: step && step.type === 'break' ? 'break' : 'task',
    label: step && typeof step.label === 'string' ? step.label.slice(0, 80) : 'Step',
  };
  createNotificationWindow(safeStep);
});

ipcMain.on('timer-action', (event, action) => {
  if (!isAuthorizedSender(event)) return;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('timer-action', action === 'continue' ? 'continue' : 'pause');
  }
  if (notificationWindow && !notificationWindow.isDestroyed()) {
    notificationWindow.close();
  }
});

ipcMain.on('show-native-notification', (event, payload) => {
  if (!isAuthorizedSender(event)) return;
  if (Notification.isSupported()) {
    new Notification({
      title: typeof payload?.title === 'string' ? payload.title.slice(0, 100) : 'Pomomo',
      body: typeof payload?.body === 'string' ? payload.body.slice(0, 200) : '',
      icon: path.join(__dirname, 'assets', 'icons', 'timer.png'),
    }).show();
  }
});

// ==========================================
// 5. OS Power & Sleep Lifecycle
// ==========================================

powerMonitor.on('suspend', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('power-suspend');
  }
});

powerMonitor.on('resume', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('power-resume');
  }
});

// ==========================================
// 6. Application Lifecycle
// ==========================================

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

