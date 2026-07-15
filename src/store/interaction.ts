import { create } from "zustand"
import type { SelectionBox } from "@/types"
import type { GuideLine } from "@/lib/snap-align"

export interface FlexBoxDndState {
  dragging: boolean
  cardId: string | null
  cardContent: string | null
  sourceWidgetId: string | null
  position: { x: number; y: number } | null
}

interface InteractionState {
  marquee: SelectionBox | null
  setMarquee: (box: SelectionBox | null) => void
  guides: GuideLine[]
  setGuides: (guides: GuideLine[]) => void
  flexboxDnd: FlexBoxDndState
  setFlexboxDnd: (state: Partial<FlexBoxDndState>) => void
  clearFlexboxDnd: () => void
}

const INITIAL_FLEXBOX_DND: FlexBoxDndState = {
  dragging: false,
  cardId: null,
  cardContent: null,
  sourceWidgetId: null,
  position: null,
}

// Ephemeral UI state (marquee drag, snap guides). Deliberately NOT
// persisted and NOT part of the undo/redo history: it changes on every
// pointermove and has no business surviving a reload or being undoable.
export const useInteractionStore = create<InteractionState>()((set) => ({
  marquee: null,
  setMarquee: (box) => set({ marquee: box }),
  guides: [],
  setGuides: (guides) => set({ guides }),
  flexboxDnd: INITIAL_FLEXBOX_DND,
  setFlexboxDnd: (partial) =>
    set((s) => ({ flexboxDnd: { ...s.flexboxDnd, ...partial } })),
  clearFlexboxDnd: () => set({ flexboxDnd: INITIAL_FLEXBOX_DND }),
}))
