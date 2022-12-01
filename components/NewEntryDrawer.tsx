import {
  Box,
  Button,
  Drawer,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { FC, useEffect, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { CurrencyField } from "./CurrencyField";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs, { Dayjs } from "dayjs";
import { useDb } from "../hooks/useDb";
import { useEntries } from "../context/entriesContext";

const currentDate = dayjs();
export const NewEntryDrawer: FC<{
  open: boolean;
  onClose: () => void;
}> = ({ open, onClose }) => {
  const [description, setDescription] = useState("");
  const [value, setValue] = useState(0);
  const [date, setDate] = useState<Dayjs | null>(currentDate);
  const [category, setCategory] = useState("");

  useHotkeys("esc", () => internalOnClose());

  const submitRef = useRef(null);
  const descriptionInputRef = useRef(null);

  const { insert } = useDb();
  const { entriesDispatch } = useEntries();

  const clearForm = () => {
    setDescription("");
    setValue(0);
    setCategory("");
  };

  const internalOnClose = () => {
    clearForm();
    onClose();
  };

  const onSubmit = async (event: any) => {
    event.preventDefault();

    if (!date?.isValid()) {
      // TODO: notify user
      console.error("Invalid data");
      return;
    }

    console.log("sending to api...");
    console.log({
      description,
      value,
      vale: false,
      category,
      date: date!.toDate(),
    });

    await insert({
      description,
      value,
      vale: false,
      category,
      date: date!.toDate(),
    })
      .then((newEntry) => {
        entriesDispatch({
          type: "add",
          payload: {
            entry: newEntry,
          },
        });
      })
      .catch((e) => {
        console.error("err...");
        console.error(e);
      });

    onClose();
    clearForm();
  };

  useEffect(() => {
    if (open && descriptionInputRef.current) {
      // TODO: Fix me. Set htmlinputnode type to the correspondent useRef
      // Timeout is a Workaround to prevent shortcut be entered on field
      setTimeout(() => {
        (descriptionInputRef.current as any).focus();
      });
    }
  }, [open]);

  return (
    <Drawer
      anchor="bottom"
      variant="persistent"
      open={open}
      onClose={internalOnClose}
    >
      <Box bgcolor={"rgb(18, 18, 18)"} color="white" padding="22px 28px">
        <h2>Nova Entrada</h2>
        <form id="new-entry" onSubmit={onSubmit}>
          <Stack pt={2} gap={2}>
            <TextField
              inputRef={descriptionInputRef}
              id="desc-entry"
              label="Descrição"
              fullWidth
              required
              value={description}
              onKeyDown={(e) => e.key === "Escape" && internalOnClose()}
              onChange={(e) => {
                setDescription(e.target.value);
              }}
            />

            <Stack direction="row" gap={2}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="Data"
                  value={date}
                  inputFormat="DD/MM/YYYY"
                  onChange={(newValue) => {
                    setDate(newValue!);
                  }}
                  renderInput={(params) => <TextField {...params} />}
                />
              </LocalizationProvider>
              {/* Workaround to reset field */}
              {open && (
                <CurrencyField
                  value={value}
                  required
                  onKeyDown={(e) => e.key === "Escape" && internalOnClose()}
                  onValueChange={(e) => {
                    setValue(e.floatValue!);
                  }}
                />
              )}
              <TextField
                id="category-entry"
                label="Categoria"
                fullWidth
                value={category}
                onKeyDown={(e) => e.key === "Escape" && internalOnClose()}
                onChange={(e) => setCategory(e.target.value)}
              />
            </Stack>
          </Stack>
        </form>
      </Box>
      <Stack
        direction="row"
        gap={2}
        display="flex"
        marginLeft={"auto"}
        padding={4}
      >
        <Button
          ref={submitRef}
          // variant="outlined"
          color="secondary"
          onClick={internalOnClose}
        >
          Cancelar
          <Typography color="gray" fontSize={10} paddingLeft={1}>
            ESC
          </Typography>
        </Button>
        <Button
          variant="outlined"
          color="primary"
          type="submit"
          form="new-entry"
        >
          Criar
          <Typography color="gray" fontSize={10} paddingLeft={1}>
            ENTER
          </Typography>
        </Button>
      </Stack>
    </Drawer>
  );
};
