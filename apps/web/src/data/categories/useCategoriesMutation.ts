import {
  categoriesControllerCreate,
  categoriesControllerRemove,
  categoriesControllerUpdateAppearance,
  CreateCategoryInputDto,
  UpdateCategoryAppearanceInputDto
} from "@/api/generated"
import { useQueryClient } from "@tanstack/react-query"

export const useCategoriesMutation = () => {
  const queryClient = useQueryClient()
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["categories"] })

  const addCategory = async (input: CreateCategoryInputDto) => {
    await categoriesControllerCreate({ requestBody: input })
    await invalidate()
  }
  const removeCategory = async (id: string) => {
    await categoriesControllerRemove({ id })
    await invalidate()
  }

  const updateCategoryAppearance = async (
    id: string,
    input: UpdateCategoryAppearanceInputDto
  ) => {
    await categoriesControllerUpdateAppearance({ id, requestBody: input })
    await invalidate()
  }

  return { addCategory, removeCategory, updateCategoryAppearance }
}
