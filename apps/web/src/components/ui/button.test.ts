import { describe, expect, it } from "vitest"

import { buttonVariants } from "./button"

describe("Fina button color contracts", () => {
  it.each([
    ["fina-primary", "bg-fina-lime", "hover:bg-fina-lime"],
    ["fina-secondary", "bg-fina-surface", "hover:bg-fina-sky"],
    ["fina-ghost", "bg-transparent", "hover:bg-fina-yellow"],
    ["fina-danger", "bg-fina-danger", "hover:bg-fina-danger"]
  ] as const)(
    "%s keeps an explicit, high-contrast foreground on hover",
    (variant, restingBackground, hoverBackground) => {
      const classes = buttonVariants({ variant })

      expect(classes).toContain(restingBackground)
      expect(classes).toContain("text-fina-ink")
      expect(classes).toContain(hoverBackground)
      expect(classes).toContain("hover:text-fina-ink")
    }
  )

  it("keeps transforms opt-in for fixed and translated controls", () => {
    expect(buttonVariants({ variant: "fina-primary" })).not.toContain(
      "hover:-translate-y-0.5"
    )
    expect(buttonVariants({ variant: "fina-primary", lift: true })).toContain(
      "hover:-translate-y-0.5"
    )
  })
})
