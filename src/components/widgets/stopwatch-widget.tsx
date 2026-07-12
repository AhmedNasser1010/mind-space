"use client"

import { memo, useCallback, useEffect, useMemo, useState } from "react"
import { useStore } from "@/store"
import { getWidgetData } from "@/lib/widget-utils"
import { RoundButton } from "@/components/ui/icon-button"
import { Play, Square, RotateCcw, Flag } from "lucide-react"

interface StopwatchData {
  startedAt: number | null
  accumulated: number
  laps: number[]
}

function computeElapsed(data: StopwatchData): number {
  const accumulated = data.accumulated ?? 0
  if (data.startedAt != null) {
    return accumulated + (Date.now() - data.startedAt)
  }
  return accumulated
}

function formatTime(ms: number) {
  const totalCentiseconds = Math.floor(ms / 10)
  const centiseconds = totalCentiseconds % 100
  const totalSeconds = Math.floor(totalCentiseconds / 100)
  const seconds = totalSeconds % 60
  const minutes = Math.floor(totalSeconds / 60) % 60
  const hours = Math.floor(totalSeconds / 3600)
  return {
    hours: String(hours).padStart(2, "0"),
    minutes: String(minutes).padStart(2, "0"),
    seconds: String(seconds).padStart(2, "0"),
    centiseconds: String(centiseconds).padStart(2, "0"),
  }
}

function formatLap(ms: number) {
  const t = formatTime(ms)
  return `${t.minutes}:${t.seconds}.${t.centiseconds}`
}

export const StopwatchWidget = memo(function StopwatchWidget({ widgetId }: { widgetId: string }) {
  const widget = useStore((s) => s.widgets[widgetId])
  const updateWidget = useStore((s) => s.updateWidget)

  const data = useMemo(() => getWidgetData<StopwatchData>(widget), [widget])
  const running = data.startedAt != null
  const paused = !running && (data.accumulated ?? 0) > 0
  const laps = useMemo(() => data.laps ?? [], [data.laps])

  const [elapsed, setElapsed] = useState(() => computeElapsed(data))

  useEffect(() => {
    setElapsed(computeElapsed(data))
  }, [data])

  useEffect(() => {
    if (!running) return
    const interval = setInterval(() => {
      const w = useStore.getState().widgets[widgetId]
      if (!w) return
      const d = getWidgetData<StopwatchData>(w)
      setElapsed(computeElapsed(d))
    }, 50)
    return () => clearInterval(interval)
  }, [running, widgetId])

  const handleStart = useCallback(() => {
    const s = useStore.getState().widgets[widgetId]
    if (!s) return
    const d = getWidgetData<StopwatchData>(s)
    updateWidget(widgetId, {
      data: {
        ...d,
        startedAt: Date.now(),
        accumulated: paused ? d.accumulated ?? 0 : 0,
        laps: paused ? d.laps ?? [] : [],
      },
    })
  }, [paused, updateWidget, widgetId])

  const handleStop = useCallback(() => {
    const s = useStore.getState().widgets[widgetId]
    if (!s) return
    const d = getWidgetData<StopwatchData>(s)
    updateWidget(widgetId, {
      data: { ...d, startedAt: null, accumulated: computeElapsed(d) },
    })
  }, [updateWidget, widgetId])

  const handleReset = useCallback(() => {
    const s = useStore.getState().widgets[widgetId]
    if (!s) return
    const d = getWidgetData<StopwatchData>(s)
    updateWidget(widgetId, {
      data: { ...d, startedAt: null, accumulated: 0, laps: [] },
    })
  }, [updateWidget, widgetId])

  const handleLap = useCallback(() => {
    const s = useStore.getState().widgets[widgetId]
    if (!s) return
    const d = getWidgetData<StopwatchData>(s)
    const currentElapsed = computeElapsed(d)
    const currentLaps = d.laps ?? []
    updateWidget(widgetId, { data: { ...d, laps: [...currentLaps, currentElapsed] } })
  }, [updateWidget, widgetId])

  const t = formatTime(elapsed)

  return (
    <div className="flex h-full flex-col p-4">
      <div className="flex flex-col items-center justify-center flex-1 gap-3">
        <div className="text-4xl font-mono font-bold tabular-nums tracking-tight">
          <span className="text-muted-foreground text-2xl">{t.hours}:</span>
          {t.minutes}:{t.seconds}
          <span className="text-xl text-muted-foreground">.{t.centiseconds}</span>
        </div>

        <div className="flex items-center gap-2">
          {!running ? (
            <RoundButton
              label={paused ? "Continue" : "Start"}
              variant="primary"
              onClick={handleStart}
            >
              <Play className="h-4 w-4 fill-current ml-0.5" />
            </RoundButton>
          ) : (
            <RoundButton label="Stop" variant="destructive" onClick={handleStop}>
              <Square className="h-4 w-4 fill-current" />
            </RoundButton>
          )}
          <RoundButton label="Reset" onClick={handleReset}>
            <RotateCcw className="h-4 w-4" />
          </RoundButton>
          {running && (
            <RoundButton label="Lap" variant="primary" onClick={handleLap}>
              <Flag className="h-4 w-4" />
            </RoundButton>
          )}
        </div>
      </div>

      {laps.length > 0 && (
        <div className="mt-2 border-t pt-2 max-h-[120px] overflow-y-auto">
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest mb-1">
            Laps
          </div>
          <div className="space-y-0.5">
            {laps.map((lap, i) => {
              const diff = i === 0 ? lap : lap - laps[i - 1]
              return (
                <div
                  key={i}
                  className="flex items-center justify-between text-xs font-mono tabular-nums"
                >
                  <span className="text-muted-foreground">Lap {i + 1}</span>
                  <span>{formatLap(lap)}</span>
                  <span className="text-muted-foreground">(+{formatLap(diff)})</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
})
