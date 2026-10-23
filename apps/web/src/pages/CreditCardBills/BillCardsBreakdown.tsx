import { formatCurrency } from "@/i18n"
import { useTranslation } from "react-i18next"
import type { CreditCardBillDetail } from "@fina/types"
import { cardMetadataKey } from "@fina/types"
import { CreditCard } from "lucide-react"
import { CardLabel } from "@/components/creditCards/CardLabel"
import { formatCardLabel } from "@/components/creditCards/cardLabelFormat"
import { cn } from "@/lib/utils"

const money = { format: formatCurrency }

export function BillCardsBreakdown({
  summaries,
  roundingAdjustment,
  selectedIds,
  onToggleCard
}: {
  summaries: CreditCardBillDetail["cardSummaries"]
  roundingAdjustment: number
  selectedIds: readonly string[]
  onToggleCard: (id: string) => void
}) {
  const { t } = useTranslation()

  if (!summaries.length) return null
  return (
    <section aria-labelledby="bill-cards-title" className="mb-6">
      <h2 id="bill-cards-title" className="text-sm font-semibold">
        {t("Cards in this bill")}
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        {t(
          "One shared bill. These subtotals include every purchase and refund, even when the purchase list is filtered."
        )}
      </p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {summaries.map((summary) => {
          const id = cardMetadataKey(summary)
          return (
            <li key={id}>
              <button
                type="button"
                aria-label={t("Filter purchases by {{value0}}", {
                  value0: formatCardLabel(summary)
                })}
                aria-pressed={selectedIds.includes(id)}
                onClick={() => onToggleCard(id)}
                className={cn(
                  "flex w-full min-w-0 items-center justify-between gap-3 rounded-lg border border-fina-grid px-3 py-2 text-left outline-none hover:bg-foreground/[0.035] focus-visible:ring-1 focus-visible:ring-fina-violet",
                  selectedIds.includes(id) &&
                    "border-fina-violet/35 bg-fina-violet/5"
                )}
              >
                <span className="min-w-0">
                  <span className="flex min-w-0 items-center gap-2 text-[13px]">
                    <CreditCard
                      aria-hidden="true"
                      className="size-3.5 shrink-0 text-muted-foreground"
                    />
                    <CardLabel card={summary} className="truncate" />
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {t("purchasesCount", { count: summary.transactionCount })}
                    {summary.unavailableValueCount > 0
                      ? t(" · {{value0}} without an amount", {
                          value0: summary.unavailableValueCount
                        })
                      : ""}
                  </span>
                </span>
                <span
                  className="shrink-0 whitespace-nowrap text-[13px] tabular-nums"
                  aria-label={t("Card subtotal {{value0}}", {
                    value0: money.format(summary.total)
                  })}
                >
                  {money.format(summary.total)}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {roundingAdjustment !== 0 ? (
        <p
          className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground"
          aria-label={t("Card subtotal rounding adjustment")}
        >
          <span>
            {t("Rounding adjustment")}{" "}
            <span className="sr-only">
              {t("for amounts stored with more than two decimals")}
            </span>
          </span>
          <span className="tabular-nums">
            {money.format(roundingAdjustment)}
          </span>
        </p>
      ) : null}
    </section>
  )
}
