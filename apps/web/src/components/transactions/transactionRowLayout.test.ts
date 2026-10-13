import { describe, expect, it } from "vitest"
import { DEFAULT_TRANSACTION_DISPLAY_PROPERTIES } from "./transactionDisplay"
import { buildTransactionRowLayout } from "./transactionRowLayout"

type Metadata = Parameters<typeof buildTransactionRowLayout>[0][number]

const blank: Metadata = {
  bankaccount: null,
  import: null,
  billPayment: null,
  installmentCurrent: null,
  installmentTotal: null
}

const credit: Metadata = {
  ...blank,
  bankaccount: {
    id: "20",
    name: "Family credit",
    type: "credit",
    institutionId: null,
    dueDate: 10
  }
}

describe("shared transaction row layout", () => {
  it("derives fixed shared tracks and responsive minimum widths from all loaded metadata", () => {
    const layout = buildTransactionRowLayout(
      [
        blank,
        {
          ...credit,
          import: { id: "31", fileName: "alignment-fixture.csv" },
          installmentCurrent: "1",
          installmentTotal: 123
        },
        {
          ...blank,
          billPayment: { creditAccountId: "20", billMonth: "2026-06" }
        }
      ],
      DEFAULT_TRANSACTION_DISPLAY_PROPERTIES
    )
    expect(layout.slots).toEqual([
      { id: "account-icon", width: 14 },
      { id: "import", width: 14 },
      { id: "status", width: 80, desktopOnly: true },
      { id: "account", width: 96, desktopOnly: true },
      { id: "card", width: 176 },
      { id: "installment", width: 64 },
      { id: "category", width: 128 }
    ])
    expect(layout.columns).toBe("minmax(120px, 1fr) 14px 14px 176px 64px 128px")
    expect(layout.desktopColumns).toBe(
      "minmax(120px, 1fr) 14px 14px 80px 96px 176px 64px 128px"
    )
    expect(layout.minWidth).toBe(892)
    expect(layout.desktopExtraWidth).toBe(200)
  })

  it("reserves the enabled installment track even without values and removes hidden tracks including their gaps", () => {
    const layout = buildTransactionRowLayout(
      [blank],
      DEFAULT_TRANSACTION_DISPLAY_PROPERTIES
    )
    expect(layout.slots).toEqual([
      { id: "installment", width: 64 },
      { id: "category", width: 128 }
    ])
    expect(layout.minWidth).toBe(652)
    const withoutInstallment = buildTransactionRowLayout([blank], {
      ...DEFAULT_TRANSACTION_DISPLAY_PROPERTIES,
      installment: false
    })
    expect(withoutInstallment.slots).toEqual([{ id: "category", width: 128 }])
    expect(layout.minWidth - withoutInstallment.minWidth).toBe(76)
    const hidden = buildTransactionRowLayout([credit], {
      date: false,
      account: false,
      card: false,
      category: false,
      installment: false,
      value: false,
      sourceImport: false
    })
    expect(hidden.slots).toEqual([])
    expect(hidden.columns).toBe("minmax(120px, 1fr)")
    expect(hidden.desktopColumns).toBe(hidden.columns)
    expect(hidden.minWidth).toBe(168)
    expect(hidden.desktopExtraWidth).toBe(0)
  })

  it("keeps the fixed installment width independent of label length, loaded rows and empty results without mutating inputs", () => {
    const transactions: Metadata[] = [
      { ...blank, installmentCurrent: "1", installmentTotal: 9 },
      { ...blank, installmentCurrent: "123456", installmentTotal: 123456 }
    ]
    const before = structuredClone(transactions)
    const layout = buildTransactionRowLayout(
      transactions,
      DEFAULT_TRANSACTION_DISPLAY_PROPERTIES
    )
    expect(layout.slots.find((slot) => slot.id === "installment")?.width).toBe(
      64
    )
    expect(
      buildTransactionRowLayout(
        [...transactions].reverse(),
        DEFAULT_TRANSACTION_DISPLAY_PROPERTIES
      )
    ).toEqual(layout)
    for (const result of [
      transactions.slice(0, 1),
      transactions.slice(1),
      [blank],
      []
    ]) {
      expect(
        buildTransactionRowLayout(
          result,
          DEFAULT_TRANSACTION_DISPLAY_PROPERTIES
        )
      ).toEqual(layout)
    }
    expect(transactions).toEqual(before)
  })

  it("keeps grouped bill status and account tracks without inventing an individual purchase-card track", () => {
    const layout = buildTransactionRowLayout(
      [],
      DEFAULT_TRANSACTION_DISPLAY_PROPERTIES,
      { hasBills: true }
    )
    expect(layout.slots).toEqual([
      { id: "account-icon", width: 14 },
      { id: "status", width: 128 },
      { id: "account", width: 96, desktopOnly: true },
      { id: "installment", width: 64 },
      { id: "category", width: 128 }
    ])
    expect(layout.columns).toBe("minmax(120px, 1fr) 14px 128px 64px 128px")
    expect(layout.desktopExtraWidth).toBe(108)
    expect(layout.slots.some((slot) => slot.id === "card")).toBe(false)
  })
})
