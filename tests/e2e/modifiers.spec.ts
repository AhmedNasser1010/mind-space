import { expect, test } from "@playwright/test"
import { CanvasPage } from "./pages/canvas-page"

// Drag modifiers shipped in advisor/024-drag-modifiers: alt-drag clones the
// selection and drags the clones (original stays put), cmd/ctrl+click
// toggles a widget in and out of the selection.

test.describe("drag modifiers", () => {
  let canvas: CanvasPage

  test.beforeEach(async ({ page }) => {
    canvas = new CanvasPage(page)
    await canvas.goto()
  })

  test("alt-drag clones; the original stays; one undo removes the clone", async () => {
    await expect(canvas.widgets).toHaveCount(3)

    // Clone latches on the first pointermove with altKey held. The clone
    // drops at exactly (360, 160): 200 is a grid multiple and no snap
    // target sits within 8px of the path's end.
    await canvas.dragWidgetBy("Welcome!", 200, 0, ["Alt"])

    await expect(canvas.widgets).toHaveCount(4)
    expect(await canvas.widgetPositions("Welcome!")).toEqual([
      { x: 160, y: 160 },
      { x: 360, y: 160 },
    ])

    // duplicateWidgetsAt consumes the drag's pending snapshot, so the whole
    // alt-drag is a single history entry.
    await canvas.undo()
    await expect(canvas.widgets).toHaveCount(3)
    expect(await canvas.widgetPositions("Welcome!")).toEqual([{ x: 160, y: 160 }])
  })

  test("cmd/ctrl+click toggles widgets in and out of the selection", async () => {
    await canvas.clickWidgetHeader("Welcome!")
    await canvas.expectSelectedCount(1)

    await canvas.clickWidgetHeader("Getting Started", ["ControlOrMeta"])
    await canvas.expectSelectedCount(2)

    await canvas.clickWidgetHeader("Getting Started", ["ControlOrMeta"])
    await canvas.expectSelectedCount(1)
    // The remaining ring belongs to Welcome!.
    await expect(
      canvas.widget("Welcome!").locator("div.absolute.inset-0.rounded-xl.border-2.border-primary")
    ).toBeVisible()
  })
})
