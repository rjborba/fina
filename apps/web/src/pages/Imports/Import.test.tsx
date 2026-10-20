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
import { detectCsvStructure, structuralFingerprint } from "@/imports/csvImport"
import type { ImportProfile } from "@fina/types"
import { Import } from "./Import"

const previewImport = vi.fn()
const addImport = vi.fn()
const importFixtures = vi.hoisted(() => ({
  groupId: "10",
  profiles: [] as ImportProfile[] | undefined,
  profilesFetched: true,
  accounts: [] as {
    id: string
    name: string
    type: string
    institutionId: string | null
  }[],
  cards: [
    { cardName: "Personal", cardLast4: "4242" },
    { cardName: "Additional", cardLast4: "1234" },
    { cardName: "Old card", cardLast4: "0001" },
    { cardName: "Other account card", cardLast4: "7777" }
  ]
}))

vi.mock("@/contexts/ActiveGroupContext", () => ({
  useActiveGroup: () => ({
    selectedGroup: {
      id: importFixtures.groupId,
      name: "Test"
    }
  })
}))

vi.mock("@/data/creditCardBills/useCreditCardBills", () => ({
  useCreditCardBill: () => ({ data: undefined, isLoading: false })
}))

vi.mock("@/data/bankAccounts/useBankAccounts", () => ({
  useBankAccounts: () => ({
    data: importFixtures.accounts
  })
}))

