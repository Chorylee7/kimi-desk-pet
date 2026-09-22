const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('petAPI', {
  getSettings: () => ipcRenderer.invoke('getSettings'),
  saveSettings: (patch) => ipcRenderer.invoke('saveSettings', patch),
  getWindowPosition: () => ipcRenderer.invoke('getWindowPosition'),
  setWindowPosition: (x, y) => ipcRenderer.invoke('setWindowPosition', x, y),
  getDisplays: () => ipcRenderer.invoke('getDisplays'),
  getPetSvg: (id) => ipcRenderer.invoke('getPetSvg', id),
  getBeadPattern: () => ipcRenderer.invoke('getBeadPattern'),
  resizeWindow: (w, h) => ipcRenderer.invoke('resizeWindow', w, h),
  showBubble: (text) => ipcRenderer.invoke('showBubble', text),
  hideBubble: () => ipcRenderer.invoke('hideBubble'),
  importImage: () => ipcRenderer.invoke('importImage'),
  importFile: (srcPath) => ipcRenderer.invoke('importFile', srcPath),
  getFilePath: (file) => webUtils.getPathForFile(file),
  switchPet: (id) => ipcRenderer.invoke('switchPet', id),
  openSettings: () => ipcRenderer.invoke('openSettings'),
  petClicked: () => ipcRenderer.invoke('pet-clicked'),
  quit: () => ipcRenderer.invoke('quit'),
  onSettingsChanged: (cb) => ipcRenderer.on('settings-changed', (_e, s) => cb(s)),
  onAgentEvent: (cb) => ipcRenderer.on('agent-event', (_e, p) => cb(p)),
});
