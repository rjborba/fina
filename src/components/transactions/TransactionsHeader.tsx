import { FC } from "react";

import { Filter } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { TransactionsDateFilter } from "@/components/transactions/TransactionsDateFilter";

interface TransactionsHeaderProps {
  isFilterOpen: boolean;
  onFilterToggle: (value: boolean) => void;
}

export const TransactionsHeader: FC<TransactionsHeaderProps> = ({
  isFilterOpen,
  onFilterToggle,
}) => {
  return (
    <div className="p-4 flex justify-between sticky top-0 bg-background z-20">
      {/* Placeholder for the search bar */}
      <div></div>

      <TransactionsDateFilter />

      <Toggle
        aria-label="Toggle italic"
        pressed={isFilterOpen}
        onClick={() => onFilterToggle(!isFilterOpen)}
      >
        <Filter className="h-4 w-4" />
      </Toggle>
    </div>
  );
};
