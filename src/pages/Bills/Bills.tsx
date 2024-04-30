import { useBills } from "@/hooks/Bills/useBills";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useState } from "react";
import { BillsGridTable } from "./Table/BillsGridTable";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { NewTransactionModal } from "@/NewTransactionModal";

export const Bills = () => {
  const [newBillDrawer, setNewBillDrawer] = useState(false);

  const {
    response: { data, error },
    mutate: { add },
  } = useBills();

  if (error) {
    console.log(error);
  }

  if (!data) {
    return;
  }

  const handleAddBill = () => {};

  return (
    <>
      <div className=" space-y-4 p-6">
        <div className="p-2">
          <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
            Transactions
          </h1>
          <div className="my-4 w-full max-w-full overflow-x-auto">
            <BillsGridTable />
          </div>
          <div className="flex justify-end">
            <NewTransactionModal />
          </div>
          {/* <DataTable columns={columns} data={data} /> */}
          {/* <Button onClick={() => setNewBillDrawer((old) => !old)}>New</Button> */}
        </div>
      </div>
    </>
  );
};
