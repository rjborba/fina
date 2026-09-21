import { z } from "zod"

const webEnvironmentSchema = z.object({
  VITE_API_URL: z.string().url(),
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_KEY: z.string().min(1)
})

export type WebEnvironment = z.infer<typeof webEnvironmentSchema>

export function parseWebEnvironment(
  input: Record<string, unknown>
): WebEnvironment {
  const result = webEnvironmentSchema.safeParse(input)
  if (!result.success) {
    const fields = result.error.issues
      .map((issue) => issue.path.join(".") || "environment")
      .filter((field, index, all) => all.indexOf(field) === index)
      .join(", ")
    throw new Error(`Invalid web environment configuration: ${fields}`)
  }

  return result.data
}

export const webEnvironment = parseWebEnvironment(import.meta.env)
