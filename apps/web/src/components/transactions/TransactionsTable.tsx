import { useActiveGroup } from "@/contexts/ActiveGroupContext";
import { useCategories } from "@/data/categories/useCategories";
import { EditableSelect } from "@/data/transactions/EditableSelectCell";
import { EditableText } from "@/data/transactions/EditableTextCell";
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
import { FC, useEffect, useMemo, useRef, useState } from "react";
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
import React from "react";

export interface TransactionsTableProps {
  data?: Transaction[] | null;
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  isLoading: boolean;
  isError: boolean;
  onUpdateTransaction: (
    id: string,
    transaction: Partial<Transaction>
  ) => Promise<void>;
  onDeleteTransaction: (id: string) => Promise<void>;
}

const columnHelper = createColumnHelper<Transaction>();

// Memoized TableRow to prevent unnecessary re-renders
const MemoizedTableRow = React.memo(TableRow);

import { useAtom } from "jotai";
import { openSelectIdAtom } from "./OpenSelectAtom";
import { CreateTransactionModal } from "../CreateTransactionModal";
import { Transaction } from "@fina/types";

const CategoryCell: React.FC<{
  row: Row<Transaction>;
  categories: { id: string; name: string }[];
  onUpdateTransaction: TransactionsTableProps["onUpdateTransaction"];
}> = ({ row, categories, onUpdateTransaction }) => {
  const [openSelectId, setOpenSelectId] = useAtom(openSelectIdAtom);

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <EditableSelect
        value={row.original.category?.id || null}
        options={categories}
        open={openSelectId === row.original.id}
        onOpenChange={(open) => {
          if (open) {
            setOpenSelectId(row.original.id);
          } else {
            setOpenSelectId(null);
          }
        }}
        onChange={(value) => {
          setOpenSelectId(null);

          if (!row.original.category) {
            throw new Error("Category not found");
          }
          return onUpdateTransaction(row.original.id, {
            category: { ...row.original.category, id: value! },
          });
        }}
      />
    </div>
  );
};

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

  const [openCreateTransactionModal, setOpenCreateTransactionModal] =
    useState(false);

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in any form element
      if (
        e.target instanceof HTMLElement &&
        e.target.closest('input, textarea, select, [role="combobox"]')
      ) {
        return;
      }

      if (e.key === "n" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        // Only open the modal, don't toggle
        if (!openCreateTransactionModal) {
          setOpenCreateTransactionModal(true);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns = useMemo(
    () => [
      columnHelper.accessor("calculatedDate", {
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
            <div className="">
              <span>{row.original.description}</span>{" "}
              {!!row.original.creditDueDate && (
                <LucideCreditCard className="h-3 w-3 text-muted-foreground inline" />
              )}
            </div>
          );
        },
      }),
      // Installments
      columnHelper.accessor(
        (row) => {
          if (!row.installmentCurrent || !row.installmentTotal) {
            return "";
          }

          return `${row.installmentCurrent}/${row.installmentTotal}`;
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
      columnHelper.accessor("category", {
        header: "Category",
        cell: ({ row }) => {
          return (
            <CategoryCell
              row={row}
              categories={categories}
              onUpdateTransaction={onUpdateTransaction}
            />
          );
        },
        // const { openSelectId, setOpenSelectId } = useEditableSelectOpen();
        // return (
        //   <div
        //     onClick={(e) => {
        //       e.stopPropagation();
        //     }}
        //   >
        //     <EditableSelect
        //       value={row.original.category_id}
        //       categories={categories}
        //       transactionId={row.original.id}
        //       open={openSelectId === row.original.id}
        //       onOpen={() => setOpenSelectId(row.original.id)}
        //       onClose={() => setOpenSelectId(null)}
        //       onChange={(value) => {
        //         setOpenSelectId(null);
        //         return onUpdateTransaction(row.original.id, {
        //           category_id: value,
        //         });
        //       }}
        //     />
        //   </div>
        //   );
        // },
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
    estimateSize: () => 36,
    getScrollElement: () => tableContainerRef.current,
    measureElement:
      typeof window !== "undefined" &&
      navigator.userAgent.indexOf("Firefox") === -1
        ? (element) => element?.getBoundingClientRect().height
        : undefined,
    overscan: 15,
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
            <MemoizedTableRow key={headerGroup.id}>
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
            </MemoizedTableRow>
          ))}
        </TableHeader>
        <TableBody
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`, //tells scrollbar how big the table is
            position: "relative", //needed for absolute positioning of rows
          }}
        >
          {rowVirtualizer
            .getVirtualItems()
            .map((virtualRow, virtualRowIndex) => {
              const row = rows[virtualRow.index] as Row<Transaction>;

              return (
                <MemoizedTableRow
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
                </MemoizedTableRow>
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
        {Array.from({ length: 12 }).map((_, index) => (
          <div key={index} className="flex gap-2">
            <Skeleton className="w-1/12 h-8" />
            <Skeleton className="w-4/12 h-8" />
            <Skeleton className="w-1/12 h-8" />
            <Skeleton className="w-1/12 h-8" />
            <Skeleton className="w-1/12 h-8" />
            <Skeleton className="w-2/12 h-8" />
            <Skeleton className="w-1/12 h-8" />
            <Skeleton className="w-1/12 h-8" />
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
              transaction={data ? data[selectedTransactionIndex] : null}
              open={isTransactionsDetailsModalOpen}
              onOpenChange={setIsTransactionsDetailsModalOpen}
              totalTransactions={data?.length || 0}
              currentTransactionIndex={selectedTransactionIndex}
              onNextTransaction={() => {
                if (selectedTransactionIndex === null) {
                  return;
                }

                setSelectedTransactionIndex(
                  Math.min(
                    data?.length ? data?.length - 1 : 0,
                    selectedTransactionIndex + 1
                  )
                );
              }}
              onPreviousTransaction={() => {
                if (selectedTransactionIndex === null) {
                  return;
                }

                setSelectedTransactionIndex(
                  Math.max(0, selectedTransactionIndex - 1)
                );
              }}
            />
          )}
        <CreateTransactionModal
          open={openCreateTransactionModal}
          onOpenChange={setOpenCreateTransactionModal}
        />
      </div>
    </div>
  );
};

export default TransactionsTable;
