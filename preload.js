const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  versions: () => ({ ...process.versions }),
  openAddBlockWindow: () => ipcRenderer.send('open-add-block-window'),
  submitAddBlock: (block) => ipcRenderer.send('add-block-submit', block),
  onBlockAdded: (callback) => ipcRenderer.on('block-added', (_event, block) => callback(block)),
  openTimerNotification: (step) => ipcRenderer.send('open-timer-notification', step),
  onTimerAction: (callback) => ipcRenderer.on('timer-action', (_event, action) => callback(action)),
  submitTimerAction: (action) => ipcRenderer.send('timer-action', action),
  onNotificationData: (callback) => ipcRenderer.on('notification-data', (_event, data) => callback(data)),
});
