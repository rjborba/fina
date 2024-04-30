/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  useReducer,
  useRef,
  useState,
  FC,
  forwardRef,
  ChangeEvent,
  useEffect,
} from "react";
import CurrencyInput from "react-currency-input-field";

import { Input } from "./ui/input"; // Shandcn UI Input
import { UseFormReturn } from "react-hook-form";
import { cn } from "@/lib/utils";

type TextInputProps = {
  // name: string;
  // label: string;
  // placeholder: string;
};

// Brazilian currency config
const moneyFormatter = Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  currencyDisplay: "symbol",
  currencySign: "standard",
  style: "currency",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export interface MoneyInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

export const MoneyInput: FC<MoneyInputProps> = forwardRef(
  ({ className, onChange: originalOnChange, ...props }, inputRef) => {
    const localInputRef = useRef<HTMLInputElement | null>(null);

    const formatCurrency = (value: string) => {
      const digits = value.replace(/\D/g, "");
      return moneyFormatter.format(Number(digits) / 100);
    };

    const handleOnChange = (changeEvent: ChangeEvent<HTMLInputElement>) => {
      if (localInputRef.current) {
        const formattedDigits = formatCurrency(changeEvent.target.value);
        changeEvent.target.value = formattedDigits;

        if (localInputRef.current) {
          localInputRef.current.value = formattedDigits;
        }

        if (originalOnChange) {
          originalOnChange(changeEvent);
        }
      }
    };

    useEffect(() => {
      if (localInputRef.current && props.defaultValue) {
        localInputRef.current.value = formatCurrency(
          String(props.defaultValue),
        );
      }
    }, [props.defaultValue]);

    return (
      <Input
        className={cn("", className)}
        ref={(ref) => {
          // Assign the external ref
          if (inputRef) {
            (inputRef as any).current = ref;
          }
          // Assign the local ref
          localInputRef.current = ref;
        }}
        onChange={handleOnChange}
        {...props}
      />
    );
  },
);
