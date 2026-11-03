const path = require('node:path');
const { app, BrowserWindow, shell } = require('electron');

let server;
let mainWindow;

function openWindow(url) {
  mainWindow = new BrowserWindow({
    width: 1220,
    height: 840,
    minWidth: 360,
    minHeight: 600,
    title: 'VGArchive',
    backgroundColor: '#10110f',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  mainWindow.webContents.setWindowOpenHandler(({ url: target }) => {
    if (/^https?:\/\//i.test(target)) shell.openExternal(target);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, target) => {
    if (!target.startsWith(url)) event.preventDefault();
  });
  mainWindow.loadURL(url);
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  app.setAppUserModelId('com.vgarchive.desktop');
  process.env.VGARCHIVE_DATA_DIR = path.join(app.getPath('userData'), 'data');
  process.env.PORT = process.env.VGARCHIVE_LAN === '1' ? '3000' : '0';
  process.env.HOST = process.env.VGARCHIVE_LAN === '1' ? '0.0.0.0' : '127.0.0.1';
  const { server: localServer } = require('../server.js');
  server = localServer;
  server.once('error', (error) => {
    console.error(`No se pudo iniciar el servidor local de VGArchive: ${error.message}`);
    app.quit();
  });
  server.listen(Number(process.env.PORT), process.env.HOST, () => {
    const url = `http://127.0.0.1:${server.address().port}/`;
    openWindow(url);
  });
});

app.on('before-quit', () => {
  if (server?.listening) server.close();
});

app.on('window-all-closed', () => app.quit());
