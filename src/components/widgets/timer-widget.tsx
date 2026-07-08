"use client"

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useStore } from "@/store"
import { cn } from "@/lib/utils"
import { getWidgetData } from "@/lib/widget-utils"
import { RoundButton, InlineInput } from "@/components/ui/icon-button"
import { Play, Pause, RotateCcw } from "lucide-react"

interface TimerData {
  duration: number
  remaining: number
  running: boolean
  paused: boolean
}

export const TimerWidget = memo(function TimerWidget({ widgetId }: { widgetId: string }) {
  const widget = useStore((s) => s.widgets[widgetId])
  const updateWidget = useStore((s) => s.updateWidget)
  const [editingDuration, setEditingDuration] = useState(false)
  const [durationInput, setDurationInput] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const data = useMemo(() => getWidgetData<TimerData>(widget), [widget])
  const duration = data.duration ?? 300
  const remaining = data.remaining ?? duration
  const running = data.running ?? false
  const paused = data.paused ?? false

  useEffect(() => {
    if (!running || paused) return
    const interval = setInterval(() => {
      const w = useStore.getState().widgets[widgetId]
      if (!w) return
      const d = getWidgetData<TimerData>(w)
      const newRemaining = Math.max(0, (d.remaining ?? duration) - 0.1)
      if (newRemaining <= 0) {
        updateWidget(widgetId, {
          data: { ...d, remaining: 0, running: false, paused: false },
        })
        clearInterval(interval)
      } else {
        updateWidget(widgetId, {
          data: { ...d, remaining: Number(newRemaining.toFixed(1)) },
        })
      }
    }, 100)
    return () => clearInterval(interval)
  }, [running, paused, widgetId, updateWidget, duration])

  const minutes = Math.floor(remaining / 60)
  const seconds = Math.floor(remaining % 60)
  const tenths = Math.floor((remaining - Math.floor(remaining)) * 10)

  const handleStart = useCallback(() => {
    updateWidget(widgetId, {
      data: { ...data, running: true, paused: false, remaining: remaining || duration },
    })
  }, [updateWidget, widgetId, data, remaining, duration])

  const handlePause = useCallback(() => {
    updateWidget(widgetId, { data: { ...data, paused: true } })
  }, [updateWidget, widgetId, data])

  const handleResume = useCallback(() => {
    updateWidget(widgetId, { data: { ...data, paused: false } })
  }, [updateWidget, widgetId, data])

  const handleReset = useCallback(() => {
    updateWidget(widgetId, {
      data: { ...data, remaining: duration, running: false, paused: false },
    })
  }, [updateWidget, widgetId, data, duration])

  const handleStartEdit = useCallback(() => {
    setDurationInput(String(duration))
    setEditingDuration(true)
    requestAnimationFrame(() => inputRef.current?.select())
  }, [duration])

  const handleFinishEdit = useCallback(() => {
    const val = parseInt(durationInput, 10)
    if (!isNaN(val) && val > 0) {
      updateWidget(widgetId, {
        data: { ...data, duration: val, remaining: val, running: false, paused: false },
      })
    }
    setEditingDuration(false)
  }, [durationInput, updateWidget, widgetId, data])

  const isComplete = remaining <= 0 && !running

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-4">
      {editingDuration ? (
        <InlineInput
          inputRef={inputRef}
          type="number"
          min={1}
          value={durationInput}
          onChange={setDurationInput}
          onEnter={handleFinishEdit}
          onEscape={() => setEditingDuration(false)}
          onBlur={handleFinishEdit}
          onPointerDown={(e) => e.stopPropagation()}
          autoFocus
          className="h-8 w-24 text-center text-sm font-mono"
        />
      ) : (
        <div
          className={cn(
            "text-4xl font-mono font-bold tabular-nums tracking-tight cursor-pointer",
            isComplete && "text-destructive animate-pulse"
          )}
          onClick={!running ? handleStartEdit : undefined}
          title="Click to set duration"
        >
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          <span className="text-xl text-muted-foreground">.{tenths}</span>
        </div>
      )}

      <div className="flex items-center gap-2">
        {!running && !isComplete && (
          <RoundButton label="Start" variant="primary" onClick={handleStart}>
            <Play className="h-4 w-4 fill-current" />
          </RoundButton>
        )}
        {running && !paused && (
          <RoundButton
            label="Pause"
            onClick={handlePause}
            className="bg-amber-500 text-white hover:bg-amber-600"
          >
            <Pause className="h-4 w-4 fill-current" />
          </RoundButton>
        )}
        {running && paused && (
          <RoundButton label="Resume" variant="primary" onClick={handleResume}>
            <Play className="h-4 w-4 fill-current" />
          </RoundButton>
        )}
        <RoundButton label="Reset" onClick={handleReset}>
          <RotateCcw className="h-4 w-4" />
        </RoundButton>
      </div>
    </div>
  )
})
