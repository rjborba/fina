import { Box, Button, Checkbox } from "@mui/material";
import { FC, useCallback, useState } from "react";
import { useEntries } from "../../context/entriesContext";
import { useDb } from "../../hooks/useDb";
import { TEntry } from "../../types/Entry";

export const ActionsCellRenderer: FC<{ entry: TEntry }> = ({ entry }) => {
  const [isRemoveButtonLoading, setIsRemoveButtonLoading] = useState(false);
  const { remove } = useDb();
  const { entriesDispatch } = useEntries();

  const onRemoveClick = useCallback(async (id: string) => {
    setIsRemoveButtonLoading(true);
    await remove(id)
      .then((res) => {
        entriesDispatch({ type: "delete", payload: { entryId: id } });
      })
      .catch((e) => {
        console.error("Error while removing");
        console.error(e);
      })
      .finally(() => {
        setIsRemoveButtonLoading(false);
      });
  }, []);

  return (
    <Box sx={{ alignSelf: "center" }}>
      <Button
        disabled={isRemoveButtonLoading}
        onClick={() => onRemoveClick(entry.id)}
      >
        Remover
      </Button>
    </Box>
  );
};
