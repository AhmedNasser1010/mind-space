import { describe, expect, it } from "vitest"
import { applyHistoryEntry, diffForHistory, isValidHistoryEntry, type HistoryTrio } from "@/lib/history-diff"
import { WidgetType, type Widget } from "@/types"

function makeWidget(id: string, overrides: Partial<Widget> = {}): Widget {
  return {
    id, type: WidgetType.Note, title: "w", x: 0, y: 0,
    width: 100, height: 100, zIndex: 1, collapsed: false, data: {},
    ...overrides,
  }
}

function makeTrio(overrides: Partial<HistoryTrio> = {}): HistoryTrio {
  return {
    sheets: [{ id: "s1", title: "Sheet 1", widgetOrder: ["w1"], createdAt: 0, updatedAt: 0 }],
    widgets: { w1: makeWidget("w1") },
    currentSheetId: "s1",
    ...overrides,
  }
}

describe("diffForHistory", () => {
  it("returns null when nothing changed", () => {
    const trio = makeTrio()
    expect(diffForHistory(trio, trio)).toBeNull()
  })

  it("records a single-widget edit", () => {
    const prev = makeTrio()
    const editedWidget = { ...prev.widgets.w1, title: "updated" }
    const next = makeTrio({ sheets: prev.sheets, widgets: { w1: editedWidget } })

    const entry = diffForHistory(prev, next)
    expect(entry).not.toBeNull()
    expect(entry!.widgetsBefore).toEqual({ w1: prev.widgets.w1 })
    expect(entry!.sheetsBefore).toBeNull()
    expect(entry!.currentSheetIdBefore).toBeUndefined()
  })

  it("records a widget add as a null tombstone", () => {
    const prev = makeTrio()
    const w2 = makeWidget("w2")
    const next = makeTrio({ widgets: { w1: prev.widgets.w1, w2 } })

    const entry = diffForHistory(prev, next)
    expect(entry).not.toBeNull()
    expect(entry!.widgetsBefore).toEqual({ w2: null })
  })

  it("records a widget delete with its prior value", () => {
    const prev = makeTrio({ widgets: { w1: makeWidget("w1"), w2: makeWidget("w2") } })
    const next = makeTrio({ sheets: prev.sheets, widgets: { w1: prev.widgets.w1 } })

    const entry = diffForHistory(prev, next)
    expect(entry).not.toBeNull()
    expect(entry!.widgetsBefore).toEqual({ w2: prev.widgets.w2 })
  })

  it("records a multi-widget paste as multiple tombstones", () => {
    const prev = makeTrio()
    const w2 = makeWidget("w2")
    const w3 = makeWidget("w3")
    const next = makeTrio({ widgets: { w1: prev.widgets.w1, w2, w3 } })

    const entry = diffForHistory(prev, next)
    expect(entry).not.toBeNull()
    expect(entry!.widgetsBefore).toEqual({ w2: null, w3: null })
  })

  it("records sheet reorder via sheetsBefore", () => {
    const prev = makeTrio({
      sheets: [
        { id: "s1", title: "Sheet 1", widgetOrder: [], createdAt: 0, updatedAt: 0 },
        { id: "s2", title: "Sheet 2", widgetOrder: [], createdAt: 0, updatedAt: 0 },
      ],
      widgets: {},
    })
    const next = makeTrio({ sheets: [...prev.sheets].reverse(), widgets: prev.widgets })

    const entry = diffForHistory(prev, next)
    expect(entry).not.toBeNull()
    expect(entry!.sheetsBefore).toBe(prev.sheets)
    expect(entry!.widgetsBefore).toEqual({})
  })

  it("records currentSheetId change", () => {
    const prev = makeTrio({ currentSheetId: "s1" })
    const next = makeTrio({ sheets: prev.sheets, widgets: prev.widgets, currentSheetId: "s2" })

    const entry = diffForHistory(prev, next)
    expect(entry).not.toBeNull()
    expect(entry!.currentSheetIdBefore).toBe("s1")
    expect(entry!.sheetsBefore).toBeNull()
    expect(entry!.widgetsBefore).toEqual({})
  })
})

