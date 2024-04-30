import { cn } from "@/lib/utils";
import React, {
  FC,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Input } from "./ui/input";

import { Pencil } from "lucide-react";
import { Controller, useFormContext } from "react-hook-form";

export interface EditableFieldProps {
  name: string;
  initAsEditMode?: boolean;
  disabled?: boolean;
}

export const EditableField: FC<EditableFieldProps> = ({ name, disabled }) => {
  const [isEditMode, setEditMode] = useState(false);

  const useFormMethods = useFormContext();
  const { ref, ...formRegMethods } = useFormMethods.register(name);

  const [currentValue, setCurrentValue] = useState("");

  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const submissionHappenedRef = useRef(false);

  useEffect(() => {
    setCurrentValue(useFormMethods.getValues()[name]);
  }, [name, useFormMethods]);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const currentValueRef = useRef<string | null>(null);

  const handleCellClick = () => {
    setEditMode(true);
  };

  const persistChanges = () => {
    setEditMode(false);
  };

  // Delays the timeout
  useEffect(() => {
    if (!inputRef?.current?.value) {
      return;
    }

    if (isEditMode) {
      setTimeout(() => {
        inputRef!.current!.focus();
      });
    }
  }, [inputRef?.current?.value, isEditMode]);

  return (
    <div className="relative flex h-full flex-grow items-center overflow-hidden">
      <div className="group/cell max-w-ful flex h-full w-full flex-grow overflow-hidden text-ellipsis whitespace-nowrap">
        <Input
          {...formRegMethods}
          className={cn(
            { "hidden border-transparent": !isEditMode },
            "h-full overflow-ellipsis rounded-none border-none",
          )}
          ref={(e) => {
            ref(e);
            inputRef.current = e;
          }}
          readOnly={!isEditMode}
          onClick={() => !isEditMode && handleCellClick()}
          autoComplete="off"
          onChange={(e) => {
            currentValueRef.current = e.target.value;
            formRegMethods.onChange(e);
          }}
          onBlur={() => {
            persistChanges();

            if (submissionHappenedRef.current) {
              submissionHappenedRef.current = false;
            } else {
              useFormMethods.reset();
            }
          }}
          onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
            if (!event.shiftKey && event.key === "Enter") {
              persistChanges();

              submissionHappenedRef.current = true;
            } else if (!event.shiftKey && event.key === "Escape") {
              event.currentTarget.blur();
            }
          }}
        />

        <button className="hidden" type="submit" ref={submitButtonRef} />

        <div
          className={cn(
            "flex-shrink-1 flex flex-grow items-center overflow-hidden text-ellipsis whitespace-nowrap",
            {
              hidden: isEditMode,
              "cursor-not-allowed": disabled,
            },
          )}
          onDoubleClick={handleCellClick}
        >
          <p className={`overflow-hidden text-ellipsis whitespace-nowrap`}>
            {currentValue}
          </p>
        </div>
      </div>
    </div>
  );
};
