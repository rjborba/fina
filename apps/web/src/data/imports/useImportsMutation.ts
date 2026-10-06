import {
  CreateImportInputDto,
  importsControllerCreate,
  importsControllerPreview,
  importsControllerRemove
} from "@/api/generated"
import { useQueryClient } from "@tanstack/react-query"

export const useImportsMutation = () => {
  const queryClient = useQueryClient()
  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["imports"] }),
      queryClient.invalidateQueries({ queryKey: ["import-profiles"] }),
      queryClient.invalidateQueries({ queryKey: ["transactions"] })
    ])
  }

  const previewImport = (input: CreateImportInputDto) =>
    importsControllerPreview({ requestBody: input })

  const addImport = async (input: CreateImportInputDto, file: File) => {
    const result = await importsControllerCreate({
      formData: { payload: input, file }
    })
    await invalidate()
    return result
  }

  const removeImport = async (id: string) => {
    await importsControllerRemove({ id })
    await invalidate()
  }

  return { addImport, previewImport, removeImport }
}
