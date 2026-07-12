import { expect, test } from "@playwright/test"
import { CanvasPage } from "./pages/canvas-page"

// Canvas backgrounds shipped in advisor/028-canvas-backgrounds: a global
// color+pattern picker in the zoom controls, plus per-sheet overrides from
// the sheet tab menu. Dots renders a radial-gradient layer, grid renders
// linear-gradients.

const dotsLayer = 'div[style*="radial-gradient"]'

test.describe("canvas backgrounds", () => {
  let canvas: CanvasPage

  test.beforeEach(async ({ page }) => {
    canvas = new CanvasPage(page)
    await canvas.goto()
  })

  test("switching the pattern to dots renders radial-gradient and persists", async ({ page }) => {
    // Default pattern is grid (linear gradients), no dots layer.
    await expect(page.locator(dotsLayer)).toHaveCount(0)

    await page.getByRole("button", { name: "Canvas background" }).click()
    await page.getByRole("button", { name: "Dots" }).click()
    await expect(page.locator(dotsLayer)).toHaveCount(1)
    await page.keyboard.press("Escape")

    const state = await canvas.persistedState()
    expect((state.canvasBackground as { pattern: string }).pattern).toBe("dots")
  })

  test("a per-sheet override survives sheet switching and reload", async ({ page }) => {
    await canvas.newSheetButton.click()
    await expect(page.getByText("Sheet 2")).toBeVisible()
    await page.getByText("Sheet 2").click()
    await expect(page.getByText("Canvas is empty")).toBeVisible()

    // Override Sheet 2's pattern from its tab menu.
    const tab = page.locator("[data-sheet-id]").filter({ hasText: "Sheet 2" })
    await tab.getByRole("button", { name: "Sheet actions" }).click()
    await page.getByRole("menuitem", { name: "Background" }).click()
    await page.locator("[data-background-picker]").getByRole("button", { name: "Dots" }).click()
    await expect(page.locator(dotsLayer)).toHaveCount(1)
    await page.keyboard.press("Escape")
    await page.keyboard.press("Escape")

    // Sheet 1 keeps the global grid pattern.
    await page.getByText("Sheet 1").click()
    await expect(canvas.widgets).toHaveCount(3)
    await expect(page.locator(dotsLayer)).toHaveCount(0)

    // Back to Sheet 2: the override is still applied.
    await page.getByText("Sheet 2").click()
    await expect(page.getByText("Canvas is empty")).toBeVisible()
    await expect(page.locator(dotsLayer)).toHaveCount(1)

    // And it survives a reload (Sheet 2 stays current).
    const state = await canvas.persistedState()
    const sheet2 = (state.sheets as { title: string; background?: { pattern?: string } }[]).find(
      (s) => s.title === "Sheet 2"
    )
    expect(sheet2?.background?.pattern).toBe("dots")

    await page.reload()
    await expect(page.getByText("Canvas is empty")).toBeVisible()
    await expect(page.locator(dotsLayer)).toHaveCount(1)
  })
})
