import { dayjs } from "@/dayjs";
import { ImportFieldMap } from "./FieldMapAtom";
import { CreateImportInputDto } from "@fina/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const extractText = (row: any, keysOrKey: string | string[]) => {
  if (Array.isArray(keysOrKey)) {
    return keysOrKey.reduce((acc, current) => {
      const text = acc.length ? acc + " - " + row[current] : acc + row[current];
      return text;
    }, "");
  } else {
    return row[keysOrKey];
  }
};

export type rawsEntriesToTransactionsProps = {
  rawData: unknown[] | undefined;
  importFieldMap: ImportFieldMap;
  accountId?: string;
  invertValue?: boolean;
  creditDueDate?: string;
  groupId: number;
  toBeConsideredAt?: string;
};

export const rawEntriesToTransactions = ({
  rawData,
  importFieldMap,
  accountId,
  invertValue,
  creditDueDate,
  groupId,
  toBeConsideredAt,
}: rawsEntriesToTransactionsProps) => {
  if (!rawData) {
    return [];
  }

  const digitRegex = /^\d+\/\d+$/;

  return rawData.map(
    (row: unknown): CreateImportInputDto["transactions"][number] => {
      if (!accountId) {
        throw new Error("Account ID is required");
      }

      const parsedRow: CreateImportInputDto["transactions"][number] = {
        bankaccountId: accountId,
        groupId: groupId.toString(),
        toBeConsideredAt: toBeConsideredAt,
        date: null,
        calculatedDate: null,
        description: null,
        installmentCurrent: null,
        installmentTotal: null,
        value: null,
        creditDueDate: null,
      };

      if (typeof row !== "object" || row === null) {
        throw new Error("Invalid datas");
      }

      if (importFieldMap.date) {
        const text = extractText(row, importFieldMap.date);
        const formatedDate = dayjs(text, "DD/MM/YYYY");

        if (formatedDate.isValid()) {
          parsedRow.date = formatedDate.toDate();
          parsedRow.calculatedDate = formatedDate.toDate();
        } else {
          throw new Error("Invalid Date");
        }
      }

      if (importFieldMap.description) {
        parsedRow.description = extractText(row, importFieldMap.description);
      }

      if (importFieldMap.installment) {
        const installmentString = String(
          extractText(row, importFieldMap.installment)
        );

        if (digitRegex.test(installmentString)) {
          const slashIndex = installmentString.indexOf("/");

          const installmentCurrentString = installmentString.slice(
            0,
            slashIndex
          );
          const installmentTotalString = installmentString.slice(
            slashIndex + 1
          );

          if (
            !Number.isNaN(installmentCurrentString) ||
            !Number.isNaN(installmentTotalString)
          ) {
            const installmentCurrent = Number(installmentCurrentString);
            const installmentTotal = Number(installmentTotalString);

            if (
              installmentCurrent > 0 &&
              installmentTotal > 0 &&
              installmentTotal >= installmentCurrent
            ) {
              parsedRow.installmentCurrent = installmentCurrent.toString();
              parsedRow.installmentTotal = installmentTotal;
            }
          } else {
            parsedRow.installmentCurrent = "-1";
            parsedRow.installmentTotal = -1;
          }
        }
      }

      // Calculated data
      if (
        parsedRow.installmentCurrent &&
        Number(parsedRow.installmentCurrent) > 0 &&
        parsedRow.date
      ) {
        const dateWithInstallment = dayjs(parsedRow.date).add(
          Number(parsedRow.installmentCurrent) - 1,
          "month"
        );

        parsedRow.calculatedDate = dateWithInstallment.toDate();
      }

      if (importFieldMap.value) {
        const valueString = extractText(row, importFieldMap.value);

        if (!Number.isNaN(valueString)) {
          const value = Number(valueString);
          parsedRow.value = invertValue ? value * -1 : value;
        }
      }

      if (creditDueDate) {
        parsedRow.creditDueDate = dayjs(creditDueDate).toDate();
      }

      return parsedRow;
    }
  );
};
