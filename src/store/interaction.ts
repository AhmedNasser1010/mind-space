import { create } from "zustand"
import type { SelectionBox } from "@/types"

interface InteractionState {
  marquee: SelectionBox | null
  setMarquee: (box: SelectionBox | null) => void
}

// Ephemeral UI state (marquee drag, future snap guides). Deliberately NOT
// persisted and NOT part of the undo/redo history: it changes on every
// pointermove and has no business surviving a reload or being undoable.
export const useInteractionStore = create<InteractionState>()((set) => ({
  marquee: null,
  setMarquee: (box) => set({ marquee: box }),
}))
