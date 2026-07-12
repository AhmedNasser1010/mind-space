"use client";

import { memo, useRef } from "react";
import { useStore } from "@/store";
import { IconButton } from "@/components/ui/icon-button";
import { ChevronDown, ChevronRight, MoreHorizontal } from "lucide-react";

interface WidgetToolbarProps {
  widgetId: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onStartRename: () => void;
  hideTitle?: boolean;
}

function stopPropagation(e: React.PointerEvent) {
  e.stopPropagation();
}

export const WidgetToolbar = memo(function WidgetToolbar({
  widgetId,
  collapsed,
  onToggleCollapse,
  onStartRename,
  hideTitle = false,
}: WidgetToolbarProps) {
  const widget = useStore((s) => s.widgets[widgetId]);
  const moreButtonRef = useRef<HTMLButtonElement>(null);

  if (!widget) return null;

  function openContextMenu() {
    const btn = moreButtonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    btn.dispatchEvent(
      new PointerEvent("contextmenu", {
        clientX: rect.x + rect.width / 2,
        clientY: rect.y + rect.height / 2,
        bubbles: true,
        cancelable: true,
      }),
    );
  }

  return (
    <div className="flex items-center justify-between gap-0.5 w-full">
      <IconButton
        label={collapsed ? "Expand" : "Collapse"}
        onPointerDown={stopPropagation}
        onClick={(e) => {
          e.stopPropagation();
          onToggleCollapse();
        }}
      >
        {collapsed ? (
          <ChevronRight className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
      </IconButton>

      <div className="flex items-center justify-between w-full">
        {hideTitle ? (
          <div className="min-w-0 flex-1" />
        ) : (
          <button
            onPointerDown={stopPropagation}
            onClick={(e) => {
              e.stopPropagation();
              onStartRename();
            }}
            className="flex h-6 min-w-24 max-w-48 flex-none items-center truncate rounded-md px-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            title="Rename"
          >
            <span className="truncate">{widget.title}</span>
          </button>
        )}

        <IconButton
          ref={moreButtonRef}
          label="Widget actions"
          onPointerDown={stopPropagation}
          onClick={(e) => {
            e.stopPropagation();
            openContextMenu();
          }}
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </IconButton>
      </div>
    </div>
  );
});
