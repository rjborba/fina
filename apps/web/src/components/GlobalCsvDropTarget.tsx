import { queueImportFile } from "@/imports/pendingImport"
import { FileUp } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router"

function carriesFiles(event: DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes("Files")
}

export function GlobalCsvDropTarget() {
  const navigate = useNavigate()
  const dragDepth = useRef(0)
  const [active, setActive] = useState(false)

  useEffect(() => {
    const reset = () => {
      dragDepth.current = 0
      setActive(false)
    }

    const handleDragEnter = (event: DragEvent) => {
      if (!carriesFiles(event)) return
      event.preventDefault()
      dragDepth.current += 1
      setActive(true)
    }

    const handleDragOver = (event: DragEvent) => {
      if (!carriesFiles(event)) return
      event.preventDefault()
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy"
      setActive(true)
    }

    const handleDragLeave = (event: DragEvent) => {
      if (!carriesFiles(event)) return
      dragDepth.current = Math.max(0, dragDepth.current - 1)
      if (dragDepth.current === 0) setActive(false)
    }

    const handleDrop = (event: DragEvent) => {
      if (!carriesFiles(event)) return
      if (event.defaultPrevented) {
        reset()
        return
      }
      event.preventDefault()
      reset()
      const file = event.dataTransfer?.files[0]
      if (!file) return
      queueImportFile(file)
      navigate("/imports")
    }

    window.addEventListener("dragenter", handleDragEnter)
    window.addEventListener("dragover", handleDragOver)
    window.addEventListener("dragleave", handleDragLeave)
    window.addEventListener("drop", handleDrop)
    window.addEventListener("dragend", reset)
    return () => {
      window.removeEventListener("dragenter", handleDragEnter)
      window.removeEventListener("dragover", handleDragOver)
      window.removeEventListener("dragleave", handleDragLeave)
      window.removeEventListener("drop", handleDrop)
      window.removeEventListener("dragend", reset)
    }
  }, [navigate])

  if (!active) return null

  return (
    <div className="pointer-events-none fixed inset-4 z-[100] flex items-center justify-center rounded-2xl border-2 border-dashed border-primary/60 bg-background/90 shadow-2xl backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="rounded-full bg-primary/10 p-4 text-primary">
          <FileUp className="h-8 w-8" />
        </span>
        <div>
          <p className="text-xl font-semibold">Drop file to import</p>
          <p className="text-sm text-muted-foreground">
            Release it anywhere to open the CSV import preview.
          </p>
        </div>
      </div>
    </div>
  )
}
