export type TEntry = {
  id: string;
  date: Date;
  description: string;
  category: string;
  value: number;
};

export type TCreateEntryDTO = Omit<TEntry, "id">;
