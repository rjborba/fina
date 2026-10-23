import { useTranslation } from "react-i18next"
import { useState } from "react"
import { ChevronDown, CreditCard } from "lucide-react"
import { CardMetadataEditor } from "@/components/creditCards/CardMetadataEditor"
import type { CardMetadata } from "@fina/types"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover"

export function BulkCardAssignment({
  accountId,
  busy,
  onAssignCard
}: {
  accountId: string | null
  busy: boolean
  onAssignCard: (card: CardMetadata) => Promise<void>
}) {
  const { t } = useTranslation()

  const [open, setOpen] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const disabled = busy || assigning || !accountId
  const assign = async (card: CardMetadata) => {
    if (disabled) return
    setAssigning(true)
    try {
      await onAssignCard(card)
      setOpen(false)
    } finally {
      setAssigning(false)
    }
  }
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (!busy && !assigning) setOpen(next)
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="fina-ghost"
          size="sm"
          aria-label={t("Card for selected purchases")}
          disabled={disabled}
          title={
            !accountId
              ? t(
                  "Select credit purchases from one account to assign their card"
                )
              : t("Edit the card details on all selected purchases")
          }
          className="h-7 rounded-md border-0 bg-transparent px-2 text-[13px] font-normal shadow-none hover:bg-black/[0.05] dark:hover:bg-white/[0.05]"
        >
          <CreditCard className="size-3.5" aria-hidden />{" "}
          {assigning ? t("Updating...") : t("Card")}{" "}
          <ChevronDown className="size-3" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        sideOffset={8}
        aria-label={t("Card for selected purchases")}
        className="w-64 rounded-xl border-fina-grid bg-fina-surface p-3 shadow-fina-md"
      >
        <CardMetadataEditor
          value={{ cardName: null, cardLast4: null }}
          disabled={disabled}
          onSave={assign}
        />
      </PopoverContent>
    </Popover>
  )
}
