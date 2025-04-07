import { useActiveGroup } from "@/contexts/ActiveGroupContext";
import { useUsersPerGroup } from "@/data/usersPerGroup/usersPerGroup";
import { useGroupsMutation } from "@/data/groups/useGroupsMutation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "@/hooks/use-toast";

const groupFormSchema = z.object({
  name: z.string().min(1, "Group name is required"),
});

type GroupFormValues = z.infer<typeof groupFormSchema>;

export function Settings() {
  const { selectedGroup, groups } = useActiveGroup();
  const { data: usersPerGroup } = useUsersPerGroup({
    groupId: selectedGroup?.id?.toString(),
  });
  const { addGroup } = useGroupsMutation();

  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: {
      name: "",
    },
  });

  const onSubmit = async (data: GroupFormValues) => {
    try {
      await addGroup.mutateAsync({
        name: data.name.trim(),
      });
      form.reset();
      toast({
        title: "Group created",
        description: "The new group has been created successfully.",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to create group. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-4 w-full space-y-4">
      <h3 className="text-2xl font-bold">Settings</h3>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {usersPerGroup?.map((user) => (
              <li key={user.user_id}>
                <div className="flex flex-col px-4 py-2 rounded-md bg-muted">
                  <div className="font-medium">{user.email}</div>
                  <div className="text-sm text-muted-foreground">
                    #{user.user_id}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Groups</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder="New group name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={form.formState.isSubmitting}>
                Create Group
              </Button>
            </form>
          </Form>

          <div className="mt-6 space-y-2">
            {groups?.map((group) => (
              <div key={group.id} className="px-4 py-2 rounded-md bg-muted">
                {group.name}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
