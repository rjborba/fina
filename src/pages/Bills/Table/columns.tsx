import { EditableField } from "@/components/editableField";
import { TBill } from "@/hooks/Bills/useBills";
import { ColumnDef } from "@tanstack/react-table";

export const columns: ColumnDef<TBill>[] = [
  {
    accessorKey: "id",
    header: "Id",
    cell: ({ row, cell }) => {
      const value = row.getValue<string>("id");
      return value;
    },
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: () => {
      return <EditableField name="description" initAsEditMode />;
    },
  },
  {
    accessorKey: "value",
    header: "Value",
    cell: () => {
      return <EditableField name="value" />;
    },
  },
];
