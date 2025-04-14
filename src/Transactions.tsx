import { FC, useMemo, useState, useEffect, memo } from "react";
import { useTransactions } from "./data/transactions/useTransactions";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from "./components/ui/table";
import { useBankAccounts } from "./data/bankAccounts/useBankAccounts";
import { BankAccount } from "./data/bankAccounts/BankAccount";
import { useCategories } from "./data/categories/useCategories";
import { TransactionRow } from "./data/transactions/TransactionRow";
import { Transaction } from "./data/transactions/Transaction";
import { Pagination } from "./components/ui/pagination";
import { useActiveGroup } from "./contexts/ActiveGroupContext";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";
import { Badge } from "./components/ui/badge";
import dayjs from "dayjs";
import { useTransactionsPreferences } from "./hooks/useTransactionsPreferences";
import { CreateTransactionModal } from "./components/CreateTransactionModal";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./components/ui/popover";
import { Button } from "./components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "./lib/utils";

const HEADERS = [
  "date",
  "credit_due_date",
  "description",
  "installment",
  "value",
  "category",
  "observation",
  "actions",
] as const;

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  index: i,
  name: dayjs().month(i).format("MMMM"),
}));

const TransactionRowWithSelection = ({
  row,
  rowIndex,
  accountsMapById,
  categoriesData,
  selectedIndex,
  onSelect,
}: {
  row: Transaction["Row"];
  rowIndex: number;
  accountsMapById: Record<string, BankAccount["Row"]>;
  categoriesData: { id: number; name: string | null }[];
  selectedIndex: number | null;
  onSelect: () => void;
}) => {
  const isSelected = rowIndex === selectedIndex;
  return (
    <TransactionRow
      row={row}
      rowIndex={rowIndex}
      accountsMapById={accountsMapById}
      categoriesData={categoriesData}
      isSelected={isSelected}
      onSelect={onSelect}
    />
  );
};

const MemoizedTransactionRow = memo(
  ({
    row,
    rowIndex,
    accountsMapById,
    categoriesData,
    selectedIndex,
    onSelect,
  }: {
    row: Transaction["Row"];
    rowIndex: number;
    accountsMapById: Record<string, BankAccount["Row"]>;
    categoriesData: { id: number; name: string | null }[];
    selectedIndex: number | null;
    onSelect: () => void;
  }) => {
    return (
      <TransactionRowWithSelection
        row={row}
        rowIndex={rowIndex}
        accountsMapById={accountsMapById}
        categoriesData={categoriesData}
        selectedIndex={selectedIndex}
        onSelect={onSelect}
      />
    );
  }
);

MemoizedTransactionRow.displayName = "MemoizedTransactionRow";

