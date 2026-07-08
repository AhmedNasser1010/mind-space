# Mind Space

A personal mind organizer — a freestyle canvas dashboard for notes, todos, timers, habits, and more.

Arrange widgets freely on an infinite, zoomable canvas. Organize your thoughts across multiple sheets. Everything is local — no accounts, no servers, no cloud.

## Features

- **Infinite Canvas** — pan, zoom, snap-to-grid. Navigate with drag, scroll wheel, or Space+drag.
- **Sheets** — multiple named canvases organized in a tab bar. Add, rename, duplicate, reorder, delete.
- **Widgets** — add and arrange any mix of:
  - Note (rich text)
  - Label (editable text)
  - Todo List (todo / in-progress / done)
  - Counter (configurable step)
  - Timer (countdown)
  - Stopwatch (with lap recording)
  - Calendar (monthly with per-day notes)
  - Habit Tracker (emoji-labeled, monthly grid, streak tracking)
  - Quick Link (bookmark with favicon)
- **Drag, Resize, Collapse** — every widget is freely positioned and resizable via 8 handles.
- **Multi-Select** — Shift+click to batch operations.
- **Color Themes** — 12 accent colors per widget.
- **Undo / Redo** — history stack (up to 50 steps).
- **Copy / Paste** — across sheets and canvases.
- **Light / Dark / System** theme toggle.
- **Persistent** — all data saved to localStorage. Debounced writes, flushes on tab close.

## Tech Stack

[Next.js](https://nextjs.org/) (App Router) · [React](https://react.dev/) · [TypeScript](https://www.typescriptlang.org/) · [Tailwind CSS](https://tailwindcss.com/) v4 · [Zustand](https://github.com/pmndrs/zustand) (state + persist) · [Radix UI](https://www.radix-ui.com/) · [Lucide](https://lucide.dev/) icons · [Frimousse](https://github.com/penx/frimousse) (emoji picker)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## Architecture

Mind Space is a fully client-side single-page application. There is no backend, no database, and no API routes. All state is managed by a Zustand store persisted to localStorage.

```
page.tsx
├── SheetSidebar (tab bar for sheet management)
└── Canvas (infinite pan/zoom canvas)
    ├── ZoomControls (zoom, theme, add widget)
    └── Widgets (for active sheet)
        └── BaseWidget (drag, resize, select, context menu, color)
            ├── SelectionOutline (resize handles)
            ├── WidgetToolbar (title, collapse, menu)
            └── WidgetComponent (NoteWidget | TodoWidget | ...)
```

## License

MIT
