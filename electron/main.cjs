const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron')
const path = require('node:path')
const fs = require('node:fs')

/** Set by the dev script; empty in a packaged build. */
const DEV_URL = process.env.STATIC_COLOR_DEV_URL || ''

const dataFile = () => path.join(app.getPath('userData'), 'static-color-data.json')

let win = null

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 380,
    minHeight: 600,
    backgroundColor: '#eceef2',
    title: 'Static Color',
    autoHideMenuBar: true,
    show: false,
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      // preload needs fs to read and write the data file synchronously
      sandbox: false,
      spellcheck: false,
    },
  })

  win.once('ready-to-show', () => win.show())

  if (DEV_URL) {
    win.loadURL(DEV_URL)
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  // external links open in the real browser, never inside the app window
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

/* ------------------------------------------------------------- storage */

ipcMain.on('sc:paths', (event) => {
  event.returnValue = { dataFile: dataFile() }
})

ipcMain.handle('sc:reveal-data', async () => {
  const file = dataFile()
  if (fs.existsSync(file)) shell.showItemInFolder(file)
  else shell.openPath(app.getPath('userData'))
})

/** Writes a copy of the data file wherever the user picks. */
ipcMain.handle('sc:backup', async (_e, json) => {
  const stamp = new Date().toISOString().slice(0, 10)
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Backup',
    defaultPath: `static-color-backup-${stamp}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  })
  if (canceled || !filePath) return null
  fs.writeFileSync(filePath, json, 'utf8')
  return filePath
})

ipcMain.handle('sc:restore', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Restore',
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }],
  })
  if (canceled || !filePaths[0]) return null
  return fs.readFileSync(filePaths[0], 'utf8')
})

/* ------------------------------------------------------------ lifecycle */

// one instance only, so two windows can never fight over the data file
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })

  app.whenReady().then(createWindow)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
