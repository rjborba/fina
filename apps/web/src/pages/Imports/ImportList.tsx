import { CalendarDays, FileSpreadsheet, Landmark, Trash2 } from "lucide-react"
import { type FC } from "react"

import { FinaSectionLabel } from "@/components/FinaPage"
import { Button } from "@/components/ui/button"
import { FinaBadge, FinaSurface } from "@/components/ui/fina"
import { useActiveGroup } from "@/contexts/ActiveGroupContext"
import { useImports } from "@/data/imports/useImports"
import { useImportsMutation } from "@/data/imports/useImportsMutation"

export const ImportList: FC = () => {
  const { selectedGroup } = useActiveGroup()
  const { data: importsData } = useImports({
    groupId: selectedGroup?.id?.toString()
  })
  const { removeImport } = useImportsMutation()

  return (
    <section aria-labelledby="import-history-title">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <FinaSectionLabel>Files / History</FinaSectionLabel>
          <h2
            id="import-history-title"
            className="mt-2 text-2xl font-black uppercase tracking-[-0.04em]"
          >
            Import history
          </h2>
          <p className="mt-2 max-w-2xl text-sm font-semibold text-fina-ink/60">
            Removing an import archives it and its transactions, allowing a
            corrected file to be imported again.
          </p>
        </div>
        <FinaBadge tone="surface">{importsData?.length ?? 0} files</FinaBadge>
      </div>

      <FinaSurface elevation="md" className="overflow-hidden">
        {importsData?.length ? (
          <ul className="divide-y-2 divide-fina-ink">
            {importsData.map((item, index) => (
              <li
                className="flex flex-col gap-5 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
                key={item.id}
              >
                <div className="flex min-w-0 items-start gap-4">
                  <div className="flex size-12 shrink-0 items-center justify-center border-2 border-fina-ink bg-fina-violet text-white">
                    <FileSpreadsheet className="size-5" strokeWidth={2.5} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-mono text-[9px] font-black uppercase tracking-[0.16em] text-fina-ink/45">
                      File / {String(index + 1).padStart(2, "0")}
                    </div>
                    <div className="mt-1 truncate text-lg font-black tracking-[-0.025em]">
                      {item.fileName}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-bold text-fina-ink/60">
                      <span className="inline-flex items-center gap-1.5">
                        <Landmark className="size-3.5" /> {item.accountName}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <FileSpreadsheet className="size-3.5" />
                        {item.transactionCount} transactions
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="size-3.5" />
                        {item.dateStart && item.dateEnd
                          ? `${item.dateStart} – ${item.dateEnd}`
                          : "No date range"}
                      </span>
                      {item.billDueDate ? (
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="size-3.5" /> Bill due{" "}
                          {item.billDueDate}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-fina-ink/40">
                      Added {new Date(item.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
                <Button
                  variant="fina-ghost"
                  size="sm"
                  type="button"
                  onClick={() => void removeImport(item.id)}
                >
                  <Trash2 /> Remove
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-10 text-center">
            <FileSpreadsheet className="mx-auto size-10" />
            <p className="mt-4 font-black uppercase">No imports yet</p>
            <p className="mt-2 text-sm font-semibold text-fina-ink/60">
              Import a CSV statement to start the history.
            </p>
          </div>
        )}
      </FinaSurface>
    </section>
  )
}