describe("applyHistoryEntry apply+mirror round trip", () => {
  function roundTrip(prev: HistoryTrio, next: HistoryTrio) {
    const entry = diffForHistory(prev, next)
    expect(entry).not.toBeNull()

    // undo: apply entry to `next` -> should restore `prev`
    const undone = applyHistoryEntry(next, entry!)
    expect(undone.restored).toEqual(prev)

    // redo: apply the mirror to the undone state -> should restore `next`
    const redone = applyHistoryEntry(undone.restored, undone.mirror)
    expect(redone.restored).toEqual(next)

    return { undone, redone }
  }

  it("round-trips a single-widget edit", () => {
    const prev = makeTrio()
    const next = makeTrio({ sheets: prev.sheets, widgets: { w1: { ...prev.widgets.w1, title: "updated" } } })
    roundTrip(prev, next)
  })

  it("round-trips a widget add", () => {
    const prev = makeTrio()
    const w2 = makeWidget("w2")
    const next = makeTrio({ sheets: prev.sheets, widgets: { ...prev.widgets, w2 } })
    roundTrip(prev, next)
  })

  it("round-trips a widget delete", () => {
    const prev = makeTrio({ widgets: { w1: makeWidget("w1"), w2: makeWidget("w2") } })
    const next = makeTrio({ sheets: prev.sheets, widgets: { w1: prev.widgets.w1 } })
    roundTrip(prev, next)
  })

  it("round-trips a multi-widget paste", () => {
    const prev = makeTrio()
    const w2 = makeWidget("w2")
    const w3 = makeWidget("w3")
    const next = makeTrio({ sheets: prev.sheets, widgets: { ...prev.widgets, w2, w3 } })
    roundTrip(prev, next)
  })

  it("round-trips a sheet reorder", () => {
    const prev = makeTrio({
      sheets: [
        { id: "s1", title: "Sheet 1", widgetOrder: [], createdAt: 0, updatedAt: 0 },
        { id: "s2", title: "Sheet 2", widgetOrder: [], createdAt: 0, updatedAt: 0 },
      ],
    })
    const next = makeTrio({ sheets: [...prev.sheets].reverse() })
    roundTrip(prev, next)
  })

  it("round-trips a currentSheetId change", () => {
    const prev = makeTrio({ currentSheetId: "s1" })
    const next = makeTrio({ sheets: prev.sheets, widgets: prev.widgets, currentSheetId: "s2" })
    roundTrip(prev, next)
  })

  it("undo then redo returns to identity for a combined multi-field change", () => {
    const prev = makeTrio({
      sheets: [{ id: "s1", title: "Sheet 1", widgetOrder: ["w1"], createdAt: 0, updatedAt: 0 }],
      currentSheetId: "s1",
    })
    const w2 = makeWidget("w2")
    const next = makeTrio({
      sheets: [
        { id: "s1", title: "Sheet 1 renamed", widgetOrder: ["w1"], createdAt: 0, updatedAt: 1 },
      ],
      widgets: { w1: { ...prev.widgets.w1, title: "edited" }, w2 },
      currentSheetId: "s2",
    })

    const entry = diffForHistory(prev, next)
    expect(entry).not.toBeNull()

    const undone = applyHistoryEntry(next, entry!)
    expect(undone.restored).toEqual(prev)

    const redone = applyHistoryEntry(undone.restored, undone.mirror)
    expect(redone.restored).toEqual(next)
  })
})

describe("isValidHistoryEntry", () => {
  it("accepts a well-formed entry", () => {
    expect(
      isValidHistoryEntry({ widgetsBefore: {}, sheetsBefore: null, currentSheetIdBefore: undefined })
    ).toBe(true)
  })

  it("rejects malformed entries", () => {
    expect(isValidHistoryEntry(null)).toBe(false)
    expect(isValidHistoryEntry("legacy-json-string")).toBe(false)
    expect(isValidHistoryEntry({})).toBe(false)
    expect(isValidHistoryEntry({ widgetsBefore: {}, sheetsBefore: "not-array" })).toBe(false)
  })
})
