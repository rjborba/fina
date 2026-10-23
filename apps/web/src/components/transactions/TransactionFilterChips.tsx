import { formatCurrency } from "@/i18n"
import { useTranslation } from "react-i18next"
import {
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction
} from "react"
import { FinancialInstitutionLogo } from "@/components/accounts/FinancialInstitutionLogo"
import {
  CreditCard,
  Landmark,
  ReceiptText,
  Tag,
  X,
  type LucideIcon
} from "lucide-react"
import { useActiveGroup } from "@/contexts/ActiveGroupContext"
import { useCategories } from "@/data/categories/useCategories"
import { useBankAccounts } from "@/data/bankAccounts/useBankAccounts"
import { useImports } from "@/data/imports/useImports"
import { parseCardMetadataKey } from "@fina/types"
import { formatCardLabel } from "@/components/creditCards/cardLabelFormat"
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover"
import {
  TransactionFilterPanel,
  type FilterProperty,
  type TransactionFilterValue
} from "./TransactionsFilter"
import { filterPopupClass } from "./TransactionFilterStyles"

const formatMoney = formatCurrency
const summarize = (names: string[]) =>
  names.length > 1 ? `${names[0]} +${names.length - 1}` : names[0]

export function TransactionFilterChips({
  value,
  onChange,
  dateBasis
}: {
  value: TransactionFilterValue
  onChange: Dispatch<SetStateAction<TransactionFilterValue>>
  dateBasis?: "cash-flow" | "monthly-review"
  linkedAccountId?: string | null
}) {
  const { t } = useTranslation()

  const { selectedGroup } = useActiveGroup()
  const groupId = selectedGroup?.id
  const { data: categories } = useCategories({ groupId })
  const { data: accounts } = useBankAccounts({ groupId })
  const { data: imports } = useImports({ groupId })
  const cardNames = (value.cards ?? []).map((id) => {
    if (id === "-1") return t("Not identified")
    return formatCardLabel(parseCardMetadataKey(id))
  })
  const categoryNames = value.categoriesId.map((id) =>
    id === "-1"
      ? t("None")
      : (categories?.find((item) => item.id === id)?.name ?? `#${id}`)
  )
  const accountNames = (value.accountsId ?? []).map(
    (id) => accounts?.find((item) => item.id === id)?.name ?? `#${id}`
  )
  const firstSelectedAccount = accounts?.find(
    (account) => account.id === value.accountsId?.[0]
  )
  const importNames = (value.importsId ?? []).map(
    (id) => imports?.find((item) => item.id === id)?.fileName ?? `#${id}`
  )
  const amount =
    value.minValue !== undefined && value.maxValue !== undefined
      ? value.minValue === value.maxValue
        ? t("is {{value0}}", { value0: formatMoney(value.minValue) })
        : t("between {{value0}} and {{value1}}", {
            value0: formatMoney(value.minValue),
            value1: formatMoney(value.maxValue)
          })
      : value.minValue !== undefined
        ? `≥ ${formatMoney(value.minValue)}`
        : value.maxValue !== undefined
          ? `≤ ${formatMoney(value.maxValue)}`
          : null
  const common = { value, onChange, dateBasis }
  return (
    <>
      {categoryNames.length ? (
        <FilterChip
          {...common}
          property="category"
          label={t("Category {{value0}} {{value1}}", {
            value0: categoryNames.length > 1 ? t("is either of") : t("is"),
            value1: summarize(categoryNames)
          })}
          clearLabel={t("Clear category filters")}
          icon={Tag}
          onClear={() =>
            onChange((current) => ({ ...current, categoriesId: [] }))
          }
        />
      ) : null}
      {accountNames.length ? (
        <FilterChip
          {...common}
          property="account"
          label={t("Account {{value0}} {{value1}}", {
            value0: accountNames.length > 1 ? t("is either of") : t("is"),
            value1: summarize(accountNames)
          })}
          clearLabel={t("Clear account filters")}
          icon={Landmark}
          leading={
            firstSelectedAccount ? (
              <FinancialInstitutionLogo
                institutionId={firstSelectedAccount.institutionId}
                accountName={firstSelectedAccount.name}
                accountType={firstSelectedAccount.type}
                className="size-3.5 shrink-0"
                decorative
              />
            ) : undefined
          }
          onClear={() =>
            onChange((current) => ({ ...current, accountsId: undefined }))
          }
        />
      ) : null}
      {cardNames.length ? (
        <FilterChip
          {...common}
          property="card"
          label={t("Card {{value0}} {{value1}}", {
            value0: cardNames.length > 1 ? t("is either of") : t("is"),
            value1: summarize(cardNames)
          })}
          clearLabel={t("Clear card filters")}
          icon={CreditCard}
          onClear={() =>
            onChange((current) => ({ ...current, cards: undefined }))
          }
        />
      ) : null}
      {importNames.length || value.importSource ? (
        <FilterChip
          {...common}
          property="source"
          label={
            importNames.length
              ? t("Import is {{value0}}", { value0: summarize(importNames) })
              : t("Source is {{value0}}", {
                  value0:
                    value.importSource === "imported"
                      ? t("imported")
                      : t("manual")
                })
          }
          clearLabel={t("Clear import filters")}
          icon={ReceiptText}
          onClear={() =>
            onChange((current) => ({
              ...current,
              importSource: undefined,
              importsId: undefined
            }))
          }
        />
      ) : null}
      {amount ? (
        <FilterChip
          {...common}
          property="amount"
          label={t("Amount {{value0}}", { value0: amount })}
          clearLabel={t("Clear amount filter")}
          onClear={() =>
            onChange((current) => ({
              ...current,
              minValue: undefined,
              maxValue: undefined
            }))
          }
        />
      ) : null}
    </>
  )
}

