import { TBill } from "@/models/Bill";
import { EditableField } from "@/components/editableField";
import { TableCell, TableRow } from "@/components/ui/table";
import { FC } from "react";
import { useForm } from "react-hook-form";

export type BillRowProps = { bill: TBill };

export type TBillFormValues = Omit<TBill, "id">;

const defaultFormValues: TBillFormValues = {
  description: "Default description",
  value: 230,
  dueDay: 1,
};

export const BillRow: FC<BillRowProps> = ({ bill }) => {
  const formMethods = useForm<TBillFormValues>({
    defaultValues: defaultFormValues,
    mode: "onBlur",
  });

  const onSubmit = (submitedData: TBillFormValues) => {
    console.log(submitedData);
    (document?.activeElement as HTMLInputElement).blur();
  };

  const formId = `bill-form-${bill.id}`;

  return (
    <>
      <TableRow className="group relative my-auto overflow-visible border-0">
        <TableCell>
          <form id={formId} onSubmit={formMethods.handleSubmit(onSubmit)} />
          {/* <button form={formId} type="submit">
        Submit
    </button>*/}
          <EditableField defaultValue={bill.description} />
        </TableCell>
        <TableCell>
          <EditableField defaultValue={bill.value} />
        </TableCell>
        <TableCell>
          <EditableField defaultValue={bill.dueDay} />
        </TableCell>
      </TableRow>
    </>
  );
};
