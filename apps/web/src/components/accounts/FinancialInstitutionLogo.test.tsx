// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import { FINANCIAL_INSTITUTIONS } from "@fina/types"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { FinancialInstitutionLogo } from "./FinancialInstitutionLogo"

const bundledArtwork = import.meta.glob<string>(
  "/src/assets/financial-institutions/*.{svg,webp}",
  { query: "?url", import: "default", eager: true }
)
const vectorArtwork = import.meta.glob<string>(
  "/src/assets/financial-institutions/*.svg",
  { query: "?raw", import: "default", eager: true }
)

afterEach(cleanup)

describe("FinancialInstitutionLogo", () => {
  it("does not paint white canvas backgrounds into the vector logos", () => {
    for (const [asset, source] of Object.entries(vectorArtwork)) {
      const svg = new DOMParser().parseFromString(source, "image/svg+xml")
      const [x, y, width, height] = svg.documentElement
        .getAttribute("viewBox")!
        .split(/[\s,]+/)
        .map(Number)
      const whiteBackgrounds = [...svg.querySelectorAll("rect")].filter(
        (rect) =>
          !rect.closest("defs") &&
          /^(?:white|#fff(?:fff)?)$/i.test(rect.getAttribute("fill") ?? "") &&
          Number(rect.getAttribute("x") ?? 0) === x &&
          Number(rect.getAttribute("y") ?? 0) === y &&
          Number(rect.getAttribute("width")) === width &&
          Number(rect.getAttribute("height")) === height
      )
      expect(whiteBackgrounds, asset).toHaveLength(0)
    }
  })

  it("keeps every vector mark self-contained and scalable", () => {
    expect(Object.keys(vectorArtwork)).toHaveLength(20)
    for (const svg of Object.values(vectorArtwork)) {
      expect(svg).toMatch(/<svg\b[^>]*\bviewBox=/)
      expect(svg).not.toMatch(/<script\b|<foreignObject\b|<!ENTITY/i)
      expect(svg).not.toMatch(/\son\w+\s*=/i)
      expect(svg).not.toMatch(
        /(?:href|src)\s*=\s*["'](?:https?:|\/\/|data:|javascript:)/i
      )
    }
  })

  it("bundles an accessible local logo for every catalog institution", () => {
    for (const institution of FINANCIAL_INSTITUTIONS) {
      const { unmount } = render(
        <FinancialInstitutionLogo institutionId={institution.id} />
      )
      const logo = screen.getByRole("img", {
        name: `${institution.name} logo`
      })
      expect(logo).toHaveAttribute(
        "src",
        bundledArtwork[
          `/src/assets/financial-institutions/${institution.id}.${institution.id === "inter" ? "webp" : "svg"}`
        ]
      )
      expect(logo.getAttribute("src")).not.toMatch(/^https?:\/\//)
      expect(logo.parentElement).toHaveAttribute(
        "data-institution-id",
        institution.id
      )
      expect(logo.parentElement).toHaveClass("bg-transparent")
      expect(logo.parentElement).not.toHaveClass("bg-white", "ring-1")
      unmount()
    }
  })

  it("infers a recognized legacy name only when the institution is omitted", () => {
    const { rerender } = render(
      <FinancialInstitutionLogo
        accountName="Cartão Itaú"
        accountType="credit"
      />
    )
    expect(screen.getByRole("img", { name: "Itaú logo" })).toBeInTheDocument()

    rerender(
      <FinancialInstitutionLogo
        institutionId={null}
        accountName="Cartão Itaú"
        accountType="credit"
      />
    )
    expect(screen.getByRole("img", { name: "Credit card" })).toBeInTheDocument()
    expect(screen.queryByRole("img", { name: "Itaú logo" })).toBeNull()
  })

  it("lets a stored choice override the account name", () => {
    render(
      <FinancialInstitutionLogo
        institutionId="inter"
        accountName="Itaú - personal"
      />
    )
    expect(screen.getByRole("img", { name: "Inter logo" })).toBeInTheDocument()
  })

  it("uses honest account-type fallbacks for unknown and ambiguous names", () => {
    const { rerender } = render(
      <FinancialInstitutionLogo
        accountName="Household"
        accountType="checking"
      />
    )
    expect(
      screen.getByRole("img", { name: "Bank account" })
    ).toBeInTheDocument()

    rerender(
      <FinancialInstitutionLogo
        accountName="Inter / Nubank"
        accountType="credit"
      />
    )
    expect(screen.getByRole("img", { name: "Credit card" })).toBeInTheDocument()
  })

  it("hides decorative logos and supports compact sizing without replacing artwork", () => {
    const { container, rerender } = render(
      <FinancialInstitutionLogo
        institutionId="nubank"
        decorative
        className="size-4"
      />
    )
    expect(screen.queryByRole("img")).toBeNull()
    expect(container.querySelector("span")).toHaveAttribute(
      "aria-hidden",
      "true"
    )
    expect(container.querySelector("span")).toHaveClass("size-4")
    expect(container.querySelector("img")).toHaveAttribute("alt", "")

    rerender(<FinancialInstitutionLogo institutionId={null} decorative />)
    expect(screen.queryByRole("img")).toBeNull()
  })
})
