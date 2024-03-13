// import {
//   Dialog,
//   DialogClose,
//   DialogContent,
//   DialogDescription,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
// } from "./components/ui/dialog";
// import { Input } from "./components/ui/input";
// import { Label } from "./components/ui/label";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "./components/ui/table";
// import { Search, PlusCircle } from "lucide-react";

import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useBills } from "@/hooks/Bills/useBills";
import { Fragment, useEffect } from "react";
import { BillRow } from "./billRow";

export const Bills = () => {
  const {
    response: { data, error },
    mutate: { add },
  } = useBills();

  const handleAddBill = () => {};

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="scroll-m-20 py-4 text-4xl font-extrabold tracking-tight lg:text-5xl">
        Contas
      </h1>
      <div className=" p-2">
        <Table className="overflow-visible">
          <TableHeader>
            <TableRow>
              <TableHead className="">Descrição</TableHead>
              <TableHead>Valor Estimado</TableHead>
              <TableHead>Dia do Vencimento</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="overflow-visible">
            {data?.map((bill, index) => (
              <Fragment key={bill.id}>
                <BillRow key={bill.id} bill={bill} />
                <TableRow className="relative h-1 max-h-1 border-0 p-0">
                  {index !== data?.length - 1 ? (
                    <TableCell
                      colSpan={3}
                      className="group cursor-pointer bg-gray-900 p-0"
                    />
                  ) : (
                    <TableCell
                      colSpan={3}
                      className="group cursor-pointer bg-black p-2"
                    />
                  )}
                </TableRow>
              </Fragment>
            ))}
          </TableBody>
        </Table>

        <ContextMenu>
          <ContextMenuContent className="w-64">
            <ContextMenuItem inset>
              Back
              <ContextMenuShortcut>⌘[</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem inset disabled>
              Forward
              <ContextMenuShortcut>⌘]</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem inset>
              Reload
              <ContextMenuShortcut>⌘R</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuSub>
              <ContextMenuSubTrigger inset>More Tools</ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-48">
                <ContextMenuItem>
                  Save Page As...
                  <ContextMenuShortcut>⇧⌘S</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuItem>Create Shortcut...</ContextMenuItem>
                <ContextMenuItem>Name Window...</ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem>Developer Tools</ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuSeparator />
            <ContextMenuCheckboxItem checked>
              Show Bookmarks Bar
              <ContextMenuShortcut>⌘⇧B</ContextMenuShortcut>
            </ContextMenuCheckboxItem>
            <ContextMenuCheckboxItem>Show Full URLs</ContextMenuCheckboxItem>
            <ContextMenuSeparator />
            <ContextMenuRadioGroup value="pedro">
              <ContextMenuLabel inset>People</ContextMenuLabel>
              <ContextMenuSeparator />
              <ContextMenuRadioItem value="pedro">
                Pedro Duarte
              </ContextMenuRadioItem>
              <ContextMenuRadioItem value="colm">
                Colm Tuite
              </ContextMenuRadioItem>
            </ContextMenuRadioGroup>
          </ContextMenuContent>
        </ContextMenu>
      </div>
    </div>
  );
};
