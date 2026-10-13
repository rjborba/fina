// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ImportList } from "./ImportList"

const removeImport = vi.fn().mockResolvedValue(undefined)
vi.mock("@/contexts/ActiveGroupContext", () => ({
  useActiveGroup: () => ({ selectedGroup: { id: "1" } })
}))
vi.mock("@/data/imports/useImportsMutation", () => ({
  useImportsMutation: () => ({ removeImport })
}))
vi.mock("@/data/imports/useImports", () => ({
  useImports: () => ({
    data: [
      {
        id: "11",
        fileName: "checking-fixture.csv",
        accountName: "Household checking",
        accountInstitutionId: "inter",
        createdAt: "2026-06-01T00:00:00.000Z",
        transactionCount: 2,
        billDueDate: null,
        dateStart: "2026-06-01",
        dateEnd: "2026-06-02"
      },
      {
        id: "12",
        fileName: "card-fixture.csv",
        accountName: "Household card",
        accountInstitutionId: "nubank",
        createdAt: "2026-06-01T00:00:00.000Z",
        transactionCount: 1,
        billDueDate: "2026-07-10",
        dateStart: "2026-06-03",
        dateEnd: "2026-06-03"
      }
    ]
  })
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("import institution attribution", () => {
  it("renders the bank and card issuer from saved IDs alongside custom account names", () => {
    render(<ImportList />)
    const checking = screen.getByText("checking-fixture.csv").closest("li")
    const card = screen.getByText("card-fixture.csv").closest("li")
    expect(checking).toHaveTextContent("Household checking")
    expect(
      checking?.querySelector('[data-institution-id="inter"] img')
    ).not.toBeNull()
    expect(card).toHaveTextContent("Household card")
    expect(
      card?.querySelector('[data-institution-id="nubank"] img')
    ).not.toBeNull()
  })

  it("keeps removal bound to the selected import rather than its displayed institution", async () => {
    render(<ImportList />)
    await userEvent.click(screen.getAllByRole("button", { name: "Remove" })[1])
    expect(removeImport).toHaveBeenCalledWith("12")
  })
})
