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
  return (
    <TransactionIconTooltip
      ariaLabel={`${account.type === "credit" ? "Credit card" : "Checking"} account: ${account.name}`}
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
  return (
    <TransactionIconTooltip
      ariaLabel={`Imported from ${sourceImport.fileName}`}
      tooltip={`Imported from ${sourceImport.fileName}`}
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
  const label = billAccountName
    ? `Combined bill for ${billAccountName}`
    : formatCardLabel(card)

  return (
    <TransactionIconTooltip ariaLabel={`Credit card: ${label}`} tooltip={label}>
      <CreditCard className="size-3.5 shrink-0" aria-hidden="true" />
    </TransactionIconTooltip>
  )
}
