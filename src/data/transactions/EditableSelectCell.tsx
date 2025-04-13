import { FC, useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { SelectValue } from "@radix-ui/react-select";
import { toast } from "@/hooks/use-toast";

const NONE_CATEGORY_ID = "none" as const;

interface EditableSelectProps {
  transactionId: number;
  value: number | null;
  categories: { id: number; name: string | null }[];
  onChange: (value: number | null) => Promise<unknown>;
}

export const EditableSelect: FC<EditableSelectProps> = ({
  value,
  categories,
  onChange,
}) => {
  const [internalValue, setInternalValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);

  const selectedCategory = categories.find((cat) => cat.id === value);
  const displayText = selectedCategory?.name || "-";

  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  return (
    <div
      className="cursor-pointer hover:underline"
      onClick={() => setIsOpen(true)}
    >
      {isOpen ? (
        <Select
          open={isOpen}
          onOpenChange={setIsOpen}
          value={internalValue ? String(internalValue) : NONE_CATEGORY_ID}
          onValueChange={(newValue) => {
            const normalizedNewValue =
              newValue === NONE_CATEGORY_ID ? null : Number(newValue);

            setInternalValue(normalizedNewValue);

            onChange(normalizedNewValue).catch(() => {
              toast({ title: "Something went wrong", variant: "destructive" });
              setInternalValue(value);
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
      ) : (
        <span className="">{displayText}</span>
      )}
    </div>
  );
};
