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

export const TransactionsDateFilter: FC = () => {
  const [filterProps, setFilterProps] = useAtom(transactionFilterAtom);
  const [date, setDate] = useState<DateRange | undefined>({
    from: filterProps.startDate,
    to: filterProps.endDate,
  });

  const isFullMonth =
    !date ||
    (dayjs(date?.from).date() === 1 &&
      dayjs(date?.to).date() === dayjs(date?.to).endOf("month").date());

  useEffect(() => {
    setFilterProps((old: TransactionFilterType) => {
      if (!date) {
        return old;
      }

      return { ...old, startDate: date.from!, endDate: date.to! };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          if (isFullMonth) {
            const baseDate = dayjs(date?.from).subtract(1, "month");
            setDate({
              from: baseDate.startOf("month").toDate(),
              to: baseDate.endOf("month").toDate(),
            });
          } else {
            setDate({
              from: dayjs(date?.from).subtract(1, "month").toDate(),
              to: dayjs(date?.to).subtract(1, "month").toDate(),
            });
          }
        }}
      >
        <ChevronLeftIcon className="size-2" />
      </Button>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" className="w-auto">
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
                  <div className="text-sm">
                    {dayjs(date?.to).format("MMMM")}
                  </div>
                  <div className="text-xs">
                    {dayjs(date?.to).format("YYYY")}
                  </div>
                </div>
              )}
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={setDate}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          if (isFullMonth) {
            const baseDate = dayjs(date?.from).add(1, "month");
            setDate({
              from: baseDate.startOf("month").toDate(),
              to: baseDate.endOf("month").toDate(),
            });
          } else {
            setDate({
              from: dayjs(date?.from).add(1, "month").toDate(),
              to: dayjs(date?.to).add(1, "month").toDate(),
            });
          }
        }}
      >
        <ChevronRightIcon className="size-2" />
      </Button>
    </div>
  );
};
