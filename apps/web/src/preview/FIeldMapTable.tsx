import MultipleSelector from "@/components/ui/multipleselector";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FC, Fragment, useMemo } from "react";
import { EXPECTED_HEADERS_CREDIT } from "./constant";
import { useAtom } from "jotai";
import { ImportAtom, ImportFieldMap } from "./FieldMapAtom";
import { rawEntriesToTransactions } from "./rawEntriesToTransactions";
import { Transaction } from "@/data/transactions/Transaction";

export const FieldMapTable: FC<{
  rawData?: object[];
  rawFields?: string[];
  groupId: number;
  expectedHeaders: string[];
}> = ({ rawData = [], rawFields = [], groupId, expectedHeaders }) => {
  const [importAtom, setImportAtom] = useAtom(ImportAtom);

  const fieldMapOptions =
    rawFields.map((rawField) => ({ label: rawField, value: rawField })) || [];

  const previewData = useMemo(() => {
    return rawEntriesToTransactions({
      rawData,
      importFieldMap: importAtom.fieldMap,
      accountId: importAtom.accountId,
      invertValue: importAtom.parserConfig.invertValueField,
      groupId,
    });
  }, [importAtom, rawData, groupId]);

  return (
    <div className="min-h-[200px]">
      <Table>
        <TableHeader>
          <TableRow>
            {expectedHeaders.map((column: string) => (
              <TableHead key={column}>{column}</TableHead>
            ))}
          </TableRow>

          <TableRow>
            {expectedHeaders.map((column: string) => (
              <TableHead key={column}>
                <MultipleSelector
                  options={fieldMapOptions}
                  onChange={(selectedValues) => {
                    setImportAtom((oldImportData) => {
                      const oldFieldMap = oldImportData.fieldMap;
                      if (selectedValues.length) {
                        oldFieldMap[column as keyof ImportFieldMap] =
                          selectedValues.map(
                            (currentValue) => currentValue.value
                          );
                      } else {
                        oldFieldMap[column as keyof ImportFieldMap] = null;
                      }

                      return { ...oldImportData };
                    });
                  }}
                />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.values(importAtom.fieldMap).some(
            (value) => value !== null || importAtom.accountId
          )
            ? previewData?.map((row, rowIndex) => {
                return (
                  <TableRow key={rowIndex}>
                    {EXPECTED_HEADERS_CREDIT.map((column) => (
                      <Fragment key={column}>
                        <TableCell key={column}>
                          {(() => {
                            return column === "installment"
                              ? row["installment_current"]
                                ? row["installment_current"] +
                                  "/" +
                                  row["installment_total"]
                                : ""
                              : row[
                                  column as keyof Partial<Transaction["Row"]>
                                ];
                          })()}
                        </TableCell>
                      </Fragment>
                    ))}
                  </TableRow>
                );
              })
            : null}
        </TableBody>
      </Table>
    </div>
  );
};
