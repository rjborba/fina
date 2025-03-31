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
import { useAccounts } from "@/data/accounts/useAccounts";
import { useAccountsMutation } from "@/data/accounts/useAccountsMutation";
import { FC, useState } from "react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Account } from "@/data/accounts/Account";
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

type FormData = {
  accountName: string;
  accountType: string;
  dueDate: string;
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
  const { data: accountsData } = useAccounts();
  const { addAccount } = useAccountsMutation();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const form = useForm<FormData>({
    defaultValues: {
      accountName: "",
      accountType: "checkout",
      dueDate: "",
    },
  });

  const accountType = form.watch("accountType");

  const onSubmit = async (data: FormData) => {
    const addAccountPayload: Account["Insert"] = {
      name: data.accountName,
      type: data.accountType,
      // TODO
      owner: 1,
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
    <div className="border border-back rounded-md p-5 w-[500px]">
      <div className="flex flex-col">
        <p>Accounts</p>
        <div className="min-h-[80px] bg-gray-50 rounded-lg p-2 w-full">
          {accountsData?.length ? (
            <ul className="">
              {accountsData?.map((accountData) => {
                return (
                  <li className="my-1" key={accountData.id}>
                    <div className="flex justify-between px-2 py-2 items-center rounded-l bg-gray-100">
                      <div className="flex gap-1 items-center">
                        <span className="text-sm text-gray-400 inline">
                          #{accountData.id}
                        </span>
                        <span>{accountData.name}</span>
                        <span className="text-sm text-gray-400 inline">
                          ({accountData.type})
                        </span>
                      </div>
                      <div>
                        <RemoveConfirmDialog id={accountData.id} />
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
