import { Checkbox } from "@mui/material";
import { FC, useState } from "react";
import { useEntries } from "../../context/entriesContext";
import { useDb } from "../../hooks/useDb";
import { TEntry } from "../../types/Entry";

export const ValeCheckboxCellRenderer: FC<{ entry: TEntry }> = ({ entry }) => {
  const [isValeCheckboxLoading, setIsValeCheckboxLoading] = useState(false);
  const { update } = useDb();
  const { entriesDispatch } = useEntries();

  return (
    <Checkbox
      checked={entry.vale}
      disabled={isValeCheckboxLoading}
      onChange={async (event) => {
        setIsValeCheckboxLoading(true);
        update(entry.id, {
          vale: !entry.vale,
        })
          .then((updatedEntry: TEntry) => {
            entriesDispatch({
              type: "update",
              payload: { entry: updatedEntry },
            });
          })
          .finally(() => {
            setIsValeCheckboxLoading(false);
          });
      }}
    />
  );
};
