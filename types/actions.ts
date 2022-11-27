import { TEntry } from "./Entry";

export interface EntriesFetchAction {
  type: "fetch";
  payload: {
    data: TEntry[];
  };
}

export interface EntriesAddAction {
  type: "add";
  payload: {
    // data: Omit<TRow, "id" | "ratings">;
    entry: TEntry;
  };
}

export interface EntriesDeleteAction {
  type: "delete";
  payload: {
    entryId: TEntry["id"];
  };
}

export type EntriesAction =
  | EntriesFetchAction
  | EntriesAddAction
  | EntriesDeleteAction;
