import dayjs from "dayjs";
import { useAtom } from "jotai";
import Papa, { ParseResult } from "papaparse";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBankAccounts } from "@/data/bankAccounts/useBankAccounts";
import { useImportsMutation } from "@/data/imports/useImportsMutation";
import { useTransactionMutation } from "@/data/transactions/useTransactionsMutation";
import { ImportAtom } from "@/preview/FieldMapAtom";
import { FieldMapTable } from "@/preview/FIeldMapTable";
import { rawEntriesToTransactions } from "@/preview/rawEntriesToTransactions";
import { RawDataTable } from "@/RawDataTable";
import { Checkbox } from "@/components/ui/checkbox";
import { ImportList } from "./ImportList";
import { useActiveGroup } from "@/contexts/ActiveGroupContext";
import { EXPECTED_HEADERS_CHECKOUT } from "@/preview/constant";
import { EXPECTED_HEADERS_CREDIT } from "@/preview/constant";

const currentDate = dayjs();
const year = currentDate.year();
const month = currentDate.month();
const oneMonthAgo = currentDate.subtract(1, "month").month();

//  TODO improve
const yearOptions = [
  year - 3,
  year - 2,
  year - 1,
  year,
  year + 1,
  year + 2,
  year + 3,
];

// TODO: This needs to be refactored
export const Import = () => {
  const [rawEntries, setRawEntries] = useState<ParseResult<object>>();
  const [importAtom, setImportAtom] = useAtom(ImportAtom);
  const { selectedGroup } = useActiveGroup();
  const { data: bankAccountsData } = useBankAccounts({
    groupId: selectedGroup?.id?.toString(),
  });
  const { addImport } = useImportsMutation();
  const { addMutation: addTransaction } = useTransactionMutation();

  const selectedAccount = bankAccountsData?.find(
    (currentAccount) => String(currentAccount.id) === importAtom.accountId
  );

  const [file, setFile] = useState<File>();

  useEffect(() => {
    if (bankAccountsData && !importAtom.accountId) {
      setImportAtom((oldImportAtom) => {
        return { ...oldImportAtom, accountId: String(bankAccountsData[0].id) };
      });
    }
  }, [bankAccountsData, importAtom.accountId, setImportAtom]);

  // TODO: Do it outside render
  const [selectedYear, setSelectedYear] = useState<string>(year.toString());
  const [selectedMonth, setSelectedMonth] = useState<string>(month.toString());

  const [selectedToBeConsideredYear, setToBeConsideredYear] = useState<string>(
    year.toString()
  );
  const [selectedToBeConsideredMonth, setToBeConsideredMonth] =
    useState<string>(oneMonthAgo.toString());

  const isAccountCredit = selectedAccount?.type === "credit";

  useEffect(() => {
    const oneMonthBeforeSelectedMonth = Number(selectedMonth) - 1;
    setToBeConsideredMonth(String(oneMonthBeforeSelectedMonth));
  }, [selectedMonth]);

  const getCreditDueDate = () => {
    let d = dayjs();
    d = d = d.month(Number(selectedMonth));
    d = d.year(Number(selectedYear));
    d = d.hour(0);
    d = d.minute(0);
    d = d.second(0);
    d = d.millisecond(0);

    return d.toDate();
  };

  const getToBeConsideredAtDate = () => {
    let d = dayjs();
    d = d = d.month(Number(selectedToBeConsideredMonth));
    d = d.year(Number(selectedToBeConsideredYear));
    d = d.date(1);
    d = d.hour(0);
    d = d.minute(0);
    d = d.second(0);
    d = d.millisecond(0);

    return d.toDate();
  };

  return (
    <div className="p-5 w-full">
      <div className="mt-4">
        <h2 className="text-2xl">Import</h2>

        <Select
          value={importAtom.accountId}
          onValueChange={(newValue) => {
            setImportAtom((oldImportAtomData) => {
              return { ...oldImportAtomData, accountId: newValue };
            });
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Account" />
          </SelectTrigger>
          <SelectContent>
            {bankAccountsData?.map((account) => {
              return (
                <SelectItem key={account.id} value={String(account.id)}>
                  {account.name}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        {isAccountCredit ? (
          <div className="py-4 flex flex-col gap-2">
            <div>
              <p>Credit Due Date</p>
              <div className="flex items-center space-x-2">
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((year) => {
                      return (
                        <SelectItem key={year} value={String(year)}>
                          {String(year)}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {dayjs.months().map((month, index) => {
                      return (
                        <SelectItem key={month} value={String(index)}>
                          {month}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <p>To be considered as part of</p>
              <div className="flex items-center space-x-2">
                <Select
                  value={selectedToBeConsideredYear}
                  onValueChange={setToBeConsideredYear}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((year) => {
                      return (
                        <SelectItem key={year} value={String(year)}>
                          {String(year)}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                <Select
                  value={selectedToBeConsideredMonth}
                  onValueChange={setToBeConsideredMonth}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {dayjs
                      .months()
                      .filter(
                        (_, filterMonthIndex) =>
                          filterMonthIndex <=
                          Number(selectedToBeConsideredMonth) + 1
                      )
                      .map((month, index) => {
                        return (
                          <SelectItem key={month} value={String(index)}>
                            {month}
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        ) : null}

        <Input
          name="csvFile"
          type="file"
          accept=".csv"
          onChange={async (e) => {
            const input = e.target as HTMLInputElement;
            const csvFile = input.files?.[0];
            if (!csvFile) {
              return;
            }

            const content = await csvFile.text();

            const parsed = Papa.parse<object>(content, {
              header: true, // Parse with headers
              skipEmptyLines: true, // Skip empty rows
            });

            if (!parsed.data?.length) {
              throw new Error("No data found in the CSV file");
            }

            setFile(csvFile);
            setRawEntries(parsed);
          }}
        />
        <RawDataTable rawImportedData={rawEntries} />
        <div className="flex items-center space-x-2">
          <Checkbox
            id="terms"
            checked={importAtom.parserConfig.invertValueField}
            onCheckedChange={(newValue) => {
              setImportAtom((oldAtomValue) => {
                oldAtomValue.parserConfig.invertValueField = Boolean(newValue);
                return { ...oldAtomValue };
              });
            }}
          />
          <label
            htmlFor="terms"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Invert value field
          </label>
        </div>

        {selectedGroup?.id && (
          <FieldMapTable
            rawData={rawEntries?.data}
            rawFields={rawEntries?.meta.fields}
            groupId={selectedGroup.id}
            expectedHeaders={
              isAccountCredit
                ? EXPECTED_HEADERS_CREDIT
                : EXPECTED_HEADERS_CHECKOUT
            }
          />
        )}

        <Button
          className="mt-4"
          onClick={async () => {
            if (!file) {
              throw new Error("No file selected");
            }

            if (!selectedGroup?.id) {
              throw new Error("No group selected");
            }

            // TODO: Use Edge Supabase Edge function to make it in a single transaction
            const res = await addImport({
              fileName: file.name,
              group_id: selectedGroup.id,
            });
            const importId = res?.data![0]?.id;

            const data = rawEntriesToTransactions({
              groupId: selectedGroup.id,
              rawData: rawEntries?.data,
              importFieldMap: importAtom.fieldMap,
              accountId: importAtom.accountId,
              invertValue: importAtom.parserConfig.invertValueField,
              creditDueDate: isAccountCredit
                ? getCreditDueDate().toISOString()
                : undefined,
              importId,
              toBeConsideredAt: isAccountCredit
                ? getToBeConsideredAtDate().toISOString()
                : undefined,
            });

            if (!data) {
              return;
            }

            await addTransaction.mutateAsync(data);
          }}
        >
          Import
        </Button>
      </div>
      <ImportList />
    </div>
  );
};
