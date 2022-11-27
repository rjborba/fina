import { Box, Button } from "@mui/material";
import { userAgent } from "next/server";
import { CSSProperties, FC } from "react";
import { useEntries } from "../context/entriesContext";
import { useDb } from "../hooks/useDb";
import { TColumn } from "../pages";
import { TEntry } from "../types/Entry";

const renderRows = (
  isLoading: boolean,
  rows: TEntry[],
  columns: TColumn[],
  onRemoveClick: (id: string) => void
) => {
  if (isLoading) {
    return <Box>Carregando...</Box>;
  }

  if (rows.length === 0) {
    return <Box>Sem entradas</Box>;
  }

  return rows.map((row, index) => {
    const reactNodeRows = columns.map((column) => {
      let rowData = row[column.field as keyof typeof row];
      let rowDataFormatted;

      if (!rowData) {
        rowDataFormatted = "N/A";
      } else if (column.formatter) {
        rowDataFormatted = column.formatter(rowData);
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
    });

    reactNodeRows.push(
      <Box key={`row-${index}/actions`} sx={{ alignSelf: "center" }}>
        <Button onClick={() => onRemoveClick(row.id)}>Remover</Button>
      </Box>
    );

    return reactNodeRows;
  });
};

export const EntriesTable: FC<{
  columns: TColumn[];
  rows: TEntry[];
  isLoading?: boolean;
  style?: CSSProperties;
}> = ({ columns, rows, isLoading, style = {} }) => {
  const { remove } = useDb();
  const { entriesDispatch } = useEntries();

  const onRemoveClick = async (id: string) => {
    await remove(id)
      .then((res) => {
        entriesDispatch({ type: "delete", payload: { entryId: id } });
      })
      .catch((e) => {
        console.error("Error while removing");
        console.error(e);
      });
  };

  return (
    <Box
      style={style}
      sx={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns.length + 1}, 1fr)`,
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
      <Box></Box>
      {renderRows(!!isLoading, rows, columns, onRemoveClick)}
    </Box>
  );
};
