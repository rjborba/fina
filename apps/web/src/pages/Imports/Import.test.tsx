// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { queueImportFile, takePendingImportFile } from "@/imports/pendingImport"
import { Import } from "./Import"

const previewImport = vi.fn()
const addImport = vi.fn()

vi.mock("@/contexts/ActiveGroupContext", () => ({
  useActiveGroup: () => ({
    selectedGroup: { id: "10", name: "Test", creditCardReviewMonthOffset: -1 }
  })
}))

vi.mock("@/data/creditCardBills/useCreditCardBills", () => ({
  useCreditCardBill: () => ({ data: undefined, isLoading: false })
}))

vi.mock("@/data/bankAccounts/useBankAccounts", () => ({
  useBankAccounts: () => ({
    data: [
      { id: "20", name: "Main account", type: "checkout" },
      { id: "21", name: "Credit card", type: "credit" }
    ]
  })
}))

vi.mock("@/data/imports/useImportProfiles", () => ({
  useImportProfiles: () => ({ data: [], isFetched: true })
}))

vi.mock("@/data/imports/useImportsMutation", () => ({
  useImportsMutation: () => ({
    previewImport,
    addImport,
    removeImport: vi.fn()
  })
}))

vi.mock("./ImportList", () => ({ ImportList: () => <div>Import history</div> }))

const validCsv = [
  "Synthetic statement;",
  "Type;Checking",
  "Period;August",
  "Generated;2026-09-01",
  "",
  "Date;Description;Details;Amount;Balance",
  "13/08/2026;Coffee;Synthetic;-10,00;90,00",
  "14/08/2026;Income;Synthetic;100,00;190,00",
  "15/08/2026;Transfer;Synthetic;20,00;210,00",
  "16/08/2026;Market;Synthetic;-15,00;195,00"
].join("\n")

