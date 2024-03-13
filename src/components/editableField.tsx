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

export interface EditableFieldProps
  extends React.ButtonHTMLAttributes<HTMLInputElement> {}

export const EditableField: FC<EditableFieldProps> = React.forwardRef<
  HTMLInputElement,
  EditableFieldProps
>(({ className, type, ...props }, ref) => {
  const [isEditMode, setEditMode] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  // const inputRef = props.re;
  const tempSpanRef = useRef<HTMLSpanElement>(null);
  const inputWrapperRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

  const [currentValue, setCurrentValue] = useState(props.defaultValue);

  const handleCellClick = () => {
    setEditMode(true);
  };

  const persistChanges = () => {
    setEditMode(false);
  };

  // Sets Input initial value
  useEffect(() => {
    if (inputRef?.current) {
      setCurrentValue(inputRef.current.value);
    }
  }, [inputRef?.current?.value]);

  // Updates the input width based on invisible span that has the same content
  useEffect(() => {
    if (inputRef?.current && tempSpanRef.current && inputWrapperRef.current) {
      let inputWidth = Math.max(100, tempSpanRef.current.offsetWidth + 30);
      inputWidth = Math.min(inputWrapperRef.current.scrollWidth, inputWidth);

      inputRef.current.style.width = `${inputWidth}px`;
    }
  }, [currentValue]);

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
    <>
      <span
        ref={tempSpanRef}
        style={{
          visibility: "hidden",
          position: "absolute",
          pointerEvents: "none",
        }}
      >
        {currentValue}
      </span>
      <div className="max-w-full" ref={inputWrapperRef}>
        <Input
          ref={inputRef}
          {...props}
          readOnly={!isEditMode}
          onClick={() => !isEditMode && handleCellClick()}
          autoComplete="off"
          className={cn(
            { "hidden border-transparent": !isEditMode },
            "w-fit overflow-ellipsis",
          )}
          onChange={(e) => {
            if (!inputRef.current) {
              return;
            }

            setCurrentValue(inputRef.current.value);

            if (props.onChange) {
              props.onChange(e);
            }
          }}
          onBlur={persistChanges}
          onKeyDown={(event) => {
            if (props.onKeyDown) {
              props.onKeyDown(event);
            }
            if (!event.shiftKey && event.key === "Enter") {
              persistChanges();
            }

            return;
          }}
        />

        <div
          className={cn(
            {
              hidden: isEditMode,
            },
            "",
          )}
        >
          <p
            role="button"
            className={`group/cell relative inline-block border border-transparent px-3 py-2 `}
            onClick={handleCellClick}
          >
            {currentValue}
            <span
              className={` absolute ml-1 hidden  bg-gray-900 p-1 group-hover/cell:inline-block`}
            >
              <Pencil className="h-3 w-3" />
            </span>
          </p>
        </div>
      </div>
    </>
  );
});
