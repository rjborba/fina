import { Box, Button, Fab, Typography } from "@mui/material";
import { format } from "date-fns";
import type { NextPage } from "next";
import { ReactElement, ReactNode, useEffect, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { EntriesTable } from "../components/EntriesTable";
import { NewEntryDrawer } from "../components/NewEntryDrawer";
import { useEntries } from "../context/entriesContext";
import AddIcon from "@mui/icons-material/Add";

export type TRow = {
  date: Date;
  description: string;
  category: string;
  value: number;
};
export type TColumn = {
  title: string;
  field: string;
  justify?: "start" | "center" | "end";
  formatter?: (raw: string | number | Date) => ReactNode;
};

const columns: TColumn[] = [
  {
    title: "Data",
    field: "date",
    formatter: (date: any) => format(date as Date, "dd/MM/yyyy"),
  },
  { title: "Descrição", field: "description" },
  { title: "Categoria", field: "category" },
  {
    title: "Valor",
    field: "value",
    formatter: (value: any) => "R$ " + value.toFixed(2),
  },
];

const Home: NextPage = () => {
  const [isNewEntryModalVisible, setIsNewEntryModalVisible] = useState(false);

  const descriptionField = useRef(null); // 1. create

  useHotkeys("n", () => setIsNewEntryModalVisible(true));

  useEffect(() => {
    if (isNewEntryModalVisible && descriptionField?.current) {
      (descriptionField.current as any).focus();
    }
  }, [isNewEntryModalVisible]);

  const onClose = () => {
    setIsNewEntryModalVisible(false);
  };

  const { entries } = useEntries();
  return (
    <div style={{ padding: "16px" }}>
      <h1>Fina</h1>
      <Box sx={{ height: "100px", width: "100%", padding: "4px" }}>
        <h2 style={{ margin: 0 }}>Somatório</h2>
        <Box style={{ fontSize: "22px", padding: "8px 0px" }}>
          {entries.reduce((acc, current) => acc + current.value, 0).toFixed(2)}
        </Box>
      </Box>
      <Box
        sx={{ display: "flex", justifyContent: "end", padding: "16px 64px" }}
      >
        <Box display="flex" flexDirection="column" alignItems={"center"}>
          <Fab
            sx={{ position: "relative" }}
            color="primary"
            aria-label="add"
            onClick={() => setIsNewEntryModalVisible(true)}
          >
            <AddIcon />
            <Typography
              bgcolor="white"
              color="black"
              fontSize={10}
              padding="0 8px"
              position="absolute"
              sx={{ right: "-7px", bottom: "36px" }}
            >
              N
            </Typography>
          </Fab>
        </Box>
        {/* <Button size="large" onClick={() => setIsNewEntryModalVisible(true)}>
          Nova entrada
          
        </Button> */}
      </Box>
      <EntriesTable rows={entries} columns={columns} />

      <NewEntryDrawer open={isNewEntryModalVisible} onClose={onClose} />
    </div>
  );
};

export default Home;
