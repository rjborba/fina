import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCategories } from "@/data/categories/useCategories";
import { useCategoriesMutation } from "@/data/categories/useCategoriesMutation";
import { FC } from "react";

export const Categories: FC = () => {
  const { addCategory, removeCategory } = useCategoriesMutation();
  const { data: categoryData } = useCategories();

  return (
    <div className="border border-back rounded-md p-5 w-[500px]">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const formData = new FormData(e.target as HTMLFormElement);
          const categoryName = formData.get("categoryName") as string;

          if (!categoryName) {
            return;
          }

          await addCategory({ name: categoryName });
        }}
      >
        <div className="flex flex-col max-w-sm">
          <p>Categories</p>
          {categoryData?.data?.map((category) => {
            return (
              <ul key={category.id}>
                <li className="py-1">
                  <div className="flex gap-1 items-center">
                    <div>{category.name}</div>
                    <div>
                      <Button
                        variant="destructive"
                        type="button"
                        onClick={() => removeCategory(category.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </li>
              </ul>
            );
          })}
          <Input name="categoryName" />
          <div>
            <Button type="submit">Add</Button>
          </div>
        </div>
      </form>
    </div>
  );
};
