import type { Sheet, Widget } from "@/types"

export interface HistoryTrio {
  sheets: Sheet[]
  widgets: Record<string, Widget>
  currentSheetId: string | null
}

export interface HistoryEntry {
  widgetsBefore: Record<string, Widget | null>
  sheetsBefore: Sheet[] | null
  currentSheetIdBefore: string | null | undefined
}

/**
 * Compares prev/next trios by reference (store updates are immutable
 * spreads, so reference inequality means changed) and records only what
 * is needed to restore prev. Returns null when nothing history-relevant
 * changed.
 */
export function diffForHistory(prev: HistoryTrio, next: HistoryTrio): HistoryEntry | null {
  const widgetsBefore: Record<string, Widget | null> = {}
  let hasWidgetChange = false

  for (const id of Object.keys(prev.widgets)) {
    if (prev.widgets[id] !== next.widgets[id]) {
      widgetsBefore[id] = prev.widgets[id]
      hasWidgetChange = true
    }
  }
  for (const id of Object.keys(next.widgets)) {
    if (!(id in prev.widgets)) {
      widgetsBefore[id] = null
      hasWidgetChange = true
    }
  }

  const sheetsChanged = prev.sheets !== next.sheets
  const currentSheetIdChanged = prev.currentSheetId !== next.currentSheetId

  if (!hasWidgetChange && !sheetsChanged && !currentSheetIdChanged) {
    return null
  }

  return {
    widgetsBefore,
    sheetsBefore: sheetsChanged ? prev.sheets : null,
    currentSheetIdBefore: currentSheetIdChanged ? prev.currentSheetId : undefined,
  }
}

/**
 * Applies a history entry to `state`, restoring the prior values it
 * captured. Returns the restored trio plus a mirror entry that reverses
 * the application (i.e. redoing after an undo, or undoing after a redo).
 */
export function applyHistoryEntry(
  state: HistoryTrio,
  entry: HistoryEntry
): { restored: HistoryTrio; mirror: HistoryEntry } {
  const mirrorWidgetsBefore: Record<string, Widget | null> = {}
  const widgets = { ...state.widgets }

  for (const [id, priorWidget] of Object.entries(entry.widgetsBefore)) {
    mirrorWidgetsBefore[id] = widgets[id] ?? null
    if (priorWidget === null) {
      delete widgets[id]
    } else {
      widgets[id] = priorWidget
    }
  }

  const sheets = entry.sheetsBefore !== null ? entry.sheetsBefore : state.sheets
  const currentSheetId =
    entry.currentSheetIdBefore !== undefined ? entry.currentSheetIdBefore : state.currentSheetId

  const mirror: HistoryEntry = {
    widgetsBefore: mirrorWidgetsBefore,
    sheetsBefore: entry.sheetsBefore !== null ? state.sheets : null,
    currentSheetIdBefore: entry.currentSheetIdBefore !== undefined ? state.currentSheetId : undefined,
  }

  return {
    restored: { sheets, widgets, currentSheetId },
    mirror,
  }
}

/**
 * Type guard for entries coming out of persisted storage - guards
 * against malformed/legacy blobs the same way the old JSON.parse
 * try/catch did.
 */
export function isValidHistoryEntry(value: unknown): value is HistoryEntry {
  if (typeof value !== "object" || value === null) return false
  const entry = value as Record<string, unknown>
  if (typeof entry.widgetsBefore !== "object" || entry.widgetsBefore === null) return false
  if (entry.sheetsBefore !== null && !Array.isArray(entry.sheetsBefore)) return false
  if (
    entry.currentSheetIdBefore !== undefined &&
    entry.currentSheetIdBefore !== null &&
    typeof entry.currentSheetIdBefore !== "string"
  ) {
    return false
  }
  return true
}
