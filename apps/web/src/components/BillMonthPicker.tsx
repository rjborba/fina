import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CreditCard
} from "lucide-react"
import { useState } from "react"

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
] as const

type BillMonthPickerProps = {
  id: string
  value: string
  onValueChange: (value: string) => void
  dueDate?: number | null
  className?: string
  label?: string
  description?: string
  disabled?: boolean
}

export const BillMonthPicker = ({
  id,
  value,
  onValueChange,
  dueDate,
  className,
  label = "Bill due in",
  description = "File names are never used to choose a bill.",
  disabled = false
}: BillMonthPickerProps) => {
  const [open, setOpen] = useState(false)
  const selectedYear = value ? Number(value.slice(0, 4)) : null
  const selectedMonth = value ? Number(value.slice(5, 7)) - 1 : null
  const [displayYear, setDisplayYear] = useState(
    selectedYear ?? new Date().getFullYear()
  )
  const dueDay = dueDate ?? null

  return (
    <div className={cn("space-y-2", className)}>
      <label className="text-sm font-bold" htmlFor={id}>
        {label}
      </label>
      <Popover
        open={open}
        onOpenChange={(nextOpen) => {
          if (nextOpen && selectedYear) setDisplayYear(selectedYear)
          setOpen(nextOpen)
        }}
      >
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            aria-required="true"
            disabled={disabled}
            className={cn(
              "h-auto w-full justify-between rounded-none border-2 border-fina-ink bg-fina-surface px-3 py-3 text-left shadow-fina-sm hover:-translate-y-0.5 hover:bg-fina-yellow hover:shadow-fina-md",
              !value && "text-fina-ink/55"
            )}
          >
            <span className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center border-2 border-fina-ink bg-fina-violet text-white">
                <CreditCard className="size-5" strokeWidth={2.5} />
              </span>
              <span className="flex flex-col">
                <span className="font-mono text-[9px] font-black uppercase tracking-[0.16em] text-fina-ink/45">
                  {label}
                </span>
                <span className="text-base font-black tracking-[-0.02em] text-fina-ink">
                  {selectedMonth === null || selectedYear === null
                    ? "Choose month"
                    : `${months[selectedMonth]} ${selectedYear}`}
                </span>
              </span>
            </span>
            <CalendarDays className="size-5 text-fina-ink/55" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[min(22rem,calc(100vw-2rem))] rounded-none border-2 border-fina-ink bg-fina-surface p-0 shadow-fina-lg"
        >
          <div className="flex items-center justify-between border-b-2 border-fina-ink bg-fina-lime px-3 py-2">
            <Button
              type="button"
              variant="fina-ghost"
              size="icon"
              aria-label="Previous year"
              onClick={() => setDisplayYear((year) => year - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <div className="text-center">
              <div className="font-mono text-[9px] font-black uppercase tracking-[0.16em] text-fina-ink/50">
                Year
              </div>
              <div className="text-lg font-black">{displayYear}</div>
            </div>
            <Button
              type="button"
              variant="fina-ghost"
              size="icon"
              aria-label="Next year"
              onClick={() => setDisplayYear((year) => year + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2 p-3">
            {months.map((month, index) => {
              const selected =
                selectedYear === displayYear && selectedMonth === index
              return (
                <Button
                  key={month}
                  type="button"
                  variant="fina-ghost"
                  aria-label={`${month} ${displayYear}`}
                  aria-pressed={selected}
                  className={cn(
                    "relative h-10 rounded-none border-2 border-transparent px-2 text-xs font-black uppercase",
                    "hover:border-fina-ink hover:bg-fina-yellow",
                    selected &&
                      "border-fina-ink bg-fina-violet text-white hover:bg-fina-violet"
                  )}
                  onClick={() => {
                    onValueChange(
                      `${displayYear}-${String(index + 1).padStart(2, "0")}`
                    )
                    setOpen(false)
                  }}
                >
                  {month.slice(0, 3)}
                  {selected ? (
                    <Check className="absolute right-1 top-1 size-3" />
                  ) : null}
                </Button>
              )
            })}
          </div>
          <div className="border-t-2 border-fina-ink bg-fina-grid px-4 py-3 text-xs font-semibold text-fina-ink/65">
            {dueDay
              ? `Due day ${dueDay}. Fina combines it with the selected month.`
              : "Choose the calendar month for this view."}
          </div>
        </PopoverContent>
      </Popover>
      <p className="text-xs font-semibold text-fina-ink/55">{description}</p>
    </div>
  )
}