function FilterChip({
  value,
  onChange,
  dateBasis,
  property,
  label,
  clearLabel,
  icon: Icon,
  leading,
  onClear
}: {
  value: TransactionFilterValue
  onChange: Dispatch<SetStateAction<TransactionFilterValue>>
  dateBasis?: "cash-flow" | "monthly-review"
  property: FilterProperty
  label: string
  clearLabel: string
  icon?: LucideIcon
  leading?: ReactNode
  onClear: () => void
}) {
  const { t } = useTranslation()

  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="flex h-[26px] max-w-full items-center rounded-md border-[0.5px] border-[#dcdce0] text-xs font-normal text-[#5e5e68] dark:border-white/[0.12] dark:text-[#b7b7c0]">
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={t("Edit {{value0}}", { value0: label })}
            title={label}
            className="flex h-full min-w-0 items-center gap-1.5 rounded-l-md px-2 hover:bg-[#eeeef0] focus-visible:bg-[#eeeef0] focus-visible:outline-none dark:hover:bg-[#2a2a2e] dark:focus-visible:bg-[#2a2a2e]"
          >
            {leading ?? (Icon ? <Icon className="size-3.5 shrink-0" /> : null)}
            <span className="max-w-52 truncate">{label}</span>
          </button>
        </PopoverTrigger>
        <button
          type="button"
          aria-label={clearLabel}
          onClick={onClear}
          className="flex h-full w-6 shrink-0 items-center justify-center rounded-r-md text-[#92929b] hover:bg-[#eeeef0] hover:text-[#303036] focus-visible:bg-[#eeeef0] focus-visible:outline-none dark:hover:bg-[#2a2a2e] dark:hover:text-[#e3e3e8] dark:focus-visible:bg-[#2a2a2e]"
        >
          <X className="size-3" />
        </button>
      </div>
      <PopoverContent
        align="start"
        aria-label={t("Edit transaction filter")}
        sideOffset={6}
        className={`${filterPopupClass} w-72 overflow-hidden p-0`}
      >
        <TransactionFilterPanel
          value={value}
          onChange={onChange}
          isOpen={open}
          onFilterToggle={setOpen}
          compact
          initialProperty={property}
          dateBasis={dateBasis}
        />
      </PopoverContent>
    </Popover>
  )
}