describe("adaptive CSV import", () => {
  afterEach(() => {
    cleanup()
    takePendingImportFile()
  })

  beforeEach(() => {
    previewImport.mockReset()
    addImport.mockReset()
    previewImport.mockResolvedValue({
      valid: true,
      issues: [],
      duplicate: null,
      summary: {
        includedRowCount: 4,
        excludedRowCount: 0,
        errorCount: 0,
        warningCount: 0,
        dateStart: "2026-08-13",
        dateEnd: "2026-08-14",
        inflowCount: 1,
        inflowTotal: 100,
        outflowCount: 1,
        outflowTotal: -10
      }
    })
    addImport.mockResolvedValue({
      id: "30",
      accountId: "20",
      transactionCount: 4
    })
  })

  it("opens a full-screen importer and edits inferred boundaries in a line editor", async () => {
    renderImport()

    expect(screen.getByText("Import history")).toBeInTheDocument()
    expect(
      screen.queryByText("Drop a CSV here or choose a file")
    ).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Import file" }))
    expect(screen.getByRole("dialog")).toHaveClass("h-[100dvh]", "w-screen")

    await upload(validCsv)

    expect(await screen.findByText("Destination account")).toBeInTheDocument()
    expect(
      screen.getByRole("button", {
        name: "Edit Description mapping. Description + Details"
      })
    ).toBeInTheDocument()
    expect(screen.queryByText("Included")).not.toBeInTheDocument()
    expect(screen.queryByText("Inflow")).not.toBeInTheDocument()
    expect(screen.queryByText("Outflow")).not.toBeInTheDocument()

    await userEvent.click(
      screen.getByRole("button", { name: "Edit file configuration" })
    )
    expect(
      await screen.findByRole("heading", { name: "Edit file configuration" })
    ).toBeInTheDocument()
    const headerLine = screen.getByRole("button", {
      name: "Configure line 6: Date;Description;Details;Amount;Balance"
    })
    const firstDataLine = screen.getByRole("button", {
      name: "Configure line 7: 13/08/2026;Coffee;Synthetic;-10,00;90,00"
    })
    expect(headerLine).toHaveClass("bg-amber-500/10")
    expect(firstDataLine).toHaveClass("bg-sky-500/10")

    await userEvent.click(
      screen.getByRole("button", {
        name: "Configure line 8: 14/08/2026;Income;Synthetic;100,00;190,00"
      })
    )
    await userEvent.click(
      await screen.findByRole("menuitem", { name: "Data start" })
    )
    await userEvent.click(screen.getByRole("button", { name: "Done" }))

    expect(
      screen.getByRole("button", { name: "Import 3 transactions" })
    ).toBeDisabled()
    expect(
      screen.getByRole("combobox", { name: "Destination account" })
    ).toHaveTextContent("Main account")
  })

  it("opens the importer and previews a file queued by the global drop target", async () => {
    queueImportFile(createCsvFile(validCsv))

    renderImport()

    expect(
      await screen.findByRole("heading", { name: "Review and import" })
    ).toBeInTheDocument()
    expect(screen.getByText("Destination account")).toBeInTheDocument()
    expect(
      screen.queryByText("Drop a CSV here or choose a file")
    ).not.toBeInTheDocument()
  })

  it("allows an ambiguous inferred date to be corrected in the Date mapping", async () => {
    renderImport()
    await upload(
      "Date;Description;Amount;Balance\n01/02/2026;One;1,00;1,00\n02/03/2026;Two;2,00;3,00"
    )

    await userEvent.click(
      screen.getByRole("button", { name: "Edit Date mapping. Date" })
    )
    expect(
      await screen.findByRole("combobox", { name: "Date format" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Import transactions" })
    ).toBeDisabled()
  })

  it("recalculates descriptions when their Review header mapping changes", async () => {
    renderImport()
    await upload(validCsv)

    expect(
      screen.getByRole("row", {
        name: /7 2026-08-13 Coffee - Synthetic -10.00/
      })
    ).toBeInTheDocument()

    await userEvent.click(
      screen.getByRole("button", {
        name: "Edit Description mapping. Description + Details"
      })
    )
    await userEvent.click(
      await screen.findByRole("checkbox", { name: "3. Details" })
    )

    expect(
      screen.getByRole("button", {
        name: "Edit Description mapping. Description"
      })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("row", { name: /7 2026-08-13 Coffee -10.00/ })
    ).toBeInTheDocument()
  })

  it("requires fresh server validation after an exclusion changes", async () => {
    renderImport()
    await upload(validCsv)

    const validate = await screen.findByRole("button", {
      name: "Validate import"
    })
    await waitFor(() => expect(validate).toBeEnabled())
    await userEvent.click(validate)
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Import 4 transactions" })
      ).toBeEnabled()
    )

    await userEvent.click(screen.getByLabelText("Exclude source line 7"))
    expect(
      screen.getByRole("button", { name: "Import 3 transactions" })
    ).toBeDisabled()
    expect(
      screen.getByText(/Validate after any file, mapping, exclusion/)
    ).toBeInTheDocument()
  })

  it("requires an entered bill due date for credit card imports", async () => {
    renderImport()
    await upload(
      [
        "Date;Description;Installment;Amount",
        "13/08/2026;First;2/3;10,00",
        "14/08/2026;Second;Single;20,00",
        "15/08/2026;Third;Single;30,00",
        "16/08/2026;Fourth;Single;40,00"
      ].join("\n")
    )

    const currentYear = new Date().getFullYear()
    const billMonth = await screen.findByLabelText("Bill due in")
    expect(
      screen.getByRole("button", { name: "Validate import" })
    ).toBeDisabled()
    expect(screen.getByText(/File names are never used/)).toBeInTheDocument()

    await userEvent.click(billMonth)
    await userEvent.click(
      screen.getByRole("button", { name: `September ${currentYear}` })
    )
    expect(
      screen.getByLabelText("Include in monthly review")
    ).toHaveTextContent(`August ${currentYear}`)
    await userEvent.click(screen.getByLabelText("Include in monthly review"))
    await userEvent.click(
      screen.getByRole("button", { name: `July ${currentYear}` })
    )
    const validate = screen.getByRole("button", { name: "Validate import" })
    await waitFor(() => expect(validate).toBeEnabled())
    await userEvent.click(validate)

    expect(previewImport).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: "21",
        billMonth: `${currentYear}-09`,
        reviewMonth: `${currentYear}-07`
      })
    )
  })

  it("sends the original file when confirming an import", async () => {
    renderImport()
    await upload(validCsv)

    await userEvent.click(
      await screen.findByRole("button", { name: "Validate import" })
    )
    const confirm = await screen.findByRole("button", {
      name: "Import 4 transactions"
    })
    await waitFor(() => expect(confirm).toBeEnabled())
    await userEvent.click(confirm)

    await waitFor(() => expect(addImport).toHaveBeenCalledTimes(1))
    expect(addImport).toHaveBeenCalledWith(
      expect.objectContaining({
        fileName: "statement.csv",
        fileSize: new TextEncoder().encode(validCsv).byteLength,
        billMonth: null
      }),
      expect.objectContaining({ name: "statement.csv", type: "text/csv" })
    )
  })

  it("previews and submits inverted charges and refunds together", async () => {
    renderImport()
    await upload(
      [
        "Date;Description;Installment;Amount",
        "13/08/2026;Charge;Single;25,00",
        "14/08/2026;Refund;Single;-5,00",
        "15/08/2026;Other charge;Single;10,00",
        "16/08/2026;Other refund;Single;-2,00"
      ].join("\n")
    )
    expect(
      screen.getByRole("row", { name: /2 2026-08-13 Charge 25.00/ })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("row", { name: /3 2026-08-14 Refund -5.00/ })
    ).toBeInTheDocument()

    await userEvent.click(
      screen.getByRole("button", { name: "Edit Amount mapping. Amount" })
    )
    await userEvent.click(
      await screen.findByRole("checkbox", { name: /Invert amount signs/ })
    )
    expect(
      screen.getByRole("row", { name: /2 2026-08-13 Charge -25.00/ })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("row", { name: /3 2026-08-14 Refund 5.00/ })
    ).toBeInTheDocument()
    await userEvent.keyboard("{Escape}")

    const currentYear = new Date().getFullYear()
    await userEvent.click(screen.getByLabelText("Bill due in"))
    await userEvent.click(
      screen.getByRole("button", { name: `September ${currentYear}` })
    )
    await userEvent.click(
      screen.getByRole("button", { name: "Validate import" })
    )
    const confirm = screen.getByRole("button", {
      name: "Import 4 transactions"
    })
    await waitFor(() => expect(confirm).toBeEnabled())
    await userEvent.click(confirm)

    await waitFor(() => expect(addImport).toHaveBeenCalledTimes(1))
    expect(addImport.mock.calls[0][0]).toMatchObject({
      accountId: "21",
      config: { version: 1, amountMode: "signed", chargesPositive: true },
      rows: [
        { sourceRow: 2, amount: -25 },
        { sourceRow: 3, amount: 5 },
        { sourceRow: 4, amount: -10 },
        { sourceRow: 5, amount: 2 }
      ]
    })
  })

  it("blocks invalid rows until they are explicitly excluded", async () => {
    renderImport()
    await upload(
      "Date;Description;Amount;Balance\n13/08/2026;Valid;10,00;10,00\n14/08/2026;Valid;2,00;12,00\n15/08/2026;Valid;3,00;15,00\n16/08/2026;Valid;4,00;19,00\n17/08/2026;Broken;NaN;19,00"
    )

    const validate = await screen.findByRole("button", {
      name: "Validate import"
    })
    expect(validate).toBeDisabled()
    await userEvent.click(screen.getByLabelText("Exclude source line 6"))
    await waitFor(() => expect(validate).toBeEnabled())
  })
})

function renderImport() {
  render(
    <MemoryRouter>
      <Import />
    </MemoryRouter>
  )
}

async function upload(contents: string) {
  if (!screen.queryByLabelText(/Drop a CSV here or choose a file/)) {
    await userEvent.click(screen.getByRole("button", { name: "Import file" }))
  }
  const input = await screen.findByLabelText(/Drop a CSV here or choose a file/)
  const file = createCsvFile(contents)
  fireEvent.change(input, { target: { files: [file] } })
  await waitFor(() =>
    expect(screen.queryByText(/Reading, hashing/)).not.toBeInTheDocument()
  )
}

function createCsvFile(contents: string) {
  const file = new File([contents], "statement.csv", { type: "text/csv" })
  if (
    !(file as File & { arrayBuffer?: () => Promise<ArrayBuffer> }).arrayBuffer
  ) {
    Object.defineProperty(file, "arrayBuffer", {
      value: async () => new TextEncoder().encode(contents).buffer
    })
  }
  return file
}
