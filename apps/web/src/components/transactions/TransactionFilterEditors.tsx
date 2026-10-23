import { useTranslation } from "react-i18next"
import { useEffect, useId, useState, type ReactNode } from "react"
import dayjs from "dayjs"
import { useActiveGroup } from "@/contexts/ActiveGroupContext"
import { useCategories } from "@/data/categories/useCategories"
import { useBankAccounts } from "@/data/bankAccounts/useBankAccounts"
import { useImports } from "@/data/imports/useImports"
import { useTransactionCardValues } from "@/data/transactions/useTransactionCardValues"
import { cardMetadataKey } from "@fina/types"
import { formatCardLabel } from "@/components/creditCards/cardLabelFormat"
import { CategoryAppearance } from "@/components/categories/CategoryAppearance"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Check, CreditCard, ReceiptText, Search } from "lucide-react"
import { FinancialInstitutionLogo } from "@/components/accounts/FinancialInstitutionLogo"
import {
  filterChoiceClass,
  filterInputClass,
  filterMutedClass,
  filterSearchHeaderClass,
  filterSearchInputClass
} from "./TransactionFilterStyles"
import type {
  FilterProperty,
  TransactionFilterPanelProps
} from "./TransactionsFilter"

type EditorProps = Pick<
  TransactionFilterPanelProps,
  "value" | "onChange" | "dateBasis" | "cardAccountId"
> & {
  property: FilterProperty
  description: string
  onDescriptionChange: (text: string) => void
  autoFocus?: boolean
}
export function TransactionFilterEditor(props: EditorProps) {
  const { t } = useTranslation()

  switch (props.property) {
    case "category":
      return <CategoryEditor {...props} />
    case "account":
      return <AccountEditor {...props} />
    case "card":
      return <CardEditor {...props} />
    case "source":
      return <ImportEditor {...props} />
    case "amount":
      return <AmountEditor {...props} />
    case "date":
      return <DateEditor {...props} />
    case "description":
      return (
        <label className={`block p-3 text-xs ${filterMutedClass}`}>
          {t("Search description")}
          <Input
            autoFocus={props.autoFocus}
            aria-label={t("Search description")}
            placeholder={t("Find transactions…")}
            value={props.description}
            onChange={(event) => props.onDescriptionChange(event.target.value)}
            className={`${filterInputClass} mt-1.5`}
          />
        </label>
      )
  }
}

function Choice({
  name,
  checked,
  onChange,
  children
}: {
  name: string
  checked: boolean
  onChange: (checked: boolean) => void
  children?: ReactNode
}) {
  const id = useId()
  return (
    <label htmlFor={id} className={filterChoiceClass}>
      <Checkbox
        id={id}
        aria-label={name}
        checked={checked}
        onCheckedChange={(next) => onChange(next === true)}
        className="size-3.5 shrink-0 rounded-[3px] border-[#c7c7ce] shadow-none focus-visible:ring-0 data-[state=checked]:border-[#8a8a94] data-[state=checked]:bg-transparent data-[state=checked]:text-[#303036] dark:border-[#60606a] dark:data-[state=checked]:border-[#a5a5af] dark:data-[state=checked]:text-[#e3e3e8] [&_svg]:size-3 [&_svg]:stroke-[2]"
      />
      {children}
      <span className="min-w-0 truncate">{name}</span>
    </label>
  )
}
const toggleId = (ids: string[], id: string, checked: boolean) =>
  checked ? [...new Set([...ids, id])] : ids.filter((item) => item !== id)

function SearchHeader({
  label,
  placeholder,
  value,
  onChange,
  autoFocus
}: {
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  autoFocus?: boolean
}) {
  return (
    <div className={filterSearchHeaderClass}>
      <Search className={`size-3.5 shrink-0 ${filterMutedClass}`} />
      <Input
        aria-label={label}
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={filterSearchInputClass}
      />
    </div>
  )
}

function CategoryEditor({ value, onChange, autoFocus }: EditorProps) {
  const { t } = useTranslation()

  const { selectedGroup } = useActiveGroup()
  const { data, isLoading, isError } = useCategories({
    groupId: selectedGroup?.id
  })
  const [search, setSearch] = useState("")
  const matching = [
    ...(data ?? []),
    { id: "-1", name: "None", icon: undefined, color: undefined }
  ].filter((item) => item.name.toLowerCase().includes(search.toLowerCase()))
  return (
    <div>
      <SearchHeader
        label={t("Search categories")}
        autoFocus={autoFocus}
        placeholder={t("Search categories…")}
        value={search}
        onChange={setSearch}
      />
      <div className="p-1">
        {isLoading ? (
          <Status>{t("Loading categories…")}</Status>
        ) : isError ? (
          <Status>{t("Could not load categories.")}</Status>
        ) : (
          matching.map((item) => (
            <Choice
              key={item.id}
              name={item.name}
              checked={value.categoriesId.includes(item.id)}
              onChange={(checked) =>
                onChange((current) => ({
                  ...current,
                  categoriesId: toggleId(current.categoriesId, item.id, checked)
                }))
              }
            >
              {item.color ? <CategoryAppearance color={item.color} /> : null}
            </Choice>
          ))
        )}
        {!isLoading && !isError && !matching.length ? (
          <Status>{t("No matching categories.")}</Status>
        ) : null}
      </div>
    </div>
  )
}

