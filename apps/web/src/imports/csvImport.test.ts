import { describe, expect, it } from "vitest"
import {
  decodeCsv,
  detectCsvStructure,
  inferFieldMapping,
  normalizeImportRows,
  parseCsvMatrix,
  parseImportDate,
  parseImportNumber,
  structuralFingerprint
} from "./csvImport"

const referenceShape = [
  "Synthetic statement;",
  "Account type;Checking",
  "Period;August 2026",
  "Generated;01/09/2026",
  "",
  "Date;Description;Details;Amount;Balance",
  '01/08/2026;Opening item;Synthetic note;"1.234,56";"1.234,56"',
  '15/08/2026;Store;Invented purchase;"-34,20";"1.200,36"',
  '28/08/2026;Transfer;Synthetic transfer;"200,00";"1.400,36"'
].join("\n")

describe("CSV import parsing", () => {
  it("detects a semicolon header on physical line 6 and data on line 7", () => {
    const { matrix, structure } = detectCsvStructure(referenceShape)
    const mapping = inferFieldMapping(matrix, structure)

    expect(structure).toMatchObject({
      delimiter: ";",
      headerRecordIndex: 5,
      dataStartRecordIndex: 6,
      columnCount: 5,
      confidence: "high"
    })
    expect(matrix.rows[structure.headerRecordIndex!]?.sourceLine).toBe(6)
    expect(matrix.rows[structure.dataStartRecordIndex]?.sourceLine).toBe(7)
    expect(mapping).toMatchObject({
      dateColumn: 0,
      descriptionColumns: [1, 2],
      amountColumn: 3,
      dateFormat: "DD/MM/YYYY",
      numberFormat: "decimal-comma",
      confidence: "high"
    })
  })

  it("does not let several narrow metadata rows beat a short consistent table", () => {
    const short = referenceShape.split("\n").slice(0, 8).join("\n")
    const { matrix, structure } = detectCsvStructure(short)
    expect(matrix.rows[structure.headerRecordIndex!]?.sourceLine).toBe(6)
    expect(matrix.rows[structure.dataStartRecordIndex]?.sourceLine).toBe(7)
  })

  it.each([
    [",", "Date,Description,Amount\n2026-08-01,Coffee,-2.50"],
    [";", "Date;Description;Amount\n2026-08-01;Coffee;-2.50"],
    ["\t", "Date\tDescription\tAmount\n2026-08-01\tCoffee\t-2.50"]
  ] as const)("detects %s-delimited input", (delimiter, text) => {
    expect(detectCsvStructure(text).structure.delimiter).toBe(delimiter)
  })

  it("decodes UTF-8 BOM and falls back to Windows-1252", () => {
    expect(decodeCsv(new Uint8Array([0xef, 0xbb, 0xbf, 65]))).toEqual({
      text: "A",
      encoding: "utf-8",
      usedFallback: false
    })
    expect(decodeCsv(new Uint8Array([0x43, 0x61, 0x66, 0xe9]))).toEqual({
      text: "Café",
      encoding: "windows-1252",
      usedFallback: true
    })
  })

  it("supports quoted delimiters, escaped quotes, and embedded newlines with stable source lines", () => {
    const matrix = parseCsvMatrix(
      'Date,Description,Amount\n2026-08-01,"Line one, ""quoted""\nline two",-2.50\n2026-08-02,Next,3.00',
      ","
    )
    expect(matrix.rows[1]).toMatchObject({
      sourceLine: 2,
      endLine: 3,
      cells: ["2026-08-01", 'Line one, "quoted"\nline two', "-2.50"]
    })
    expect(matrix.rows[2]?.sourceLine).toBe(4)
  })

  it("retains blank and duplicate headers by stable column index", () => {
    const text =
      "Date;;Description;Description;Amount\n01/08/2026;;One;Two;1,00"
    const { matrix, structure } = detectCsvStructure(text)
    expect(matrix.rows[structure.headerRecordIndex!]?.cells).toEqual([
      "Date",
      "",
      "Description",
      "Description",
      "Amount"
    ])
    expect(inferFieldMapping(matrix, structure).descriptionColumns).toEqual([
      2, 3
    ])
  })

  it("supports explicit no-header mode, repeated headers, a footer, and reversible exclusions", () => {
    const matrix = parseCsvMatrix(
      [
        "01/08/2026;First;10,00",
        "02/08/2026;Second;-2,00",
        "01/08/2026;First;10,00",
        "Totals;;",
        ""
      ].join("\n"),
      ";"
    )
    const structure = {
      delimiter: ";" as const,
      headerRecordIndex: null,
      dataStartRecordIndex: 0,
      dataEndRecordIndex: 4,
      columnCount: 3,
      confidence: "high" as const,
      evidence: []
    }
    const result = normalizeImportRows({
      matrix,
      structure,
      excludedRows: new Set([2]),
      config: config({
        hasHeader: false,
        descriptionColumns: [1],
        amountColumn: 2
      })
    })
    expect(result.summary).toMatchObject({
      includedRowCount: 2,
      excludedRowCount: 2,
      errorCount: 0
    })
    expect(result.normalizedRows.map((row) => row.sourceRow)).toEqual([1, 3])
    expect(
      result.rows.find((row) => row.sourceRow === 2)?.exclusionReason
    ).toBe("user")
  })

  it("normalizes signed and debit/credit amounts, credit charges, descriptions, installments, and zero", () => {
    const matrix = parseCsvMatrix(
      [
        "Date;Primary;Extra;Debit;Credit;Installment",
        "13/08/2026;Alpha;Beta;1.234,56;;2/4",
        "14/08/2026;Gamma;;;0,00;",
        "15/08/2026;Delta;;;50,00;"
      ].join("\n"),
      ";"
    )
    const structure = {
      delimiter: ";" as const,
      headerRecordIndex: 0,
      dataStartRecordIndex: 1,
      dataEndRecordIndex: 3,
      columnCount: 6,
      confidence: "high" as const,
      evidence: []
    }
    const debitCredit = normalizeImportRows({
      matrix,
      structure,
      config: config({
        descriptionColumns: [1, 2],
        amountMode: "debit-credit",
        amountColumn: null,
        debitColumn: 3,
        creditColumn: 4,
        installmentColumn: 5
      })
    })
    expect(debitCredit.normalizedRows).toEqual([
      expect.objectContaining({
        amount: -1234.56,
        description: "Alpha - Beta",
        installmentCurrent: 2,
        installmentTotal: 4
      }),
      expect.objectContaining({ amount: 0, description: "Gamma" }),
      expect.objectContaining({ amount: 50, description: "Delta" })
    ])

    const creditCharge = normalizeImportRows({
      matrix: parseCsvMatrix(
        "Date;Description;Amount\n13/08/2026;Purchase;25,00",
        ";"
      ),
      structure: { ...structure, dataEndRecordIndex: 1, columnCount: 3 },
      config: config({
        descriptionColumns: [1],
        amountColumn: 2,
        chargesPositive: true
      })
    })
    expect(creditCharge.normalizedRows[0]?.amount).toBe(-25)
  })

  it("ignores installment labels that do not use current/total form", () => {
    const { matrix, structure } = detectCsvStructure(
      [
        "Date;Description;Amount;Installment",
        "13/08/2026;Single purchase;10,00;Single",
        "14/08/2026;Other bank label;20,00;Not divided",
        "15/08/2026;Split purchase;30,00;2/3"
      ].join("\n")
    )
    const result = normalizeImportRows({
      matrix,
      structure,
      config: config({
        descriptionColumns: [1],
        amountColumn: 2,
        installmentColumn: 3
      })
    })

    expect(result.summary.errorCount).toBe(0)
    expect(result.normalizedRows).toEqual([
      expect.objectContaining({
        installmentCurrent: null,
        installmentTotal: null
      }),
      expect.objectContaining({
        installmentCurrent: null,
        installmentTotal: null
      }),
      expect.objectContaining({
        installmentCurrent: 2,
        installmentTotal: 3
      })
    ])
  })

  it("reports transaction-like invalid rows and allows their explicit exclusion", () => {
    const { matrix, structure } = detectCsvStructure(
      "Date;Description;Amount\n13/08/2026;Valid;10,00\nnot-a-date;Bad;NaN"
    )
    const base = config({ descriptionColumns: [1], amountColumn: 2 })
    const invalid = normalizeImportRows({ matrix, structure, config: base })
    expect(invalid.summary.errorCount).toBe(2)
    expect(invalid.issues.map((issue) => issue.code)).toEqual([
      "INVALID_DATE",
      "INVALID_AMOUNT"
    ])
    const excluded = normalizeImportRows({
      matrix,
      structure,
      config: base,
      excludedRows: new Set([3])
    })
    expect(excluded.summary).toMatchObject({
      errorCount: 0,
      excludedRowCount: 1
    })
    expect(excluded.normalizedRows).toHaveLength(1)
  })

  it("rejects malformed, non-finite, overflow, and partially parsed amounts", () => {
    expect(parseImportNumber("1.234,56", "decimal-comma")).toBe(1234.56)
    expect(parseImportNumber("1,234.56", "decimal-point")).toBe(1234.56)
    expect(parseImportNumber("- 2,00", "decimal-comma")).toBeNull()
    expect(parseImportNumber("12,34,56", "decimal-comma")).toBeNull()
    expect(parseImportNumber("Infinity", "decimal-point")).toBeNull()
    expect(parseImportNumber("1000000000001", "decimal-point")).toBeNull()
    expect(parseImportNumber("2.5oops", "decimal-point")).toBeNull()
  })

  it("parses supported date forms and leaves ambiguous detection unresolved", () => {
    expect(parseImportDate("31/08/2026", "DD/MM/YYYY")).toBe("2026-08-31")
    expect(parseImportDate("08/31/2026", "MM/DD/YYYY")).toBe("2026-08-31")
    expect(parseImportDate("2026-08-31", "YYYY-MM-DD")).toBe("2026-08-31")
    expect(parseImportDate("31/02/2026", "DD/MM/YYYY")).toBeNull()
    const ambiguous = detectCsvStructure(
      "Date;Description;Amount\n01/02/2026;One;1,00\n02/03/2026;Two;2,00"
    )
    expect(
      inferFieldMapping(ambiguous.matrix, ambiguous.structure)
    ).toMatchObject({
      dateFormat: null,
      confidence: "low"
    })
  })

  it("creates a stable fingerprint from structure and headers without data rows", async () => {
    const first = detectCsvStructure(referenceShape)
    const second = detectCsvStructure(
      referenceShape.replace("Store", "Different private text")
    )
    await expect(
      structuralFingerprint(first.matrix, first.structure)
    ).resolves.toBe(
      await structuralFingerprint(second.matrix, second.structure)
    )
  })
})

function config(
  overrides: Partial<Parameters<typeof normalizeImportRows>[0]["config"]> = {}
): Parameters<typeof normalizeImportRows>[0]["config"] {
  return {
    version: 1,
    delimiter: ";",
    encoding: "utf-8",
    hasHeader: true,
    dateFormat: "DD/MM/YYYY",
    numberFormat: "decimal-comma",
    dateColumn: 0,
    descriptionColumns: [],
    installmentColumn: null,
    amountMode: "signed",
    amountColumn: 1,
    debitColumn: null,
    creditColumn: null,
    chargesPositive: false,
    ...overrides
  }
}
