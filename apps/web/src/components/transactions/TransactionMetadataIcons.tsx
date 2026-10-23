import { useTranslation } from "react-i18next"
import type { TransactionOutput } from "@fina/types"
import { CreditCard, FileUp } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { FinancialInstitutionLogo } from "@/components/accounts/FinancialInstitutionLogo"
import {
  formatCardLabel,
  type CardOption
} from "@/components/creditCards/cardLabelFormat"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@/components/ui/tooltip"

function TransactionIconTooltip({
  ariaLabel,
  tooltip,
  className,
  role = "img",
  testId,
  children
}: {
  ariaLabel: string
  tooltip: string
  className?: string
  role?: "img" | "group"
  testId?: string
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          role={role}
          data-testid={testId}
          data-transaction-metadata="true"
          aria-label={ariaLabel}
          tabIndex={0}
          className={cn(
            "inline-flex shrink-0 cursor-default items-center text-foreground/45 outline-none focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-fina-violet",
            className
          )}
        >
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={6}
        className="rounded-md border border-fina-grid bg-fina-ink font-mono text-[10px] font-semibold text-white shadow-fina-sm"
      >
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}

export function TransactionAccountChip({
  account
}: {
  account: Pick<
    NonNullable<TransactionOutput["bankaccount"]>,
    "name" | "type" | "institutionId"
  >
}) {
  const { t } = useTranslation()

  return (
    <TransactionIconTooltip
      ariaLabel={t("{{value0}} account: {{value1}}", {
        value0: account.type === "credit" ? t("Credit card") : t("Checking"),
        value1: account.name
      })}
      tooltip={account.name}
      role="group"
      testId="transaction-account"
      className="h-6 max-w-full min-w-0 gap-1.5 rounded-full border border-foreground/10 px-2 text-xs text-foreground/60"
    >
      <FinancialInstitutionLogo
        institutionId={account.institutionId}
        accountName={account.name}
        accountType={account.type}
        className="size-3.5 shrink-0"
        decorative
      />
      <span className="min-w-0 truncate" title={account.name}>
        {account.name}
      </span>
    </TransactionIconTooltip>
  )
}

export function ImportSourceIndicator({
  sourceImport
}: {
  sourceImport: NonNullable<TransactionOutput["import"]>
}) {
  const { t } = useTranslation()

  return (
    <TransactionIconTooltip
      ariaLabel={t("Imported from {{value0}}", {
        value0: sourceImport.fileName
      })}
      tooltip={t("Imported from {{value0}}", { value0: sourceImport.fileName })}
    >
      <FileUp className="size-3.5 shrink-0" aria-hidden="true" />
    </TransactionIconTooltip>
  )
}

export function CreditCardIndicator({
  card,
  billAccountName
}: {
  card?: CardOption | null
  billAccountName?: string
}) {
  const { t } = useTranslation()

  const label = billAccountName
    ? t("Combined bill for {{value0}}", { value0: billAccountName })
    : formatCardLabel(card)

  return (
    <TransactionIconTooltip
      ariaLabel={t("Credit card: {{value0}}", { value0: label })}
      tooltip={label}
    >
      <CreditCard className="size-3.5 shrink-0" aria-hidden="true" />
    </TransactionIconTooltip>
  )
}
