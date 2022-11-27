import { TRow } from "../pages";

export interface EntriesFetchAction {
  type: "fetch";
  payload: {
    data: TRow[];
  };
}

export interface EntriesAddAction {
  type: "add";
  payload: {
    // data: Omit<TRow, "id" | "ratings">;
    entry: TRow;
  };
}

export interface EntriesDeleteAction {
  type: "delete";
  payload: {
    // entryId: TRow["id"];
  };
}

export type EntriesAction =
  | EntriesFetchAction
  | EntriesAddAction
  | EntriesDeleteAction;
