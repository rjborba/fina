import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { FC, useRef } from "react";
import { Button } from "./components/ui/button";
import { DialogHeader, DialogFooter } from "./components/ui/dialog";
import { Input } from "./components/ui/input";
import { useHotkeys } from "react-hotkeys-hook";
import { MoneyInput } from "./components/MoneyInput";
import { DatePicker } from "./components/ui/date-picker";

export const NewTransactionModal: FC = () => {
  const triggerRef = useRef<HTMLButtonElement>(null);

  useHotkeys("n", () => triggerRef.current?.click(), { preventDefault: true });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" ref={triggerRef}>
          New Transaction
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>New Transaction</DialogTitle>
          <DialogDescription>Insert your transaction data</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Description
            </Label>
            <Input id="description" defaultValue="" className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="value" className="text-right">
              Value
            </Label>
            <MoneyInput className="col-span-3" defaultValue={"0"} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="date" className="text-right">
              Date
            </Label>
            <DatePicker />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit">Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
