import { expect, type Locator, type Page } from "@playwright/test"

type Modifier = "Alt" | "Control" | "ControlOrMeta" | "Meta" | "Shift"

export interface SeedWidget {
  id: string
  type: string
  title: string
  x: number
  y: number
  width: number
  height: number
  collapsed?: boolean
  data?: Record<string, unknown>
  colorTheme?: string
}

export class CanvasPage {
  readonly page: Page
  readonly addWidgetButton: Locator
  readonly widgets: Locator
  readonly newSheetButton: Locator
  // SelectionOutline's ring div (advisor/030): absolute inset-0 border-2
  // border-primary. Corner squares/brackets carry border-primary too but
  // not inset-0, so this matches exactly one ring per selected widget.
  readonly selectionRings: Locator
  // SnapGuides (advisor/023/025) render bg-red-500 line divs while a drag
  // is within snap range; they unmount on drop.
  readonly snapGuides: Locator
  // MarqueeOverlay (advisor/022) renders while an empty-canvas drag is live.
  readonly marqueeOverlay: Locator

  constructor(page: Page) {
    this.page = page
    this.addWidgetButton = page.getByRole("button", { name: "Add widget", exact: true })
    // The [data-widget] wrapper is zero-size (the card inside is absolutely
    // positioned), so target the card div - it has real geometry.
    this.widgets = page.locator("[data-widget] > div")
    this.newSheetButton = page.getByRole("button", { name: "New Sheet", exact: true })
    this.selectionRings = page.locator("[data-widget] div.absolute.inset-0.rounded-xl.border-2.border-primary")
    this.snapGuides = page.locator("div.absolute.bg-red-500")
    this.marqueeOverlay = page.locator("div.absolute.border.border-primary")
  }

  async goto() {
    await this.page.goto("/app")
    // First visit seeds a default sheet (Welcome note, Getting Started todo,
    // Quick Links) after rehydration; wait for it rather than networkidle.
    await this.widgets.first().waitFor({ state: "visible" })
  }

  // Writes a version-6 mind-space-store blob before the app boots so specs
  // get exact widget geometry (needed for snap-distance math). Call BEFORE
  // goto().
  async seedSheet(widgets: SeedWidget[]) {
    const now = 1700000000000
    const state = {
      sheets: [
        {
          id: "sheet-1",
          title: "Sheet 1",
          widgetOrder: widgets.map((w) => w.id),
          createdAt: now,
          updatedAt: now,
        },
      ],
      currentSheetId: "sheet-1",
      widgets: Object.fromEntries(
        widgets.map((w, i) => [
          w.id,
          { collapsed: false, data: {}, zIndex: i + 1, ...w },
        ])
      ),
      canvasState: { offsetX: 0, offsetY: 0, scale: 1, gridSize: 20, snapToObjects: true },
      canvasBackground: { color: "default", pattern: "grid" },
      resizeHandleStyle: "corners",
      themeSettings: { mode: "system", accentColor: "zinc", fontSize: 16 },
      clipboard: null,
      undoStack: [],
      redoStack: [],
    }
    await this.page.addInitScript(
      ({ key, value }: { key: string; value: string }) => localStorage.setItem(key, value),
      { key: "mind-space-store", value: JSON.stringify({ state, version: 6 }) }
    )
  }

  widget(titleText: string): Locator {
    return this.widgets.filter({ hasText: titleText })
  }

  dragHandle(widget: Locator): Locator {
    // BaseWidget's title bar is the drag surface.
    return widget.locator("div.cursor-grab").first()
  }

  async addWidget(menuLabel: string) {
    await this.addWidgetButton.click()
    await this.page.getByRole("button", { name: menuLabel, exact: true }).click()
  }

  // World position straight off the card's inline style - exact and live,
  // no storage debounce to wait out.
  async readWidgetPosition(title: string): Promise<{ x: number; y: number }> {
    return this.widget(title)
      .first()
      .evaluate((el) => ({
        x: parseFloat((el as HTMLElement).style.left),
        y: parseFloat((el as HTMLElement).style.top),
      }))
  }

  // All matches for a title (e.g. original + alt-drag clone share a title),
  // sorted by x then y for stable assertions.
  async widgetPositions(title: string): Promise<{ x: number; y: number }[]> {
    return this.widget(title).evaluateAll((els) =>
      els
        .map((el) => ({
          x: parseFloat((el as HTMLElement).style.left),
          y: parseFloat((el as HTMLElement).style.top),
        }))
        .sort((a, b) => a.x - b.x || a.y - b.y)
    )
  }

  async readWidgetSize(title: string): Promise<{ width: number; height: number }> {
    return this.widget(title)
      .first()
      .evaluate((el) => ({
        width: parseFloat((el as HTMLElement).style.width),
        height: parseFloat((el as HTMLElement).style.height),
      }))
  }

