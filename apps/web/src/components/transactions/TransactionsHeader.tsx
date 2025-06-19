import { FC, useState } from "react";

import { Filter, PanelBottomOpen } from "lucide-react";

import { TransactionsDateFilter } from "@/components/transactions/TransactionsDateFilter";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface TransactionsHeaderProps {
  isFilterOpen: boolean;
  onFilterToggle: (value: boolean) => void;
}

export const TransactionsHeader: FC<TransactionsHeaderProps> = ({
  isFilterOpen,
  onFilterToggle,
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  return (
    <div className="p-4 flex justify-between sticky top-0 bg-background z-20 border-b">
      {/* Placeholder for the search bar */}
      {/* <div></div> */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsDrawerOpen(!isDrawerOpen)}
      >
        <PanelBottomOpen className="h-4 w-4" />
      </Button>

      <TransactionsDateFilter />

      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onFilterToggle(!isFilterOpen)}
          className={cn({
            "transition-all duration-300": true,
            "opacity-0 pointer-events-none": isFilterOpen,
          })}
        >
          <Filter className="h-4 w-4" />
        </Button>

        <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <SheetContent side="left">
            <SheetHeader>
              <SheetTitle>Are you absolutely sure?</SheetTitle>
              <SheetDescription>
                This action cannot be undone. This will permanently delete your
                account and remove your data from our servers.
              </SheetDescription>
            </SheetHeader>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};
