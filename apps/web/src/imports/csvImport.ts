import type {
  ImportIssue,
  ImportMappingConfig,
  ImportPreviewSummary,
  NormalizedImportRow
} from "@fina/types"

export type ImportEncoding = "utf-8" | "windows-1252"
export type ImportDelimiter = "," | ";" | "\t" | "|"
export type ImportDateFormat =
  | "DD/MM/YYYY"
  | "MM/DD/YYYY"
  | "YYYY-MM-DD"
  | "YYYY-MM-DDTHH:mm:ss"
export type ImportNumberFormat = "decimal-comma" | "decimal-point"

export type IndexedCsvRow = {
  recordIndex: number
  sourceLine: number
  endLine: number
  cells: string[]
}

export type CsvMatrix = {
  delimiter: ImportDelimiter
  rows: IndexedCsvRow[]
}

export type CsvStructure = {
  delimiter: ImportDelimiter
  headerRecordIndex: number | null
  dataStartRecordIndex: number
  dataEndRecordIndex: number
  columnCount: number
  confidence: "high" | "low"
  evidence: string[]
}

export type MappingSuggestion = {
  dateColumn: number | null
  descriptionColumns: number[]
  amountMode: "signed" | "debit-credit"
  amountColumn: number | null
  debitColumn: number | null
  creditColumn: number | null
  installmentColumn: number | null
  dateFormat: ImportDateFormat | null
  numberFormat: ImportNumberFormat | null
  accountType: "credit" | "checkout" | null
  confidence: "high" | "low"
  evidence: string[]
}

export type RowPreview = {
  sourceRow: number
  date: string | null
  description: string | null
  amount: number | null
  installment: string | null
  excluded: boolean
  exclusionReason?: "empty" | "repeated-header" | "footer" | "user"
  issues: ImportIssue[]
  normalized: NormalizedImportRow | null
}

export type NormalizationResult = {
  rows: RowPreview[]
  normalizedRows: NormalizedImportRow[]
  issues: ImportIssue[]
  summary: ImportPreviewSummary
}

const delimiters: ImportDelimiter[] = [",", ";", "\t", "|"]
const dateAliases = [
  "date",
  "data",
  "posted date",
  "transaction date",
  "data lancamento",
  "data movimento"
]
const amountAliases = [
  "amount",
  "value",
  "valor",
  "transaction amount",
  "montante"
]
const debitAliases = ["debit", "debito", "withdrawal", "saida"]
const creditAliases = ["credit", "credito", "deposit", "entrada"]
const descriptionAliases = [
  "description",
  "descricao",
  "memo",
  "history",
  "historico",
  "details",
  "detalhes",
  "merchant"
]
const installmentAliases = ["installment", "parcela", "parcelas"]
const balanceAliases = ["balance", "saldo"]

export function decodeCsv(
  bytes: Uint8Array,
  encodingOverride?: ImportEncoding
): { text: string; encoding: ImportEncoding; usedFallback: boolean } {
  if (encodingOverride) {
    return {
      text: stripBom(new TextDecoder(encodingOverride).decode(bytes)),
      encoding: encodingOverride,
      usedFallback: false
    }
  }

  try {
    return {
      text: stripBom(new TextDecoder("utf-8", { fatal: true }).decode(bytes)),
      encoding: "utf-8",
      usedFallback: false
    }
  } catch {
    return {
      text: stripBom(new TextDecoder("windows-1252").decode(bytes)),
      encoding: "windows-1252",
      usedFallback: true
    }
  }
}

export function parseCsvMatrix(
  text: string,
  delimiter: ImportDelimiter
): CsvMatrix {
  const rows: IndexedCsvRow[] = []
  let cells: string[] = []
  let field = ""
  let inQuotes = false
  let sourceLine = 1
  let currentLine = 1

  const finishRecord = () => {
    cells.push(field)
    rows.push({
      recordIndex: rows.length,
      sourceLine,
      endLine: currentLine,
      cells
    })
    cells = []
    field = ""
    sourceLine = currentLine + 1
  }

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    if (inQuotes) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"'
          index += 1
        } else {
          inQuotes = false
        }
      } else {
        field += character
        if (character === "\n") currentLine += 1
      }
      continue
    }

    if (character === '"' && field.length === 0) {
      inQuotes = true
    } else if (character === delimiter) {
      cells.push(field)
      field = ""
    } else if (character === "\r" || character === "\n") {
      if (character === "\r" && text[index + 1] === "\n") index += 1
      finishRecord()
      currentLine += 1
    } else {
      field += character
    }
  }

  if (field.length > 0 || cells.length > 0 || text.length === 0) finishRecord()
  return { delimiter, rows }
}

