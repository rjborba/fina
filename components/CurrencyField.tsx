import { TextField } from "@mui/material";
import React, { useState } from "react";
import NumberFormat, { NumberFormatProps } from "react-number-format";

/** https://github.com/s-yadav/react-number-format/issues/366#issuecomment-886242487 */
export const CurrencyField = ({
  onValueChange,
  onKeyDown = () => {},
  ...props
}: NumberFormatProps) => {
  const [value, setValue] = useState<string | number>("");

  const handleChange = (v: any) => {
    // Set the value to value * 100 because it was divided on the field value prop
    setValue(parseFloat(v.value) * 100);
    if (onValueChange) {
      onValueChange({ ...v, floatValue: v.floatValue / 100 });
    }
  };

  const currencyFormatter = (formatted_value: any) => {
    // Set to 0,00 when "" and divide by 100 to start by the cents when start typing
    if (!Number(formatted_value)) return "R$ 0,00";
    const br = { style: "currency", currency: "BRL" };
    return new Intl.NumberFormat("pt-BR", br).format(formatted_value / 100);
  };

  const keyDown = (e: any) => {
    //This if keep the cursor position on erase if the value is === 0
    if (e.code === "Backspace" && !value) {
      e.preventDefault();
    }
    // This if sets the value to 0 and prevent the default for the cursor to keep when there's only cents
    if (e.code === "Backspace" && value < 1000) {
      e.preventDefault();
      setValue(0);
    }

    onKeyDown(e);
  };

  return (
    <NumberFormat
      {...props}
      label="Valor"
      value={Number(value) / 100}
      format={currencyFormatter}
      onValueChange={handleChange}
      allowEmptyFormatting
      decimalSeparator=","
      thousandSeparator="."
      decimalScale={2}
      customInput={TextField}
      onKeyDown={keyDown}
      onFocus={(e) => {
        e.target.setSelectionRange(
          currencyFormatter(value).length,
          currencyFormatter(value).length
        );
      }}
    />
  );
};
