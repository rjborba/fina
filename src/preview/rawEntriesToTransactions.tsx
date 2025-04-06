import { Transaction } from "@/data/transactions/Transaction";
import { dayjs } from "@/dayjs";
import { ImportFieldMap } from "./FieldMapAtom";

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
  importId?: number;
};

export const rawEntriesToTransactions = ({
  rawData,
  importFieldMap,
  accountId,
  invertValue,
  creditDueDate,
  importId,
}: rawsEntriesToTransactionsProps) => {
  if (!rawData) {
    return [];
  }

  const digitRegex = /^\d+\/\d+$/;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return rawData.map((row: any): Transaction["Insert"] => {
    const parsedRow: Partial<Transaction["Row"]> = {
      account_id: Number(accountId),
      date: null,
      description: null,
      installment_current: null,
      installment_total: null,
      value: null,
      credit_due_date: null,
      import_id: null,
    };

    if (typeof row !== "object" || row === null) {
      return parsedRow;
    }

    if (importFieldMap.date) {
      const text = extractText(row, importFieldMap.date);
      const formatedDate = dayjs(text, "DD/MM/YYYY");

      if (formatedDate.isValid()) {
        parsedRow.date = formatedDate.toISOString();
      } else {
        parsedRow.date = "Invalid Date";
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

        const installmentCurrentString = installmentString.slice(0, slashIndex);
        const installmentTotalString = installmentString.slice(slashIndex + 1);

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
            parsedRow.installment_current = installmentCurrent;
            parsedRow.installment_total = installmentTotal;
          }
        } else {
          parsedRow.installment_current = -1;
          parsedRow.installment_total = -1;
        }
      }
    }

    if (importFieldMap.value) {
      const valueString = extractText(row, importFieldMap.value);

      if (!Number.isNaN(valueString)) {
        const value = Number(valueString);
        parsedRow.value = invertValue ? value * -1 : value;
      }
    }

    if (creditDueDate) {
      parsedRow.credit_due_date = creditDueDate;
    }

    if (importId) {
      parsedRow.import_id = importId;
    }

    return parsedRow;
  });
};
