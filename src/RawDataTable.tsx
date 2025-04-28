/* eslint-disable @typescript-eslint/no-explicit-any */
import type { FC } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './components/ui/table';
import type { ParseResult } from 'papaparse';

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
          {data?.slice(0, 5).map((row: unknown, rowIndex: number) => {
            return (
              // biome-ignore lint/suspicious/noArrayIndexKey: Using index as key is acceptable for static data
              <TableRow key={rowIndex}>
                {Object.values(row as Record<string, unknown>).map((value, index) => {
                  // biome-ignore lint/suspicious/noArrayIndexKey: Using index as key is acceptable for static data
                  return <TableCell key={`${index}-${rowIndex}`}>{value as string}</TableCell>;
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
