import { Box } from "@mui/material";
import { format } from "date-fns";
import { FC } from "react";
import { TColumn, TRow } from "../pages";

export const EntriesTable: FC<{ columns: TColumn[]; rows: TRow[] }> = ({
  columns,
  rows,
}) => {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns.length + 1}, 1fr)`,
        gap: "12px",
      }}
    >
      {columns.map((column) => (
        <Box
          key={`column-${column.title}`}
          style={{
            justifySelf: column.justify ?? "start",
            fontWeight: "700",
            fontSize: "22px",
          }}
        >
          {column.title}
        </Box>
      ))}
      <Box sx={{ fontWeight: "700", fontSize: "22px" }}>Actions</Box>
      {rows.map((row, index) => {
        const reactNodeRows = columns.map((column) => {
          let rowData = row[column.field as keyof typeof row];
          let rowDataFormatted;

          if (!rowData) {
            rowDataFormatted = "FIELD NOT FOUND";
          } else if (column.formatter) {
            rowDataFormatted = column.formatter(rowData);
          } else {
            rowDataFormatted = rowData;
          }

          return (
            <Box key={`row-index-${index}/${column.field}}`}>
              {rowDataFormatted as any}
            </Box>
          );
        });

        reactNodeRows.push(<Box key={`row-${index}/actions`}>Actions</Box>);

        return reactNodeRows;
      })}
    </Box>
  );
};