vi.mock("@/data/imports/useImportProfiles", () => ({
  useImportProfiles: () => ({
    data: importFixtures.profiles,
    isFetched: importFixtures.profilesFetched
  })
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
    vi.unstubAllGlobals()
  })

  beforeEach(() => {
    importFixtures.profiles = []
    importFixtures.profilesFetched = true
    importFixtures.accounts = [
      {
        id: "20",
        name: "Main account",
        type: "checkout",
        institutionId: "inter"
      },
      { id: "21", name: "Credit card", type: "credit", institutionId: "nubank" }
    ]
    importFixtures.groupId = "10"
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    )
    Element.prototype.scrollIntoView = () => undefined
    Element.prototype.hasPointerCapture = () => false
    Element.prototype.setPointerCapture = () => undefined
    Element.prototype.releasePointerCapture = () => undefined
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
    expect(
      screen
        .getByRole("combobox", { name: "Destination account" })
        .querySelector('[data-institution-id="inter"] img')
    ).not.toBeNull()
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
      screen.queryByLabelText("Include in monthly review")
    ).not.toBeInTheDocument()
    const validate = screen.getByRole("button", { name: "Validate import" })
    await waitFor(() => expect(validate).toBeEnabled())
    await userEvent.click(validate)

    expect(previewImport).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: "21",
        billMonth: `${currentYear}-09`
      })
    )
    expect(previewImport.mock.calls[0]?.[0]).not.toHaveProperty("reviewMonth")
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

  it("imports three card labels directly from ordinary name and number mappings on one bill", async () => {
    renderImport()
    await upload(combinedCardCsv)
    await chooseBillMonth()
    expect(
      screen.queryByRole("combobox", { name: "Card for this file" })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText("Identify cards in this statement")
    ).not.toBeInTheDocument()
    const validate = screen.getByRole("button", { name: "Validate import" })
    await waitFor(() => expect(validate).toBeEnabled())
    await userEvent.click(validate)
    expect(previewImport).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: "21",
        config: expect.objectContaining({
          cardNameColumn: 4,
          cardLast4Column: 5
        }),
        rows: [
          expect.objectContaining({
            sourceRow: 2,
            cardName: "Personal",
            cardLast4: "0042"
          }),
          expect.objectContaining({
            sourceRow: 3,
            cardName: "Family",
            cardLast4: "1234"
          }),
          expect.objectContaining({
            sourceRow: 4,
            cardName: "Virtual",
            cardLast4: "5678"
          }),
          expect.objectContaining({
            sourceRow: 5,
            cardName: null,
            cardLast4: null
          })
        ]
      })
    )
    expect(previewImport.mock.calls[0][0]).not.toHaveProperty("creditCardId")
    const confirm = screen.getByRole("button", {
      name: "Import 4 transactions"
    })
    await waitFor(() => expect(confirm).toBeEnabled())
    await userEvent.click(confirm)
    expect(addImport).toHaveBeenCalledTimes(1)
  })

  it("automatically restores a saved C6 mapping including card columns and signs, but still requires a bill month", async () => {
    importFixtures.accounts[1].institutionId = "c6"
    importFixtures.profiles = [await savedCardProfile()]
    renderImport()
    await upload(combinedCardCsv)

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Saved mapping applied from C6 personal."
    )
    expect(
      screen.getByRole("combobox", { name: "Destination account" })
    ).toHaveTextContent("Credit card")
    expect(
      screen.getByRole("button", { name: "Validate import" })
    ).toBeDisabled()
    await chooseBillMonth()
    await userEvent.click(
      screen.getByRole("button", { name: "Validate import" })
    )
    expect(previewImport.mock.calls[0][0]).toMatchObject({
      accountId: "21",
      config: {
        cardNameColumn: 4,
        cardLast4Column: 5,
        chargesPositive: true
      },
      rows: [
        { amount: -10, cardName: "Personal", cardLast4: "0042" },
        { amount: -20, cardName: "Family", cardLast4: "1234" },
        { amount: -30, cardName: "Virtual", cardLast4: "5678" },
        { amount: -40, cardName: null, cardLast4: null }
      ]
    })
  })

  it("applies the chosen account's own mapping when several accounts use the format", async () => {
    const credit = await savedCardProfile()
    const checking: ImportProfile = {
      ...credit,
      id: "2",
      accountId: "20",
      accountName: "Main account",
      accountInstitutionId: "inter",
      accountType: "checkout",
      config: {
        ...credit.config,
        chargesPositive: false,
        cardNameColumn: null,
        cardLast4Column: null
      }
    }
    importFixtures.profiles = [checking, credit]
    renderImport()
    await upload(combinedCardCsv)
    expect(
      screen.getByRole("combobox", { name: "Destination account" })
    ).toHaveTextContent("Select the account to confirm")
    await chooseAccount("Credit card")
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Saved mapping applied from C6 personal."
    )
    await chooseBillMonth()
    const validate = screen.getByRole("button", { name: "Validate import" })
    await userEvent.click(validate)
    const confirm = screen.getByRole("button", {
      name: "Import 4 transactions"
    })
    await waitFor(() => expect(confirm).toBeEnabled())
    await chooseAccount("Main account")
    expect(confirm).toBeDisabled()
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Saved mapping applied from Main account."
    )
    await userEvent.click(validate)
    expect(previewImport.mock.calls.at(-1)![0]).toMatchObject({
      accountId: "20",
      billMonth: null,
      config: {
        chargesPositive: false,
        cardNameColumn: null,
        cardLast4Column: null
      }
    })
  })

  it("reuses an unambiguous mapping for another C6 credit account and allows edits without reapplying it", async () => {
    importFixtures.accounts[1].institutionId = "c6"
    importFixtures.accounts.push({
      id: "22",
      name: "C6 shared",
      type: "credit",
      institutionId: "c6"
    })
    importFixtures.profiles = [await savedCardProfile()]
    const view = renderImport()
    await upload(combinedCardCsv)
    await chooseAccount("C6 shared")
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Saved mapping applied from C6 personal."
    )
    await chooseBillMonth()
    await userEvent.click(
      screen.getByRole("button", { name: /^Edit Card name mapping/ })
    )
    await userEvent.click(
      screen.getByRole("combobox", { name: "Card name source column" })
    )
    await userEvent.click(screen.getByRole("option", { name: "Not mapped" }))
    await userEvent.keyboard("{Escape}")
    importFixtures.profiles = [...importFixtures.profiles!]
    view.rerender(
      <MemoryRouter>
        <Import />
      </MemoryRouter>
    )
    await userEvent.click(
      screen.getByRole("button", { name: "Validate import" })
    )
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
    expect(previewImport.mock.calls.at(-1)![0]).toMatchObject({
      accountId: "22",
      config: {
        cardNameColumn: null,
        cardLast4Column: 5,
        chargesPositive: true
      }
    })
  })

  it("offers an explicit saved-mapping choice when C6 mappings disagree", async () => {
    importFixtures.accounts[1].institutionId = "c6"
    importFixtures.accounts.push(
      { id: "22", name: "C6 shared", type: "credit", institutionId: "c6" },
      { id: "23", name: "C6 virtual", type: "credit", institutionId: "c6" }
    )
    const personal = await savedCardProfile()
    importFixtures.profiles = [
      personal,
      {
        ...personal,
        id: "2",
        accountId: "23",
        accountName: "C6 virtual",
        config: { ...personal.config, chargesPositive: false }
      }
    ]
    renderImport()
    await upload(combinedCardCsv)
    await chooseAccount("C6 shared")
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
    await userEvent.click(
      screen.getByRole("combobox", { name: "Saved mapping" })
    )
    await userEvent.click(screen.getByRole("option", { name: "C6 personal" }))
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Saved mapping applied from C6 personal."
    )
    await chooseBillMonth()
    await userEvent.click(
      screen.getByRole("button", { name: "Validate import" })
    )
    expect(previewImport.mock.calls.at(-1)![0]).toMatchObject({
      accountId: "22",
      config: { chargesPositive: true }
    })
  })

  it("does not overwrite manual account or mapping choices when profiles arrive late", async () => {
    importFixtures.accounts[1].institutionId = "c6"
    importFixtures.accounts.push({
      id: "22",
      name: "C6 shared",
      type: "credit",
      institutionId: "c6"
    })
    importFixtures.profiles = undefined
    importFixtures.profilesFetched = false
    const view = renderImport()
    await upload(combinedCardCsv)
    await chooseAccount("C6 shared")
    await chooseBillMonth()
    await userEvent.click(
      screen.getByRole("button", { name: /^Edit Card name mapping/ })
    )
    await userEvent.click(
      screen.getByRole("combobox", { name: "Card name source column" })
    )
    await userEvent.click(screen.getByRole("option", { name: "Not mapped" }))
    await userEvent.keyboard("{Escape}")
    importFixtures.profiles = [await savedCardProfile()]
    importFixtures.profilesFetched = true
    view.rerender(
      <MemoryRouter>
        <Import />
      </MemoryRouter>
    )
    await userEvent.click(
      screen.getByRole("button", { name: "Validate import" })
    )
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
    expect(previewImport.mock.calls.at(-1)![0]).toMatchObject({
      accountId: "22",
      config: { cardNameColumn: null, chargesPositive: false }
    })
  })

  it("revalidates after editing a card column and clears card mappings for checking accounts", async () => {
    renderImport()
    await upload(combinedCardCsv)
    await chooseBillMonth()
    const validate = screen.getByRole("button", { name: "Validate import" })
    await waitFor(() => expect(validate).toBeEnabled())
    await userEvent.click(validate)
    const confirm = screen.getByRole("button", {
      name: "Import 4 transactions"
    })
    await waitFor(() => expect(confirm).toBeEnabled())
    await userEvent.click(
      screen.getByRole("button", { name: /^Edit Card name mapping/ })
    )
    await userEvent.click(
      screen.getByRole("combobox", { name: "Card name source column" })
    )
    await userEvent.click(screen.getByRole("option", { name: "Not mapped" }))
    await userEvent.keyboard("{Escape}")
    expect(confirm).toBeDisabled()
    await userEvent.click(
      screen.getByRole("combobox", { name: "Destination account" })
    )
    await userEvent.click(screen.getByRole("option", { name: /^Main account/ }))
    await userEvent.click(validate)
    const payload = previewImport.mock.calls.at(-1)![0]
    expect(payload.config).toMatchObject({
      cardNameColumn: null,
      cardLast4Column: null
    })
    expect(
      payload.rows.every(
        (row: { cardName: string | null; cardLast4: string | null }) =>
          row.cardName === null && row.cardLast4 === null
      )
    ).toBe(true)
  })
})

