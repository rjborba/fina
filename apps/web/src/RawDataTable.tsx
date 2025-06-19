/* eslint-disable @typescript-eslint/no-explicit-any */
import { FC } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./components/ui/table";
import { ParseResult } from "papaparse";

export const RawDataTable: FC<{
  rawImportedData?: ParseResult<unknown>;
}> = ({ rawImportedData }) => {
  const data = rawImportedData?.data;
  const fields = rawImportedData?.meta.fields;

  if (!data || !fields) {
    return null;
  }

  return (
    <div className="py-2">
      <h2 className="text-xl">Raw Data</h2>
      <Table>
        <TableHeader>
          <TableRow>
            {fields?.map((field) => (
              <TableHead key={field}>{field}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.slice(0, 5).map((row: any, rowIndex) => {
            return (
              <TableRow key={rowIndex}>
                {Object.values(row).map((value, index) => {
                  return (
                    <TableCell key={`${index}-${rowIndex}`}>
                      {value as string}
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
