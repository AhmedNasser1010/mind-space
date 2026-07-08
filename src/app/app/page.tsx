import { Canvas } from "@/components/canvas"
import { SheetSidebar } from "@/components/sheets/sheet-sidebar"

export default function Home() {
  return (
    <div className="flex flex-col h-dvh">
      <div className="flex-1 relative min-h-0">
        <Canvas />
      </div>
      <SheetSidebar />
    </div>
  )
}