const combinedCardCsv = [
  "Date;Description;Installment;Amount;Card name;Last4",
  "13/08/2026;First;Single;10,00;Personal;0042",
  "14/08/2026;Second;Single;20,00;Family;**** 1234",
  "15/08/2026;Third;Single;30,00;Virtual;5678",
  "16/08/2026;Fourth;Single;40,00;;"
].join("\n")

async function savedCardProfile(): Promise<ImportProfile> {
  const { matrix, structure } = detectCsvStructure(combinedCardCsv)
  return {
    id: "1",
    accountId: "21",
    accountName: "C6 personal",
    accountInstitutionId: "c6",
    accountType: "credit",
    sourceFingerprint: await structuralFingerprint(matrix, structure),
    updatedAt: "2026-10-19T12:00:00.000Z",
    config: {
      version: 1,
      delimiter: ";",
      encoding: "utf-8",
      hasHeader: true,
      dateFormat: "DD/MM/YYYY",
      numberFormat: "decimal-comma",
      dateColumn: 0,
      descriptionColumns: [1],
      installmentColumn: 2,
      amountMode: "signed",
      amountColumn: 3,
      debitColumn: null,
      creditColumn: null,
      chargesPositive: true,
      cardNameColumn: 4,
      cardLast4Column: 5
    }
  }
}

async function chooseAccount(name: string) {
  await userEvent.click(
    screen.getByRole("combobox", { name: "Destination account" })
  )
  await userEvent.click(
    screen.getByRole("option", { name: new RegExp(`^${name}`) })
  )
}

async function chooseBillMonth() {
  await userEvent.click(await screen.findByLabelText("Bill due in"))
  await userEvent.click(
    screen.getByRole("button", {
      name: `September ${new Date().getFullYear()}`
    })
  )
}

function renderImport() {
  return render(
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