function AccountEditor({ value, onChange, autoFocus }: EditorProps) {
  const { t } = useTranslation()

  const { selectedGroup } = useActiveGroup()
  const { data, isLoading, isError } = useBankAccounts({
    groupId: selectedGroup?.id
  })
  const [search, setSearch] = useState("")
  const matching = (data ?? []).filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  )
  return (
    <div>
      <SearchHeader
        label={t("Search bank accounts")}
        autoFocus={autoFocus}
        placeholder={t("Search accounts…")}
        value={search}
        onChange={setSearch}
      />
      <div className="p-1">
        {isLoading ? (
          <Status>{t("Loading accounts…")}</Status>
        ) : isError ? (
          <Status>{t("Could not load accounts.")}</Status>
        ) : (
          matching.map((item) => (
            <Choice
              key={item.id}
              name={item.name}
              checked={!!value.accountsId?.includes(item.id)}
              onChange={(checked) =>
                onChange((current) => ({
                  ...current,
                  accountsId: toggleId(
                    current.accountsId ?? [],
                    item.id,
                    checked
                  )
                }))
              }
            >
              <FinancialInstitutionLogo
                institutionId={item.institutionId}
                accountName={item.name}
                accountType={item.type}
                className="size-3.5 shrink-0"
                decorative
              />
            </Choice>
          ))
        )}
        {!isLoading && !isError && !matching.length ? (
          <Status>{t("No matching accounts.")}</Status>
        ) : null}
      </div>
    </div>
  )
}

function CardEditor({
  value,
  onChange,
  autoFocus,
  cardAccountId
}: EditorProps) {
  const { t } = useTranslation()

  const { selectedGroup } = useActiveGroup()
  const { data, isLoading, isError } = useTransactionCardValues({
    groupId: selectedGroup?.id,
    accountId: cardAccountId
  })
  const [search, setSearch] = useState("")
  const options = [
    { id: "-1", name: "Not identified" },
    ...(data ?? [])
      .filter((card) => card.cardName !== null || card.cardLast4 !== null)
      .map((card) => ({
        id: cardMetadataKey(card),
        name: formatCardLabel(card)
      }))
  ].filter((card) => card.name.toLowerCase().includes(search.toLowerCase()))
  return (
    <div>
      <SearchHeader
        label={t("Search cards")}
        placeholder={t("Search cards…")}
        value={search}
        onChange={setSearch}
        autoFocus={autoFocus}
      />
      <div className="p-1">
        {isLoading ? (
          <Status>{t("Loading cards…")}</Status>
        ) : isError ? (
          <Status>{t("Could not load cards.")}</Status>
        ) : (
          options.map((card) => (
            <Choice
              key={card.id}
              name={card.name}
              checked={!!value.cards?.includes(card.id)}
              onChange={(checked) =>
                onChange((current) => ({
                  ...current,
                  cards: toggleId(current.cards ?? [], card.id, checked)
                }))
              }
            >
              <CreditCard className="size-3.5 shrink-0" aria-hidden="true" />
            </Choice>
          ))
        )}
        {!isLoading && !isError && !options.length ? (
          <Status>{t("No matching cards.")}</Status>
        ) : null}
      </div>
    </div>
  )
}

