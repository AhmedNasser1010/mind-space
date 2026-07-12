import { beforeEach, describe, expect, it } from "vitest"
import { useStore } from "@/store"
import { WidgetType, type Widget } from "@/types"

function makeWidget(id: string, overrides: Partial<Widget> = {}): Widget {
  return {
    id, type: WidgetType.Note, title: "w", x: 0, y: 0,
    width: 100, height: 100, zIndex: 1, collapsed: false, data: {},
    ...overrides,
  }
}

beforeEach(() => {
  localStorage.clear()
  useStore.setState({
    sheets: [{ id: "s1", title: "Sheet 1", widgetOrder: ["w1"], createdAt: 0, updatedAt: 0 }],
    currentSheetId: "s1",
    widgets: { w1: makeWidget("w1") },
    selectedWidgetIds: [],
    undoStack: [],
    redoStack: [],
    clipboard: null,
  })
})

describe("addSheet", () => {
  it("appends a sheet and pushes one undo snapshot", () => {
    useStore.getState().addSheet("Sheet 2")
    const state = useStore.getState()
    expect(state.sheets).toHaveLength(2)
    expect(state.sheets[1].title).toBe("Sheet 2")
    expect(state.undoStack).toHaveLength(1)
  })
})

describe("deleteSheet", () => {
  it("removes the sheet and its widgets, and moves currentSheetId to the first remaining sheet", () => {
    useStore.setState({
      sheets: [
        { id: "s1", title: "Sheet 1", widgetOrder: ["w1"], createdAt: 0, updatedAt: 0 },
        { id: "s2", title: "Sheet 2", widgetOrder: [], createdAt: 0, updatedAt: 0 },
      ],
      currentSheetId: "s1",
    })
    useStore.getState().deleteSheet("s1")
    const state = useStore.getState()
    expect(state.sheets.map((s) => s.id)).toEqual(["s2"])
    expect(state.widgets.w1).toBeUndefined()
    expect(state.currentSheetId).toBe("s2")
  })

  it("sets currentSheetId to null when the last sheet is deleted", () => {
    useStore.getState().deleteSheet("s1")
    const state = useStore.getState()
    expect(state.sheets).toHaveLength(0)
    expect(state.currentSheetId).toBeNull()
  })
})

describe("duplicateSheet", () => {
  it("creates new widget IDs and appends ' (copy)' to titles", () => {
    useStore.getState().duplicateSheet("s1")
    const state = useStore.getState()
    const newSheet = state.sheets[1]
    expect(newSheet.title).toBe("Sheet 1 (copy)")
    expect(newSheet.widgetOrder).toHaveLength(1)
    const newWidgetId = newSheet.widgetOrder[0]
    expect(newWidgetId).not.toBe("w1")
    expect(state.widgets[newWidgetId].title).toBe("w (copy)")
  })
})

describe("updateWidget", () => {
  it("merges partial updates and pushes an undo snapshot", () => {
    useStore.getState().updateWidget("w1", { title: "updated", x: 42 })
    const state = useStore.getState()
    expect(state.widgets.w1.title).toBe("updated")
    expect(state.widgets.w1.x).toBe(42)
    expect(state.widgets.w1.y).toBe(0)
    expect(state.undoStack).toHaveLength(1)
  })

  it("is a no-op for an unknown id", () => {
    useStore.getState().updateWidget("does-not-exist", { title: "x" })
    const state = useStore.getState()
    expect(state.widgets["does-not-exist"]).toBeUndefined()
    expect(state.undoStack).toHaveLength(0)
  })
})

describe("moveWidget", () => {
  it("changes x/y and does not push an undo snapshot", () => {
    useStore.getState().moveWidget("w1", 10, 20)
    const state = useStore.getState()
    expect(state.widgets.w1.x).toBe(10)
    expect(state.widgets.w1.y).toBe(20)
    expect(state.undoStack).toHaveLength(0)
  })
})

describe("resizeWidget", () => {
  it("changes width/height and does not push an undo snapshot", () => {
    useStore.getState().resizeWidget("w1", 200, 300)
    const state = useStore.getState()
    expect(state.widgets.w1.width).toBe(200)
    expect(state.widgets.w1.height).toBe(300)
    expect(state.undoStack).toHaveLength(0)
  })
})

describe("undo/redo", () => {
  it("undo after updateWidget restores previous state and moves an entry to redoStack; redo re-applies it", () => {
    useStore.getState().updateWidget("w1", { title: "updated" })
    expect(useStore.getState().widgets.w1.title).toBe("updated")

    useStore.getState().undo()
    let state = useStore.getState()
    expect(state.widgets.w1.title).toBe("w")
    expect(state.undoStack).toHaveLength(0)
    expect(state.redoStack).toHaveLength(1)

    useStore.getState().redo()
    state = useStore.getState()
    expect(state.widgets.w1.title).toBe("updated")
    expect(state.undoStack).toHaveLength(1)
    expect(state.redoStack).toHaveLength(0)
  })

  it("clears redoStack when a new snapshotting action runs", () => {
    useStore.getState().updateWidget("w1", { title: "updated" })
    useStore.getState().undo()
    expect(useStore.getState().redoStack).toHaveLength(1)

    useStore.getState().updateWidget("w1", { title: "again" })
    expect(useStore.getState().redoStack).toHaveLength(0)
  })
})

describe("history cap", () => {
  it("caps undoStack at 50 after 55 updateWidget calls", () => {
    for (let i = 0; i < 55; i++) {
      useStore.getState().updateWidget("w1", { x: i })
    }
    expect(useStore.getState().undoStack).toHaveLength(50)
  })
})

describe("copyWidgets / pasteWidgets", () => {
  it("creates widgets with new IDs, offset positions, and selects the new IDs", () => {
    useStore.getState().copyWidgets("s1", ["w1"])
    useStore.getState().pasteWidgets("s1")
    const state = useStore.getState()
    const newIds = state.selectedWidgetIds
    expect(newIds).toHaveLength(1)
    expect(newIds[0]).not.toBe("w1")
    const pasted = state.widgets[newIds[0]]
    expect(pasted.x).toBe(0 + 24)
    expect(pasted.y).toBe(0 + 24)
  })
})

describe("deleteWidgets", () => {
  it("removes from widgets, widgetOrder, and selectedWidgetIds", () => {
    useStore.setState({ selectedWidgetIds: ["w1"] })
    useStore.getState().deleteWidgets("s1", ["w1"])
    const state = useStore.getState()
    expect(state.widgets.w1).toBeUndefined()
    expect(state.sheets[0].widgetOrder).not.toContain("w1")
    expect(state.selectedWidgetIds).not.toContain("w1")
  })
})
