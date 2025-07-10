import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useActiveGroup } from "@/contexts/ActiveGroupContext";
import { useCategories } from "@/data/categories/useCategories";
import { useCategoriesMutation } from "@/data/categories/useCategoriesMutation";
import { FC } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const formSchema = z.object({
  categoryName: z.string().min(1, "Category name is required"),
});

export const Categories: FC = () => {
  const { selectedGroup } = useActiveGroup();
  const { addCategory, removeCategory } = useCategoriesMutation();
  const { data: categoryData } = useCategories({
    groupId: selectedGroup?.id?.toString(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      categoryName: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!selectedGroup?.id) {
      throw new Error("Selected group not found");
    }

    await addCategory({
      name: values.categoryName,
      groupId: selectedGroup.id.toString(),
    });
    form.reset();
  };

  return (
    <div className="p-5 w-full">
      <Card className="max-w-2xl ">
        <CardHeader>
          <CardTitle>Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="categoryName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Category</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter category name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit">Add Category</Button>
            </form>
          </Form>

          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">Existing Categories</h3>
            <div className="space-y-2">
              {categoryData?.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <span className="font-medium">{category.name}</span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => removeCategory(category.id)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
