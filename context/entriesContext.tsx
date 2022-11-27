import React, { ReactNode, useContext, useEffect, useReducer } from "react";
import { useDb } from "../hooks/useDb";
import { TRow } from "../pages";
import { EntriesAction } from "../types/actions";

type EntriesContextType = {
  entries: TRow[];
  entriesDispatch: React.Dispatch<EntriesAction>;
};

interface EntriesState {
  entries: TRow[];
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
        console.log("called");
        return { ...state, entries: [...state.entries, action.payload.entry] };
      case "fetch":
        return { ...state, initialized: true, entries: action.payload.data };
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

    query().then((res: TRow[]) => {
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
