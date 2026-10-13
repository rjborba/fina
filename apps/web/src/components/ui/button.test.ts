import { describe, expect, it } from "vitest"

import { buttonVariants } from "./button"

describe("Fina button color contracts", () => {
  it.each([
    ["fina-primary", "bg-fina-violet", "text-white", "hover:text-white"],
    [
      "fina-secondary",
      "bg-fina-surface",
      "text-foreground",
      "hover:text-foreground"
    ],
    [
      "fina-ghost",
      "bg-transparent",
      "text-foreground",
      "hover:text-foreground"
    ],
    ["fina-danger", "bg-fina-surface", "text-red-600", "hover:text-red-700"]
  ] as const)(
    "%s keeps an explicit, high-contrast foreground on hover",
    (variant, restingBackground, restingForeground, hoverForeground) => {
      const classes = buttonVariants({ variant })

      expect(classes).toContain(restingBackground)
      expect(classes).toContain(restingForeground)
      expect(classes).toContain(hoverForeground)
    }
  )

  it("keeps controls stationary in every state", () => {
    expect(buttonVariants({ variant: "fina-primary" })).not.toContain(
      "hover:-translate-y-0.5"
    )
    expect(
      buttonVariants({ variant: "fina-primary", lift: true })
    ).not.toContain("hover:-translate-y-0.5")
  })
})
