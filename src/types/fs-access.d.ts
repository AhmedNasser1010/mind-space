interface FileSystemHandle {
  requestPermission(options?: { mode?: "read" | "readwrite" }): Promise<"granted" | "denied" | "prompt">
}

interface Window {
  showOpenFilePicker(options?: {
    types?: {
      description: string
      accept: Record<string, string[]>
    }[]
    multiple?: boolean
  }): Promise<FileSystemFileHandle[]>
}
