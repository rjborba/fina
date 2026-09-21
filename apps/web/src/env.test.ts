import { describe, expect, it } from "vitest"
import { parseWebEnvironment } from "./env"

describe("parseWebEnvironment", () => {
  it("accepts the required public application configuration", () => {
    expect(
      parseWebEnvironment({
        VITE_API_URL: "http://localhost:3000",
        VITE_SUPABASE_URL: "https://example.supabase.co",
        VITE_SUPABASE_KEY: "local-anon-key"
      })
    ).toEqual({
      VITE_API_URL: "http://localhost:3000",
      VITE_SUPABASE_URL: "https://example.supabase.co",
      VITE_SUPABASE_KEY: "local-anon-key"
    })
  })

  it("reports missing fields without printing configured values", () => {
    expect(() => parseWebEnvironment({})).toThrow(
      "VITE_API_URL, VITE_SUPABASE_URL, VITE_SUPABASE_KEY"
    )
  })
})
