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

export const TransactionsDateFilter: FC<{
  monthlyReview?: boolean
  mobile?: boolean
}> = ({ monthlyReview = false, mobile = false }) => {
  return monthlyReview ? (
    <MonthlyReviewDateFilter mobile={mobile} />
  ) : (
    <CashFlowDateFilter mobile={mobile} />
  )
}

const MonthlyReviewDateFilter: FC<{ mobile: boolean }> = ({ mobile }) => {
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
      : `${selectedMonths.length} months`

  return (
    <div
      className={cn(
        "flex h-7 items-center gap-0.5",
        mobile && "h-11 min-w-0 flex-1"
      )}
    >
      <Button
        variant="fina-ghost"
        size="icon"
        aria-label="Previous month"
        disabled={selectedMonths[0] === "0001-01"}
        className={cn(
          "size-6 text-muted-foreground",
          mobile && "h-11 w-9 shrink-0"
        )}
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
            className={cn(
              "h-7 px-1.5 text-xs font-normal text-muted-foreground hover:bg-fina-canvas",
              mobile && "h-11 min-w-0 flex-1 flex-col gap-0 px-1"
            )}
            aria-label="Review months"
            title={selectedMonths
              .map((month) => dayjs(reviewMonthStart(month)).format("MMM YYYY"))
              .join(", ")}
          >
            {mobile ? (
              <span
                aria-hidden="true"
                className="text-[10px] leading-4 text-muted-foreground"
              >
                Review
              </span>
            ) : null}
            <span className="max-w-full truncate">{summary}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          aria-label="Review months"
          className="w-64 rounded-md border border-fina-grid bg-fina-surface p-0 shadow-fina-lg"
        >
          <div className="flex items-center justify-between border-b border-fina-grid px-2 py-1.5">
            <Button
              variant="fina-ghost"
              size="icon"
              className="size-7"
              aria-label="Previous year"
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
              aria-label="Next year"
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
                Choose up to 120 months. Start a new selection to edit this
                range.
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
                Use current month
              </Button>
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-2 border-t border-fina-grid px-3 py-2">
            <span
              className="text-[11px] text-muted-foreground"
              aria-live="polite"
            >
              {selectedMonths.length} selected
            </span>
            <Button
              variant="fina-ghost"
              className="h-6 px-2 text-xs"
              onClick={() => setOpen(false)}
            >
              Done
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      <Button
        variant="fina-ghost"
        size="icon"
        aria-label="Next month"
        disabled={selectedMonths.at(-1) === "9999-12"}
        className={cn(
          "size-6 text-muted-foreground",
          mobile && "h-11 w-9 shrink-0"
        )}
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

const CashFlowDateFilter: FC<{ mobile: boolean }> = ({ mobile }) => {
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
    <div
      className={cn(
        "flex h-7 items-center gap-0.5",
        mobile && "h-11 min-w-0 flex-1"
      )}
    >
      <Button
        variant="fina-ghost"
        size="icon"
        aria-label="Previous month"
        className={cn(
          "size-6 text-muted-foreground",
          mobile && "h-11 w-9 shrink-0"
        )}
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
            className={cn(
              "h-7 px-1.5 text-xs font-normal text-muted-foreground hover:bg-fina-canvas",
              mobile && "h-11 min-w-0 flex-1 flex-col gap-0 px-1"
            )}
            aria-label="Date range"
          >
            {mobile ? (
              <span
                aria-hidden="true"
                className="text-[10px] leading-4 text-muted-foreground"
              >
                Cash flow
              </span>
            ) : null}
            <span className="max-w-full truncate whitespace-nowrap">
              {isFullMonth
                ? dayjs(date?.from).format("MMM YYYY")
                : `${dayjs(date?.from).format("D MMM")} – ${dayjs(date?.to ?? date?.from).format("D MMM YYYY")}`}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          collisionPadding={8}
          className="max-w-[calc(100vw-16px)] w-auto rounded-md border border-fina-grid p-0 shadow-fina-lg"
        >
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
        aria-label="Next month"
        className={cn(
          "size-6 text-muted-foreground",
          mobile && "h-11 w-9 shrink-0"
        )}
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
