import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { useBankAccounts } from "@/data/bankAccounts/useBankAccounts";
import { useAccountsMutation } from "@/data/bankAccounts/useBankAccountsMutation";
import { FC, useEffect, useState } from "react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { BankAccount } from "@/data/bankAccounts/BankAccount";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useActiveGroup } from "@/contexts/ActiveGroupContext";
import { useUsersPerGroup } from "@/data/usersPerGroup/usersPerGroup";

type FormData = {
  accountName: string;
  accountType: string;
  dueDate: string;
  user_id: string;
};

const RemoveConfirmDialog: FC<{ id: number }> = ({ id }) => {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { removeAccount } = useAccountsMutation();
  const [isLoading, setIsLoading] = useState(false);
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button type="button" size="sm">
          Remove
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete your
            account and remove your data from our servers.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <Button
            disabled={isLoading}
            onClick={async () => {
              setIsLoading(true);
              removeAccount(id)
                .then(() => {
                  toast({ title: "Successfully removed" });
                  setOpen(false);
                })
                .catch((e) => {
                  toast({ title: "Something went wrong" });
                  console.error(e);
                })
                .finally(() => {
                  setIsLoading(false);
                });
            }}
          >
            Continue
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export const Accounts: FC = () => {
  const { selectedGroup } = useActiveGroup();
  const { data: bankAccountsData } = useBankAccounts({
    groupId: selectedGroup?.id?.toString(),
  });
  const { addAccount } = useAccountsMutation();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { data: usersPerGroup } = useUsersPerGroup({
    groupId: selectedGroup?.id?.toString(),
  });

  const form = useForm<FormData>({
    defaultValues: {
      accountName: "",
      accountType: "checkout",
      dueDate: "",
      user_id: "",
    },
  });

  useEffect(() => {
    if (!usersPerGroup || !usersPerGroup.length) {
      return;
    }

    form.setValue("user_id", usersPerGroup[0].user_id!);
  }, [form, usersPerGroup]);

  const accountType = form.watch("accountType");

  const onSubmit = async (data: FormData) => {
    if (!selectedGroup?.id) {
      throw new Error("No group selected");
    }

    if (!data.user_id) {
      throw new Error("User not found");
    }

    const addAccountPayload: BankAccount["Insert"] = {
      name: data.accountName,
      type: data.accountType,
      group_id: selectedGroup?.id,
      user_id: data.user_id,
      // TODO
    };

    if (accountType === "credit") {
      const dueDateAsFormattedString = new Date(
        data.dueDate.toString()
      ).toISOString();

      addAccountPayload.due_date = dueDateAsFormattedString;
    }

    setIsLoading(true);
    addAccount(addAccountPayload)
      .then(() => {
        toast({ title: "Successfully added" });
        form.reset();
      })
      .catch((e) => {
        toast({ title: "Something went wrong" });
        console.error(e);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <div className="p-5 w-full">
      <div className="flex flex-col">
        <p>Accounts</p>
        <div className="min-h-[80px] bg-gray-50 rounded-lg p-2 w-full">
          {bankAccountsData?.length ? (
            <ul className="">
              {bankAccountsData?.map((bankAccountsData) => {
                return (
                  <li className="my-1" key={bankAccountsData.id}>
                    <div className="flex justify-between px-2 py-2 items-center rounded-l bg-gray-100">
                      <div className="flex gap-1 items-center">
                        <span className="text-sm text-gray-400 inline">
                          #{bankAccountsData.id}
                        </span>
                        <span>{bankAccountsData.name}</span>
                        <span className="text-sm text-gray-400 inline">
                          ({bankAccountsData.type})
                        </span>
                      </div>
                      <div>
                        <RemoveConfirmDialog id={bankAccountsData.id} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="text-center text-sm">No accounts found</div>
          )}
        </div>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            control={form.control}
            name="accountName"
            rules={{ required: true }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Banco Inter" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="accountType"
            rules={{ required: true }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <FormControl>
                  <Select
                    value={field.value}
                    name={field.name}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue onBlur={field.onBlur} ref={field.ref} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="checkout">Checkout</SelectItem>
                      <SelectItem value="credit">Credit</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="user_id"
            rules={{ required: true }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>User</FormLabel>
                <FormControl>
                  <Select
                    value={field.value}
                    name={field.name}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue onBlur={field.onBlur} ref={field.ref} />
                    </SelectTrigger>
                    <SelectContent>
                      {usersPerGroup?.map((groupUser) => (
                        <SelectItem
                          key={groupUser.email}
                          value={groupUser.user_id!}
                        >
                          {groupUser.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {accountType === "credit" ? (
            <FormField
              control={form.control}
              name="dueDate"
              rules={{ required: true }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Date</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="date"
                      placeholder="Due Date (To be changed to due Day)"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}

          <div>
            <Button type="submit" className="mt-4" disabled={isLoading}>
              Add
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};