export function detectCsvStructure(
  text: string,
  delimiterOverride?: ImportDelimiter
): {
  matrix: CsvMatrix
  structure: CsvStructure
  candidates: CsvStructure[]
} {
  const candidates = (delimiterOverride ? [delimiterOverride] : delimiters).map(
    (delimiter) => {
      const matrix = parseCsvMatrix(text, delimiter)
      return { matrix, structure: detectStructureForMatrix(matrix) }
    }
  )
  candidates.sort(
    (left, right) =>
      structureScore(right.structure, right.matrix) -
      structureScore(left.structure, left.matrix)
  )
  const selected = candidates[0]
  return {
    matrix: selected.matrix,
    structure: selected.structure,
    candidates: candidates.map(({ structure }) => structure)
  }
}

function detectStructureForMatrix(matrix: CsvMatrix): CsvStructure {
  const meaningfulRows = matrix.rows.filter((row) => !isEmptyRow(row))
  const widthCounts = new Map<number, number>()
  meaningfulRows.forEach((row) => {
    if (row.cells.length > 1) {
      widthCounts.set(
        row.cells.length,
        (widthCounts.get(row.cells.length) ?? 0) + 1
      )
    }
  })
  const columnCount =
    [...widthCounts.entries()]
      .map(([width, count]) => {
        const rows = meaningfulRows.filter((row) => row.cells.length === width)
        const strongestHeader = rows.reduce((strongest, row) => {
          const aliases = row.cells.filter(
            (cell) => knownHeaderKind(cell) !== null
          ).length
          const following = rows.filter(
            (candidate) =>
              candidate.recordIndex > row.recordIndex &&
              candidate.recordIndex <= row.recordIndex + 12
          ).length
          return Math.max(strongest, aliases * 10 + following * 2)
        }, 0)
        return { width, score: count * 3 + width + strongestHeader }
      })
      .sort(
        (left, right) => right.score - left.score || right.width - left.width
      )[0]?.width ?? 1

  const matching = meaningfulRows.filter(
    (row) => row.cells.length === columnCount
  )
  const firstMatching = matching[0]?.recordIndex ?? 0
  let headerRecordIndex: number | null = null
  let bestHeaderScore = Number.NEGATIVE_INFINITY

  for (const row of matching.slice(0, 40)) {
    const laterMatching = matching.filter(
      (candidate) =>
        candidate.recordIndex > row.recordIndex &&
        candidate.recordIndex <= row.recordIndex + 12
    ).length
    if (laterMatching === 0) continue
    const aliases = row.cells.reduce(
      (count, cell) => count + (knownHeaderKind(cell) ? 1 : 0),
      0
    )
    const textCells = row.cells.filter(
      (cell) =>
        normalizeHeader(cell).length > 0 &&
        !looksNumeric(cell) &&
        !looksDate(cell)
    ).length
    const nextRows = matching.filter(
      (candidate) =>
        candidate.recordIndex > row.recordIndex &&
        candidate.recordIndex <= row.recordIndex + 8
    )
    const dataEvidence = nextRows.reduce(
      (score, candidate) =>
        score +
        (candidate.cells.some(looksDate) ? 1 : 0) +
        (candidate.cells.some(looksNumeric) ? 1 : 0),
      0
    )
    const score = laterMatching * 3 + aliases * 8 + textCells + dataEvidence * 2
    if (score > bestHeaderScore) {
      bestHeaderScore = score
      headerRecordIndex = row.recordIndex
    }
  }

  const header =
    headerRecordIndex === null ? null : (matrix.rows[headerRecordIndex] ?? null)
  const aliasCount =
    header?.cells.filter((cell) => knownHeaderKind(cell) !== null).length ?? 0
  const hasHeader =
    header !== null &&
    (aliasCount >= 2 ||
      header.cells.filter((cell) => !looksNumeric(cell) && !looksDate(cell))
        .length >= Math.ceil(columnCount * 0.7))
  if (!hasHeader) headerRecordIndex = null

  const dataStartRecordIndex =
    headerRecordIndex === null ? firstMatching : headerRecordIndex + 1
  const consistentRows = matching.filter(
    (row) => row.recordIndex >= dataStartRecordIndex
  ).length
  const confidence =
    columnCount > 1 &&
    consistentRows >= 2 &&
    (aliasCount >= 2 || consistentRows >= 4)
      ? "high"
      : "low"
  const evidence = [
    `${consistentRows} rows use ${columnCount} columns`,
    headerRecordIndex === null
      ? "No reliable header row was found"
      : `Header detected on physical line ${matrix.rows[headerRecordIndex]?.sourceLine ?? 1}`
  ]

  return {
    delimiter: matrix.delimiter,
    headerRecordIndex,
    dataStartRecordIndex,
    dataEndRecordIndex: Math.max(dataStartRecordIndex, matrix.rows.length - 1),
    columnCount,
    confidence,
    evidence
  }
}

