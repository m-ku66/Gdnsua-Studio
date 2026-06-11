import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  saveLogograph: (id: string, svg: string): Promise<boolean> =>
    ipcRenderer.invoke('save-logograph', id, svg),
  deleteLogograph: (id: string): Promise<boolean> => ipcRenderer.invoke('delete-logograph', id),
  saveNumber: (id: string, svg: string): Promise<boolean> =>
    ipcRenderer.invoke('save-number', id, svg),
  deleteNumber: (id: string): Promise<boolean> => ipcRenderer.invoke('delete-number', id),
  loadRelations: (): Promise<unknown> => ipcRenderer.invoke('load-relations'),
  saveRelations: (data: unknown): Promise<boolean> => ipcRenderer.invoke('save-relations', data)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