  // Client coords of the canvas world origin, derived from any visible
  // widget (client box minus inline world position). Only valid while the
  // canvas is untransformed (scale 1, initial offset) - true for fresh pages.
  async canvasOrigin(): Promise<{ x: number; y: number }> {
    const card = this.widgets.first()
    const box = await card.boundingBox()
    if (!box) throw new Error("no widget visible to derive canvas origin")
    const world = await card.evaluate((el) => ({
      x: parseFloat((el as HTMLElement).style.left),
      y: parseFloat((el as HTMLElement).style.top),
    }))
    return { x: box.x - world.x, y: box.y - world.y }
  }

  // Empty-canvas drag = marquee select (advisor/022). rect is in world
  // coordinates; the start corner must be over empty canvas.
  async marqueeSelect(
    rect: { x: number; y: number; width: number; height: number },
    opts: { shift?: boolean } = {}
  ) {
    const origin = await this.canvasOrigin()
    const startX = origin.x + rect.x
    const startY = origin.y + rect.y
    // Additive mode latches from the modifier on pointerdown, so hold
    // Shift before pressing.
    if (opts.shift) await this.page.keyboard.down("Shift")
    await this.page.mouse.move(startX, startY)
    await this.page.mouse.down()
    await this.page.mouse.move(startX + rect.width / 2, startY + rect.height / 2)
    await this.page.mouse.move(startX + rect.width, startY + rect.height)
    await this.page.mouse.up()
    if (opts.shift) await this.page.keyboard.up("Shift")
  }

  async clickEmptyCanvas(world: { x: number; y: number }) {
    const origin = await this.canvasOrigin()
    await this.page.mouse.click(origin.x + world.x, origin.y + world.y)
  }

  // Drags by the title bar. Accepts a title or a Locator. Modifier keys are
  // held across the whole gesture: alt-clone latches on the first
  // pointermove, snap/axis modifiers are read per-move.
  async dragWidgetBy(target: Locator | string, dx: number, dy: number, modifiers: Modifier[] = []) {
    await this.beginWidgetDrag(target, dx, dy, modifiers)
    await this.endDrag(modifiers)
  }

  // Same gesture but leaves the button down so specs can assert mid-drag
  // state (snap guides, marquee overlay). Pair with endDrag().
  async beginWidgetDrag(target: Locator | string, dx: number, dy: number, modifiers: Modifier[] = []) {
    const widget = typeof target === "string" ? this.widget(target).first() : target
    const handle = this.dragHandle(widget)
    const box = await handle.boundingBox()
    if (!box) throw new Error("drag handle not visible")
    // Grab the title bar's empty flex gap left of the actions button. The
    // bar's center can land on the title rename button for narrow widgets,
    // and that button stopPropagations pointerdown, which kills the drag.
    const grabX = box.x + box.width - 44
    const grabY = box.y + box.height / 2
    for (const key of modifiers) await this.page.keyboard.down(key)
    await this.page.mouse.move(grabX, grabY)
    await this.page.mouse.down()
    // Two moves: the app latches drag state on the first pointermove.
    await this.page.mouse.move(grabX + dx / 2, grabY + dy / 2)
    await this.page.mouse.move(grabX + dx, grabY + dy)
  }

  async endDrag(modifiers: Modifier[] = []) {
    await this.page.mouse.up()
    for (const key of modifiers) await this.page.keyboard.up(key)
  }

  // Clicks the title bar's empty flex gap (left of the actions button,
  // right of the title button - both of which stopPropagation and would
  // swallow the selection click).
  async clickWidgetHeader(title: string, modifiers: Modifier[] = []) {
    const handle = this.dragHandle(this.widget(title).first())
    const box = await handle.boundingBox()
    if (!box) throw new Error(`widget header not visible: ${title}`)
    await handle.click({ position: { x: box.width - 44, y: box.height / 2 }, modifiers })
  }

  // Right-clicks the widget body (below the title bar, so the drag hook
  // never captures the pointer) and waits for the Base UI portaled popup
  // (advisor/026). Returns the popup plus the exact click point so specs
  // can assert the menu opened at the pointer.
  async openContextMenu(title: string): Promise<{ menu: Locator; point: { x: number; y: number } }> {
    const card = this.widget(title).first()
    const box = await card.boundingBox()
    if (!box) throw new Error(`widget not visible: ${title}`)
    const point = { x: box.x + box.width / 2, y: box.y + box.height - 24 }
    await this.page.mouse.click(point.x, point.y, { button: "right" })
    const menu = this.page.getByRole("menu").first()
    await menu.waitFor({ state: "visible" })
    return { menu, point }
  }

  async expectSelectedCount(n: number) {
    await expect(this.selectionRings).toHaveCount(n)
  }

  async persistedState(): Promise<Record<string, unknown>> {
    // Writes are debounced 300 ms; wait past the window before reading.
    await this.page.waitForTimeout(500)
    return this.page.evaluate(() => {
      const raw = localStorage.getItem("mind-space-store")
      return raw ? JSON.parse(raw).state : null
    })
  }

  async undo() {
    await this.page.keyboard.press("ControlOrMeta+z")
  }
}
