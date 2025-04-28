import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  transactionFilterAtom,
  type TransactionFilterType,
} from '@/data/transactions/TransactionFilterAtom';
import dayjs from 'dayjs';
import { useAtom } from 'jotai';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import type { FC } from 'react';
import { useEffect, useState, useCallback } from 'react';
import type { DateRange } from 'react-day-picker';

function checkIfFullMonth(startDate: Date, endDate: Date) {
  const startDayjs = dayjs(startDate);
  const endDayjs = dayjs(endDate);

  return startDayjs.date() === 1 && endDayjs.date() === startDayjs.endOf('month').date();
}
export const TransactionsDateFilter: FC = () => {
  const [{ startDate, endDate }, setFilterProps] = useAtom(transactionFilterAtom);
  const [pendingDate, setPendingDate] = useState<DateRange | undefined>({
    from: startDate,
    to: endDate,
  });
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [firstVisibleMonth, setFirstVisibleMonth] = useState<Date | undefined>(pendingDate?.from);

  useEffect(() => {
    if (!isPopoverOpen) {
      // Wait for the popover to close before setting the first visible month
      setTimeout(() => {
        setFirstVisibleMonth(pendingDate?.from);
      }, 200);
    }
  }, [isPopoverOpen, pendingDate?.from]);

  const isFullMonth = checkIfFullMonth(startDate, endDate);
  const startDayjs = dayjs(startDate);
  const endDayjs = dayjs(endDate);

  const setFilterPropsDates = useCallback(
    (startDate: Date, endDate: Date) => {
      setFilterProps((old: TransactionFilterType) => ({
        ...old,
        startDate: startDate,
        endDate: endDate,
      }));
    },
    [setFilterProps]
  );

  // Keeps the pending date in sync with the filter props
  useEffect(() => {
    setFilterPropsDates(startDate, endDate);
  }, [setFilterPropsDates, startDate, endDate]);

  const handleConfirm = () => {
    if (!pendingDate?.from || !pendingDate?.to) {
      return;
    }

    setFilterPropsDates(pendingDate.from, pendingDate.to);
    setIsPopoverOpen(false);
  };

  const handleCancel = () => {
    setFilterPropsDates(startDate, endDate);
    setIsPopoverOpen(false);
  };

  const setCurrentMonth = () => {
    const today = dayjs();
    setPendingDate((old) => ({
      ...old,
      from: today.startOf('month').toDate(),
      to: today.endOf('month').toDate(),
    }));
    setFirstVisibleMonth(today.startOf('month').toDate());
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          if (isFullMonth) {
            const baseDate = dayjs(startDate).subtract(1, 'month');
            setFilterPropsDates(
              baseDate.startOf('month').toDate(),
              baseDate.endOf('month').toDate()
            );
          } else {
            setFilterPropsDates(
              dayjs(startDate).subtract(1, 'month').toDate(),
              dayjs(endDate).subtract(1, 'month').toDate()
            );
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
                    <div className="text-sm">{startDayjs.format('DD MMMM')} </div>
                    <div className="text-xs">{startDayjs.format('YYYY')}</div>
                  </div>
                  <div>-</div>
                  <div className="flex items-center justify-center flex-col gap-0">
                    <div className="text-sm">{endDayjs.format('DD MMMM')}</div>
                    <div className="text-xs">{endDayjs.format('YYYY')}</div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center flex-col gap-0">
                  <div className="text-sm">{endDayjs.format('MMMM')}</div>
                  <div className="text-xs">{endDayjs.format('YYYY')}</div>
                </div>
              )}
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleConfirm();
            } else if (e.key === 'Escape') {
              handleCancel();
            }
          }}
        >
          <div className="flex flex-col">
            <Calendar
              initialFocus
              month={firstVisibleMonth}
              onMonthChange={setFirstVisibleMonth}
              mode="range"
              defaultMonth={pendingDate?.from}
              selected={pendingDate}
              onSelect={setPendingDate}
              numberOfMonths={2}
            />
            <div className="flex justify-between gap-2 p-2 border-t">
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={setCurrentMonth} className="text-xs">
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
            const baseDate = startDayjs.add(1, 'month');
            setFilterPropsDates(
              baseDate.startOf('month').toDate(),
              baseDate.endOf('month').toDate()
            );
          } else {
            setFilterPropsDates(
              startDayjs.add(1, 'month').toDate(),
              endDayjs.add(1, 'month').toDate()
            );
          }
        }}
      >
        <ChevronRightIcon className="size-2" />
      </Button>
    </div>
  );
};
