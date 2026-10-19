const { contextBridge, ipcRenderer } = require('electron');

// Safe event listener helper returning an unsubscribe function
function createListener(channel) {
  return (callback) => {
    if (typeof callback !== 'function') return () => {};
    const subscription = (_event, ...args) => callback(...args);
    ipcRenderer.on(channel, subscription);
    return () => {
      ipcRenderer.removeListener(channel, subscription);
    };
  };
}

contextBridge.exposeInMainWorld('electronAPI', {
  // Navigation & External
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // Windows & App Controls
  openAddBlockWindow: () => ipcRenderer.send('open-add-block-window'),
  openSettingsWindow: () => ipcRenderer.send('open-settings-window'),
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  pinWindow: () => ipcRenderer.send('pin-window'),

  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  updateSetting: (key, value) => ipcRenderer.send('update-setting', key, value),
  onSettingUpdated: createListener('setting-updated'),

  // Atomic Queue State Persistence (Disk-Backed)
  getQueueState: () => ipcRenderer.invoke('get-queue-state'),
  saveQueueState: (state) => ipcRenderer.invoke('save-queue-state', state),

  // Atomic Custom Presets Persistence (Disk-Backed)
  getPresets: () => ipcRenderer.invoke('get-presets'),
  savePresets: (presets) => ipcRenderer.invoke('save-presets', presets),

  // Block Creation
  submitAddBlock: (block) => ipcRenderer.send('add-block-submit', block),
  onBlockAdded: createListener('block-added'),

  // Timer Notifications
  openTimerNotification: (step) => ipcRenderer.send('open-timer-notification', step),
  showNativeNotification: (payload) => ipcRenderer.send('show-native-notification', payload),
  onNotificationData: createListener('notification-data'),
  submitTimerAction: (action) => ipcRenderer.send('timer-action', action),
  onTimerAction: createListener('timer-action'),

  // OS Power Events (Sleep/Wake)
  onPowerSuspend: createListener('power-suspend'),
  onPowerResume: createListener('power-resume'),
});

