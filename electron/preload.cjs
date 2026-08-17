const { contextBridge, ipcRenderer } = require('electron')
const fs = require('node:fs')
const path = require('node:path')

const { dataFile } = ipcRenderer.sendSync('sc:paths')

/**
 * The web build keeps its data in localStorage. The desktop build keeps it in a
 * plain JSON file next to the app's settings, so it can be copied, backed up and
 * read without the app. Reads and writes stay synchronous to match the store.
 */
const storage = {
  isDesktop: true,
  dataFile,

  read() {
    try {
      if (!fs.existsSync(dataFile)) return null
      const raw = fs.readFileSync(dataFile, 'utf8')
      return raw.trim() ? raw : null
    } catch (err) {
      console.error('[static-color] read failed', err)
      return null
    }
  },

  write(json) {
    try {
      fs.mkdirSync(path.dirname(dataFile), { recursive: true })
      // write to a temp file first so a crash mid-write cannot corrupt the data
      const tmp = `${dataFile}.tmp`
      fs.writeFileSync(tmp, json, 'utf8')
      fs.renameSync(tmp, dataFile)
      return true
    } catch (err) {
      console.error('[static-color] write failed', err)
      return false
    }
  },

  revealDataFile: () => ipcRenderer.invoke('sc:reveal-data'),
  backup: (json) => ipcRenderer.invoke('sc:backup', json),
  restore: () => ipcRenderer.invoke('sc:restore'),
}

contextBridge.exposeInMainWorld('desktop', storage)
