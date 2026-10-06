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
import dayjs from "dayjs"
import { useAtom } from "jotai"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { FC, useEffect, useState } from "react"
import { DateRange } from "react-day-picker"

export const TransactionsDateFilter: FC = () => {
  const [filterProps, setFilterProps] = useAtom(transactionFilterAtom)
  const [date, setDate] = useState<DateRange | undefined>({
    from: filterProps.startDate,
    to: filterProps.endDate
  })

  const isFullMonth =
    !date ||
    (dayjs(date?.from).date() === 1 &&
      dayjs(date?.to).date() === dayjs(date?.to).endOf("month").date())

  useEffect(() => {
    setFilterProps((old: TransactionFilterType) => {
      if (!date) {
        return old
      }

      return { ...old, startDate: date.from!, endDate: date.to! }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])

  return (
    <div className="flex min-h-12 items-stretch border-2 border-fina-ink bg-fina-surface shadow-fina-md">
      <Button
        variant="fina-ghost"
        size="icon"
        aria-label="Previous month"
        className="h-auto w-10 border-r-2 border-fina-ink hover:bg-fina-lime"
        onClick={() => {
          if (isFullMonth) {
            const baseDate = dayjs(date?.from).subtract(1, "month")
            setDate({
              from: baseDate.startOf("month").toDate(),
              to: baseDate.endOf("month").toDate()
            })
          } else {
            setDate({
              from: dayjs(date?.from).subtract(1, "month").toDate(),
              to: dayjs(date?.to).subtract(1, "month").toDate()
            })
          }
        }}
      >
        <ChevronLeftIcon className="size-4" />
      </Button>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="fina-ghost"
            className="h-auto min-w-36 px-4 hover:bg-fina-grid"
          >
            <div className="flex items-center justify-center flex-col gap-0">
              {!isFullMonth ? (
                <div className="flex gap-2 items-center">
                  <div className="flex items-center justify-center flex-col gap-0">
                    <div className="text-sm">
                      {dayjs(date?.from).format("DD MMMM")}{" "}
                    </div>
                    <div className="text-xs">
                      {dayjs(date?.from).format("YYYY")}
                    </div>
                  </div>
                  <div>-</div>
                  <div className="flex items-center justify-center flex-col gap-0">
                    <div className="text-sm">
                      {dayjs(date?.to).format("DD MMMM")}
                    </div>
                    <div className="text-xs">
                      {dayjs(date?.to).format("YYYY")}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center flex-col gap-0">
                  <div className="font-black uppercase leading-none">
                    {dayjs(date?.to).format("MMMM")}
                  </div>
                  <div className="font-mono text-[10px] font-bold">
                    {dayjs(date?.to).format("YYYY")}
                  </div>
                </div>
              )}
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto rounded-none border-2 border-fina-ink p-0 shadow-fina-lg">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={setDate}
            numberOfMonths={1}
          />
        </PopoverContent>
      </Popover>

      <Button
        variant="fina-ghost"
        size="icon"
        aria-label="Next month"
        className="h-auto w-10 border-l-2 border-fina-ink hover:bg-fina-lime"
        onClick={() => {
          if (isFullMonth) {
            const baseDate = dayjs(date?.from).add(1, "month")
            setDate({
              from: baseDate.startOf("month").toDate(),
              to: baseDate.endOf("month").toDate()
            })
          } else {
            setDate({
              from: dayjs(date?.from).add(1, "month").toDate(),
              to: dayjs(date?.to).add(1, "month").toDate()
            })
          }
        }}
      >
        <ChevronRightIcon className="size-4" />
      </Button>
    </div>
  )
}
