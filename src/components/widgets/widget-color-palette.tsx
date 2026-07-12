"use client"

import { memo } from "react"
import { WIDGET_THEMES, getSwatchStyle } from "@/lib/widget-colors"
import { cn } from "@/lib/utils"
import { useTheme } from "@/components/theme-provider"
import { Palette } from "lucide-react"

interface WidgetColorPaletteProps {
  currentId: string | undefined
  onSelect: (id: string) => void
  compact?: boolean
}

export const WidgetColorPalette = memo(function WidgetColorPalette({
  currentId,
  onSelect,
  compact = false,
}: WidgetColorPaletteProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  return (
    <div>
      {!compact && (
        <div className="flex items-center gap-1.5 px-1 py-1 text-xs text-muted-foreground">
          <Palette className="h-3 w-3" />
          Color theme
        </div>
      )}
      <div className={cn("grid gap-1 p-1", compact ? "grid-cols-6" : "grid-cols-6")}>
        <button
          className={cn(
            "h-5 w-5 rounded-full border-2 transition-colors",
            (!currentId || currentId === "default")
              ? "border-ring ring-1 ring-ring"
              : "border-border hover:border-muted-foreground"
          )}
          style={getSwatchStyle("default", isDark)}
          onClick={() => onSelect("default")}
          title="Default"
          aria-label="Reset to default theme"
        />
        {WIDGET_THEMES.map((t) => (
          <button
            key={t.id}
            className={cn(
              "h-5 w-5 rounded-full border-2 transition-colors",
              currentId === t.id
                ? "border-ring ring-1 ring-ring"
                : "border-border hover:border-muted-foreground"
            )}
            style={getSwatchStyle(t.id, isDark)}
            onClick={() => onSelect(t.id)}
            title={t.name}
            aria-label={`Apply ${t.name} theme`}
          />
        ))}
      </div>
    </div>
  )
})
