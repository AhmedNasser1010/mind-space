"use client"

import { useEffect } from "react"
import { useToast } from "@/components/ui/toast"

export function StorageErrorListener() {
  const { addToast } = useToast()

  useEffect(() => {
    function handleStorageError() {
      addToast({
        title: "Storage is full",
        description: "Recent changes may not be saved. Export or delete some content.",
        variant: "destructive",
      })
    }

    window.addEventListener("mind-space:storage-error", handleStorageError)
    return () => {
      window.removeEventListener("mind-space:storage-error", handleStorageError)
    }
  }, [addToast])

  return null
}
