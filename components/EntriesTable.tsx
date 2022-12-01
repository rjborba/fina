import { Box, Button } from "@mui/material";
import { userAgent } from "next/server";
import { CSSProperties, FC } from "react";
import { useEntries } from "../context/entriesContext";
import { useDb } from "../hooks/useDb";
import { TColumn } from "../pages";
import { TEntry } from "../types/Entry";

const renderRows = (isLoading: boolean, rows: TEntry[], columns: TColumn[]) => {
  if (isLoading) {
    return <Box>Carregando...</Box>;
  }

  if (rows.length === 0) {
    return <Box>Sem entradas</Box>;
  }

  return rows.map((row, index) =>
    columns.map((column) => {
      let rowData = row[column.field as keyof typeof row];
      let rowDataFormatted;

      if (column.cellRenderer) {
        rowDataFormatted = column.cellRenderer(row);
      } else if (rowData === undefined) {
        rowDataFormatted = "N/A";
      } else {
        rowDataFormatted = rowData;
      }

      return (
        <Box
          key={`row-index-${index}/${column.field}}`}
          alignSelf="center"
          justifySelf={column.justify ?? "start"}
        >
          {rowDataFormatted as any}
        </Box>
      );
    })
  );
};

export const EntriesTable: FC<{
  columns: TColumn[];
  rows: TEntry[];
  isLoading?: boolean;
  style?: CSSProperties;
}> = ({ columns, rows, isLoading, style = {} }) => {
  return (
    <Box
      style={style}
      sx={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns.length}, 1fr)`,
        gap: "18px 42px",
      }}
    >
      {columns.map((column) => (
        <Box
          key={`column-${column.title}`}
          style={{
            justifySelf: column.justify ?? "start",
            fontWeight: "700",
            fontSize: "22px",
            alignSelf: "center",
          }}
        >
          {column.title}
        </Box>
      ))}
      {renderRows(!!isLoading, rows, columns)}
    </Box>
  );
};
