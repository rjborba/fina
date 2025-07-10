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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateBankaccountInputDto } from "@fina/types";

type FormData = {
  accountName: string;
  accountType: string;
  dueDate: string;
  user_id: string;
};

const RemoveConfirmDialog: FC<{ id: string }> = ({ id }) => {
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
              removeAccount(id.toString())
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

    const addAccountPayload: CreateBankaccountInputDto = {
      name: data.accountName,
      type: data.accountType,
      groupId: selectedGroup?.id.toString(),
      userId: data.user_id,
      dueDate: accountType === "credit" ? new Date(data.dueDate) : null,
    };

    if (accountType === "credit") {
      addAccountPayload.dueDate = new Date(data.dueDate);
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
      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Existing Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            {bankAccountsData?.length ? (
              <div className="space-y-2">
                {bankAccountsData?.map((bankAccountsData) => (
                  <div
                    key={bankAccountsData.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex gap-2 items-center">
                      <span className="text-sm text-muted-foreground">
                        #{bankAccountsData.id}
                      </span>
                      <span className="font-medium">
                        {bankAccountsData.name}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        ({bankAccountsData.type})
                      </span>
                    </div>
                    <RemoveConfirmDialog id={bankAccountsData.id} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-sm text-muted-foreground">
                No accounts found
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add New Account</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
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
                            <SelectValue
                              onBlur={field.onBlur}
                              ref={field.ref}
                            />
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
                            <SelectValue
                              onBlur={field.onBlur}
                              ref={field.ref}
                            />
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

                {accountType === "credit" && (
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
                )}

                <Button type="submit" disabled={isLoading}>
                  Add Account
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
