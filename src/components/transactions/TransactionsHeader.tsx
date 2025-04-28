import type { FC } from 'react';

import { Filter, RefreshCw } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import { TransactionsDateFilter } from '@/components/transactions/TransactionsDateFilter';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';

interface TransactionsHeaderProps {
  isFilterOpen: boolean;
  onFilterToggle: (value: boolean) => void;
  onRefresh: () => void;
  isRefetching: boolean;
}

export const TransactionsHeader: FC<TransactionsHeaderProps> = ({
  isFilterOpen,
  onFilterToggle,
  onRefresh,
  isRefetching,
}) => {
  return (
    <div className="p-4 flex justify-between sticky top-0 bg-background z-20">
      {/* Placeholder for the search bar */}
      <div />

      <TransactionsDateFilter />

      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={onRefresh} disabled={isRefetching}>
          <RefreshCw
            className={cn('h-4 w-4', {
              'animate-spin': isRefetching,
            })}
          />
        </Button>

        <Toggle
          aria-label="Toggle italic"
          pressed={isFilterOpen}
          onClick={() => onFilterToggle(!isFilterOpen)}
        >
          <Filter className="h-4 w-4" />
        </Toggle>
      </div>
    </div>
  );
};
