import { useTranslation } from "react-i18next"
import type { ReactNode } from "react"
import { SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet"

export function TransactionMobileTools({
  open,
  onOpenChange,
  children,
  needsAttention,
  onOpenAutoFocus
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
  needsAttention: boolean
  onOpenAutoFocus: (event: Event) => void
}) {
  const { t } = useTranslation()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("View options")}
          title={t("View options")}
          className="relative size-11 shrink-0 text-muted-foreground"
        >
          <SlidersHorizontal className="size-4" />
          {needsAttention ? (
            <span
              aria-hidden="true"
              className="absolute right-2 top-2 size-1.5 rounded-full bg-amber-500"
            />
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        onOpenAutoFocus={onOpenAutoFocus}
        className="max-h-[85dvh] gap-0 rounded-t-2xl border-fina-grid bg-fina-surface pb-[env(safe-area-inset-bottom)] text-foreground"
      >
        <SheetHeader className="border-b border-fina-grid pr-14">
          <SheetTitle>{t("View options")}</SheetTitle>
          <SheetDescription>
            {t(
              "Choose your ledger view, find entries or customize the display."
            )}
          </SheetDescription>
        </SheetHeader>
        <div className="fina-scrollbar min-h-0 space-y-5 overflow-y-auto p-4">
          {children}
        </div>
        <div className="border-t border-fina-grid p-4">
          <SheetClose asChild>
            <Button className="h-11 w-full">{t("Done")}</Button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  )
}
