import type { CreateImportInputDto, ImportMappingConfig } from "@fina/types"
import { ApiError } from "@/api/generated/core/ApiError"
import { FinaPage, FinaPageHeader } from "@/components/FinaPage"
import { BillMonthPicker } from "@/components/BillMonthPicker"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import { useActiveGroup } from "@/contexts/ActiveGroupContext"
import { useBankAccounts } from "@/data/bankAccounts/useBankAccounts"
import { useImportProfiles } from "@/data/imports/useImportProfiles"
import { useImportsMutation } from "@/data/imports/useImportsMutation"
import {
  CsvMatrix,
  CsvStructure,
  ImportDateFormat,
  ImportDelimiter,
  ImportEncoding,
  ImportNumberFormat,
  MappingSuggestion,
  decodeCsv,
  detectCsvStructure,
  inferFieldMapping,
  normalizeImportRows,
  sha256Hex,
  structuralFingerprint
} from "@/imports/csvImport"
import {
  subscribeToPendingImport,
  takePendingImportFile
} from "@/imports/pendingImport"
import { IMPORT_LIMITS } from "@fina/types"
import {
  AlertCircle,
  CheckCircle2,
  FileUp,
  Loader2,
  Pencil,
  SlidersHorizontal
} from "lucide-react"
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react"
import { Link } from "react-router"
import { ImportList } from "./ImportList"

type DraftConfig = Omit<
  ImportMappingConfig,
  "dateFormat" | "numberFormat" | "dateColumn"
> & {
  dateFormat: ImportDateFormat | ""
  numberFormat: ImportNumberFormat | ""
  dateColumn: number | null
}

type LoadedFile = {
  file: File
  bytes: Uint8Array
  text: string
  hash: string
  fingerprint: string
  encoding: ImportEncoding
  matrix: CsvMatrix
  structure: CsvStructure
  suggestion: MappingSuggestion
}

type ServerPreview = {
  key: string
  result: Awaited<
    ReturnType<ReturnType<typeof useImportsMutation>["previewImport"]>
  >
}

type ImportView = "upload" | "review"

const pageSize = 100

