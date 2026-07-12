import { expect, test } from "@playwright/test"
import { CanvasPage } from "./pages/canvas-page"

// advisor/027-hard-grid-lock made the 20px grid a hard constraint: every
// move/resize write path quantizes x/y/width/height (the old snap-to-grid
// toggle was removed), and new widgets are created on-grid.

test.describe("hard grid lock", () => {
  let canvas: CanvasPage

  test.beforeEach(async ({ page }) => {
    canvas = new CanvasPage(page)
    await canvas.goto()
  })

  test("drop position is quantized to 20 on a plain drag", async () => {
    // Raw target (87, 119) rounds to (80, 120). Up-left keeps the path
    // clear of the other widgets' snap ranges.
    await canvas.dragWidgetBy("Welcome!", -73, -41)
    const pos = await canvas.readWidgetPosition("Welcome!")
    expect(pos).toEqual({ x: 80, y: 120 })
    expect(pos.x % 20).toBe(0)
    expect(pos.y % 20).toBe(0)
  })

  test("drop position is quantized to 20 with cmd/ctrl held (snap off)", async () => {
    // Raw target (226, 194) rounds to (220, 200); the modifier only
    // suppresses object snapping, never the grid.
    await canvas.dragWidgetBy("Welcome!", 66, 34, ["ControlOrMeta"])
    const pos = await canvas.readWidgetPosition("Welcome!")
    expect(pos).toEqual({ x: 220, y: 200 })
  })

  test("resize steps in 20px increments", async ({ page }) => {
    await canvas.clickWidgetHeader("Welcome!")
    await canvas.expectSelectedCount(1)

    const zone = canvas.widget("Welcome!").locator(".cursor-se-resize")
    const box = await zone.boundingBox()
    expect(box).not.toBeNull()
    const startX = box!.x + box!.width / 2
    const startY = box!.y + box!.height / 2
    await page.mouse.move(startX, startY)
    await page.mouse.down()
    await page.mouse.move(startX + 16, startY + 13)
    await page.mouse.move(startX + 33, startY + 27)
    await page.mouse.up()

    // 320+33 -> 360, 280+27 -> 300.
    expect(await canvas.readWidgetSize("Welcome!")).toEqual({ width: 360, height: 300 })
  })

  test("a new widget lands on-grid", async () => {
    await canvas.addWidget("Counter")
    await expect(canvas.widget("Counter")).toBeVisible()

    const pos = await canvas.readWidgetPosition("Counter")
    expect(pos.x % 20).toBe(0)
    expect(pos.y % 20).toBe(0)
    const size = await canvas.readWidgetSize("Counter")
    expect(size.width % 20).toBe(0)
    expect(size.height % 20).toBe(0)
  })

  test("the old snap-to-grid toggle is gone from the zoom controls", async ({ page }) => {
    // Removed in advisor/027; the grid is always on now.
    await expect(page.getByRole("button", { name: "Zoom in" })).toBeVisible()
    await expect(page.getByRole("button", { name: /snap/i })).toHaveCount(0)
  })
})
