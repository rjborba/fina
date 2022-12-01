export type TEntry = {
  id: string;
  date: Date;
  description: string;
  category: string;
  vale: boolean;
  value: number;
};

export type TCreateEntryDTO = Omit<TEntry, "id">;

export type TUpdateEntryDTO = Partial<TEntry>;