export const Transactions: FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const { selectedGroup } = useActiveGroup();
  const { preferences, updatePreferences } = useTransactionsPreferences(
    selectedGroup?.id?.toString()
  );
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<
    (number | null)[]
  >([]);
  const [openCategoriesFilter, setOpenCategoriesFilter] = useState(false);

  const { data: transactionsData, isLoading: isLoadingTransactions } =
    useTransactions({
      page: currentPage,
      pageSize: preferences.pageSize,
      groupdId: selectedGroup?.id?.toString() || "",
      startDate: preferences.useCustomDates
        ? preferences.startDate
        : dayjs()
            .month(Math.min(...preferences.selectedMonths))
            .year(preferences.selectedYear)
            .startOf("month")
            .format("YYYY-MM-DD"),
      endDate: preferences.useCustomDates
        ? preferences.endDate
        : dayjs()
            .month(Math.max(...preferences.selectedMonths))
            .year(preferences.selectedYear)
            .endOf("month")
            .format("YYYY-MM-DD"),
      account_ids: selectedAccount ? [Number(selectedAccount)] : undefined,
      category_ids: selectedCategories,
    });

  const { data: bankAccountsData, isLoading: isLoadingAccounts } =
    useBankAccounts({ groupId: selectedGroup?.id?.toString() });
  const { data: categoriesData, isLoading: isLoadingCategories } =
    useCategories({ groupId: selectedGroup?.id?.toString() });

  const accountsMapById = useMemo(() => {
    if (!bankAccountsData) {
      return {};
    }

    return bankAccountsData.reduce((acc, current) => {
      acc[current.id] = current;
      return acc;
    }, {} as Record<string, BankAccount["Row"]>);
  }, [bankAccountsData]);

  const totalPages = Math.ceil(
    (transactionsData?.totalCount || 0) / preferences.pageSize
  );

  const handleMonthSelect = (monthIndex: number) => {
    const newSelectedMonths = preferences.selectedMonths.includes(monthIndex)
      ? preferences.selectedMonths.filter((m) => m !== monthIndex)
      : [...preferences.selectedMonths, monthIndex].sort((a, b) => a - b);

    updatePreferences({ selectedMonths: newSelectedMonths });
    setCurrentPage(1);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in any form element
      if (
        e.target instanceof HTMLElement &&
        e.target.closest('input, textarea, select, [role="combobox"]')
      ) {
        return;
      }

      if (!transactionsData?.data) return;

      const currentIndex = selectedIndex ?? -1;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const nextIndex = Math.min(
          currentIndex + 1,
          transactionsData.data.length - 1
        );
        setSelectedIndex(nextIndex);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prevIndex = Math.max(currentIndex - 1, 0);
        setSelectedIndex(prevIndex);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [transactionsData?.data, selectedIndex]);

  return (
    <div>
      <div className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label>Filter by:</Label>
              <Select
                value={preferences.useCustomDates ? "custom" : "month"}
                onValueChange={(value) => {
                  updatePreferences({ useCustomDates: value === "custom" });
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="custom">Custom Dates</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Label>Account:</Label>
              <Select
                value={selectedAccount ?? "all"}
                onValueChange={(value) => {
                  setSelectedAccount(value === "all" ? null : value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  {bankAccountsData?.map((account) => (
                    <SelectItem key={account.id} value={String(account.id)}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openCategoriesFilter}
                    onClick={() =>
                      setOpenCategoriesFilter(!openCategoriesFilter)
                    }
                    className="w-[200px] justify-between"
                  >
                    {selectedCategories.length > 0
                      ? `${selectedCategories.length} categories selected`
                      : "Select categories..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent>
                  <Command>
                    <CommandInput placeholder="Search categories..." />
                    <CommandList>
                      <CommandEmpty>No category found.</CommandEmpty>
                      <CommandGroup heading="Suggestions">
                        <CommandItem
                          onSelect={() => {
                            setSelectedCategories((current) => {
                              if (current.includes(null)) {
                                return current.filter((id) => id !== null);
                              }
                              return [...current, null];
                            });
                            setCurrentPage(1);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedCategories.includes(null)
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          Without category
                        </CommandItem>
                        {(categoriesData || []).map((category) => (
                          <CommandItem
                            key={category.id}
                            onSelect={() => {
                              setSelectedCategories((current) => {
                                if (current.includes(category.id)) {
                                  return current.filter(
                                    (id) => id !== category.id
                                  );
                                }
                                return [...current, category.id];
                              });
                              setCurrentPage(1);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedCategories.includes(category.id)
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            {category.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {preferences.useCustomDates ? (
              <>
                <div className="flex items-center gap-2">
                  <Label htmlFor="startDate">From:</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={preferences.startDate}
                    onChange={(e) => {
                      updatePreferences({ startDate: e.target.value });
                      setCurrentPage(1);
                    }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="endDate">To:</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={preferences.endDate}
                    onChange={(e) => {
                      updatePreferences({ endDate: e.target.value });
                      setCurrentPage(1);
                    }}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Label>Months:</Label>
                  <div className="flex flex-wrap gap-2">
                    {MONTHS.map(({ index, name }) => (
                      <Badge
                        key={name}
                        variant={
                          preferences.selectedMonths.includes(index)
                            ? "default"
                            : "outline"
                        }
                        className="cursor-pointer"
                        onClick={() => handleMonthSelect(index)}
                      >
                        {name}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Label>Year:</Label>
                  <Select
                    value={preferences.selectedYear.toString()}
                    onValueChange={(value) => {
                      updatePreferences({ selectedYear: parseInt(value) });
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from(
                        { length: 10 },
                        (_, i) => dayjs().year() - 5 + i
                      ).map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            <CreateTransactionModal />
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={preferences.pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                updatePreferences({ pageSize: size });
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">#</TableHead>
              <TableHead className="w-[150px]">Account</TableHead>
              {HEADERS.map((column) => (
                <TableHead key={column} className="w-[150px]">
                  {column}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingTransactions ||
            isLoadingAccounts ||
            isLoadingCategories ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : (
              transactionsData?.data?.map((transaction, rowIndex) => (
                <TransactionRow
                  key={transaction.id}
                  row={transaction}
                  rowIndex={rowIndex}
                  accountsMapById={accountsMapById}
                  categoriesData={categoriesData || []}
                  isSelected={rowIndex === selectedIndex}
                  onSelect={() => setSelectedIndex(rowIndex)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
