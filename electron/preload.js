const { contextBridge, ipcRenderer } = require('electron')

// Expose safe APIs to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.send('minimize-window'),
  maximize: () => ipcRenderer.send('maximize-window'),
  close: () => ipcRenderer.send('close-window'),

  // System info
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),

  // Alerts
  requestAttention: () => ipcRenderer.send('request-attention'),

  // Listen for events
  on: (channel, callback) => {
    ipcRenderer.on(channel, (event, ...args) => callback(...args))
  },

  // Remove listener
  removeListener: (channel) => {
    ipcRenderer.removeAllListeners(channel)
  },

  // Check if running as Electron app
  isElectron: true,
  platform: process.platform,
})
