import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover"
import {
  transactionFilterAtom,
  TransactionFilterType
} from "@/data/transactions/TransactionFilterAtom"
import {
  reviewMonthFromDate,
  reviewMonthStart,
  reviewMonthEnd,
  shiftReviewMonth
} from "@/data/transactions/reviewMonthSelection"
import { cn } from "@/lib/utils"
import dayjs from "dayjs"
import { useAtom } from "jotai"
import { Check, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { FC, useEffect, useState } from "react"
import { DateRange } from "react-day-picker"

export const TransactionsDateFilter: FC<{ monthlyReview?: boolean }> = ({
  monthlyReview = false
}) => {
  return monthlyReview ? <MonthlyReviewDateFilter /> : <CashFlowDateFilter />
}

const MonthlyReviewDateFilter: FC = () => {
  const { t } = useTranslation()

  const [filter, setFilter] = useAtom(transactionFilterAtom)
  const [open, setOpen] = useState(false)
  const [displayYear, setDisplayYear] = useState(() =>
    filter.startDate.getFullYear()
  )
  const selectedMonths = filter.reviewMonths ?? monthsInRange(filter)
  const changeMonths = (months: string[]) => {
    if (!months.length) return
    const sorted = [...new Set(months)].sort()
    setFilter((current) => ({
      ...current,
      reviewMonths: sorted,
      startDate: reviewMonthStart(sorted[0]),
      endDate: reviewMonthEnd(sorted[sorted.length - 1])
    }))
  }
  const shiftMonths = (offset: number) => {
    const shifted = selectedMonths.map((month) =>
      shiftReviewMonth(month, offset)
    )
    if (shifted.length > 120) {
      setFilter((current) => ({
        ...current,
        startDate: reviewMonthStart(shifted[0]),
        endDate: reviewMonthEnd(shifted[shifted.length - 1])
      }))
    } else changeMonths(shifted)
  }
  const summary =
    selectedMonths.length === 1
      ? dayjs(reviewMonthStart(selectedMonths[0])).format("MMM YYYY")
      : t("monthsCount", { count: selectedMonths.length })

  return (
    <div className="flex h-7 items-center gap-0.5">
      <Button
        variant="fina-ghost"
        size="icon"
        aria-label={t("Previous month")}
        disabled={selectedMonths[0] === "0001-01"}
        className="size-6 text-muted-foreground"
        onClick={() => shiftMonths(-1)}
      >
        <ChevronLeftIcon className="size-3.5" />
      </Button>
      <Popover
        open={open}
        onOpenChange={(nextOpen) => {
          if (nextOpen) setDisplayYear(Number(selectedMonths[0].slice(0, 4)))
          setOpen(nextOpen)
        }}
      >
        <PopoverTrigger asChild>
          <Button
            variant="fina-ghost"
            className="h-7 px-1.5 text-xs font-normal text-muted-foreground hover:bg-fina-canvas"
            aria-label={t("Review months")}
            title={selectedMonths
              .map((month) => dayjs(reviewMonthStart(month)).format("MMM YYYY"))
              .join(", ")}
          >
            {summary}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          aria-label={t("Review months")}
          className="w-64 rounded-md border border-fina-grid bg-fina-surface p-0 shadow-fina-lg"
        >
          <div className="flex items-center justify-between border-b border-fina-grid px-2 py-1.5">
            <Button
              variant="fina-ghost"
              size="icon"
              className="size-7"
              aria-label={t("Previous year")}
              disabled={displayYear <= 1}
              onClick={() => setDisplayYear((year) => year - 1)}
            >
              <ChevronLeftIcon className="size-3.5" />
            </Button>
            <span className="text-xs font-medium">{displayYear}</span>
            <Button
              variant="fina-ghost"
              size="icon"
              className="size-7"
              aria-label={t("Next year")}
              disabled={displayYear >= 9999}
              onClick={() => setDisplayYear((year) => year + 1)}
            >
              <ChevronRightIcon className="size-3.5" />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-1 p-2">
            {Array.from({ length: 12 }, (_, index) => {
              const month = `${String(displayYear).padStart(4, "0")}-${String(index + 1).padStart(2, "0")}`
              const date = dayjs(reviewMonthStart(month))
              const selected = selectedMonths.includes(month)
              return (
                <Button
                  key={month}
                  variant="fina-ghost"
                  aria-label={date.format("MMMM YYYY")}
                  aria-pressed={selected}
                  disabled={
                    selectedMonths.length > 120 ||
                    (selected
                      ? selectedMonths.length === 1
                      : selectedMonths.length >= 120)
                  }
                  className={cn(
                    "relative h-8 text-xs font-normal",
                    selected && "bg-fina-violet/10 text-fina-violet"
                  )}
                  onClick={() =>
                    changeMonths(
                      selected
                        ? selectedMonths.filter((value) => value !== month)
                        : [...selectedMonths, month]
                    )
                  }
                >
                  {date.format("MMM")}
                  {selected ? (
                    <Check className="absolute right-1 top-1 size-2.5" />
                  ) : null}
                </Button>
              )
            })}
          </div>
          {selectedMonths.length > 120 ? (
            <div className="space-y-2 border-t border-fina-grid px-3 py-2 text-xs text-muted-foreground">
              <p>
                {t(
                  "Choose up to 120 months. Start a new selection to edit this range."
                )}
              </p>
              <Button
                variant="fina-ghost"
                className="h-6 px-2 text-xs"
                onClick={() => {
                  const currentMonth = reviewMonthFromDate(new Date())
                  changeMonths([currentMonth])
                  setDisplayYear(Number(currentMonth.slice(0, 4)))
                }}
              >
                {t("Use current month")}
              </Button>
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-2 border-t border-fina-grid px-3 py-2">
            <span
              className="text-[11px] text-muted-foreground"
              aria-live="polite"
            >
              {t("selectedMonthsCount", { count: selectedMonths.length })}
            </span>
            <Button
              variant="fina-ghost"
              className="h-6 px-2 text-xs"
              onClick={() => setOpen(false)}
            >
              {t("Done")}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      <Button
        variant="fina-ghost"
        size="icon"
        aria-label={t("Next month")}
        disabled={selectedMonths.at(-1) === "9999-12"}
        className="size-6 text-muted-foreground"
        onClick={() => shiftMonths(1)}
      >
        <ChevronRightIcon className="size-3.5" />
      </Button>
    </div>
  )
}

function monthsInRange(filter: TransactionFilterType): string[] {
  const months: string[] = []
  const end = reviewMonthFromDate(filter.endDate)
  for (
    let month = reviewMonthFromDate(filter.startDate);
    month <= end;
    month = shiftReviewMonth(month, 1)
  ) {
    months.push(month)
    if (month === end) break
  }
  return months
}

const CashFlowDateFilter: FC = () => {
  const { t } = useTranslation()

  const [filterProps, setFilterProps] = useAtom(transactionFilterAtom)
  const [date, setDate] = useState<DateRange | undefined>({
    from: filterProps.startDate,
    to: filterProps.endDate
  })

  const isFullMonth = Boolean(
    date?.from &&
      date.to &&
      dayjs(date.from).isSame(date.to, "month") &&
      dayjs(date.from).date() === 1 &&
      dayjs(date.to).date() === dayjs(date.to).endOf("month").date()
  )

  useEffect(() => {
    setDate({ from: filterProps.startDate, to: filterProps.endDate })
  }, [filterProps.startDate, filterProps.endDate])

  const changeRange = (range: DateRange | undefined) => {
    setDate(range)
    if (range?.from && range.to) {
      setFilterProps((old: TransactionFilterType) => ({
        ...old,
        reviewMonths: undefined,
        startDate: range.from!,
        endDate: range.to!
      }))
    }
  }

  return (
    <div className="flex h-7 items-center gap-0.5">
      <Button
        variant="fina-ghost"
        size="icon"
        aria-label={t("Previous month")}
        className="size-6 text-muted-foreground"
        onClick={() => {
          if (isFullMonth) {
            const baseDate = dayjs(date?.from).subtract(1, "month")
            changeRange({
              from: baseDate.startOf("month").toDate(),
              to: baseDate.endOf("month").toDate()
            })
          } else {
            changeRange({
              from: dayjs(date?.from).subtract(1, "month").toDate(),
              to: dayjs(date?.to).subtract(1, "month").toDate()
            })
          }
        }}
      >
        <ChevronLeftIcon className="size-3.5" />
      </Button>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="fina-ghost"
            className="h-7 px-1.5 text-xs font-normal text-muted-foreground hover:bg-fina-canvas"
            aria-label={t("Date range")}
          >
            <span className="whitespace-nowrap">
              {isFullMonth
                ? dayjs(date?.from).format("MMM YYYY")
                : `${dayjs(date?.from).format("D MMM")} – ${dayjs(date?.to ?? date?.from).format("D MMM YYYY")}`}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto rounded-md border border-fina-grid p-0 shadow-fina-lg">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={changeRange}
            numberOfMonths={1}
          />
        </PopoverContent>
      </Popover>

      <Button
        variant="fina-ghost"
        size="icon"
        aria-label={t("Next month")}
        className="size-6 text-muted-foreground"
        onClick={() => {
          if (isFullMonth) {
            const baseDate = dayjs(date?.from).add(1, "month")
            changeRange({
              from: baseDate.startOf("month").toDate(),
              to: baseDate.endOf("month").toDate()
            })
          } else {
            changeRange({
              from: dayjs(date?.from).add(1, "month").toDate(),
              to: dayjs(date?.to).add(1, "month").toDate()
            })
          }
        }}
      >
        <ChevronRightIcon className="size-3.5" />
      </Button>
    </div>
  )
}
