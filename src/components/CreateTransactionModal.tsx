import { FC } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { useTransactionMutation } from "@/data/transactions/useTransactionsMutation";
import { useBankAccounts } from "@/data/bankAccounts/useBankAccounts";
import { useCategories } from "@/data/categories/useCategories";
import { useActiveGroup } from "@/contexts/ActiveGroupContext";
import { toast } from "@/hooks/use-toast";
import { Transaction } from "@/data/transactions/Transaction";

interface CreateTransactionModalProps {
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
}

type FormData = {
  date: string;
  description: string;
  value: string;
  category_id: string;
  observation: string;
  bankaccount_id: string;
  installment_current: string;
  installment_total: string;
  group_id?: number;
};

export const CreateTransactionModal: FC<CreateTransactionModalProps> = ({
  open,
  onOpenChange = () => {},
}) => {
  const { selectedGroup } = useActiveGroup();
  const { data: bankAccounts } = useBankAccounts({
    groupId: selectedGroup?.id?.toString(),
  });
  const { data: categories } = useCategories({
    groupId: selectedGroup?.id?.toString(),
  });
  const { addMutation } = useTransactionMutation();

  const isCreditCardAccount = (accountId: string) => {
    const account = bankAccounts?.find(
      (acc) => acc.id.toString() === accountId
    );
    return account?.type === "credit";
  };

  const form = useForm<FormData>({
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      description: "",
      value: "",
      category_id: "",
      observation: "",
      bankaccount_id: "",
      installment_current: "",
      installment_total: "",
      group_id: selectedGroup?.id,
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const selectedAccount = bankAccounts?.find(
        (account) => account.id.toString() === data.bankaccount_id
      );

      if (!data.group_id) {
        throw new Error("Group ID is required");
      }

      const transactionData: Transaction["Insert"] = {
        date: data.date || null,
        credit_due_date:
          selectedAccount?.type === "credit" ? selectedAccount.due_date : null,
        description: data.description || null,
        value: data.value ? parseFloat(data.value) : null,
        category_id: data.category_id ? parseInt(data.category_id) : null,
        observation: data.observation || null,
        bankaccount_id: parseInt(data.bankaccount_id),
        installment_current: data.installment_current
          ? parseInt(data.installment_current)
          : null,
        installment_total: data.installment_total
          ? parseInt(data.installment_total)
          : null,
        group_id: data.group_id,
      };

      await addMutation.mutateAsync([transactionData]);
      toast({
        title: "Transaction created successfully",
      });
      form.reset();
      onOpenChange?.(false);
    } catch (error) {
      console.error("Failed to create transaction:", error);
      toast({
        title: "Failed to create transaction",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        onOpenChange(newOpen);
      }}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Transaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bankaccount_id">Account</Label>
            <Select
              onValueChange={(value) => form.setValue("bankaccount_id", value)}
              value={form.watch("bankaccount_id")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an account" />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts?.map((account) => (
                  <SelectItem key={account.id} value={account.id.toString()}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" {...form.register("date")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" {...form.register("description")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="value">Value</Label>
            <Input
              id="value"
              type="number"
              step="0.01"
              {...form.register("value")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category_id">Category</Label>
            <Select
              onValueChange={(value) =>
                form.setValue("category_id", value === "-" ? "" : value)
              }
              value={form.watch("category_id")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="-">-</SelectItem>
                {categories?.map((category) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observation">Observation</Label>
            <Input id="observation" {...form.register("observation")} />
          </div>

          {isCreditCardAccount(form.watch("bankaccount_id")) && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="installment_current">Current Installment</Label>
                <Input
                  id="installment_current"
                  type="number"
                  {...form.register("installment_current")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="installment_total">Total Installments</Label>
                <Input
                  id="installment_total"
                  type="number"
                  {...form.register("installment_total")}
                />
              </div>
            </div>
          )}

          <Button type="submit" className="w-full">
            Create Transaction
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
