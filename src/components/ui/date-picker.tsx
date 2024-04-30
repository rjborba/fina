import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Input } from "./input";
import { Button } from "./button";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "./calendar";
import { format } from "date-fns";

const DATE_FORMAT = "dd/MM/yyyy";
export function DatePicker() {
  const [stringDate, setStringDate] = useState<string>(
    format(new Date(), DATE_FORMAT),
  );
  const [date, setDate] = useState<Date | null>(new Date());
  const [errorMessage, setErrorMessage] = useState<string>("");

  return (
    <Popover>
      <div className="relative w-[280px]">
        <Input
          type="string"
          value={stringDate}
          onChange={(e) => {
            setStringDate(e.target.value);
            const parsedDate = new Date(e.target.value);
            if (parsedDate.toString() === "Invalid Date") {
              setErrorMessage("Invalid Date");
              setDate(null);
            } else {
              setErrorMessage("");
              setDate(parsedDate);
            }
          }}
        />
        {errorMessage !== "" && (
          <div className="absolute bottom-[-1.75rem] left-0 text-sm text-red-400">
            {errorMessage}
          </div>
        )}
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "absolute right-0 top-[50%] translate-y-[-50%] rounded-l-none font-normal",
              !date && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
      </div>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date!}
          onSelect={(selectedDate) => {
            if (!selectedDate) return;
            setDate(selectedDate);
            setStringDate(format(selectedDate, DATE_FORMAT));
            setErrorMessage("");
          }}
          defaultMonth={date!}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
