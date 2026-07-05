// The Atlas — preload bridge.
//
// Chromium in Electron loses renderer keyboard focus after a native
// alert()/confirm() closes (electron#20400): every input stops accepting
// keystrokes until the OS window is refocused by hand. The pages wrap
// alert/confirm and call fixFocus() afterward; main blurs+refocuses the
// window, which resets Chromium's focus state.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('atlasBridge', {
  fixFocus: () => ipcRenderer.invoke('atlas-fix-focus'),
  // Public IP for the host panel's remote (port-forwarded) player link.
  publicIp: () => ipcRenderer.invoke('atlas-public-ip'),
});
