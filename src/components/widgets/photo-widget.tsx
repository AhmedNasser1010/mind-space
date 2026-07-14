"use client"

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useStore } from "@/store"
import { getWidgetData } from "@/lib/widget-utils"
import { cn } from "@/lib/utils"
import {
  pickLocalFile,
  readFromHandle,
  createObjectURL,
  revokeObjectURL,
  isLocalSource,
  removeBlobFromIDB,
  loadBlobFromIDB,
} from "@/lib/photo-storage"
import { IconButton, InlineInput } from "@/components/ui/icon-button"
import { ImageIcon, Plus, Edit3, X, RefreshCw, Maximize2, Minimize2 } from "lucide-react"

interface PhotoLocal {
  fileName: string
  fileSize: number
  lastModified: number
}

interface PhotoData {
  src: string
  alt?: string
  fitMode?: "cover" | "contain"
  fileHandle?: FileSystemFileHandle
  local?: PhotoLocal
}

export const PhotoWidget = memo(function PhotoWidget({
  widgetId,
}: {
  widgetId: string
}) {
  const widget = useStore((s) => s.widgets[widgetId])
  const updateWidget = useStore((s) => s.updateWidget)

  const data = useMemo(() => getWidgetData<PhotoData>(widget), [widget])
  const src = data.src ?? ""
  const alt = data.alt ?? ""
  const fitMode = data.fitMode ?? "cover"

  const [editing, setEditing] = useState(false)
  const [urlInput, setUrlInput] = useState("")
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [imgError, setImgError] = useState(false)
  const [loading, setLoading] = useState(false)

  const urlInputRef = useRef<HTMLInputElement>(null)
  const prevObjectUrl = useRef<string | null>(null)

  // Clean up previous object URL before setting a new one
  const setObjectUrlSafe = useCallback((url: string | null) => {
    if (prevObjectUrl.current) {
      revokeObjectURL(prevObjectUrl.current)
    }
    prevObjectUrl.current = url
    setObjectUrl(url)
  }, [])

  // Revoke object URL on unmount
  useEffect(() => {
    return () => {
      if (prevObjectUrl.current) {
        revokeObjectURL(prevObjectUrl.current)
      }
    }
  }, [])

  // Resolve image source to an object URL or direct URL
  useEffect(() => {
    let cancelled = false
    setImgError(false)

    if (!src) {
      setObjectUrlSafe(null)
      return
    }

    if (!isLocalSource(src)) {
      // Public URL — use directly
      setObjectUrlSafe(null)
      return
    }

    setLoading(true)

    async function loadLocal() {
      try {
        if (data.fileHandle) {
          const blob = await readFromHandle(data.fileHandle!)
          if (cancelled) return
          if (blob) {
            setObjectUrlSafe(createObjectURL(blob))
          } else {
            setImgError(true)
          }
        } else if (src.startsWith("idb://")) {
          const key = src.slice("idb://".length)
          const blob = await loadBlobFromIDB(key)
          if (cancelled) return
          if (blob) {
            setObjectUrlSafe(createObjectURL(blob))
          } else {
            setImgError(true)
          }
        } else {
          setImgError(true)
        }
      } catch {
        if (!cancelled) setImgError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadLocal()
    return () => {
      cancelled = true
    }
  }, [src, data.fileHandle, setObjectUrlSafe])

  const handleStartEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      setUrlInput(src.startsWith("http") ? src : "")
      setEditing(true)
      requestAnimationFrame(() => urlInputRef.current?.focus())
    },
    [src]
  )

  const handleCancelEdit = useCallback(() => {
    setEditing(false)
    setUrlInput("")
  }, [])

  const handleSaveUrl = useCallback(() => {
    const trimmed = urlInput.trim()
    if (trimmed) {
      updateWidget(widgetId, {
        data: { src: trimmed, alt: data.alt ?? "" },
      })
    }
    setEditing(false)
  }, [urlInput, updateWidget, widgetId, data.alt])

  const handlePickFile = useCallback(async () => {
    setLoading(true)
    try {
      const result = await pickLocalFile()
      if (!result) return

      const idbPrefix = result.idbKey ? `idb://${result.idbKey}` : ""
      const fileHandle = result.fileHandle
      const newSrc = fileHandle ? "local-fs" : idbPrefix

      setObjectUrlSafe(createObjectURL(result.blob))
      updateWidget(widgetId, {
        data: {
          src: newSrc,
          alt: data.alt ?? "",
          fileHandle: fileHandle ?? undefined,
          local: result.metadata,
        },
      })
      setEditing(false)
    } catch {
      setImgError(true)
    } finally {
      setLoading(false)
    }
  }, [updateWidget, widgetId, data.alt, setObjectUrlSafe])

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (data.local && src.startsWith("idb://")) {
        removeBlobFromIDB(src.slice("idb://".length)).catch(() => {})
      }
      setObjectUrlSafe(null)
      updateWidget(widgetId, { data: { src: "", alt: "" } })
    },
    [updateWidget, widgetId, data.local, src, setObjectUrlSafe]
  )

  const handleToggleFit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      const next = fitMode === "cover" ? "contain" : "cover"
      updateWidget(widgetId, { data: { ...data, fitMode: next } })
    },
    [updateWidget, widgetId, data, fitMode]
  )

  const displayUrl = src && !isLocalSource(src) ? src : objectUrl

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {editing ? (
        <div className="flex flex-col gap-2 h-full p-3">
          <InlineInput
            inputRef={urlInputRef}
            value={urlInput}
            onChange={setUrlInput}
            placeholder="Paste image URL"
            onEnter={handleSaveUrl}
            onEscape={handleCancelEdit}
            onBlur={handleSaveUrl}
            onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}
            autoFocus
          />
          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                handlePickFile()
              }}
              onMouseDown={(e) => e.preventDefault()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <Plus className="h-3 w-3" />
              Browse
            </button>
            <IconButton
              label="Cancel"
              onClick={handleCancelEdit}
              size="sm"
            >
              <X className="h-3.5 w-3.5" />
            </IconButton>
          </div>
        </div>
      ) : displayUrl ? (
        <div
          className="relative flex-1 group/photo"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {imgError ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
              <ImageIcon className="h-8 w-8 opacity-50" />
              <p className="text-xs">Failed to load image</p>
              <button
                className="text-xs underline hover:text-foreground transition-colors"
                onClick={handleStartEdit}
              >
                Try another
              </button>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displayUrl}
              alt={alt}
              className={cn(
                "h-full w-full",
                fitMode === "contain" ? "object-contain" : "object-cover"
              )}
              onError={() => setImgError(true)}
            />
          )}

          {data.local && (
            <div className="absolute top-1.5 left-1.5 opacity-0 group-hover/photo:opacity-100 transition-opacity">
              <span className="inline-flex items-center gap-1 rounded-md bg-background/80 backdrop-blur px-1.5 py-0.5 text-[10px] text-muted-foreground">
                <RefreshCw className="h-2.5 w-2.5" />
                Local
              </span>
            </div>
          )}

          <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover/photo:opacity-100 transition-opacity">
            <IconButton
              label={fitMode === "cover" ? "Switch to contain" : "Switch to cover"}
              onClick={handleToggleFit}
              size="sm"
            >
              {fitMode === "cover" ? (
                <Minimize2 className="h-3 w-3" />
              ) : (
                <Maximize2 className="h-3 w-3" />
              )}
            </IconButton>
            <IconButton
              label="Edit"
              onClick={handleStartEdit}
              size="sm"
            >
              <Edit3 className="h-3 w-3" />
            </IconButton>
            <IconButton
              label="Remove"
              onClick={handleRemove}
              size="sm"
            >
              <X className="h-3 w-3" />
            </IconButton>
          </div>
        </div>
      ) : (
        <button
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-2 rounded-lg p-3",
            "border-2 border-dashed border-muted-foreground/25",
            "hover:border-muted-foreground/50 hover:bg-accent/50 transition-colors"
          )}
          onClick={(e) => {
            e.stopPropagation()
            setEditing(true)
            requestAnimationFrame(() => urlInputRef.current?.focus())
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
          <span className="text-xs text-muted-foreground">Add Photo</span>
        </button>
      )}
    </div>
  )
})