export function inferFieldMapping(
  matrix: CsvMatrix,
  structure: CsvStructure
): MappingSuggestion {
  const header =
    structure.headerRecordIndex === null
      ? []
      : (matrix.rows[structure.headerRecordIndex]?.cells ?? [])
  const sample = matrix.rows
    .slice(structure.dataStartRecordIndex, structure.dataEndRecordIndex + 1)
    .filter(
      (row) =>
        !isEmptyRow(row) &&
        row.cells.length === structure.columnCount &&
        !isRepeatedHeader(row, header)
    )
    .slice(0, 100)

  const aliasIndexes = (aliases: string[]) =>
    header.flatMap((cell, index) =>
      matchesAlias(cell, aliases) ? [index] : []
    )
  const dateAlias = aliasIndexes(dateAliases)[0] ?? null
  const amountAlias =
    aliasIndexes(amountAliases).find(
      (index) => !matchesAlias(header[index] ?? "", balanceAliases)
    ) ?? null
  const debitColumn = aliasIndexes(debitAliases)[0] ?? null
  const creditColumn = aliasIndexes(creditAliases)[0] ?? null
  const descriptionColumns = aliasIndexes(descriptionAliases)
  const installmentColumn = aliasIndexes(installmentAliases)[0] ?? null

  const columnIndexes = Array.from(
    { length: structure.columnCount },
    (_, index) => index
  )
  const dateColumn =
    dateAlias ??
    columnIndexes
      .map((index) => ({
        index,
        matches: sample.filter((row) => looksDate(row.cells[index] ?? ""))
          .length
      }))
      .sort((left, right) => right.matches - left.matches)[0]?.index ??
    null
  const inferredAmount =
    amountAlias ??
    columnIndexes
      .filter((index) => !matchesAlias(header[index] ?? "", balanceAliases))
      .map((index) => ({
        index,
        matches: sample.filter((row) => looksNumeric(row.cells[index] ?? ""))
          .length
      }))
      .sort((left, right) => right.matches - left.matches)[0]?.index ??
    null

  const dateInference = inferDateFormat(
    dateColumn === null ? [] : sample.map((row) => row.cells[dateColumn] ?? "")
  )
  const numberSamples =
    debitColumn !== null && creditColumn !== null
      ? sample.flatMap((row) => [
          row.cells[debitColumn] ?? "",
          row.cells[creditColumn] ?? ""
        ])
      : inferredAmount === null
        ? []
        : sample.map((row) => row.cells[inferredAmount] ?? "")
  const numberInference = inferNumberFormat(numberSamples)
  const amountMode =
    debitColumn !== null && creditColumn !== null ? "debit-credit" : "signed"
  const strongMapping =
    dateColumn !== null &&
    (amountMode === "debit-credit" || inferredAmount !== null) &&
    dateInference.format !== null &&
    numberInference.format !== null

  return {
    dateColumn,
    descriptionColumns,
    amountMode,
    amountColumn: amountMode === "signed" ? inferredAmount : null,
    debitColumn,
    creditColumn,
    installmentColumn,
    dateFormat: dateInference.format,
    numberFormat: numberInference.format,
    accountType:
      installmentColumn !== null
        ? "credit"
        : header.some((cell) => matchesAlias(cell, balanceAliases))
          ? "checkout"
          : null,
    confidence:
      strongMapping &&
      structure.confidence === "high" &&
      dateInference.confidence === "high" &&
      numberInference.confidence === "high"
        ? "high"
        : "low",
    evidence: [dateInference.evidence, numberInference.evidence]
  }
}