export const Import = () => {
  const { selectedGroup } = useActiveGroup()
  const groupId = selectedGroup?.id?.toString()
  const { data: accounts = [] } = useBankAccounts({ groupId })
  const { addImport, previewImport } = useImportsMutation()
  const [loaded, setLoaded] = useState<LoadedFile | null>(null)
  const [draft, setDraft] = useState<DraftConfig | null>(null)
  const [selectedAccountId, setSelectedAccountId] = useState("")
  const [billMonth, setBillMonth] = useState("")
  const [excludedRows, setExcludedRows] = useState<Set<number>>(new Set())
  const [importView, setImportView] = useState<ImportView>("upload")
  const [importOpen, setImportOpen] = useState(false)
  const [configurationOpen, setConfigurationOpen] = useState(false)
  const [processing, setProcessing] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [serverPreview, setServerPreview] = useState<ServerPreview | null>(null)
  const [reviewFilter, setReviewFilter] = useState<
    "all" | "errors" | "warnings" | "excluded"
  >("all")
  const [reviewPage, setReviewPage] = useState(0)
  const [success, setSuccess] = useState<{
    importId: string
    accountId: string
    count: number
  } | null>(null)
  const profileAppliedFor = useRef<string | null>(null)
  const { data: profiles, isFetched: profilesFetched } = useImportProfiles({
    groupId,
    fingerprint: loaded?.fingerprint
  })

  const selectedAccount = accounts.find(
    (account) => account.id === selectedAccountId
  )
  const creditCardSelected = selectedAccount?.type === "credit"
  const config = completeConfig(draft)
  const normalization = useMemo(
    () =>
      loaded && config
        ? normalizeImportRows({
            matrix: loaded.matrix,
            structure: loaded.structure,
            config,
            excludedRows
          })
        : null,
    [config, excludedRows, loaded]
  )
  const payload = useMemo<CreateImportInputDto | null>(() => {
    if (
      !loaded ||
      !config ||
      !groupId ||
      !selectedAccountId ||
      (creditCardSelected && !billMonth) ||
      !normalization ||
      normalization.summary.errorCount > 0 ||
      normalization.normalizedRows.length === 0
    ) {
      return null
    }
    return {
      groupId,
      accountId: selectedAccountId,
      billMonth: creditCardSelected ? billMonth : null,
      fileName: loaded.file.name,
      fileSize: loaded.file.size,
      fileHash: loaded.hash,
      sourceFingerprint: loaded.fingerprint,
      excludedRowCount: normalization.summary.excludedRowCount,
      config,
      rows: normalization.normalizedRows
    }
  }, [
    billMonth,
    config,
    creditCardSelected,
    groupId,
    loaded,
    normalization,
    selectedAccountId
  ])
  const payloadKey = payload ? JSON.stringify(payload) : ""
  const currentServerPreview =
    serverPreview?.key === payloadKey ? serverPreview.result : null

  useEffect(() => {
    if (
      !loaded ||
      !profilesFetched ||
      profileAppliedFor.current === loaded.fingerprint
    ) {
      return
    }
    profileAppliedFor.current = loaded.fingerprint
    if (profiles?.length === 1) {
      setDraft({ ...profiles[0].config, version: 1 })
      setSelectedAccountId(profiles[0].accountId)
      return
    }
    if ((profiles?.length ?? 0) > 1) return
    const accountType = loaded.suggestion.accountType
    if (!accountType) return
    const candidates = accounts.filter(
      (account) => account.type === accountType
    )
    if (candidates.length === 1) setSelectedAccountId(candidates[0].id)
  }, [accounts, loaded, profiles, profilesFetched])

  const loadFile = useCallback(async (file: File) => {
    setError(null)
    setSuccess(null)
    if (!file.name.toLocaleLowerCase().endsWith(".csv")) {
      setError("Choose a file with a .csv extension.")
      return
    }
    if (file.size === 0) {
      setError("The selected file is empty.")
      return
    }
    if (file.size > IMPORT_LIMITS.maxFileBytes) {
      setError(
        `The selected file exceeds the ${formatBytes(IMPORT_LIMITS.maxFileBytes)} limit.`
      )
      return
    }
    if (
      file.type &&
      !["text/csv", "text/plain", "application/vnd.ms-excel"].includes(
        file.type
      )
    ) {
      setError("The selected file type is not supported. Choose a CSV file.")
      return
    }

    try {
      setProcessing("Reading, hashing, and detecting the statement…")
      const bytes = new Uint8Array(await file.arrayBuffer())
      const decoded = decodeCsv(bytes)
      const detected = detectCsvStructure(decoded.text)
      const suggestion = inferFieldMapping(detected.matrix, detected.structure)
      const [hash, fingerprint] = await Promise.all([
        sha256Hex(bytes),
        structuralFingerprint(detected.matrix, detected.structure)
      ])
      setLoaded({
        file,
        bytes,
        text: decoded.text,
        hash,
        fingerprint,
        encoding: decoded.encoding,
        matrix: detected.matrix,
        structure: detected.structure,
        suggestion
      })
      setDraft(
        draftFromSuggestion(suggestion, detected.structure, decoded.encoding)
      )
      setSelectedAccountId("")
      setBillMonth("")
      setExcludedRows(new Set())
      setServerPreview(null)
      setReviewPage(0)
      setImportView("review")
      profileAppliedFor.current = null
    } catch {
      setError(
        "Fina could not decode this CSV. Try changing the encoding after reselecting it."
      )
    } finally {
      setProcessing(null)
    }
  }, [])

  useEffect(() => {
    const openPendingImport = () => {
      const file = takePendingImportFile()
      if (!file) return
      setImportOpen(true)
      void loadFile(file)
    }

    openPendingImport()
    return subscribeToPendingImport(openPendingImport)
  }, [loadFile])

  const redetect = async ({
    encoding = loaded?.encoding,
    delimiter = loaded?.structure.delimiter
  }: {
    encoding?: ImportEncoding
    delimiter?: ImportDelimiter
  }) => {
    if (!loaded || !encoding || !delimiter) return
    const decoded = decodeCsv(loaded.bytes, encoding)
    const detected = detectCsvStructure(decoded.text, delimiter)
    const suggestion = inferFieldMapping(detected.matrix, detected.structure)
    const fingerprint = await structuralFingerprint(
      detected.matrix,
      detected.structure
    )
    setLoaded({
      ...loaded,
      text: decoded.text,
      encoding,
      fingerprint,
      matrix: detected.matrix,
      structure: detected.structure,
      suggestion
    })
    setDraft(draftFromSuggestion(suggestion, detected.structure, encoding))
    setExcludedRows(new Set())
    setServerPreview(null)
    profileAppliedFor.current = null
  }

  const updateDraft = (update: (current: DraftConfig) => DraftConfig) => {
    setDraft((current) => (current ? update(current) : current))
    setServerPreview(null)
    setReviewPage(0)
  }

  const updateStructure = (structure: CsvStructure) => {
    if (!loaded) return
    const suggestion = inferFieldMapping(loaded.matrix, structure)
    setLoaded({ ...loaded, structure, suggestion })
    setDraft(draftFromSuggestion(suggestion, structure, loaded.encoding))
    setExcludedRows(new Set())
    setServerPreview(null)
    setReviewPage(0)
  }

  const resetDraft = () => {
    setLoaded(null)
    setDraft(null)
    setSelectedAccountId("")
    setBillMonth("")
    setExcludedRows(new Set())
    setServerPreview(null)
    setReviewFilter("all")
    setReviewPage(0)
    setImportView("upload")
    setConfigurationOpen(false)
    profileAppliedFor.current = null
  }

  const handleImportOpenChange = (open: boolean) => {
    if (!open && processing !== null) return
    setImportOpen(open)
    if (!open) {
      resetDraft()
      setError(null)
    }
  }

  const filteredRows = (normalization?.rows ?? []).filter((row) => {
    if (reviewFilter === "excluded") return row.excluded
    if (reviewFilter === "errors")
      return row.issues.some((issue) => issue.severity === "error")
    if (reviewFilter === "warnings")
      return row.issues.some((issue) => issue.severity === "warning")
    return true
  })
  const visibleRows = filteredRows.slice(
    reviewPage * pageSize,
    (reviewPage + 1) * pageSize
  )

  return (
    <FinaPage>
      <FinaPageHeader
        eyebrow="Imports"
        marker="05"
        title="Statements, in."
        description="Bring CSV statements into the active workspace, review every inferred field, and keep a clear import history."
        actions={
          <Button
            type="button"
            variant="fina-primary"
            lift
            onClick={() => {
              resetDraft()
              setError(null)
              setImportOpen(true)
            }}
          >
            <FileUp />
            Import file
          </Button>
        }
      />

      <main className="space-y-6 p-5 md:p-8">
        {success ? (
          <Alert className="rounded-none border-2 border-fina-ink bg-fina-lime shadow-fina-sm">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription className="font-semibold text-fina-ink">
              Imported {success.count} transactions.{" "}
              <Link
                className="underline"
                to={`/transactions?accountId=${encodeURIComponent(success.accountId)}`}
              >
                Review this account&apos;s transactions
              </Link>
              .
            </AlertDescription>
          </Alert>
        ) : null}

        <ImportList />
      </main>

      <Dialog open={importOpen} onOpenChange={handleImportOpenChange}>
        <DialogContent className="left-0 top-0 flex h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden border-0 bg-fina-grid p-0 text-fina-ink sm:rounded-none">
          <DialogHeader className="shrink-0 border-b-[3px] border-fina-ink bg-fina-lime px-6 py-5 pr-14">
            <DialogTitle className="text-2xl font-black uppercase tracking-[-0.04em]">
              {loaded ? "Review and import" : "Import a CSV file"}
            </DialogTitle>
            <DialogDescription className="font-semibold text-fina-ink/65">
              {loaded
                ? "Review the inferred configuration and normalized transactions before importing."
                : `CSV only, up to ${formatBytes(IMPORT_LIMITS.maxFileBytes)}. The original file is retained securely with the import.`}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto p-5 md:p-8">
            {error && (
              <Alert variant="destructive" className="mb-5">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {importView === "upload" && (
              <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center">
                <div className="w-full space-y-5">
                  <div>
                    <div className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-fina-ink/55">
                      Step / 01
                    </div>
                    <h2 className="mt-2 text-3xl font-black uppercase tracking-[-0.045em]">
                      Choose a statement
                    </h2>
                    <p className="mt-2 text-sm font-semibold text-fina-ink/60">
                      Fina will infer the file structure and open the
                      transaction preview automatically.
                    </p>
                  </div>
                  <label
                    className="flex min-h-64 cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed border-fina-ink bg-fina-surface p-8 text-center font-black shadow-fina-md transition-colors hover:bg-fina-yellow"
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault()
                      const file = event.dataTransfer.files[0]
                      if (file) void loadFile(file)
                    }}
                  >
                    {processing ? (
                      <Loader2 className="h-7 w-7 animate-spin" />
                    ) : (
                      <FileUp className="h-7 w-7" />
                    )}
                    <span>
                      {processing ?? "Drop a CSV here or choose a file"}
                    </span>
                    <Input
                      className="sr-only"
                      type="file"
                      accept=".csv,text/csv,text/plain"
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (file) void loadFile(file)
                        event.target.value = ""
                      }}
                    />
                  </label>
                </div>
              </div>
            )}

            {loaded && draft && importView === "review" && (
              <Card className="rounded-none border-2 border-fina-ink bg-fina-surface shadow-fina-md">
                <CardHeader className="border-b-2 border-fina-ink bg-fina-yellow">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <CardTitle className="text-xl font-black tracking-[-0.03em]">
                        {loaded.file.name}
                      </CardTitle>
                      <CardDescription className="font-semibold text-fina-ink/60">
                        {formatBytes(loaded.file.size)} · {loaded.encoding} ·{" "}
                        {delimiterName(loaded.structure.delimiter)} delimiter ·{" "}
                        {loaded.structure.headerRecordIndex === null
                          ? "No header"
                          : `Header line ${loaded.matrix.rows[loaded.structure.headerRecordIndex]?.sourceLine}`}{" "}
                        · Data lines{" "}
                        {
                          loaded.matrix.rows[
                            loaded.structure.dataStartRecordIndex
                          ]?.sourceLine
                        }
                        –
                        {
                          loaded.matrix.rows[
                            loaded.structure.dataEndRecordIndex
                          ]?.endLine
                        }
                      </CardDescription>
                    </div>
                    <Button
                      type="button"
                      variant="fina-secondary"
                      onClick={() => setConfigurationOpen(true)}
                    >
                      <SlidersHorizontal className="mr-2 h-4 w-4" />
                      Edit file configuration
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5 p-5 md:p-6">
                  <div className="space-y-2">
                    <label
                      className="text-sm font-medium"
                      htmlFor="destination-account"
                    >
                      Destination account
                    </label>
                    <Select
                      value={selectedAccountId}
                      onValueChange={(value) => {
                        setSelectedAccountId(value)
                        setBillMonth("")
                        setServerPreview(null)
                      }}
                    >
                      <SelectTrigger
                        id="destination-account"
                        className="h-11 max-w-md rounded-none border-2 border-fina-ink bg-fina-surface font-semibold shadow-fina-sm"
                      >
                        <SelectValue placeholder="Select the account to confirm" />
                      </SelectTrigger>
                      <SelectContent className="rounded-none border-2 border-fina-ink">
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name} ({account.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {profiles && profiles.length > 1 && !selectedAccountId && (
                      <p className="text-sm text-muted-foreground">
                        This format has been used with several accounts. Choose
                        the destination.
                      </p>
                    )}
                    {creditCardSelected ? (
                      <BillMonthPicker
                        id="bill-month"
                        className="max-w-md pt-2"
                        value={billMonth}
                        dueDate={selectedAccount?.dueDate}
                        onValueChange={(value) => {
                          setBillMonth(value)
                          setServerPreview(null)
                        }}
                      />
                    ) : null}
                  </div>
                  <div className="border-t-2 border-fina-ink pt-5">
                    <h3 className="text-xl font-black uppercase tracking-[-0.03em]">
                      Review and map
                    </h3>
                    <p className="text-sm font-semibold text-fina-ink/60">
                      Edit a column header to change its CSV source. The preview
                      and validation state update immediately.
                    </p>
                  </div>
                  {!config && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Complete the highlighted Date and Amount mappings before
                        validation.
                      </AlertDescription>
                    </Alert>
                  )}
                  {normalization && (
                    <div className="flex flex-wrap gap-2">
                      {(["all", "errors", "warnings", "excluded"] as const).map(
                        (filter) => (
                          <Button
                            key={filter}
                            type="button"
                            size="sm"
                            variant={
                              reviewFilter === filter ? "default" : "outline"
                            }
                            onClick={() => {
                              setReviewFilter(filter)
                              setReviewPage(0)
                            }}
                          >
                            {filter[0].toUpperCase() + filter.slice(1)}
                          </Button>
                        )
                      )}
                    </div>
                  )}

                  <div className="overflow-auto border-2 border-fina-ink">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Line</TableHead>
                          <TableHead>
                            <MappingHeader
                              label="Date"
                              summary={columnName(loaded, draft.dateColumn)}
                              invalid={
                                draft.dateColumn === null || !draft.dateFormat
                              }
                            >
                              <LabeledSelect
                                label="Source column"
                                ariaLabel="Date source column"
                                value={draft.dateColumn?.toString() ?? ""}
                                placeholder="Choose a date column"
                                onValueChange={(value) =>
                                  updateDraft((current) => ({
                                    ...current,
                                    dateColumn: Number(value)
                                  }))
                                }
                                options={columnOptions(loaded)}
                              />
                              <LabeledSelect
                                label="Date format"
                                ariaLabel="Date format"
                                value={draft.dateFormat}
                                placeholder="Choose a date format"
                                onValueChange={(value) =>
                                  updateDraft((current) => ({
                                    ...current,
                                    dateFormat: value as ImportDateFormat
                                  }))
                                }
                                options={[
                                  ["DD/MM/YYYY", "Day / month / year"],
                                  ["MM/DD/YYYY", "Month / day / year"],
                                  ["YYYY-MM-DD", "ISO year-month-day"],
                                  ["YYYY-MM-DDTHH:mm:ss", "ISO date and time"]
                                ]}
                              />
                            </MappingHeader>
                          </TableHead>
                          <TableHead>
                            <MappingHeader
                              label="Description"
                              summary={columnNames(
                                loaded,
                                draft.descriptionColumns
                              )}
                            >
                              <fieldset className="space-y-3">
                                <legend className="text-sm font-medium">
                                  Source columns
                                </legend>
                                <p className="text-xs text-muted-foreground">
                                  Selected values are combined in file order.
                                </p>
                                <div className="max-h-64 space-y-2 overflow-auto pr-1">
                                  {columnOptions(loaded).map(
                                    ([optionValue, optionLabel]) => {
                                      const columnIndex = Number(optionValue)
                                      const inputId = `description-column-${optionValue}`
                                      return (
                                        <div
                                          key={optionValue}
                                          className="flex items-center gap-2"
                                        >
                                          <Checkbox
                                            id={inputId}
                                            checked={draft.descriptionColumns.includes(
                                              columnIndex
                                            )}
                                            onCheckedChange={(checked) =>
                                              updateDraft((current) => ({
                                                ...current,
                                                descriptionColumns:
                                                  checked === true
                                                    ? [
                                                        ...new Set([
                                                          ...current.descriptionColumns,
                                                          columnIndex
                                                        ])
                                                      ].sort(
                                                        (left, right) =>
                                                          left - right
                                                      )
                                                    : current.descriptionColumns.filter(
                                                        (value) =>
                                                          value !== columnIndex
                                                      )
                                              }))
                                            }
                                          />
                                          <label
                                            htmlFor={inputId}
                                            className="text-sm font-normal"
                                          >
                                            {optionLabel}
                                          </label>
                                        </div>
                                      )
                                    }
                                  )}
                                </div>
                              </fieldset>
                            </MappingHeader>
                          </TableHead>
                          <TableHead>
                            <MappingHeader
                              label="Amount"
                              summary={amountMappingName(loaded, draft)}
                              invalid={
                                !draft.numberFormat || !hasAmountMapping(draft)
                              }
                            >
                              <LabeledSelect
                                label="Amount layout"
                                ariaLabel="Amount layout"
                                value={draft.amountMode}
                                onValueChange={(value) =>
                                  updateDraft((current) => ({
                                    ...current,
                                    amountMode: value as
                                      | "signed"
                                      | "debit-credit"
                                  }))
                                }
                                options={[
                                  ["signed", "One signed amount column"],
                                  [
                                    "debit-credit",
                                    "Separate debit and credit columns"
                                  ]
                                ]}
                              />
                              {draft.amountMode === "signed" ? (
                                <LabeledSelect
                                  label="Source column"
                                  ariaLabel="Amount source column"
                                  value={draft.amountColumn?.toString() ?? ""}
                                  placeholder="Choose an amount column"
                                  onValueChange={(value) =>
                                    updateDraft((current) => ({
                                      ...current,
                                      amountColumn: Number(value)
                                    }))
                                  }
                                  options={columnOptions(loaded)}
                                />
                              ) : (
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <LabeledSelect
                                    label="Debit column"
                                    ariaLabel="Debit source column"
                                    value={draft.debitColumn?.toString() ?? ""}
                                    placeholder="Choose debit"
                                    onValueChange={(value) =>
                                      updateDraft((current) => ({
                                        ...current,
                                        debitColumn: Number(value)
                                      }))
                                    }
                                    options={columnOptions(loaded)}
                                  />
                                  <LabeledSelect
                                    label="Credit column"
                                    ariaLabel="Credit source column"
                                    value={draft.creditColumn?.toString() ?? ""}
                                    placeholder="Choose credit"
                                    onValueChange={(value) =>
                                      updateDraft((current) => ({
                                        ...current,
                                        creditColumn: Number(value)
                                      }))
                                    }
                                    options={columnOptions(loaded)}
                                  />
                                </div>
                              )}
                              <LabeledSelect
                                label="Number format"
                                ariaLabel="Number format"
                                value={draft.numberFormat}
                                placeholder="Choose a number format"
                                onValueChange={(value) =>
                                  updateDraft((current) => ({
                                    ...current,
                                    numberFormat: value as ImportNumberFormat
                                  }))
                                }
                                options={[
                                  ["decimal-comma", "1.234,56"],
                                  ["decimal-point", "1,234.56"]
                                ]}
                              />
                              {draft.amountMode === "signed" &&
                                selectedAccount?.type === "credit" && (
                                  <div className="flex items-start gap-2">
                                    <Checkbox
                                      id="charges-positive"
                                      checked={draft.chargesPositive}
                                      onCheckedChange={(checked) =>
                                        updateDraft((current) => ({
                                          ...current,
                                          chargesPositive: checked === true
                                        }))
                                      }
                                    />
                                    <label
                                      htmlFor="charges-positive"
                                      className="text-sm font-normal"
                                    >
                                      Charges are positive in this file. A
                                      source amount of 25.00 imports as −25.00.
                                    </label>
                                  </div>
                                )}
                            </MappingHeader>
                          </TableHead>
                          <TableHead>
                            <MappingHeader
                              label="Installment"
                              summary={columnName(
                                loaded,
                                draft.installmentColumn,
                                "Not mapped"
                              )}
                            >
                              <LabeledSelect
                                label="Source column"
                                ariaLabel="Installment source column"
                                value={
                                  draft.installmentColumn?.toString() ?? "none"
                                }
                                onValueChange={(value) =>
                                  updateDraft((current) => ({
                                    ...current,
                                    installmentColumn:
                                      value === "none" ? null : Number(value)
                                  }))
                                }
                                options={[
                                  ["none", "Not mapped"],
                                  ...columnOptions(loaded)
                                ]}
                              />
                            </MappingHeader>
                          </TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Exclude</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {!normalization ? (
                          <TableRow>
                            <TableCell
                              colSpan={7}
                              className="h-24 text-center text-muted-foreground"
                            >
                              Complete the Date and Amount headers to preview
                              rows.
                            </TableCell>
                          </TableRow>
                        ) : visibleRows.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={7}
                              className="h-24 text-center text-muted-foreground"
                            >
                              No rows match this filter.
                            </TableCell>
                          </TableRow>
                        ) : (
                          visibleRows.map((row) => (
                            <TableRow key={row.sourceRow}>
                              <TableCell>{row.sourceRow}</TableCell>
                              <TableCell>{row.date ?? "—"}</TableCell>
                              <TableCell>{row.description ?? "—"}</TableCell>
                              <TableCell className="text-right">
                                {row.amount === null
                                  ? "—"
                                  : formatAmount(row.amount)}
                              </TableCell>
                              <TableCell>{row.installment ?? "—"}</TableCell>
                              <TableCell>
                                {row.excluded
                                  ? `Excluded (${row.exclusionReason})`
                                  : row.issues.length
                                    ? row.issues
                                        .map((issue) => issue.message)
                                        .join("; ")
                                    : "Ready"}
                              </TableCell>
                              <TableCell>
                                {row.exclusionReason === "empty" ||
                                row.exclusionReason === "repeated-header" ||
                                row.exclusionReason === "footer" ? (
                                  "Automatic"
                                ) : (
                                  <Checkbox
                                    aria-label={`Exclude source line ${row.sourceRow}`}
                                    checked={excludedRows.has(row.sourceRow)}
                                    onCheckedChange={(checked) => {
                                      setExcludedRows((current) => {
                                        const next = new Set(current)
                                        if (checked === true)
                                          next.add(row.sourceRow)
                                        else next.delete(row.sourceRow)
                                        return next
                                      })
                                      setServerPreview(null)
                                    }}
                                  />
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  {filteredRows.length > pageSize && (
                    <div className="flex items-center justify-between">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={reviewPage === 0}
                        onClick={() => setReviewPage((page) => page - 1)}
                      >
                        Previous
                      </Button>
                      <span className="text-sm">
                        Page {reviewPage + 1} of{" "}
                        {Math.ceil(filteredRows.length / pageSize)}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={
                          (reviewPage + 1) * pageSize >= filteredRows.length
                        }
                        onClick={() => setReviewPage((page) => page + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                  <div className="sticky bottom-0 z-10 -mx-6 -mb-6 space-y-3 border-t-2 border-fina-ink bg-fina-yellow/95 px-6 py-4 backdrop-blur">
                    {currentServerPreview?.duplicate && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          This exact file is already active as import #
                          {currentServerPreview.duplicate.importId}.
                        </AlertDescription>
                      </Alert>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="font-medium">
                          {normalization?.summary.includedRowCount ?? 0}{" "}
                          {(normalization?.summary.includedRowCount ?? 0) === 1
                            ? "transaction"
                            : "transactions"}
                          {selectedAccount ? (
                            <> → {selectedAccount.name}</>
                          ) : null}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {currentServerPreview?.valid &&
                          currentServerPreview.duplicate === null
                            ? "Server validation complete. Ready to import."
                            : currentServerPreview?.duplicate
                              ? "This file is already active and cannot be imported again."
                              : payload
                                ? "Validate after any file, mapping, exclusion, format, or account change."
                                : creditCardSelected && !billMonth
                                  ? "Choose the bill month before validation."
                                  : selectedAccount
                                    ? "Resolve mapping or row errors before validation."
                                    : "Choose a destination account before validation."}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="fina-secondary"
                          disabled={!payload || processing !== null}
                          onClick={async () => {
                            if (!payload || !loaded) return
                            setProcessing("Validating with the server…")
                            setError(null)
                            try {
                              const result = await previewImport(payload)
                              setServerPreview({ key: payloadKey, result })
                            } catch (caught) {
                              setError(apiMessage(caught))
                            } finally {
                              setProcessing(null)
                            }
                          }}
                        >
                          {processing === "Validating with the server…" ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          Validate import
                        </Button>
                        <Button
                          type="button"
                          variant="fina-primary"
                          disabled={
                            !payload ||
                            !currentServerPreview?.valid ||
                            currentServerPreview.duplicate !== null ||
                            processing !== null
                          }
                          onClick={async () => {
                            if (!payload || !loaded) return
                            setProcessing(
                              "Importing every transaction atomically…"
                            )
                            setError(null)
                            try {
                              const result = await addImport(
                                payload,
                                loaded.file
                              )
                              setSuccess({
                                importId: result.id,
                                accountId: result.accountId,
                                count: result.transactionCount
                              })
                              setImportOpen(false)
                              resetDraft()
                            } catch (caught) {
                              setError(apiMessage(caught))
                            } finally {
                              setProcessing(null)
                            }
                          }}
                        >
                          {normalization ? (
                            <>
                              Import {normalization.summary.includedRowCount}{" "}
                              {normalization.summary.includedRowCount === 1
                                ? "transaction"
                                : "transactions"}
                            </>
                          ) : (
                            "Import transactions"
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {loaded && draft && (
            <Dialog
              open={configurationOpen}
              onOpenChange={setConfigurationOpen}
            >
              <DialogContent className="flex h-[92dvh] w-[96vw] max-w-6xl flex-col gap-0 overflow-hidden rounded-none border-2 border-fina-ink bg-fina-grid p-0 shadow-fina-lg">
                <DialogHeader className="shrink-0 border-b-2 border-fina-ink bg-fina-sky px-6 py-5 pr-14">
                  <DialogTitle className="text-2xl font-black uppercase tracking-[-0.04em]">
                    Edit file configuration
                  </DialogTitle>
                  <DialogDescription className="font-semibold text-fina-ink/65">
                    Click a source line to mark it as the single header, the
                    start of data, or the end of data.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid shrink-0 gap-4 border-b-2 border-fina-ink bg-fina-surface px-6 py-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
                  <LabeledSelect
                    label="Delimiter"
                    value={draft.delimiter}
                    onValueChange={(value) =>
                      void redetect({ delimiter: value as ImportDelimiter })
                    }
                    options={[
                      [";", "Semicolon"],
                      [",", "Comma"],
                      ["\t", "Tab"],
                      ["|", "Pipe"]
                    ]}
                  />
                  <LabeledSelect
                    label="Encoding"
                    value={draft.encoding}
                    onValueChange={(value) =>
                      void redetect({ encoding: value as ImportEncoding })
                    }
                    options={[
                      ["utf-8", "UTF-8"],
                      ["windows-1252", "Windows-1252"]
                    ]}
                  />
                  <div className="flex flex-wrap gap-2 pb-1 text-xs">
                    <Badge
                      variant="outline"
                      className="border-amber-500/30 bg-amber-500/10"
                    >
                      Header
                    </Badge>
                    <Badge
                      variant="outline"
                      className="border-sky-500/30 bg-sky-500/10"
                    >
                      Data
                    </Badge>
                  </div>
                </div>

                <RawFileConfigurationEditor
                  loaded={loaded}
                  onStructureChange={updateStructure}
                />

                <DialogFooter className="shrink-0 border-t-2 border-fina-ink bg-fina-yellow px-6 py-4">
                  <Button
                    type="button"
                    variant="fina-primary"
                    onClick={() => setConfigurationOpen(false)}
                  >
                    Done
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </DialogContent>
      </Dialog>
    </FinaPage>
  )
}

function RawFileConfigurationEditor({
  loaded,
  onStructureChange
}: {
  loaded: LoadedFile
  onStructureChange: (structure: CsvStructure) => void
}) {
  const lines = loaded.text.split(/\r\n|\n|\r/)
  const recordIndexByLine = new Map<number, number>()
  loaded.matrix.rows.forEach((row) => {
    for (let line = row.sourceLine; line <= row.endLine; line += 1) {
      recordIndexByLine.set(line, row.recordIndex)
    }
  })

  const setBoundary = (
    recordIndex: number,
    boundary: "header" | "data-start" | "data-end"
  ) => {
    const row = loaded.matrix.rows[recordIndex]
    if (!row) return

    if (boundary === "header") {
      const dataStartRecordIndex = recordIndex + 1
      onStructureChange({
        ...loaded.structure,
        headerRecordIndex: recordIndex,
        dataStartRecordIndex,
        dataEndRecordIndex: Math.max(
          loaded.structure.dataEndRecordIndex,
          dataStartRecordIndex
        ),
        columnCount: row.cells.length
      })
      return
    }

    if (boundary === "data-start") {
      onStructureChange({
        ...loaded.structure,
        dataStartRecordIndex: recordIndex
      })
      return
    }

    onStructureChange({
      ...loaded.structure,
      dataEndRecordIndex: recordIndex
    })
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto bg-muted/20 p-4">
      <div className="min-w-max overflow-hidden rounded-md border bg-background font-mono text-xs">
        {lines.map((line, index) => {
          const lineNumber = index + 1
          const recordIndex = recordIndexByLine.get(lineNumber)
          const row =
            recordIndex === undefined
              ? undefined
              : loaded.matrix.rows[recordIndex]
          const isHeader =
            recordIndex !== undefined &&
            recordIndex === loaded.structure.headerRecordIndex
          const isData =
            recordIndex !== undefined &&
            recordIndex >= loaded.structure.dataStartRecordIndex &&
            recordIndex <= loaded.structure.dataEndRecordIndex
          const isDataStart =
            recordIndex === loaded.structure.dataStartRecordIndex &&
            lineNumber === row?.sourceLine
          const isDataEnd =
            recordIndex === loaded.structure.dataEndRecordIndex &&
            lineNumber === row?.endLine
          const showHeaderLabel = isHeader && lineNumber === row?.sourceLine
          const lineClass = isHeader
            ? "bg-amber-500/10 hover:bg-amber-500/15"
            : isData
              ? "bg-sky-500/10 hover:bg-sky-500/15"
              : "hover:bg-muted/60"
          const content = (
            <>
              <span className="select-none border-r px-3 py-1.5 text-right text-muted-foreground">
                {lineNumber}
              </span>
              <span className="whitespace-pre px-3 py-1.5 text-left">
                {line || " "}
              </span>
              <span className="flex items-center justify-end gap-1 px-3 py-1.5 font-sans">
                {showHeaderLabel && (
                  <Badge
                    variant="outline"
                    className="border-amber-500/30 bg-amber-500/10 text-[10px]"
                  >
                    Header
                  </Badge>
                )}
                {isDataStart && (
                  <Badge
                    variant="outline"
                    className="border-sky-500/30 bg-sky-500/10 text-[10px]"
                  >
                    Data start
                  </Badge>
                )}
                {isDataEnd && (
                  <Badge
                    variant="outline"
                    className="border-sky-500/30 bg-sky-500/10 text-[10px]"
                  >
                    Data end
                  </Badge>
                )}
              </span>
            </>
          )

          if (recordIndex === undefined) {
            return (
              <div
                key={lineNumber}
                className="grid grid-cols-[4rem_minmax(40rem,1fr)_auto]"
              >
                {content}
              </div>
            )
          }

          return (
            <DropdownMenu key={lineNumber}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={`Configure line ${lineNumber}: ${line || "blank line"}`}
                  className={`grid w-full grid-cols-[4rem_minmax(40rem,1fr)_auto] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${lineClass}`}
                >
                  {content}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  disabled={recordIndex >= loaded.matrix.rows.length - 1}
                  onSelect={() => setBoundary(recordIndex, "header")}
                >
                  Header
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={
                    recordIndex <= (loaded.structure.headerRecordIndex ?? -1) ||
                    recordIndex > loaded.structure.dataEndRecordIndex
                  }
                  onSelect={() => setBoundary(recordIndex, "data-start")}
                >
                  Data start
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={recordIndex < loaded.structure.dataStartRecordIndex}
                  onSelect={() => setBoundary(recordIndex, "data-end")}
                >
                  Data end
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        })}
      </div>
    </div>
  )
}

function draftFromSuggestion(
  suggestion: MappingSuggestion,
  structure: CsvStructure,
  encoding: ImportEncoding
): DraftConfig {
  return {
    version: 1,
    delimiter: structure.delimiter,
    encoding,
    hasHeader: structure.headerRecordIndex !== null,
    dateFormat: suggestion.dateFormat ?? "",
    numberFormat: suggestion.numberFormat ?? "",
    dateColumn: suggestion.dateColumn,
    descriptionColumns: suggestion.descriptionColumns,
    installmentColumn: suggestion.installmentColumn,
    amountMode: suggestion.amountMode,
    amountColumn: suggestion.amountColumn,
    debitColumn: suggestion.debitColumn,
    creditColumn: suggestion.creditColumn,
    chargesPositive: false
  }
}

function completeConfig(draft: DraftConfig | null): ImportMappingConfig | null {
  if (
    !draft ||
    !draft.dateFormat ||
    !draft.numberFormat ||
    draft.dateColumn === null ||
    (draft.amountMode === "signed" && draft.amountColumn === null) ||
    (draft.amountMode === "debit-credit" &&
      (draft.debitColumn === null || draft.creditColumn === null))
  ) {
    return null
  }
  return draft as ImportMappingConfig
}

function columnOptions(loaded: LoadedFile): Array<[string, string]> {
  const headers =
    loaded.structure.headerRecordIndex === null
      ? []
      : (loaded.matrix.rows[loaded.structure.headerRecordIndex]?.cells ?? [])
  return Array.from({ length: loaded.structure.columnCount }, (_, index) => [
    String(index),
    `${index + 1}. ${headers[index]?.trim() || `Column ${index + 1}`}`
  ])
}

function columnName(
  loaded: LoadedFile,
  index: number | null,
  emptyLabel = "Choose source"
): string {
  if (index === null) return emptyLabel
  const headers =
    loaded.structure.headerRecordIndex === null
      ? []
      : (loaded.matrix.rows[loaded.structure.headerRecordIndex]?.cells ?? [])
  return headers[index]?.trim() || `Column ${index + 1}`
}

function columnNames(loaded: LoadedFile, indexes: number[]): string {
  if (indexes.length === 0) return "Not mapped"
  return indexes.map((index) => columnName(loaded, index)).join(" + ")
}

function hasAmountMapping(draft: DraftConfig): boolean {
  return draft.amountMode === "signed"
    ? draft.amountColumn !== null
    : draft.debitColumn !== null && draft.creditColumn !== null
}

function amountMappingName(loaded: LoadedFile, draft: DraftConfig): string {
  if (draft.amountMode === "signed") {
    return columnName(loaded, draft.amountColumn)
  }
  if (draft.debitColumn === null || draft.creditColumn === null) {
    return "Choose debit and credit"
  }
  return `${columnName(loaded, draft.debitColumn)} − ${columnName(loaded, draft.creditColumn)}`
}

function MappingHeader({
  label,
  summary,
  invalid = false,
  children
}: {
  label: string
  summary: string
  invalid?: boolean
  children: ReactNode
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          aria-label={`Edit ${label} mapping. ${summary}`}
          className="h-auto min-w-32 justify-start gap-2 px-2 py-1 text-left"
        >
          <span className="min-w-0 flex-1">
            <span className="block font-medium">{label}</span>
            <span
              className={`block max-w-48 truncate text-xs font-normal ${
                invalid ? "text-destructive" : "text-muted-foreground"
              }`}
              title={summary}
            >
              {summary}
            </span>
          </span>
          <Pencil className="h-3.5 w-3.5 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-96 space-y-4">
        <div>
          <div className="font-medium">Map {label}</div>
          <p className="text-xs text-muted-foreground">
            Changes are applied to every preview row immediately.
          </p>
        </div>
        {children}
      </PopoverContent>
    </Popover>
  )
}

function LabeledSelect({
  label,
  ariaLabel,
  value,
  placeholder,
  options,
  onValueChange
}: {
  label: string
  ariaLabel?: string
  value: string
  placeholder?: string
  options: Array<readonly [string, string]>
  onValueChange: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <span className="text-sm font-medium">{label}</span>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger aria-label={ariaLabel ?? label}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map(([optionValue, optionLabel]) => (
            <SelectItem key={optionValue} value={optionValue}>
              {optionLabel}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function delimiterName(delimiter: ImportDelimiter): string {
  return (
    { ",": "Comma", ";": "Semicolon", "\t": "Tab", "|": "Pipe" } as const
  )[delimiter]
}

function formatBytes(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MiB`
    : `${Math.max(1, Math.round(bytes / 1024))} KiB`
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

function apiMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const body = error.body as { message?: unknown; code?: unknown }
    if (body?.code === "DUPLICATE_IMPORT") {
      return "This exact file has already been imported into the selected account."
    }
    if (typeof body?.message === "string") return body.message
  }
  return "The import could not be completed. No transactions were saved."
}
