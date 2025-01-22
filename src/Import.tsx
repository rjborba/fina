import dayjs from "dayjs";
import { useAtom } from "jotai";
import Papa, { ParseResult } from "papaparse";
import { useState } from "react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";
import { useAccounts } from "./data/accounts/useAccounts";
import { useImportsMutation } from "./data/imports/useImportsMutation";
import { useTransactionMutation } from "./data/transactions/useTransactionsMutation";
import { ImportAtom } from "./preview/FieldMapAtom";
import { FieldMapTable } from "./preview/FIeldMapTable";
import { rawEntriesToTransactions } from "./preview/rawEntriesToTransactions";
import { RawDataTable } from "./RawDataTable";
import { Checkbox } from "./components/ui/checkbox";

const currentDate = dayjs();
const year = currentDate.year();
const month = currentDate.month();

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

export const Import = () => {
  const [importedEntries, setImportedEntries] = useState<ParseResult<object>>();
  const [importAtom, setImportAtom] = useAtom(ImportAtom);

  const { data: accountsData } = useAccounts();
  const { addImport } = useImportsMutation();
  const { addTransactions } = useTransactionMutation();

  const selectedAccount = accountsData?.data?.find(
    (currentAccount) => String(currentAccount.id) === importAtom.accountId
  );

  // TODO: Do it outside render
  const [selectedYear, setSelectedYear] = useState<string>(year.toString());
  const [selectedMonth, setSelectedMonth] = useState<string>(month.toString());
  const isAccountCredit = selectedAccount?.type === "credit";

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

  console.log(importedEntries);

  return (
    <div className="mt-4">
      <h2 className="text-2xl">Import</h2>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const formData = new FormData(e.target as HTMLFormElement);
          const csvFile = formData.get("csvFile") as File;

          const content = await csvFile.text();

          const parsed = Papa.parse<object>(content, {
            header: true, // Parse with headers
            skipEmptyLines: true, // Skip empty rows
          });

          if (!parsed.data?.length) {
            throw new Error("No data found in the CSV file");
          }

          setImportedEntries(parsed);
        }}
      >
        <Input name="csvFile" type="file" accept=".csv" />
        <Button type="submit">Load</Button>
      </form>

      <RawDataTable rawImportedData={importedEntries} />

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
          {accountsData?.data?.map((account) => {
            return (
              <SelectItem key={account.id} value={String(account.id)}>
                {account.name}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

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

      {isAccountCredit ? (
        <>
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
        </>
      ) : null}

      <FieldMapTable
        rawData={importedEntries?.data}
        rawFields={importedEntries?.meta.fields}
      />

      <Button
        className="mt-4"
        onClick={async () => {
          // TODO: Use Edge Supabase Edge function to make it in a single transaction
          const res = await addImport({ fileName: String(Date.now()) });
          const importId = res?.data![0]?.id;

          const data = rawEntriesToTransactions({
            rawData: importedEntries?.data,
            importFieldMap: importAtom.fieldMap,
            accountId: importAtom.accountId,
            invertValue: importAtom.parserConfig.invertValueField,
            creditDueDate: isAccountCredit
              ? getCreditDueDate().toISOString()
              : undefined,
            importId,
          });

          console.log(data);

          if (!data) {
            return;
          }

          await addTransactions(data);
        }}
      >
        Import
      </Button>
    </div>
  );
};
