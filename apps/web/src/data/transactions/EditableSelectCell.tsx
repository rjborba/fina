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
  value: string | null;
  options: { id: string; name: string | null }[];
  open: boolean;
  onOpenChange: (number: boolean) => void;
  onChange: (value: string | null) => Promise<unknown>;
}

export const EditableSelect: FC<EditableSelectProps> = ({
  value,
  options,
  onChange,
  open,
  onOpenChange,
}) => {
  const [internalValue, setInternalValue] = useState(value);

  const selectedOption = options.find(
    (option) => String(option.id) === String(internalValue)
  );

  const displayText = selectedOption?.name || "-";

  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  return (
    <div>
      {open ? (
        <Select
          open={open}
          onOpenChange={onOpenChange}
          value={internalValue ? String(internalValue) : NONE_CATEGORY_ID}
          onValueChange={(newValue) => {
            const normalizedNewValue =
              newValue === NONE_CATEGORY_ID ? null : newValue;

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
            {options?.map((option) => {
              return (
                <SelectItem key={option.id} value={String(option.id)}>
                  {option.name || "-"}
                </SelectItem>
              );
            })}
            <SelectItem value={NONE_CATEGORY_ID}>-</SelectItem>
          </SelectContent>
        </Select>
      ) : (
        <button
          className="flex w-full py-2 cursor-pointer hover:bg-accent/50 px-4 items-center"
          onClick={() => {
            onOpenChange(true);
          }}
        >
          <span>{displayText}</span>
        </button>
      )}
    </div>
  );
};