export function normalizeImportRows({
  matrix,
  structure,
  config,
  excludedRows = new Set<number>()
}: {
  matrix: CsvMatrix
  structure: CsvStructure
  config: ImportMappingConfig
  excludedRows?: ReadonlySet<number>
}): NormalizationResult {
  const header =
    structure.headerRecordIndex === null
      ? []
      : (matrix.rows[structure.headerRecordIndex]?.cells ?? [])
  const previews: RowPreview[] = []
  const issues: ImportIssue[] = []
  let hasSeenTransaction = false

  for (const row of matrix.rows.slice(
    structure.dataStartRecordIndex,
    structure.dataEndRecordIndex + 1
  )) {
    const automaticReason = exclusionReason(
      row,
      header,
      config,
      hasSeenTransaction
    )
    const userExcluded = excludedRows.has(row.sourceLine)
    if (automaticReason || userExcluded) {
      previews.push({
        sourceRow: row.sourceLine,
        date: null,
        description: null,
        amount: null,
        installment: null,
        excluded: true,
        exclusionReason: userExcluded ? "user" : (automaticReason ?? undefined),
        issues: [],
        normalized: null
      })
      continue
    }

    hasSeenTransaction = true
    const rowIssues: ImportIssue[] = []
    const date = parseImportDate(
      row.cells[config.dateColumn] ?? "",
      config.dateFormat
    )
    if (!date) {
      rowIssues.push(
        issue(
          row.sourceLine,
          "date",
          "INVALID_DATE",
          "Choose a date format that matches this row",
          "error"
        )
      )
    }

    const amount = parseMappedAmount(row.cells, config)
    if (amount.error) {
      rowIssues.push(
        issue(row.sourceLine, "amount", amount.error, amount.message, "error")
      )
    }

    const descriptionText = config.descriptionColumns
      .map((index) => (row.cells[index] ?? "").trim())
      .filter(Boolean)
      .join(" - ")
    const description = descriptionText.length > 0 ? descriptionText : null
    if (!description) {
      rowIssues.push(
        issue(
          row.sourceLine,
          "description",
          "MISSING_DESCRIPTION",
          "This transaction has no description",
          "warning"
        )
      )
    } else if (description.length > 500) {
      rowIssues.push(
        issue(
          row.sourceLine,
          "description",
          "DESCRIPTION_TOO_LONG",
          "The composed description is too long",
          "error"
        )
      )
    }

    const installment = parseInstallment(
      config.installmentColumn === null
        ? ""
        : (row.cells[config.installmentColumn] ?? "")
    )
    if (installment.error) {
      rowIssues.push(
        issue(
          row.sourceLine,
          "installment",
          "INVALID_INSTALLMENT",
          "Installment must use current/total form",
          "error"
        )
      )
    }

    const normalized =
      date &&
      amount.value !== null &&
      !rowIssues.some((item) => item.severity === "error")
        ? {
            sourceRow: row.sourceLine,
            date,
            amount: amount.value,
            description,
            installmentCurrent: installment.current,
            installmentTotal: installment.total
          }
        : null
    issues.push(...rowIssues)
    previews.push({
      sourceRow: row.sourceLine,
      date,
      description,
      amount: amount.value,
      installment:
        installment.current === null
          ? null
          : `${installment.current}/${installment.total}`,
      excluded: false,
      issues: rowIssues,
      normalized
    })
  }

  const normalizedRows = previews.flatMap((row) =>
    row.normalized === null ? [] : [row.normalized]
  )
  return {
    rows: previews,
    normalizedRows,
    issues,
    summary: summarizeImport(previews)
  }
}

