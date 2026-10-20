import type { ImportProfile } from "@fina/types"
import { describe, expect, it } from "vitest"
import {
  configFromSavedMapping,
  savedImportMapping,
  type ImportFileFormat
} from "./savedImportMapping"

const format: ImportFileFormat = {
  fingerprint: "a".repeat(64),
  columnCount: 6,
  hasHeader: true,
  delimiter: ";",
  encoding: "utf-8"
}
const account = { id: "22", type: "credit", institutionId: "c6" }
const profile: ImportProfile = {
  id: "1",
  accountId: "21",
  accountName: "C6 personal",
  accountInstitutionId: "c6",
  accountType: "credit",
  sourceFingerprint: format.fingerprint,
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

describe("saved statement mappings", () => {
  it("reuses a C6 credit format on another C6 credit account", () => {
    expect(
      savedImportMapping({ profiles: [profile], account, format }).profile
    ).toEqual(profile)
  })

  it("prefers the selected account's mapping over newer institution mappings", () => {
    const own = { ...profile, id: "2", accountId: account.id }
    const newer = {
      ...profile,
      updatedAt: "2026-10-20T12:00:00.000Z",
      config: { ...profile.config, chargesPositive: false }
    }
    expect(
      savedImportMapping({ profiles: [newer, own], account, format })
    ).toEqual({ profile: own, choices: [own] })
  })

  it.each([
    { ...account, institutionId: "inter" },
    { ...account, institutionId: null },
    { ...account, type: "checkout" }
  ])(
    "does not share an unrelated mapping with $institutionId/$type",
    (other) => {
      expect(
        savedImportMapping({ profiles: [profile], account: other, format })
      ).toEqual({ profile: null, choices: [] })
    }
  )

  it("does not reuse a different layout or an out-of-range column", () => {
    for (const candidate of [
      { ...profile, sourceFingerprint: "b".repeat(64) },
      { ...profile, config: { ...profile.config, cardLast4Column: 6 } }
    ]) {
      expect(
        savedImportMapping({ profiles: [candidate], account, format })
      ).toEqual({ profile: null, choices: [] })
    }
  })

  it("requires an explicit choice when institution mappings conflict", () => {
    const other = {
      ...profile,
      id: "2",
      accountId: "23",
      updatedAt: "2026-10-20T12:00:00.000Z",
      config: { ...profile.config, cardNameColumn: null }
    }
    expect(
      savedImportMapping({ profiles: [profile, other], account, format })
    ).toEqual({ profile: null, choices: [other, profile] })
  })

  it("treats equivalent mappings as unambiguous despite dialect or omitted optional fields", () => {
    const other: ImportProfile = {
      ...profile,
      id: "2",
      accountId: "23",
      updatedAt: "2026-10-20T12:00:00.000Z",
      config: {
        ...profile.config,
        delimiter: ",",
        encoding: "windows-1252"
      }
    }
    expect(
      savedImportMapping({ profiles: [profile, other], account, format })
        .profile
    ).toEqual(other)
    const withoutCards = { ...profile, config: { ...profile.config } }
    delete withoutCards.config.cardNameColumn
    delete withoutCards.config.cardLast4Column
    const nullCards = {
      ...other,
      config: { ...other.config, cardNameColumn: null, cardLast4Column: null }
    }
    expect(
      savedImportMapping({
        profiles: [withoutCards, nullCards],
        account,
        format
      }).profile
    ).toEqual(nullCards)
  })

  it("restricts headerless formats to their original account", () => {
    const headerless = { ...format, hasHeader: false }
    expect(
      savedImportMapping({ profiles: [profile], account, format: headerless })
        .profile
    ).toBeNull()
    expect(
      savedImportMapping({
        profiles: [profile],
        account: { ...account, id: profile.accountId },
        format: headerless
      }).profile
    ).toEqual(profile)
  })

  it("keeps this file's detected parsing settings without altering saved values", () => {
    const detected: ImportFileFormat = {
      ...format,
      delimiter: ",",
      encoding: "windows-1252"
    }
    expect(configFromSavedMapping(profile, detected)).toEqual({
      ...profile.config,
      delimiter: ",",
      encoding: "windows-1252"
    })
    expect(profile.config.delimiter).toBe(";")
    expect(profile.config.encoding).toBe("utf-8")
  })
})
