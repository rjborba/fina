type PendingImportListener = () => void

let pendingImportFile: File | null = null
const listeners = new Set<PendingImportListener>()

export function queueImportFile(file: File) {
  pendingImportFile = file
  listeners.forEach((listener) => listener())
}

export function takePendingImportFile(): File | null {
  const file = pendingImportFile
  pendingImportFile = null
  return file
}

export function subscribeToPendingImport(listener: PendingImportListener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
