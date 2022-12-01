import dayjs from "dayjs";
import React, { ReactNode, useContext, useEffect, useReducer } from "react";
import { useDb } from "../hooks/useDb";
import { EntriesAction } from "../types/actions";
import { TEntry } from "../types/Entry";

type EntriesContextType = {
  entries: TEntry[];
  entriesDispatch: React.Dispatch<EntriesAction>;
};

interface EntriesState {
  entries: TEntry[];
  initialized: boolean;
}

const useEntryCollection = (): [
  EntriesState,
  React.Dispatch<EntriesAction>
] => {
  const { query } = useDb();

  const entriesReducer = (state: EntriesState, action: EntriesAction) => {
    switch (action.type) {
      case "add":
        return { ...state, entries: [...state.entries, action.payload.entry] };
      case "delete":
        const removedIndex = state.entries.findIndex(
          (entry) => entry.id === action.payload.entryId
        );

        const oldEntries = [...state.entries];

        oldEntries.splice(removedIndex, 1);

        return {
          ...state,
          entries: oldEntries,
        };
      case "fetch":
        return { ...state, initialized: true, entries: action.payload.data };
      case "update":
        const entriesBeforeUpdate = [...state.entries];
        const index = entriesBeforeUpdate.findIndex(
          (currEntry) => currEntry.id === action.payload.entry.id
        );

        entriesBeforeUpdate[index] = action.payload.entry;

        return { ...state, entries: entriesBeforeUpdate };
      default:
        return { ...state };
    }
  };

  const [state, dispatch] = useReducer(entriesReducer, {
    entries: [],
    initialized: false,
  });

  useEffect(() => {
    let isCancelled = false;
    const currentDate = dayjs();

    query({ month: currentDate.get("month") }).then((res: TEntry[]) => {
      if (!isCancelled) {
        dispatch({ type: "fetch", payload: { data: res } });
      }
    });

    return () => {
      isCancelled = true;
    };
  }, []);

  return [state, dispatch];
};

export const EntriesContext = React.createContext<
  EntriesContextType | undefined
>(undefined);

export const EntriesProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [{ initialized, entries }, entriesDispatch] = useEntryCollection();

  return (
    <EntriesContext.Provider value={{ entries, entriesDispatch }}>
      {initialized ? children : <div>loading...</div>}
    </EntriesContext.Provider>
  );
};

export const useEntries = () => {
  const entriesCtx = useContext(EntriesContext);
  if (!entriesCtx) {
    throw new Error("Component beyond EntriesContext!");
  }

  return entriesCtx;
};
