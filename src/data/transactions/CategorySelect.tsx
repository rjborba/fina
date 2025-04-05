import { FC, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "../../components/ui/select";
import { SelectValue } from "@radix-ui/react-select";
import { useTransactionMutation } from "./useTransactionsMutation";

const NONE_CATEGORY_ID = "none" as const;

interface CategorySelectProps {
  transactionId: number;
  value: number | null;
  categories: { id: number; name: string | null }[];
}

export const CategorySelect: FC<CategorySelectProps> = ({
  value,
  categories,
  transactionId,
}) => {
  const { updateTransaction } = useTransactionMutation();
  const [internalValue, setInternalValue] = useState(value);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <Select
      value={internalValue ? String(internalValue) : NONE_CATEGORY_ID}
      disabled={isLoading}
      onValueChange={(newValue) => {
        const newValueNumber =
          newValue === NONE_CATEGORY_ID ? null : Number(newValue);
        setInternalValue(newValueNumber);
        setIsLoading(true);

        updateTransaction(transactionId, {
          category_id: newValueNumber,
        })
          .catch((error) => {
            console.error("Failed to update transaction:", error);
            alert("Failed to update transaction");
            setInternalValue(value);
          })
          .finally(() => {
            setIsLoading(false);
          });
      }}
    >
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {categories?.map((category) => {
          return (
            <SelectItem key={category.id} value={String(category.id)}>
              {category.name || "-"}
            </SelectItem>
          );
        })}
        <SelectItem value={NONE_CATEGORY_ID}>-</SelectItem>
      </SelectContent>
    </Select>
  );
};
