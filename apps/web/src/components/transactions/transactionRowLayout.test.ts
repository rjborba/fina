import { describe, expect, it } from "vitest"
import {
  DEFAULT_TRANSACTION_DISPLAY_PROPERTIES,
  normalizeTransactionDisplayProperties
} from "./transactionDisplay"
import { buildTransactionRowLayout } from "./transactionRowLayout"

type Metadata = Parameters<typeof buildTransactionRowLayout>[0][number]

const blank: Metadata = {
  bankaccount: null,
  cardName: null,
  cardLast4: null,
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
  it("keeps the card-name track for unidentified credit purchases but not checking purchases or derived bills", () => {
    const unidentified = buildTransactionRowLayout(
      [credit],
      DEFAULT_TRANSACTION_DISPLAY_PROPERTIES
    )
    expect(unidentified.slots).toContainEqual({ id: "card", width: 144 })
    const identified = buildTransactionRowLayout(
      [
        {
          ...credit,
          cardName: "Travel",
          cardLast4: "0042"
        }
      ],
      DEFAULT_TRANSACTION_DISPLAY_PROPERTIES
    )
    expect(identified).toEqual(unidentified)
    const hidden = buildTransactionRowLayout([credit], {
      ...DEFAULT_TRANSACTION_DISPLAY_PROPERTIES,
      card: false
    })
    expect(hidden.slots.some((slot) => slot.id === "card")).toBe(false)
    const checking = {
      ...credit,
      bankaccount: {
        ...credit.bankaccount!,
        type: "checkout" as const,
        dueDate: null
      }
    }
    expect(
      buildTransactionRowLayout(
        [checking],
        DEFAULT_TRANSACTION_DISPLAY_PROPERTIES
      ).slots.some((slot) => slot.id === "card")
    ).toBe(false)
  })
  it("ignores legacy icon visibility flags and only restores allowlisted text preferences", () => {
    const legacy = {
      account: true,
      sourceImport: false,
      card: false,
      category: false,
      cardNumber: "true",
      unknown: "discarded"
    }
    const before = structuredClone(legacy)
    const properties = normalizeTransactionDisplayProperties(legacy)
    expect(properties).toEqual({
      ...DEFAULT_TRANSACTION_DISPLAY_PROPERTIES,
      card: false,
      category: false
    })
    expect(legacy).toEqual(before)
    const layout = buildTransactionRowLayout(
      [{ ...credit, import: { id: "31", fileName: "fixture.csv" } }],
      properties
    )
    expect(layout.slots).toEqual([{ id: "installment", width: 40 }])
    expect(
      normalizeTransactionDisplayProperties({
        accountName: true,
        cardNumber: true,
        category: false
      })
    ).toEqual({
      ...DEFAULT_TRANSACTION_DISPLAY_PROPERTIES,
      accountName: true,
      cardNumber: true,
      category: false
    })
  })

  it("derives fixed shared tracks and responsive minimum widths from all loaded metadata", () => {
    const layout = buildTransactionRowLayout(
      [
        blank,
        {
          ...credit,
          cardName: "Travel",
          cardLast4: "0042",
          import: { id: "31", fileName: "alignment-fixture.csv" },
          installmentCurrent: "1",
          installmentTotal: 123
        },
        {
          ...blank,
          billPayment: { creditAccountId: "20", billMonth: "2026-06" }
        }
      ],
      {
        ...DEFAULT_TRANSACTION_DISPLAY_PROPERTIES,
        accountName: true,
        cardNumber: true
      }
    )
    expect(layout.slots).toEqual([
      { id: "status", width: 80, desktopOnly: true },
      { id: "account", width: 128 },
      { id: "card", width: 144 },
      { id: "card-number", width: 56 },
      { id: "installment", width: 40 },
      { id: "category", width: 112 }
    ])
    expect(layout.columns).toBe(
      "minmax(120px, 1fr) 128px 144px 56px 40px 112px"
    )
    expect(layout.desktopColumns).toBe(
      "minmax(120px, 1fr) 80px 128px 144px 56px 40px 112px"
    )
    expect(layout.minWidth).toBe(956)
    expect(layout.desktopExtraWidth).toBe(88)
  })

  it("reserves the enabled installment track even without values and removes hidden tracks including their gaps", () => {
    const layout = buildTransactionRowLayout(
      [blank],
      DEFAULT_TRANSACTION_DISPLAY_PROPERTIES
    )
    expect(layout.slots).toEqual([
      { id: "installment", width: 40 },
      { id: "category", width: 112 }
    ])
    expect(layout.minWidth).toBe(604)
    const withoutInstallment = buildTransactionRowLayout([blank], {
      ...DEFAULT_TRANSACTION_DISPLAY_PROPERTIES,
      installment: false
    })
    expect(withoutInstallment.slots).toEqual([{ id: "category", width: 112 }])
    expect(layout.minWidth - withoutInstallment.minWidth).toBe(48)
    const hidden = buildTransactionRowLayout([credit], {
      date: false,
      accountName: false,
      card: false,
      cardNumber: false,
      category: false,
      installment: false,
      value: false
    })
    expect(hidden.slots).toEqual([])
    expect(hidden.columns).toBe("minmax(120px, 1fr)")
    expect(hidden.desktopColumns).toBe(hidden.columns)
    expect(hidden.minWidth).toBe(208)
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
      40
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
      { id: "status", width: 128 },
      { id: "installment", width: 40 },
      { id: "category", width: 112 }
    ])
    expect(layout.columns).toBe("minmax(120px, 1fr) 128px 40px 112px")
    expect(layout.desktopExtraWidth).toBe(0)
    expect(layout.slots.some((slot) => slot.id === "card")).toBe(false)
  })
})
