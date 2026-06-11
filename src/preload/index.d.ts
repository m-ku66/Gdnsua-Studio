import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      saveLogograph: (id: string, svg: string) => Promise<boolean>
      deleteLogograph: (id: string) => Promise<boolean>
      saveNumber: (id: string, svg: string) => Promise<boolean>
      deleteNumber: (id: string) => Promise<boolean>
      loadRelations: () => Promise<unknown>
      saveRelations: (data: unknown) => Promise<boolean>
    }
  }
}