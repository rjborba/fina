import { atom } from "jotai";

export type ImportFieldMap = {
  date: string | string[] | null;
  description: string | string[] | null;
  installment: string | string[] | null;
  value: string | string[] | null;
};

const importFieldMapDefault: ImportFieldMap = {
  date: null,
  description: null,
  installment: null,
  value: null,
};

// export const FieldMapAtom = atom<ImportFieldMap>(importFieldMapDefault);

export const ImportAtom = atom({
  accountId: "",
  fieldMap: importFieldMapDefault,
  parserConfig: {
    separator: ";",
    decimalSeparator: ".",
    invertValueField: false,
  },
});
