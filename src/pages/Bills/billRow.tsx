import { TBill } from "@/models/Bill";
import { EditableField } from "@/components/editableField";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import { FC, useEffect } from "react";
import { useForm } from "react-hook-form";

export type BillRowProps = { bill: TBill };

export type TBillFormValues = TBill;

const defaultFormValues: TBillFormValues = {
  id: "TO_BE_CONFIRMED",
  description: "",
  value: 0,
  dueDay: 0,
};

export const BillRow: FC<BillRowProps> = ({ bill }) => {
  const formMethods = useForm<TBillFormValues>({
    defaultValues: defaultFormValues,
    mode: "onBlur",
  });

  useEffect(() => {
    formMethods.reset({
      id: bill.id,
      description: bill.description,
      value: bill.value,
      dueDay: bill.dueDay,
    });
  }, [formMethods, bill]);

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
          <EditableField
            // defaultValue={bill.description}
            {...formMethods.register("description")}
            form={formId}
          />
        </TableCell>
        <TableCell>
          <EditableField {...formMethods.register("value")} />
        </TableCell>
        <TableCell>
          <EditableField {...formMethods.register("dueDay")} />
        </TableCell>
      </TableRow>
    </>
  );
};
