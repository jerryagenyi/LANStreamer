/**
 * Preload bridge — the ONLY surface the dashboard renderer gets for app
 * control (contextIsolation stays on, nodeIntegration stays off).
 *
 *   window.LSApp.minimize()  → hide to tray (streams keep running) + balloon
 *   window.LSApp.shutdown()  → confirmation dialog → ordered app shutdown
 *
 * Pages served to plain browsers (no preload) see no LSApp and hide the
 * app-control buttons accordingly.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('LSApp', {
  minimize: () => ipcRenderer.send('ls:minimize'),
  shutdown: () => ipcRenderer.send('ls:shutdown')
});
