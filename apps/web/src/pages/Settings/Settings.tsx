import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useActiveGroup } from "@/contexts/ActiveGroupContext";
import { useGroupsMutation } from "@/data/groups/useGroupsMutation";
import { toast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router";
import * as z from "zod";

const groupFormSchema = z.object({
  name: z.string().min(1, "Group name is required"),
});

type GroupFormValues = z.infer<typeof groupFormSchema>;

export function Settings() {
  const { groups } = useActiveGroup();
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

          <ul className="mt-6 space-y-1">
            <h3 className="text-lg font-bold">Groups</h3>
            {groups?.map((group) => (
              <li
                key={group.id}
                className="px-4 py-2 rounded-md bg-muted underline"
              >
                <Link to={`/group-details/${group.id}`}>{group.name}</Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
