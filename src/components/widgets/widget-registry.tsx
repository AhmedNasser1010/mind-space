import type { WidgetType } from "@/types"
import type { ComponentType } from "react"
import { TimerWidget } from "./timer-widget"
import { StopwatchWidget } from "./stopwatch-widget"
import { QuickLinkWidget } from "./quick-link-widget"
import { CalendarWidget } from "./calendar-widget"
import { HabitWidget } from "./habit-widget"
import { TodoWidget } from "./todo-widget"
import { CounterWidget } from "./counter-widget"
import { NoteWidget } from "./note-widget"
import { TextWidget } from "./text-widget"

export const widgetComponents: Partial<
  Record<WidgetType, ComponentType<{ widgetId: string }>>
> = {
  timer: TimerWidget,
  stopwatch: StopwatchWidget,
  quicklink: QuickLinkWidget,
  calendar: CalendarWidget,
  habit: HabitWidget,
  todo: TodoWidget,
  counter: CounterWidget,
  note: NoteWidget,
  text: TextWidget,
}