function ImportEditor({ value, onChange }: EditorProps) {
  const { t } = useTranslation()

  const { selectedGroup } = useActiveGroup()
  const { data, isLoading, isError } = useImports({
    groupId: selectedGroup?.id
  })
  const [search, setSearch] = useState("")
  const matching = (data ?? []).filter((item) =>
    `${item.fileName} ${item.accountName}`
      .toLowerCase()
      .includes(search.toLowerCase())
  )
  return (
    <div>
      <div className="p-1" role="group" aria-label={t("Transaction source")}>
        {(
          [
            [undefined, t("Any source")],
            ["imported", t("Imported")],
            ["manual", t("Manual")]
          ] as const
        ).map(([source, label]) => (
          <Button
            key={label}
            variant="ghost"
            aria-pressed={value.importSource === source}
            className={`${filterChoiceClass} w-full justify-start hover:text-inherit aria-pressed:bg-[#eeeef0] dark:aria-pressed:bg-[#2a2a2e]`}
            onClick={() =>
              onChange((current) => ({
                ...current,
                importSource: source,
                importsId: []
              }))
            }
          >
            <span
              aria-hidden="true"
              className="flex size-3.5 shrink-0 items-center justify-center rounded-[3px] border border-[#c7c7ce] dark:border-[#60606a]"
            >
              {value.importSource === source ? (
                <Check className="size-3 stroke-[2]" />
              ) : null}
            </span>
            {label}
          </Button>
        ))}
      </div>
      {value.importSource !== "manual" ? (
        <>
          <p
            className={`border-t border-[#e7e7eb] px-3 pb-1 pt-2 text-xs dark:border-white/[0.07] ${filterMutedClass}`}
          >
            {t("Or choose specific imports")}
          </p>
          <SearchHeader
            label={t("Search imports")}
            placeholder={t("Search files or accounts…")}
            value={search}
            onChange={setSearch}
          />
          <div className="p-1">
            {isLoading ? (
              <Status>{t("Loading imports…")}</Status>
            ) : isError ? (
              <Status>{t("Could not load imports.")}</Status>
            ) : (
              matching.map((item) => (
                <div key={item.id}>
                  <Choice
                    name={`${item.fileName} · ${item.accountName} · ${dayjs(item.createdAt).format("DD MMM YYYY")}`}
                    checked={!!value.importsId?.includes(item.id)}
                    onChange={(checked) =>
                      onChange((current) => ({
                        ...current,
                        importSource: "imported",
                        importsId: toggleId(
                          current.importsId ?? [],
                          item.id,
                          checked
                        )
                      }))
                    }
                  >
                    <ReceiptText
                      className={`size-3.5 shrink-0 ${filterMutedClass}`}
                    />
                  </Choice>
                </div>
              ))
            )}
            {!isLoading && !isError && !matching.length ? (
              <Status>{t("No matching imports.")}</Status>
            ) : null}
          </div>
        </>
      ) : (
        <Status>{t("Transactions created without an import.")}</Status>
      )}
    </div>
  )
}

function Status({ children }: { children: ReactNode }) {
  return (
    <p role="status" className={`px-2 py-2 text-xs ${filterMutedClass}`}>
      {children}
    </p>
  )
}

type AmountOperator = "exact" | "between" | "min" | "max"
function amountOperator(min?: number, max?: number): AmountOperator {
  return min !== undefined && max !== undefined
    ? min === max
      ? "exact"
      : "between"
    : max !== undefined
      ? "max"
      : min !== undefined
        ? "min"
        : "exact"
}
function AmountEditor({ value, onChange, autoFocus }: EditorProps) {
  const { t } = useTranslation()

  const [operator, setOperator] = useState<AmountOperator>(() =>
    amountOperator(value.minValue, value.maxValue)
  )
  const [first, setFirst] = useState(
    String(value.minValue ?? value.maxValue ?? "")
  )
  const [second, setSecond] = useState(String(value.maxValue ?? ""))
  const [submitted, setSubmitted] = useState(false)
  const id = useId()
  useEffect(() => {
    setOperator(amountOperator(value.minValue, value.maxValue))
    setFirst(String(value.minValue ?? value.maxValue ?? ""))
    setSecond(String(value.maxValue ?? ""))
    setSubmitted(false)
  }, [value.minValue, value.maxValue])
  const number = first.trim() ? Number(first) : NaN
  const upper = second.trim() ? Number(second) : NaN
  const valid =
    Number.isFinite(number) &&
    (operator !== "between" || (Number.isFinite(upper) && number <= upper))
  return (
    <form
      className="space-y-3 p-3"
      onSubmit={(event) => {
        event.preventDefault()
        setSubmitted(true)
        if (!valid) return
        onChange((current) => ({
          ...current,
          minValue: operator === "max" ? undefined : number,
          maxValue:
            operator === "min"
              ? undefined
              : operator === "between"
                ? upper
                : number
        }))
      }}
    >
      <label className={`block text-xs ${filterMutedClass}`}>
        {t("Condition")}
        <select
          aria-label={t("Amount condition")}
          value={operator}
          onChange={(event) => {
            setOperator(event.target.value as AmountOperator)
            setSubmitted(false)
          }}
          className={`${filterInputClass} mt-1.5 w-full border`}
        >
          <option value="exact">{t("Exact amount")}</option>
          <option value="between">{t("Between")}</option>
          <option value="min">{t("At least")}</option>
          <option value="max">{t("At most")}</option>
        </select>
      </label>
      <div className={operator === "between" ? "grid grid-cols-2 gap-2" : ""}>
        <Label
          htmlFor={`${id}-amount`}
          className={`text-xs font-normal ${filterMutedClass}`}
        >
          {operator === "between" ? t("Minimum amount") : t("Amount")}
          <Input
            id={`${id}-amount`}
            autoFocus={autoFocus}
            type="number"
            step="any"
            placeholder={t("e.g. -100")}
            value={first}
            onChange={(event) => setFirst(event.target.value)}
            className={`${filterInputClass} mt-1.5`}
            aria-describedby={`${id}-hint`}
          />
        </Label>
        {operator === "between" ? (
          <Label
            htmlFor={`${id}-maximum`}
            className={`text-xs font-normal ${filterMutedClass}`}
          >
            {t("Maximum amount")}
            <Input
              id={`${id}-maximum`}
              type="number"
              step="any"
              placeholder={t("e.g. -50")}
              value={second}
              onChange={(event) => setSecond(event.target.value)}
              className={`${filterInputClass} mt-1.5`}
            />
          </Label>
        ) : null}
      </div>
      <p
        id={`${id}-hint`}
        className={`text-xs leading-relaxed ${filterMutedClass}`}
      >
        {t(
          "Use negative values for expenses and positive values for income. Range includes both limits."
        )}
      </p>
      {submitted && !valid ? (
        <p role="alert" className="text-xs text-destructive">
          {t("Enter a valid amount. The minimum cannot exceed the maximum.")}
        </p>
      ) : null}
      <Button
        type="submit"
        variant="fina-secondary"
        className={`${filterInputClass} w-full bg-[#eeeef0] hover:bg-[#e4e4e9] dark:bg-[#2a2a2e] dark:hover:bg-[#333338]`}
      >
        {t("Apply amount")}
      </Button>
    </form>
  )
}

