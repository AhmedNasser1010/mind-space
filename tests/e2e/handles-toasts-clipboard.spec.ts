import { expect, test } from "@playwright/test"
import { CanvasPage } from "./pages/canvas-page"

// Covers advisor/029-sonner-toasts (sheet actions fire sonner toasts),
// advisor/030-resize-handle-styles (selectable corner/invisible/bracket
// visuals, collapsed widgets only expose e/w zones) and
// advisor/031-clipboard-fidelity (copy/paste keeps colorTheme).

test.describe("handles, toasts, clipboard", () => {
  let canvas: CanvasPage

  test.beforeEach(async ({ page }) => {
    canvas = new CanvasPage(page)
    await canvas.goto()
  })

  test("a collapsed widget exposes only the e/w resize zones", async () => {
    await canvas.clickWidgetHeader("Welcome!")
    await canvas.expectSelectedCount(1)

    const welcome = canvas.widget("Welcome!")
    await expect(welcome.locator('[class*="-resize"]')).toHaveCount(8)

    await welcome.getByRole("button", { name: "Collapse" }).click()
    await expect(welcome.locator("textarea")).toHaveCount(0)

    // Height is content-driven while collapsed, so only horizontal
    // resizing makes sense (advisor/030 collapsed fix).
    await expect(welcome.locator(".cursor-e-resize")).toHaveCount(1)
    await expect(welcome.locator(".cursor-w-resize")).toHaveCount(1)
    await expect(welcome.locator('[class*="-resize"]')).toHaveCount(2)
    // No corner visuals either.
    await expect(welcome.locator("div.h-2.w-2.rounded-sm")).toHaveCount(0)
  })

  test("the resize handle style switches and persists across reload", async ({ page }) => {
    await page.getByRole("button", { name: "Canvas background" }).click()
    await page.getByRole("button", { name: "Brackets" }).click()
    await page.keyboard.press("Escape")

    await canvas.clickWidgetHeader("Welcome!")
    const welcome = canvas.widget("Welcome!")
    // Brackets replace the corner squares (they fade in on hover but are
    // always mounted).
    await expect(welcome.locator("div.border-t-2.border-l-2.border-primary")).toHaveCount(4)
    await expect(welcome.locator("div.h-2.w-2.rounded-sm")).toHaveCount(0)

    const state = await canvas.persistedState()
    expect(state.resizeHandleStyle).toBe("brackets")

    await page.reload()
    await canvas.widgets.first().waitFor({ state: "visible" })
    await canvas.clickWidgetHeader("Welcome!")
    await expect(welcome.locator("div.border-t-2.border-l-2.border-primary")).toHaveCount(4)
  })

  test("creating a sheet fires a sonner toast", async ({ page }) => {
    await canvas.newSheetButton.click()
    const toast = page.locator("[data-sonner-toast]")
    await expect(toast).toBeVisible()
    await expect(toast).toContainText("Sheet created")
  })

  test("copy/paste keeps the widget's color theme", async ({ page }) => {
    // Apply a theme through the context menu, then copy/paste with the
    // keyboard (advisor/031 preserves colorTheme through the clipboard).
    await canvas.clickWidgetHeader("Welcome!")
    const { menu } = await canvas.openContextMenu("Welcome!")
    await menu.getByText("Color").hover()
    await page.getByRole("button", { name: "Apply Rose theme" }).click()

    // Closing the menu returns focus to the note's textarea (the
    // right-click focused it), and the shortcut handler ignores keys from
    // inputs. Re-click the header to blur it before using the clipboard.
    await canvas.clickWidgetHeader("Welcome!")
    await canvas.expectSelectedCount(1)
    await page.keyboard.press("ControlOrMeta+c")
    await page.keyboard.press("ControlOrMeta+v")

    await expect(canvas.widgets).toHaveCount(4)
    await expect(canvas.widget("Welcome!")).toHaveCount(2)

    // Both cards must resolve to the same computed border color.
    const colors = await canvas
      .widget("Welcome!")
      .evaluateAll((els) => els.map((el) => getComputedStyle(el).borderColor))
    expect(colors).toHaveLength(2)
    expect(colors[0]).toBe(colors[1])

    const state = await canvas.persistedState()
    const themed = Object.values(state.widgets as Record<string, { colorTheme?: string }>).filter(
      (w) => w.colorTheme === "rose"
    )
    expect(themed).toHaveLength(2)
  })
})
