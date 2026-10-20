import type { ImportMappingConfig, ImportProfile } from "@fina/types"
import type { ImportDelimiter, ImportEncoding } from "./csvImport"

type MappingAccount = {
  id: string
  type: string
  institutionId: string | null
}

export type ImportFileFormat = {
  fingerprint: string
  columnCount: number
  hasHeader: boolean
  delimiter: ImportDelimiter
  encoding: ImportEncoding
}

export function savedImportMapping({
  profiles,
  account,
  format
}: {
  profiles: readonly ImportProfile[]
  account: MappingAccount
  format: ImportFileFormat
}): { profile: ImportProfile | null; choices: ImportProfile[] } {
  const matching = profiles.filter(
    (profile) =>
      profile.sourceFingerprint === format.fingerprint &&
      profile.accountType === account.type &&
      mappedColumns(profile.config).every(
        (column) => column < format.columnCount
      )
  )
  const own = matching.find((profile) => profile.accountId === account.id)
  if (own) return { profile: own, choices: [own] }

  // Column counts alone cannot identify a headerless bank export. Generic
  // institutions also do not establish a shared statement format.
  if (!format.hasHeader || !account.institutionId) {
    return { profile: null, choices: [] }
  }
  const choices = matching
    .filter((profile) => profile.accountInstitutionId === account.institutionId)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
  const keys = new Set(
    choices.map((profile) => JSON.stringify(mappingValues(profile.config)))
  )
  return { profile: keys.size === 1 ? choices[0] : null, choices }
}

export function configFromSavedMapping(
  profile: ImportProfile,
  format: ImportFileFormat
): ImportMappingConfig {
  return {
    ...profile.config,
    // The fingerprint identifies columns, not CSV dialect or preamble length.
    // Keep the parsing settings verified against this file's actual bytes.
    delimiter: format.delimiter,
    encoding: format.encoding,
    hasHeader: format.hasHeader
  }
}

function mappedColumns(config: ImportMappingConfig): number[] {
  return [
    config.dateColumn,
    ...config.descriptionColumns,
    config.installmentColumn,
    config.cardNameColumn,
    config.cardLast4Column,
    ...(config.amountMode === "signed"
      ? [config.amountColumn]
      : [config.debitColumn, config.creditColumn])
  ].filter((column): column is number => column != null)
}

function mappingValues(config: ImportMappingConfig) {
  return {
    dateFormat: config.dateFormat,
    numberFormat: config.numberFormat,
    dateColumn: config.dateColumn,
    descriptionColumns: config.descriptionColumns,
    installmentColumn: config.installmentColumn,
    cardNameColumn: config.cardNameColumn ?? null,
    cardLast4Column: config.cardLast4Column ?? null,
    amountMode: config.amountMode,
    amountColumn: config.amountMode === "signed" ? config.amountColumn : null,
    debitColumn:
      config.amountMode === "debit-credit" ? config.debitColumn : null,
    creditColumn:
      config.amountMode === "debit-credit" ? config.creditColumn : null,
    chargesPositive: config.amountMode === "signed" && config.chargesPositive
  }
}
