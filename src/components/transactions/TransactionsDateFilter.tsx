import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  transactionFilterAtom,
  TransactionFilterType,
} from "@/data/transactions/TransactionFilterAtom";
import dayjs from "dayjs";
import { useAtom } from "jotai";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { FC, useEffect, useState } from "react";
import { DateRange } from "react-day-picker";


function checkIfFullMonth(startDate: Date, endDate: Date) {
  const startDayjs = dayjs(startDate)
  const endDayjs = dayjs(endDate)

  return (
    (startDayjs.date() === 1 &&
      endDayjs.date() === startDayjs.endOf("month").date()
    )
  )
}
export const TransactionsDateFilter: FC = () => {
  const [{ startDate, endDate }, setFilterProps] = useAtom(transactionFilterAtom);
  const [pendingDate, setPendingDate] = useState<DateRange | undefined>({
    from: startDate,
    to: endDate,
  });
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const isFullMonth = checkIfFullMonth(startDate, endDate);
  const startDayjs = dayjs(startDate)
  const endDayjs = dayjs(endDate)

  function setFilterPropsDates(startDate: Date, endDate: Date) {
    setFilterProps((old: TransactionFilterType) => ({
      ...old,
      startDate: startDate,
      endDate: endDate,
    }));
  }

  // Keeps the pending date in sync with the filter props
  useEffect(() => {
    setFilterPropsDates(startDate, endDate);
  }, [startDate, endDate]);

  const handleConfirm = () => {
    if (pendingDate?.from && pendingDate?.to) {
      setFilterPropsDates(pendingDate.from!, pendingDate.to!);
    }
    setIsPopoverOpen(false);
  };

  const handleCancel = () => {
    setFilterPropsDates(startDate, endDate);
    setIsPopoverOpen(false);
  };

  const setCurrentMonth = () => {
    const today = dayjs();
    setFilterProps((old: TransactionFilterType) => ({
      ...old,
      startDate: today.startOf("month").toDate(),
      endDate: today.endOf("month").toDate(),
    }));
  };


  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          if (isFullMonth) {
            const baseDate = dayjs(startDate).subtract(1, "month");
            setFilterProps((old: TransactionFilterType) => ({
              ...old,
              startDate: baseDate.startOf("month").toDate(),
              endDate: baseDate.endOf("month").toDate(),
            }));
          } else {
            setFilterProps((old: TransactionFilterType) => ({
              ...old,
              startDate: dayjs(startDate).subtract(1, "month").toDate(),
              endDate: dayjs(endDate).subtract(1, "month").toDate(),
            }));
          }
        }}
      >
        <ChevronLeftIcon className="size-2" />
      </Button>
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" className="w-auto">
            <div className="flex items-center justify-center flex-col gap-0">
              {!isFullMonth ? (
                <div className="flex gap-2 items-center">
                  <div className="flex items-center justify-center flex-col gap-0">
                    <div className="text-sm">
                      {startDayjs.format("DD MMMM")}{" "}
                    </div>
                    <div className="text-xs">
                      {startDayjs.format("YYYY")}
                    </div>
                  </div>
                  <div>-</div>
                  <div className="flex items-center justify-center flex-col gap-0">
                    <div className="text-sm">
                      {endDayjs.format("DD MMMM")}
                    </div>
                    <div className="text-xs">
                      {endDayjs.format("YYYY")}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center flex-col gap-0">
                  <div className="text-sm">
                    {endDayjs.format("MMMM")}
                  </div>
                  <div className="text-xs">
                    {endDayjs.format("YYYY")}
                  </div>
                </div>
              )}
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleConfirm();
            } else if (e.key === "Escape") {
              handleCancel();
            }
          }}
        >
          <div className="flex flex-col">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={pendingDate?.from}
              selected={pendingDate}
              onSelect={setPendingDate}
              numberOfMonths={2}
            />
            <div className="flex justify-between gap-2 p-2 border-t">
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={setCurrentMonth}
                  className="text-xs"
                >
                  Current Month
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleConfirm}>
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          if (isFullMonth) {
            const baseDate = startDayjs.add(1, "month");
            setFilterPropsDates(baseDate.startOf("month").toDate(), baseDate.endOf("month").toDate());
          } else {
            setFilterPropsDates(startDayjs.add(1, "month").toDate(), endDayjs.add(1, "month").toDate());
          }
        }}
      >
        <ChevronRightIcon className="size-2" />
      </Button>
    </div>
  );
};
