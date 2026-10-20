import { transactionFilterAtom } from "@/data/transactions/TransactionFilterAtom"
import { cn } from "@/lib/utils"
import { useAtom } from "jotai"
import {
  type Dispatch,
  type FC,
  type SetStateAction,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState
} from "react"
import {
  CalendarDays,
  CreditCard,
  ChevronRight,
  Filter,
  Landmark,
  ReceiptText,
  RotateCcw,
  Search,
  Tag,
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover"
import { TransactionFilterEditor } from "./TransactionFilterEditors"
import {
  filterChoiceClass,
  filterMutedClass,
  filterPopupClass,
  filterSearchHeaderClass,
  filterSearchInputClass
} from "./TransactionFilterStyles"

export interface TransactionFilterValue {
  partialDescription: string
  categoriesId: string[]
  accountsId?: string[]
  cards?: string[]
  importSource?: "imported" | "manual"
  importsId?: string[]
  minValue?: number
  maxValue?: number
  startDate?: Date
  endDate?: Date
  reviewMonths?: string[]
}

export type FilterProperty =
  | "category"
  | "account"
  | "card"
  | "source"
  | "amount"
  | "date"
  | "description"

const properties = [
  { key: "category", label: "Category", icon: Tag },
  { key: "account", label: "Bank account", icon: Landmark },
  { key: "card", label: "Card", icon: CreditCard },
  { key: "source", label: "Import source", icon: ReceiptText },
  { key: "amount", label: "Amount", icon: Filter },
  { key: "date", label: "Date range", icon: CalendarDays },
  { key: "description", label: "Description", icon: Search }
] as const

interface TransactionsFilterProps {
  isOpen: boolean
  onFilterToggle: (value: boolean) => void
  presentation?: "panel" | "popover"
  dateBasis?: "cash-flow" | "monthly-review"
}

export interface TransactionFilterPanelProps extends TransactionsFilterProps {
  value: TransactionFilterValue
  onChange: Dispatch<SetStateAction<TransactionFilterValue>>
  compact?: boolean
  allowAccounts?: boolean
  cardAccountId?: string
  initialProperty?: FilterProperty
  dateBasis?: "cash-flow" | "monthly-review"
  onDescriptionDraftChange?: (description: string | null) => void
}

function activeFilterCount(value: TransactionFilterValue) {
  return (
    Number(value.categoriesId.length > 0) +
    Number(!!value.accountsId?.length) +
    Number(!!value.cards?.length) +
    Number(!!value.importSource || !!value.importsId?.length) +
    Number(value.minValue !== undefined || value.maxValue !== undefined) +
    Number(!!value.partialDescription.trim())
  )
}

export const TransactionsFilter: FC<TransactionsFilterProps> = ({
  isOpen,
  onFilterToggle,
  presentation = "panel",
  dateBasis
}) => {
  const [filterProps, setFilterProps] = useAtom(transactionFilterAtom)
  const pendingDescriptionRef = useRef<string | null>(null)
  const trackDescriptionDraft = useCallback((description: string | null) => {
    pendingDescriptionRef.current = description
  }, [])
  const changePopoverOpen = useCallback(
    (open: boolean) => {
      const pendingDescription = pendingDescriptionRef.current
      if (!open && pendingDescription !== null) {
        pendingDescriptionRef.current = null
        setFilterProps((current) => ({
          ...current,
          partialDescription: pendingDescription
        }))
      }
      onFilterToggle(open)
    },
    [onFilterToggle, setFilterProps]
  )
  const changeFilter = useCallback<
    Dispatch<SetStateAction<TransactionFilterValue>>
  >(
    (update) => {
      setFilterProps((current) => {
        const next = typeof update === "function" ? update(current) : update
        return {
          ...current,
          ...next,
          startDate: next.startDate ?? current.startDate,
          endDate: next.endDate ?? current.endDate
        }
      })
    },
    [setFilterProps]
  )
  const count = activeFilterCount(filterProps)
  const panel = (
    <TransactionFilterPanel
      value={filterProps}
      onChange={changeFilter}
      isOpen={isOpen}
      onFilterToggle={
        presentation === "popover" ? changePopoverOpen : onFilterToggle
      }
      compact={presentation === "popover"}
      dateBasis={dateBasis}
      onDescriptionDraftChange={
        presentation === "popover" ? trackDescriptionDraft : undefined
      }
    />
  )
  if (presentation === "panel") return panel
  return (
    <Popover open={isOpen} onOpenChange={changePopoverOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="h-7 gap-1.5 px-2 text-xs font-normal text-muted-foreground hover:text-foreground"
          title="Filter (F)"
          aria-keyshortcuts="F"
        >
          <Filter className="size-3.5" />
          Filter
          {count ? <span className="text-fina-violet">{count}</span> : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        collisionPadding={8}
        className={cn(
          filterPopupClass,
          "w-[216px] max-w-[calc(100vw-16px)] overflow-hidden p-0"
        )}
        aria-label="Transaction filters"
      >
        {panel}
      </PopoverContent>
    </Popover>
  )
}

export const TransactionFilterPanel: FC<TransactionFilterPanelProps> = ({
  value,
  onChange,
  isOpen,
  onFilterToggle,
  compact = false,
  allowAccounts = true,
  cardAccountId,
  initialProperty,
  dateBasis = "cash-flow",
  onDescriptionDraftChange
}) => {
  const [property, setProperty] = useState<FilterProperty | null>(
    initialProperty ?? null
  )
  const [search, setSearch] = useState("")
  const [submenuSide, setSubmenuSide] = useState<"right" | "bottom">(() =>
    typeof window !== "undefined" && window.innerWidth < 640
      ? "bottom"
      : "right"
  )
  const [description, setDescription] = useState(value.partialDescription)
  const panelRef = useRef<HTMLDivElement>(null)
  const submenuRef = useRef<HTMLDivElement>(null)
  const propertyRefs = useRef<
    Partial<Record<FilterProperty, HTMLButtonElement>>
  >({})
  const activationRef = useRef<"hover" | "explicit">("hover")
  const closeTimerRef = useRef<number | null>(null)
  const submenuId = useId()
  useEffect(() => {
    if (!compact || initialProperty) return
    const updateSide = () =>
      setSubmenuSide(window.innerWidth < 640 ? "bottom" : "right")
    updateSide()
    window.addEventListener("resize", updateSide)
    return () => window.removeEventListener("resize", updateSide)
  }, [compact, initialProperty])
  const cancelHoverClose = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }, [])
  useEffect(() => cancelHoverClose, [cancelHoverClose])
  const focusEditor = () => {
    submenuRef.current
      ?.querySelector<HTMLElement>("input, select, button, [tabindex='0']")
      ?.focus()
  }
  const openProperty = (key: FilterProperty, explicit = false) => {
    cancelHoverClose()
    activationRef.current = explicit ? "explicit" : "hover"
    setProperty(key)
    if (explicit && property === key) focusEditor()
  }
  const closeProperty = (returnFocus = false) => {
    cancelHoverClose()
    if (returnFocus && property) propertyRefs.current[property]?.focus()
    setProperty(null)
  }
  const leaveMenus = (target: EventTarget | null) => {
    if (
      activationRef.current === "explicit" ||
      (target instanceof Node &&
        (panelRef.current?.contains(target) ||
          submenuRef.current?.contains(target)))
    )
      return
    cancelHoverClose()
    // Keep the submenu open while crossing the small gap between surfaces.
    closeTimerRef.current = window.setTimeout(() => setProperty(null), 250)
  }
  useEffect(() => {
    onDescriptionDraftChange?.(null)
    setDescription(value.partialDescription)
  }, [onDescriptionDraftChange, value.partialDescription])
  useEffect(() => {
    if (description === value.partialDescription) return
    const timer = window.setTimeout(
      () =>
        onChange((current) => ({
          ...current,
          partialDescription: description
        })),
      200
    )
    return () => window.clearTimeout(timer)
  }, [description, onChange, value.partialDescription])
  useEffect(() => {
    panelRef.current?.toggleAttribute("inert", !isOpen)
    if (!isOpen) {
      // Radix retains exit-animating content, so reset before a fast reopen.
      setProperty(initialProperty ?? null)
      setSearch("")
      cancelHoverClose()
      return
    }
    if (compact) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onFilterToggle(false)
    }
    window.addEventListener("keydown", closeOnEscape)
    return () => window.removeEventListener("keydown", closeOnEscape)
  }, [cancelHoverClose, compact, initialProperty, isOpen, onFilterToggle])
  const available = properties.filter(
    (item) =>
      (item.key !== "account" || allowAccounts) &&
      (item.key !== "date" || (value.startDate && value.endDate))
  )
  const label = properties.find((item) => item.key === property)?.label
  const editor = (key: FilterProperty, autoFocus = false) => (
    <TransactionFilterEditor
      key={key}
      property={key}
      value={value}
      onChange={onChange}
      dateBasis={dateBasis}
      cardAccountId={cardAccountId}
      description={description}
      autoFocus={autoFocus}
      onDescriptionChange={(text) => {
        setDescription(text)
        onDescriptionDraftChange?.(text)
      }}
    />
  )
  return (
    <>
      {!compact ? (
        <div
          onClick={() => onFilterToggle(false)}
          aria-hidden="true"
          className={cn(
            "fixed inset-0 z-30 cursor-pointer bg-fina-ink/60 transition-opacity xl:hidden",
            isOpen
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          )}
        />
      ) : null}
      <div
        ref={panelRef}
        role={compact ? "group" : "complementary"}
        aria-label="Transaction filters"
        aria-hidden={!isOpen}
        onPointerEnter={compact ? cancelHoverClose : undefined}
        onPointerLeave={
          compact ? (event) => leaveMenus(event.relatedTarget) : undefined
        }
        className={cn(
          compact
            ? "text-inherit"
            : "fixed right-0 top-0 z-50 h-screen w-[320px] overflow-hidden border-l border-fina-grid bg-fina-surface text-foreground shadow-fina-lg transition-all duration-300 xl:sticky xl:shadow-none",
          !compact &&
            !isOpen &&
            "translate-x-[calc(100%+8px)] xl:w-0 xl:border-l-0"
        )}
      >
        <div className={compact ? "w-full" : "w-[320px]"}>
          {!compact ? (
            <div className="flex h-12 items-center justify-between border-b border-fina-grid px-4">
              <h2 className="text-sm font-medium">Filters</h2>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close filters"
                onClick={() => onFilterToggle(false)}
                className="size-7"
              >
                <X className="size-3.5" />
              </Button>
            </div>
          ) : initialProperty ? (
            <div className="flex h-9 items-center border-b border-black/[0.06] px-3 dark:border-white/[0.06]">
              <span className="text-[13px] font-medium">{label}</span>
            </div>
          ) : (
            <div className={filterSearchHeaderClass}>
              <Input
                aria-label="Search filter properties"
                autoFocus
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  closeProperty()
                }}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault()
                    const first = available.find((item) =>
                      item.label.toLowerCase().includes(search.toLowerCase())
                    )
                    if (first) propertyRefs.current[first.key]?.focus()
                  }
                }}
                placeholder="Add filter…"
                className={filterSearchInputClass}
              />
              <kbd className={cn("rounded px-1 text-[10px]", filterMutedClass)}>
                F
              </kbd>
            </div>
          )}
          <div
            className={cn(
              "overflow-y-auto",
              compact ? "max-h-[min(440px,65vh)]" : "h-[calc(100vh-3rem)] p-2"
            )}
          >
            {compact ? (
              initialProperty ? (
                editor(initialProperty, true)
              ) : (
                <div className="p-1">
                  {available
                    .filter((item) =>
                      item.label.toLowerCase().includes(search.toLowerCase())
                    )
                    .map(
                      ({ key, label: name, icon: Icon }, index, filtered) => (
                        <Popover
                          key={key}
                          open={isOpen && property === key}
                          onOpenChange={(open) => {
                            if (!open && property === key) closeProperty()
                          }}
                        >
                          <PopoverAnchor asChild>
                            <button
                              ref={(element) => {
                                if (element) propertyRefs.current[key] = element
                                else delete propertyRefs.current[key]
                              }}
                              type="button"
                              aria-haspopup="dialog"
                              aria-expanded={property === key}
                              aria-controls={
                                property === key ? submenuId : undefined
                              }
                              className={cn(
                                filterChoiceClass,
                                "w-full text-left",
                                property === key &&
                                  "bg-[#eeeef0] dark:bg-[#2a2a2e]"
                              )}
                              onPointerEnter={(event) => {
                                if (event.pointerType !== "touch")
                                  openProperty(key)
                              }}
                              onClick={() => openProperty(key, true)}
                              onKeyDown={(event) => {
                                if (event.key === "ArrowRight") {
                                  event.preventDefault()
                                  openProperty(key, true)
                                } else if (
                                  [
                                    "ArrowDown",
                                    "ArrowUp",
                                    "Home",
                                    "End"
                                  ].includes(event.key)
                                ) {
                                  event.preventDefault()
                                  const next =
                                    event.key === "Home"
                                      ? 0
                                      : event.key === "End"
                                        ? filtered.length - 1
                                        : (index +
                                            (event.key === "ArrowDown"
                                              ? 1
                                              : -1) +
                                            filtered.length) %
                                          filtered.length
                                  closeProperty()
                                  propertyRefs.current[
                                    filtered[next].key
                                  ]?.focus()
                                }
                              }}
                            >
                              <Icon
                                className={cn(
                                  "size-3.5 shrink-0",
                                  filterMutedClass
                                )}
                              />
                              <span>{name}</span>
                              <ChevronRight
                                className={cn(
                                  "ml-auto size-3",
                                  filterMutedClass
                                )}
                              />
                            </button>
                          </PopoverAnchor>
                          {property === key ? (
                            <PopoverContent
                              ref={submenuRef}
                              id={submenuId}
                              side={submenuSide}
                              align={submenuSide === "right" ? "start" : "end"}
                              sideOffset={submenuSide === "right" ? 6 : 4}
                              alignOffset={submenuSide === "right" ? -4 : 0}
                              collisionPadding={8}
                              aria-label={`${name} filter`}
                              className={cn(
                                filterPopupClass,
                                "max-w-[calc(100vw-16px)] overflow-hidden p-0",
                                key === "category" ||
                                  key === "account" ||
                                  key === "description"
                                  ? "w-64"
                                  : "w-72"
                              )}
                              onOpenAutoFocus={(event) => {
                                event.preventDefault()
                                if (activationRef.current === "explicit")
                                  focusEditor()
                              }}
                              onCloseAutoFocus={(event) =>
                                event.preventDefault()
                              }
                              onEscapeKeyDown={(event) => {
                                event.preventDefault()
                                event.stopPropagation()
                                closeProperty(true)
                              }}
                              onKeyDown={(event) => {
                                // Inputs retain their normal cursor and selection keys.
                                if (
                                  event.key === "ArrowLeft" &&
                                  !(event.target instanceof HTMLInputElement) &&
                                  !(
                                    event.target instanceof HTMLSelectElement
                                  ) &&
                                  !(
                                    event.target instanceof HTMLTextAreaElement
                                  ) &&
                                  !(
                                    event.target instanceof HTMLElement &&
                                    event.target.isContentEditable
                                  )
                                ) {
                                  event.preventDefault()
                                  event.stopPropagation()
                                  closeProperty(true)
                                }
                              }}
                              onInteractOutside={(event) => {
                                if (
                                  event.target instanceof Node &&
                                  panelRef.current?.contains(event.target)
                                )
                                  event.preventDefault()
                              }}
                              onPointerEnter={cancelHoverClose}
                              onPointerLeave={(event) =>
                                leaveMenus(event.relatedTarget)
                              }
                              onFocusCapture={() => {
                                activationRef.current = "explicit"
                              }}
                            >
                              <div className="max-h-[min(440px,65vh)] overflow-y-auto">
                                {editor(key)}
                              </div>
                            </PopoverContent>
                          ) : null}
                        </Popover>
                      )
                    )}
                  {!available.some((item) =>
                    item.label.toLowerCase().includes(search.toLowerCase())
                  ) ? (
                    <p className="p-3 text-xs text-muted-foreground">
                      No matching filters.
                    </p>
                  ) : null}
                </div>
              )
            ) : (
              <div className="space-y-4 p-1">
                {available.map(({ key, label: name }) => (
                  <section key={key} aria-label={`${name} filter`}>
                    <h3 className="mb-2 text-[11px] font-medium text-muted-foreground">
                      {name}
                    </h3>
                    {editor(key)}
                  </section>
                ))}
              </div>
            )}
            <Button
              variant="ghost"
              onClick={() => {
                onDescriptionDraftChange?.(null)
                setDescription("")
                onChange((current) => ({
                  ...current,
                  partialDescription: "",
                  categoriesId: [],
                  ...(current.accountsId !== undefined
                    ? { accountsId: undefined }
                    : {}),
                  ...(current.cards !== undefined ? { cards: undefined } : {}),
                  ...(current.importsId !== undefined
                    ? { importsId: undefined }
                    : {}),
                  ...(current.importSource !== undefined
                    ? { importSource: undefined }
                    : {}),
                  ...(current.minValue !== undefined
                    ? { minValue: undefined }
                    : {}),
                  ...(current.maxValue !== undefined
                    ? { maxValue: undefined }
                    : {})
                }))
              }}
              onPointerEnter={() => {
                if (!initialProperty && compact) closeProperty()
              }}
              className={cn(
                "h-9 w-full justify-start gap-2 rounded-none border-t border-black/[0.06] px-3 text-[12px] font-normal hover:bg-[#eeeef0] dark:border-white/[0.06] dark:hover:bg-[#2a2a2e]",
                filterMutedClass,
                !compact && "mt-2"
              )}
            >
              <RotateCcw className="size-3" />
              Clear filters
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

export { TransactionFilterChips } from "./TransactionFilterChips"
