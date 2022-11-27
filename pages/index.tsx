import AddIcon from "@mui/icons-material/Add";
import {
  Box,
  Fab,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Typography,
} from "@mui/material";
import { format } from "date-fns";
import dayjs from "dayjs";
import type { NextPage } from "next";
import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { EntriesTable } from "../components/EntriesTable";
import { NewEntryDrawer } from "../components/NewEntryDrawer";
import { useEntries } from "../context/entriesContext";
import { useDb } from "../hooks/useDb";
import { TEntry } from "../types/Entry";

export type TColumn = {
  title: string;
  field: string;
  justify?: "start" | "center" | "end";
  formatter?: (raw: string | number | Date) => ReactNode;
};

const formater = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

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
    formatter: (value: any) => {
      if (!Number(value)) return "R$ 0,00";
      formater.format(value);
    },
    justify: "end",
  },
];

const months = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

const currentDate = dayjs();
const Home: NextPage = () => {
  const [isNewEntryModalVisible, setIsNewEntryModalVisible] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const descriptionField = useRef(null); // 1. create

  const { query } = useDb();
  const { entries, entriesDispatch } = useEntries();

  useHotkeys("n", () => setIsNewEntryModalVisible(true));

  useEffect(() => {
    if (isNewEntryModalVisible && descriptionField?.current) {
      (descriptionField.current as any).focus();
    }
  }, [isNewEntryModalVisible]);

  useLayoutEffect(() => {
    setSelectedMonth(currentDate.get("month"));
  }, []);

  useEffect(() => {
    let isCancelled = false;

    setIsLoading(true);
    query({ month: selectedMonth }).then((res: TEntry[]) => {
      if (!isCancelled) {
        setIsLoading(false);
        entriesDispatch({ type: "fetch", payload: { data: res } });
      }
    });

    return () => {
      isCancelled = true;
      setIsLoading(false);
    };
  }, [selectedMonth]);

  const onClose = () => {
    setIsNewEntryModalVisible(false);
  };

  return (
    <div style={{ padding: "16px" }}>
      <h1>Fina</h1>
      <Box sx={{ height: "100px", width: "100%", padding: "4px" }}>
        <h2 style={{ margin: 0 }}>Somatório</h2>
        <Box style={{ fontSize: "22px", padding: "8px 0px" }}>
          {formater.format(
            entries.reduce((acc, current) => acc + current.value, 0)
          )}
        </Box>
      </Box>
      <Box
        sx={{
          display: "flex",
          position: "fixed",
          justifyContent: "end",
          padding: "32px",
          right: "0",
          bottom: "0",
        }}
      >
        <Box display="flex" flexDirection="column" alignItems={"center"}>
          <Fab
            sx={{ position: "relative" }}
            color="secondary"
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
      </Box>

      <FormControl sx={{ minWidth: "300px" }}>
        <FormLabel id="demo-row-radio-buttons-group-label">Gender</FormLabel>
        <RadioGroup
          row
          aria-labelledby="demo-row-radio-buttons-group-label"
          name="row-radio-buttons-group"
          value={selectedMonth}
          onChange={(e) => {
            setSelectedMonth(Number(e.target.value));
          }}
        >
          {months.map((month, index) => (
            <FormControlLabel
              key={`month-radiobutton-${month}`}
              value={index}
              control={<Radio />}
              label={month.toUpperCase()}
            />
          ))}
        </RadioGroup>
      </FormControl>

      <EntriesTable
        rows={entries}
        columns={columns}
        style={{ flexGrow: 1 }}
        isLoading={isLoading}
      />

      <NewEntryDrawer open={isNewEntryModalVisible} onClose={onClose} />
    </div>
  );
};

export default Home;