export function summarizeImport(rows: RowPreview[]): ImportPreviewSummary {
  const included = rows.filter((row) => !row.excluded)
  const normalized = included.flatMap((row) =>
    row.normalized === null ? [] : [row.normalized]
  )
  const dates = normalized.map((row) => row.date).sort()
  const errors = included
    .flatMap((row) => row.issues)
    .filter((issue) => issue.severity === "error")
  const warnings = included
    .flatMap((row) => row.issues)
    .filter((issue) => issue.severity === "warning")
  const inflows = normalized.filter((row) => row.amount > 0)
  const outflows = normalized.filter((row) => row.amount < 0)
  return {
    includedRowCount: included.length,
    excludedRowCount: rows.length - included.length,
    errorCount: errors.length,
    warningCount: warnings.length,
    dateStart: dates[0] ?? null,
    dateEnd: dates.at(-1) ?? null,
    inflowCount: inflows.length,
    inflowTotal: roundMoney(
      inflows.reduce((total, row) => total + row.amount, 0)
    ),
    outflowCount: outflows.length,
    outflowTotal: roundMoney(
      outflows.reduce((total, row) => total + row.amount, 0)
    )
  }
}

export function parseImportDate(
  input: string,
  format: ImportDateFormat
): string | null {
  const value = input.trim()
  let year: number
  let month: number
  let day: number
  if (format === "DD/MM/YYYY" || format === "MM/DD/YYYY") {
    const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value)
    if (!match) return null
    const first = Number(match[1])
    const second = Number(match[2])
    year = Number(match[3])
    month = format === "DD/MM/YYYY" ? second : first
    day = format === "DD/MM/YYYY" ? first : second
  } else {
    const match =
      /^(\d{4})-(\d{2})-(\d{2})(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/.exec(
        value
      )
    if (!match) return null
    year = Number(match[1])
    month = Number(match[2])
    day = Number(match[3])
  }
  if (!isCalendarDate(year, month, day)) return null
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`
}

export function parseImportNumber(
  input: string,
  format: ImportNumberFormat
): number | null {
  let value = input.trim().replace(/\u00a0/g, "")
  if (!value) return null
  let negativeByParentheses = false
  if (value.startsWith("(") && value.endsWith(")")) {
    negativeByParentheses = true
    value = value.slice(1, -1).trim()
  }
  const decimal = format === "decimal-comma" ? "," : "."
  const grouping = format === "decimal-comma" ? "." : ","
  const escapedDecimal = decimal === "." ? "\\." : decimal
  const escapedGrouping = grouping === "." ? "\\." : grouping
  const pattern = new RegExp(
    `^[+-]?(?:\\d{1,3}(?:${escapedGrouping}\\d{3})+|\\d+)(?:${escapedDecimal}\\d+)?$`
  )
  if (!pattern.test(value)) return null
  const normalized = value.split(grouping).join("").replace(decimal, ".")
  const parsed = Number(normalized)
  if (
    !Number.isFinite(parsed) ||
    !Number.isSafeInteger(Math.round(parsed * 100))
  )
    return null
  const result = negativeByParentheses ? -Math.abs(parsed) : parsed
  return Math.abs(result) <= 1_000_000_000_000 ? result : null
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const source = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer
  const digest = await crypto.subtle.digest("SHA-256", source)
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")
}

export async function structuralFingerprint(
  matrix: CsvMatrix,
  structure: CsvStructure
): Promise<string> {
  const headers =
    structure.headerRecordIndex === null
      ? Array.from(
          { length: structure.columnCount },
          (_, index) => `column-${index}`
        )
      : (matrix.rows[structure.headerRecordIndex]?.cells ?? []).map(
          normalizeHeader
        )
  return sha256Hex(
    new TextEncoder().encode(
      JSON.stringify({ version: 1, columns: structure.columnCount, headers })
    )
  )
}

function inferDateFormat(values: string[]): {
  format: ImportDateFormat | null
  confidence: "high" | "low"
  evidence: string
} {
  const nonEmpty = values.map((value) => value.trim()).filter(Boolean)
  if (nonEmpty.length === 0)
    return {
      format: null,
      confidence: "low",
      evidence: "No date samples were found"
    }
  const isoMatches = nonEmpty.filter((value) =>
    /^\d{4}-\d{2}-\d{2}(?:[T ].*)?$/.test(value)
  ).length
  if (isoMatches / nonEmpty.length >= 0.8) {
    return {
      format: "YYYY-MM-DD",
      confidence: "high",
      evidence: "Dates use an ISO year-first form"
    }
  }
  const slashValues = nonEmpty.flatMap((value) => {
    const match = /^(\d{1,2})\/(\d{1,2})\/\d{4}$/.exec(value)
    return match ? [{ first: Number(match[1]), second: Number(match[2]) }] : []
  })
  if (slashValues.length / nonEmpty.length < 0.8) {
    return {
      format: null,
      confidence: "low",
      evidence: "Date samples are structurally inconsistent"
    }
  }
  const dayFirstEvidence = slashValues.some(
    ({ first, second }) => first > 12 && second <= 12
  )
  const monthFirstEvidence = slashValues.some(
    ({ first, second }) => second > 12 && first <= 12
  )
  if (dayFirstEvidence && !monthFirstEvidence) {
    return {
      format: "DD/MM/YYYY",
      confidence: "high",
      evidence: "Observed day values greater than 12"
    }
  }
  if (monthFirstEvidence && !dayFirstEvidence) {
    return {
      format: "MM/DD/YYYY",
      confidence: "high",
      evidence: "Observed month-first values greater than 12"
    }
  }
  return {
    format: null,
    confidence: "low",
    evidence: "Slash dates are ambiguous; choose day-first or month-first"
  }
}

function inferNumberFormat(values: string[]): {
  format: ImportNumberFormat | null
  confidence: "high" | "low"
  evidence: string
} {
  const nonEmpty = values.map((value) => value.trim()).filter(Boolean)
  if (nonEmpty.length === 0)
    return {
      format: null,
      confidence: "low",
      evidence: "No amount samples were found"
    }
  let commaEvidence = 0
  let pointEvidence = 0
  nonEmpty.forEach((value) => {
    const comma = value.lastIndexOf(",")
    const point = value.lastIndexOf(".")
    if (comma >= 0 && point >= 0) {
      if (comma > point) commaEvidence += 2
      else pointEvidence += 2
    } else if (comma >= 0 && /^.*,[0-9]{1,2}$/.test(value)) {
      commaEvidence += 1
    } else if (point >= 0 && /^.*\.[0-9]{1,2}$/.test(value)) {
      pointEvidence += 1
    }
  })
  if (commaEvidence > pointEvidence && commaEvidence > 0) {
    return {
      format: "decimal-comma",
      confidence: "high",
      evidence: "Amounts use comma decimals"
    }
  }
  if (pointEvidence > commaEvidence && pointEvidence > 0) {
    return {
      format: "decimal-point",
      confidence: "high",
      evidence: "Amounts use point decimals"
    }
  }
  if (nonEmpty.every((value) => /^[+-]?\d+$/.test(value))) {
    return {
      format: "decimal-point",
      confidence: "low",
      evidence: "Integer-only amounts do not reveal a decimal convention"
    }
  }
  return {
    format: null,
    confidence: "low",
    evidence: "Amount separators are inconsistent; choose a number format"
  }
}

function parseMappedAmount(
  cells: string[],
  config: ImportMappingConfig
): { value: number | null; error?: string; message: string } {
  if (config.amountMode === "signed") {
    const raw =
      config.amountColumn === null ? "" : (cells[config.amountColumn] ?? "")
    const parsed = parseImportNumber(raw, config.numberFormat)
    if (parsed === null)
      return {
        value: null,
        error: "INVALID_AMOUNT",
        message: "Choose a number format that matches this row"
      }
    const value = config.chargesPositive ? -Math.abs(parsed) : parsed
    return { value, message: "" }
  }
  const debitRaw =
    config.debitColumn === null ? "" : (cells[config.debitColumn] ?? "")
  const creditRaw =
    config.creditColumn === null ? "" : (cells[config.creditColumn] ?? "")
  const debitMeaningful =
    debitRaw.trim() !== "" &&
    parseImportNumber(debitRaw, config.numberFormat) !== 0
  const creditMeaningful =
    creditRaw.trim() !== "" &&
    parseImportNumber(creditRaw, config.numberFormat) !== 0
  const debit =
    debitRaw.trim() === ""
      ? 0
      : parseImportNumber(debitRaw, config.numberFormat)
  const credit =
    creditRaw.trim() === ""
      ? 0
      : parseImportNumber(creditRaw, config.numberFormat)
  if (debit === null || credit === null)
    return {
      value: null,
      error: "INVALID_AMOUNT",
      message: "Debit or credit has an invalid number"
    }
  if (debitMeaningful && creditMeaningful)
    return {
      value: null,
      error: "BOTH_DEBIT_AND_CREDIT",
      message: "A row cannot contain both a debit and a credit"
    }
  if (!debitMeaningful && !creditMeaningful) return { value: 0, message: "" }
  return {
    value: debitMeaningful ? -Math.abs(debit) : Math.abs(credit),
    message: ""
  }
}

function parseInstallment(value: string): {
  current: number | null
  total: number | null
  error: boolean
} {
  if (!value.trim()) return { current: null, total: null, error: false }
  const match = /^(\d+)\s*\/\s*(\d+)$/.exec(value.trim())
  if (!match) return { current: null, total: null, error: false }
  const current = Number(match[1])
  const total = Number(match[2])
  return current >= 1 && total >= current
    ? { current, total, error: false }
    : { current: null, total: null, error: true }
}

function exclusionReason(
  row: IndexedCsvRow,
  header: string[],
  config: ImportMappingConfig,
  hasSeenTransaction: boolean
): "empty" | "repeated-header" | "footer" | null {
  if (isEmptyRow(row)) return "empty"
  if (isRepeatedHeader(row, header)) return "repeated-header"
  if (!hasSeenTransaction) return null
  const dateCell = row.cells[config.dateColumn] ?? ""
  const amountCells =
    config.amountMode === "signed"
      ? [
          config.amountColumn === null
            ? ""
            : (row.cells[config.amountColumn] ?? "")
        ]
      : [
          config.debitColumn === null
            ? ""
            : (row.cells[config.debitColumn] ?? ""),
          config.creditColumn === null
            ? ""
            : (row.cells[config.creditColumn] ?? "")
        ]
  const nonEmptyCount = row.cells.filter((cell) => cell.trim()).length
  if (
    nonEmptyCount <= 2 &&
    !looksDate(dateCell) &&
    !amountCells.some((value) => looksNumeric(value))
  )
    return "footer"
  return null
}

function issue(
  sourceRow: number,
  field: ImportIssue["field"],
  code: string,
  message: string,
  severity: ImportIssue["severity"]
): ImportIssue {
  return { sourceRow, field, code, message, severity }
}

function structureScore(structure: CsvStructure, matrix: CsvMatrix): number {
  const matching = matrix.rows.filter(
    (row) => !isEmptyRow(row) && row.cells.length === structure.columnCount
  ).length
  return (
    matching * Math.max(structure.columnCount, 1) +
    (structure.confidence === "high" ? 20 : 0)
  )
}

function knownHeaderKind(value: string): string | null {
  const lists = [
    dateAliases,
    amountAliases,
    debitAliases,
    creditAliases,
    descriptionAliases,
    installmentAliases,
    balanceAliases
  ]
  return lists.find((aliases) => matchesAlias(value, aliases))?.[0] ?? null
}

function matchesAlias(value: string, aliases: string[]): boolean {
  const normalized = normalizeHeader(value)
  return aliases.some(
    (alias) => normalized === alias || normalized.includes(alias)
  )
}

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("en")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
}

function looksNumeric(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false
  return (
    parseImportNumber(trimmed, "decimal-comma") !== null ||
    parseImportNumber(trimmed, "decimal-point") !== null
  )
}

function looksDate(value: string): boolean {
  const trimmed = value.trim()
  return (
    /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed) ||
    /^\d{4}-\d{2}-\d{2}/.test(trimmed)
  )
}

function isEmptyRow(row: IndexedCsvRow): boolean {
  return row.cells.every((cell) => cell.trim() === "")
}

function isRepeatedHeader(row: IndexedCsvRow, header: string[]): boolean {
  if (header.length === 0 || row.cells.length !== header.length) return false
  return row.cells.every(
    (cell, index) =>
      normalizeHeader(cell) === normalizeHeader(header[index] ?? "")
  )
}

function isCalendarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false
  const value = new Date(Date.UTC(year, month - 1, day))
  return (
    value.getUTCFullYear() === year &&
    value.getUTCMonth() === month - 1 &&
    value.getUTCDate() === day
  )
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function stripBom(value: string): string {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value
}
