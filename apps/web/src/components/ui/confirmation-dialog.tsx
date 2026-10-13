import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "./alert-dialog"
import { ReactNode } from "react"
import { useState } from "react"
import { Input } from "./input"

interface ConfirmationDialogProps {
  trigger: ReactNode
  title: ReactNode
  description: ReactNode
  onConfirm: (confirmation?: string) => void
  confirmText?: string
  cancelText?: string
  requiredConfirmationText?: string
}

export function ConfirmationDialog({
  trigger,
  title,
  description,
  onConfirm,
  confirmText = "Confirm",
  cancelText = "Cancel",
  requiredConfirmationText
}: ConfirmationDialogProps) {
  const [open, setOpen] = useState(false)
  const [confirmation, setConfirmation] = useState("")

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      setConfirmation("")
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent className="rounded-md border border-fina-grid bg-fina-surface shadow-fina-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl font-semibold tracking-[-0.04em]">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="font-semibold text-foreground/65">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {requiredConfirmationText ? (
          <Input
            aria-label="Confirmation name"
            autoComplete="off"
            placeholder={`Type ${requiredConfirmationText} to confirm`}
            className="h-11 rounded-md border border-fina-grid bg-fina-surface font-semibold shadow-fina-sm focus-visible:ring-fina-violet"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
          />
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-md border border-fina-grid">
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            className="rounded-md border border-fina-grid bg-fina-danger font-semibold text-foreground shadow-fina-sm hover:bg-fina-danger"
            disabled={
              !!requiredConfirmationText &&
              confirmation !== requiredConfirmationText
            }
            onClick={() => onConfirm(confirmation || undefined)}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
