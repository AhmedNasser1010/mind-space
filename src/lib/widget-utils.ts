import type { Widget } from "@/types"

export function getWidgetData<T>(
  widget: Widget | undefined
): T {
  return (widget?.data ?? {}) as T
}
