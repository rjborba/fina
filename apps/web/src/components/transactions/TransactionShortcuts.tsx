import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"

const shortcuts = [
  ["Create an entry", "C"],
  ["Filter", "F"],
  ["Find in view", "⌘ / Ctrl F"],
  ["Display options", "Shift V"],
  ["Toggle period summary", "S"],
  ["Move through entries", "↑ / ↓ · J / K"],
  ["Open an entry", "Enter"],
  ["Toggle selection", "X"],
  ["Select a range", "Shift ↑ / ↓"],
  ["Select all transactions", "⌘ / Ctrl A"],
  ["Clear selection / close", "Esc"],
  ["Keyboard shortcuts", "?"]
] as const

export function TransactionShortcuts({
  open,
  onOpenChange
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-sm gap-4 rounded-lg p-5"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle className="text-sm font-medium">
            Keyboard shortcuts
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {shortcuts.map(([label, key]) => (
            <div
              key={label}
              className="flex items-center justify-between gap-4 text-xs"
            >
              <span className="text-muted-foreground">{label}</span>
              <kbd className="whitespace-nowrap text-[11px] text-foreground">
                {key}
              </kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
