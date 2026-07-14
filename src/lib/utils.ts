import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { TextDirection } from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getEffectiveDirection(
  widgetDirection: TextDirection | undefined,
  sheetDirection: TextDirection | undefined,
): TextDirection {
  return widgetDirection ?? sheetDirection ?? "ltr"
}
