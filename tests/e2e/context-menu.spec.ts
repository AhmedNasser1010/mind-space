import { expect, test } from "@playwright/test"
import { CanvasPage } from "./pages/canvas-page"

// The widget context menu was rebuilt on portaled Base UI primitives in
// advisor/026-context-menu-base-ui, fixing menu placement under pan/zoom
// (issue #16) and adding a body pointer-events lock so hover UI behind the
// open menu cannot leak through.

test.describe("widget context menu", () => {
  let canvas: CanvasPage

  test.beforeEach(async ({ page }) => {
    canvas = new CanvasPage(page)
    await canvas.goto()
  })

  test("opens at the pointer even when the canvas is panned and zoomed", async ({ page }) => {
    await page.getByRole("button", { name: "Zoom in" }).click()
    await expect(page.getByText("140%")).toBeVisible()

    // Bare wheel pans (Figma convention, advisor/022).
    const origin = await canvas.canvasOrigin()
    await page.mouse.move(origin.x + 400, origin.y + 300)
    await page.mouse.wheel(-120, -80)
    await expect(page.getByText("140%")).toBeVisible()

    const { menu, point } = await canvas.openContextMenu("Welcome!")
    const box = await menu.boundingBox()
    expect(box).not.toBeNull()
    // The popup anchors at the pointer; the pre-026 bug offset it by the
    // pan/zoom transform (hundreds of px).
    expect(Math.abs(box!.x - point.x)).toBeLessThan(80)
    expect(Math.abs(box!.y - point.y)).toBeLessThan(80)
  })

  test("hovering Color opens the submenu and picking a swatch applies it", async ({ page }) => {
    const { menu } = await canvas.openContextMenu("Welcome!")
    await menu.getByText("Color").hover()

    // Palette swatches are plain buttons inside the submenu popup.
    const swatch = page.getByRole("button", { name: "Apply Rose theme" })
    await swatch.click()

    const state = await canvas.persistedState()
    const widgets = Object.values(state.widgets as Record<string, { type: string; colorTheme?: string }>)
    expect(widgets.find((w) => w.type === "note")?.colorTheme).toBe("rose")
  })

  test("multi-select shows Duplicate N and acts on the whole selection", async ({ page }) => {
    await canvas.marqueeSelect({ x: 100, y: 100, width: 500, height: 150 })
    await canvas.expectSelectedCount(2)

    const { menu } = await canvas.openContextMenu("Welcome!")
    await expect(menu.getByRole("menuitem", { name: "Delete 2 widgets" })).toBeVisible()
    await menu.getByRole("menuitem", { name: "Duplicate 2 widgets" }).click()

    await expect(canvas.widgets).toHaveCount(5)
    await expect(page.getByText("Welcome! (copy)")).toBeVisible()
  })

  test("delete action removes the widget", async () => {
    const { menu } = await canvas.openContextMenu("Quick Links")
    await menu.getByRole("menuitem", { name: "Delete", exact: true }).click()

    await expect(canvas.widgets).toHaveCount(2)
    await expect(canvas.widget("Quick Links")).toHaveCount(0)
  })

  test("hover UI behind the open menu does not leak through", async ({ page }) => {
    await canvas.openContextMenu("Welcome!")

    // Base UI's ContextMenu has no modal pointer lock of its own; the app
    // sets body pointer-events: none while open (advisor/026 leak fix).
    await expect(page.locator("body")).toHaveCSS("pointer-events", "none")

    // Physically hover the Quick Links body; its hover-revealed Edit URL
    // button must stay hidden while the menu is open. Base UI marks the
    // page behind the menu aria-hidden, so locate by attribute, not role.
    const quickLinks = canvas.widget("Quick Links")
    const box = await quickLinks.boundingBox()
    expect(box).not.toBeNull()
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
    await expect(page.locator('button[title="Edit URL"]')).toHaveCSS("opacity", "0")

    // Closing the menu restores interactivity.
    await page.keyboard.press("Escape")
    await expect(page.locator("body")).not.toHaveCSS("pointer-events", "none")
  })
})
