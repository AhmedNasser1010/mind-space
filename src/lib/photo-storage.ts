const IDB_DB_NAME = "mind-space-photos"
const IDB_STORE_NAME = "blobs"
const IDB_VERSION = 1

const ACCEPTED_TYPES = {
  "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"],
}

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB_NAME, IDB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
        db.createObjectStore(IDB_STORE_NAME)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function storeBlobInIDB(key: string, blob: Blob): Promise<void> {
  const db = await openIDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE_NAME, "readwrite")
    tx.objectStore(IDB_STORE_NAME).put(blob, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

export async function loadBlobFromIDB(key: string): Promise<Blob | null> {
  const db = await openIDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE_NAME, "readonly")
    const req = tx.objectStore(IDB_STORE_NAME).get(key)
    req.onsuccess = () => resolve(req.result ?? null)
    req.onerror = () => reject(req.error)
  })
}

export async function removeBlobFromIDB(key: string): Promise<void> {
  const db = await openIDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE_NAME, "readwrite")
    tx.objectStore(IDB_STORE_NAME).delete(key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

export function generateIDBKey(): string {
  return crypto.randomUUID()
}

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== "undefined" && "showOpenFilePicker" in window
}

export interface LocalPhotoMeta {
  fileName: string
  fileSize: number
  lastModified: number
}

export interface PickedFile {
  blob: Blob
  metadata: LocalPhotoMeta
  fileHandle?: FileSystemFileHandle
  idbKey?: string
}

function fileInputAccept(): string {
  return Object.values(ACCEPTED_TYPES)
    .flatMap((exts) => exts)
    .join(",")
}

async function pickViaFileSystemAPI(): Promise<PickedFile | null> {
  try {
    const [handle] = await window.showOpenFilePicker({
      types: [
        {
          description: "Images",
          accept: ACCEPTED_TYPES,
        },
      ],
      multiple: false,
    })
    const permission = await handle.requestPermission({ mode: "read" })
    if (permission !== "granted") return null
    const file = await handle.getFile()
    return {
      blob: file,
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        lastModified: file.lastModified,
      },
      fileHandle: handle,
    }
  } catch (e) {
    if ((e as DOMException).name === "AbortError") return null
    throw e
  }
}

function pickViaInput(): Promise<PickedFile | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = fileInputAccept()
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) {
        resolve(null)
        return
      }
      const idbKey = generateIDBKey()
      await storeBlobInIDB(idbKey, file)
      resolve({
        blob: file,
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          lastModified: file.lastModified,
        },
        idbKey,
      })
    }
    input.click()
  })
}

export async function pickLocalFile(): Promise<PickedFile | null> {
  if (isFileSystemAccessSupported()) {
    return pickViaFileSystemAPI()
  }
  return pickViaInput()
}

export async function readFromHandle(
  handle: FileSystemFileHandle
): Promise<Blob | null> {
  try {
    const permission = await handle.requestPermission({ mode: "read" })
    if (permission !== "granted") return null
    return await handle.getFile()
  } catch {
    return null
  }
}

export function createObjectURL(blob: Blob): string {
  return URL.createObjectURL(blob)
}

export function revokeObjectURL(url: string): void {
  if (url.startsWith("blob:")) {
    URL.revokeObjectURL(url)
  }
}

export function isLocalSource(src: string): boolean {
  return src === "local-fs" || src.startsWith("idb://")
}
