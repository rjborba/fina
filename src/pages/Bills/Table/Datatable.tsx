import {
  ColumnDef,
  Row,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { useForm, SubmitHandler, FormProvider } from "react-hook-form";
import { toast } from "react-toastify";

import {
  Table,
  TableBody,
  TableCell,
  TableFormRow,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FC, Fragment, useEffect } from "react";
import { TBill, useBills } from "@/hooks/Bills/useBills";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

type TFormValues = TBill;

const formDefaultValues: TBill = {
  category: "",
  createdAt: "",
  description: "Description",
  id: 0,
  installment: null,
  purchasedAt: null,
  totalInstallments: null,
  value: 200,
};

export function FormTableRow<TData>({ row }: { row: Row<TData> }) {
  const {
    mutate: { update },
  } = useBills();

  const useFormMethods = useForm<TFormValues>({
    defaultValues: formDefaultValues,
  });

  const onSubmit: SubmitHandler<TFormValues> = (data) => {
    update
      .execute({ billId: data.id, bill: data })
      .then(() => {
        toast.success("Hell Yeah!");
        useFormMethods.reset(data);
      })
      .catch((e) => {
        toast.success("Hell No!");
      });
  };

  useEffect(() => {
    useFormMethods.reset(row.original as TBill);
    return () => {};
  }, [useFormMethods, row.original]);

  return (
    <FormProvider {...useFormMethods}>
      <TableFormRow
        data-state={row.getIsSelected() && "selected"}
        onSubmit={useFormMethods.handleSubmit(onSubmit)}
      >
        <input type="submit" hidden />
        {row.getVisibleCells().map((cell) => (
          <TableCell key={cell.id}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        ))}
      </TableFormRow>
    </FormProvider>
  );
}

export function DataTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table
              .getRowModel()
              .rows.map((row) => <FormTableRow row={row} key={row.id} />)
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="col-span-3 h-24 text-center"
              >
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
