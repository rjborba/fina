import { useActiveGroup } from "@/contexts/ActiveGroupContext";
import { useCategories } from "@/data/categories/useCategories";
import { EditableSelect } from "@/data/transactions/EditableSelectCell";
import { EditableText } from "@/data/transactions/EditableTextCell";
import { Transaction } from "@/data/transactions/Transaction";
import { cn } from "@/lib/utils";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  Row,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import dayjs from "dayjs";
import {
  ArrowDown,
  ArrowUp,
  Frown,
  LucideCreditCard,
  Trash,
} from "lucide-react";
import { FC, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TransactionDetailsModal } from "./TransactionDetailsModal";
import { Skeleton } from "../ui/skeleton";

export interface TransactionsTableProps {
  data?: Transaction["Row"][] | null;
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  isLoading: boolean;
  isError: boolean;
  onUpdateTransaction: (
    id: number,
    transaction: Partial<Transaction["Row"]>
  ) => Promise<void>;
  onDeleteTransaction: (id: number) => Promise<void>;
}

const columnHelper = createColumnHelper<Transaction["Row"]>();

const TransactionsTable: FC<TransactionsTableProps> = ({
  data,
  totalCount,
  pageIndex,
  pageSize,
  isLoading,
  isError,
  onUpdateTransaction,
  onDeleteTransaction,
}) => {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const { selectedGroup } = useActiveGroup();

  const [sorting, setSorting] = useState<SortingState>([
    {
      id: "date",
      desc: true,
    },
  ]);

  const { data: categoriesData } = useCategories({
    groupId: selectedGroup?.id?.toString(),
  });

  const categories = useMemo(() => {
    return (
      categoriesData?.map((category) => ({
        id: category.id,
        name: category.name,
      })) || []
    );
  }, [categoriesData]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("calculated_date", {
        id: "date",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              size="sm"
              className="gap-0"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
            >
              Date
              {column.getIsSorted() === "asc" && (
                <ArrowDown className="ml-1 h-1 w-1" />
              )}
              {column.getIsSorted() === "desc" && (
                <ArrowUp className="ml-1 h-1 w-1" />
              )}
            </Button>
          );
        },
        cell: (info) => {
          return dayjs(info.getValue()).format("DD/MM/YYYY");
        },
      }),
      columnHelper.accessor("description", {
        id: "description",
        header: "Description",
        cell: ({ row }) => {
          return (
            <div className="flex items-center gap-1">
              <div>{row.original.description}</div>
              {!!row.original.credit_due_date && (
                <LucideCreditCard className="h-3 w-3 text-muted-foreground" />
              )}
            </div>
          );
        },
      }),
      // Installments
      columnHelper.accessor(
        (row) => {
          if (!row.installment_current || !row.installment_total) {
            return "";
          }

          return `${row.installment_current}/${row.installment_total}`;
        },
        {
          id: "installment",
        }
      ),
      columnHelper.accessor("value", {
        id: "value",
        header: "Value",
        cell: ({ row }) => {
          if (!row.original.value) {
            return "";
          }

          return <div>R$ {row.original.value.toFixed(2)}</div>;
        },
      }),
      columnHelper.accessor("category_id", {
        header: "Category",
        cell: ({ row }) => {
          return (
            <div
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <EditableSelect
                value={row.original.category_id}
                categories={categories}
                transactionId={row.original.id}
                onChange={(value) => {
                  return onUpdateTransaction(row.original.id, {
                    category_id: value,
                  });
                }}
              />
            </div>
          );
        },
      }),
      columnHelper.accessor("observation", {
        id: "observation",
        header: "Observation",
        cell: ({ row }) => {
          return (
            <div
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <EditableText
                value={row.original.observation || ""}
                onChange={(value) => {
                  return onUpdateTransaction(row.original.id, {
                    observation: value,
                  });
                }}
              />
            </div>
          );
        },
      }),
      // Actions
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          return (
            <ConfirmationDialog
              trigger={
                <Button variant="ghost" size="icon">
                  <Trash className="h-4 w-4" />
                </Button>
              }
              title="Delete Transaction"
              description="Are you sure you want to delete this transaction?"
              onConfirm={() => onDeleteTransaction(row.original.id)}
            />
          );
        },
      }),
    ],
    [categories, onUpdateTransaction, onDeleteTransaction]
  );

  const table = useReactTable({
    data: data || [],
    columns,
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
    rowCount: totalCount,
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting: sorting,
      pagination: {
        pageIndex,
        pageSize,
      },
    },
  });

  const { rows } = table.getRowModel();

  const rowVirtualizer = useVirtualizer({
    count: data?.length || 0,
    estimateSize: () => 33,
    getScrollElement: () => tableContainerRef.current,
    measureElement:
      typeof window !== "undefined" &&
      navigator.userAgent.indexOf("Firefox") === -1
        ? (element) => element?.getBoundingClientRect().height
        : undefined,
    overscan: 5,
  });

  const [isTransactionsDetailsModalOpen, setIsTransactionsDetailsModalOpen] =
    useState(false);

  const [selectedTransactionIndex, setSelectedTransactionIndex] = useState<
    number | null
  >(null);

  const RenderTable = () => {
    return (
      <Table className="text-xs">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} style={{ width: header.getSize() }}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody className={`h-[${rowVirtualizer.getTotalSize()}px]`}>
          {rowVirtualizer
            .getVirtualItems()
            .map((virtualRow, virtualRowIndex) => {
              const row = rows[virtualRow.index] as Row<Transaction["Row"]>;

              return (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${
                      virtualRow.start - virtualRowIndex * virtualRow.size
                    }px)`,
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="py-0"
                      onClick={() => {
                        setSelectedTransactionIndex(virtualRow.index);
                        setIsTransactionsDetailsModalOpen(true);
                      }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
        </TableBody>
      </Table>
    );
  };

  const RenderNoTransactions = () => {
    return (
      <div className="flex items-center h-screen flex-col gap-2 pt-8">
        <p className="text-muted-foreground">No transactions here</p>
        <Frown className="h-24 w-24 text-muted" />
      </div>
    );
  };

  const RenderLoading = () => {
    return (
      <div className="flex flex-col gap-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex gap-2">
            <Skeleton className="w-1/12 h-12" />
            <Skeleton className="w-1/12 h-12" />
            <Skeleton className="w-4/12 h-12" />
            <Skeleton className="w-1/12 h-12" />
            <Skeleton className="w-1/12 h-12" />
            <Skeleton className="w-1/12 h-12" />
            <Skeleton className="w-2/12 h-12" />
            <Skeleton className="w-1/12 h-12" />
          </div>
        ))}
      </div>
    );
  };

  const RenderError = () => {
    return <div>Error</div>;
  };

  const RenderContent = () => {
    if (isError) {
      return <RenderError />;
    }

    if (isLoading || data === undefined) {
      return <RenderLoading />;
    }

    if (data?.length === 0) {
      return <RenderNoTransactions />;
    }

    return <RenderTable />;
  };

  return (
    <div className="flex relative" ref={tableContainerRef}>
      <div className={cn("p-4 flex-1 transition-all duration-300")}>
        {RenderContent()}
        {selectedTransactionIndex !== undefined &&
          selectedTransactionIndex !== null && (
            <TransactionDetailsModal
              transaction={data![selectedTransactionIndex]}
              open={isTransactionsDetailsModalOpen}
              onOpenChange={setIsTransactionsDetailsModalOpen}
            />
          )}
      </div>
    </div>
  );
};

export default TransactionsTable;