function DateEditor({ value, onChange, dateBasis }: EditorProps) {
  const { t } = useTranslation()

  const monthly = dateBasis === "monthly-review"
  const format = monthly ? "YYYY-MM" : "YYYY-MM-DD"
  const [start, setStart] = useState(dayjs(value.startDate).format(format))
  const [end, setEnd] = useState(dayjs(value.endDate).format(format))
  const [invalid, setInvalid] = useState(false)
  const id = useId()
  return (
    <form
      className="space-y-3 p-3"
      onSubmit={(event) => {
        event.preventDefault()
        const startDay = dayjs(monthly ? `${start}-01` : start)
        const endDay = dayjs(monthly ? `${end}-01` : end)
        if (
          !start ||
          !end ||
          !startDay.isValid() ||
          !endDay.isValid() ||
          startDay.format(format) !== start ||
          endDay.format(format) !== end ||
          start > end
        ) {
          setInvalid(true)
          return
        }
        setInvalid(false)
        onChange((current) => ({
          ...current,
          startDate: startDay.startOf(monthly ? "month" : "day").toDate(),
          endDate: endDay.endOf(monthly ? "month" : "day").toDate(),
          reviewMonths: undefined
        }))
      }}
    >
      <Label
        htmlFor={`${id}-start`}
        className={`block text-xs font-normal ${filterMutedClass}`}
      >
        {monthly ? t("Start month") : t("Start date")}
        <Input
          id={`${id}-start`}
          type={monthly ? "month" : "date"}
          value={start}
          onChange={(event) => setStart(event.target.value)}
          className={`${filterInputClass} mt-1.5`}
        />
      </Label>
      <Label
        htmlFor={`${id}-end`}
        className={`block text-xs font-normal ${filterMutedClass}`}
      >
        {monthly ? t("End month") : t("End date")}
        <Input
          id={`${id}-end`}
          type={monthly ? "month" : "date"}
          value={end}
          onChange={(event) => setEnd(event.target.value)}
          className={`${filterInputClass} mt-1.5`}
        />
      </Label>
      {monthly ? (
        <p className={`text-xs leading-relaxed ${filterMutedClass}`}>
          {t(
            "Includes every review month in this range. Choose individual months from the toolbar."
          )}
        </p>
      ) : null}
      {invalid ? (
        <p role="alert" className="text-xs text-destructive">
          {t("Choose a valid range with the start before the end.")}
        </p>
      ) : null}
      <Button
        type="submit"
        variant="fina-secondary"
        className={`${filterInputClass} w-full bg-[#eeeef0] hover:bg-[#e4e4e9] dark:bg-[#2a2a2e] dark:hover:bg-[#333338]`}
      >
        {t("Apply range")}
      </Button>
    </form>
  )
}
