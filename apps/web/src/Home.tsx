import { useTranslation } from "react-i18next"
import { ArrowUpRight, Banknote, FileUp, List, Tag } from "lucide-react"
import { Link } from "react-router"

import {
  FinaPage,
  FinaPageHeader,
  FinaSectionLabel
} from "@/components/FinaPage"
import { FinaBadge, FinaSurface } from "@/components/ui/fina"
import { useActiveGroup } from "@/contexts/ActiveGroupContext"
import { useBankAccounts } from "@/data/bankAccounts/useBankAccounts"
import { useCategories } from "@/data/categories/useCategories"
import { useImports } from "@/data/imports/useImports"

const WORKSPACE_LINKS = [
  {
    description: "Review, categorize and select ledger entries.",
    icon: List,
    label: "Transactions",
    number: "01",
    to: "/transactions",
    tone: "bg-fina-lime text-fina-violet"
  },
  {
    description: "Bring statement files into the active workspace.",
    icon: FileUp,
    label: "Imports",
    number: "02",
    to: "/imports",
    tone: "bg-fina-yellow text-fina-violet"
  },
  {
    description: "Manage checking accounts and credit cards.",
    icon: Banknote,
    label: "Accounts",
    number: "03",
    to: "/bank-accounts",
    tone: "bg-fina-sky text-sky-700"
  },
  {
    description: "Shape the labels used to organize your spending.",
    icon: Tag,
    label: "Categories",
    number: "04",
    to: "/categories",
    tone: "bg-fina-danger text-red-600"
  }
] as const

function Home() {
  const { t } = useTranslation()

  const { selectedGroup } = useActiveGroup()
  const groupId = selectedGroup?.id?.toString()
  const { data: accounts } = useBankAccounts({ groupId })
  const { data: categories } = useCategories({ groupId })
  const { data: imports } = useImports({ groupId })

  return (
    <FinaPage>
      <FinaPageHeader
        eyebrow={t("Dashboard")}
        title={t("Financial overview")}
        description={
          <>
            {t("Your working view for")}{" "}
            <strong>{selectedGroup?.name ?? "Fina"}</strong>
            {t(". Start with a statement, then keep the ledger clean.")}
          </>
        }
      />

      <main className="space-y-8 p-5 md:p-8">
        <section aria-labelledby="workspace-title">
          <div className="mb-4 flex min-w-0 flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <FinaSectionLabel>{t("Quick access")}</FinaSectionLabel>
              <h2
                id="workspace-title"
                className="mt-1 text-lg font-semibold tracking-[-0.025em]"
              >
                {t("Your workspace")}
              </h2>
            </div>
            <FinaBadge tone="surface">
              {selectedGroup?.name ?? t("No group")}
            </FinaBadge>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {WORKSPACE_LINKS.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="group rounded-lg border border-fina-grid bg-fina-surface p-4 shadow-fina-sm transition-colors hover:border-fina-violet/35 hover:bg-fina-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fina-violet/50"
                >
                  <div className="flex items-start justify-between">
                    <div
                      className={`${item.tone} flex size-9 items-center justify-center rounded-md`}
                    >
                      <Icon className="size-4" strokeWidth={2} />
                    </div>
                    <span className="text-[11px] font-medium text-foreground/35">
                      {item.number}
                    </span>
                  </div>
                  <div className="mt-8">
                    <div className="flex items-end justify-between gap-4">
                      <h3 className="text-base font-semibold tracking-[-0.02em]">
                        {t(item.label)}
                      </h3>
                      <ArrowUpRight className="size-4 text-foreground/35 transition-colors group-hover:text-fina-violet" />
                    </div>
                    <p className="mt-2 max-w-xs text-sm leading-5 text-foreground/55">
                      {t(item.description)}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        <section
          aria-label={t("Workspace totals")}
          className="grid gap-4 md:grid-cols-3"
        >
          {[
            [t("Accounts"), accounts?.length ?? "—", t("Active money sources")],
            [t("Categories"), categories?.length ?? "—", t("Ledger labels")],
            [t("Imports"), imports?.length ?? "—", t("Statement files")]
          ].map(([label, value, helper]) => (
            <FinaSurface key={label} elevation="sm" className="p-5">
              <FinaSectionLabel>{label}</FinaSectionLabel>
              <div className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
                {value}
              </div>
              <p className="mt-2 text-xs text-foreground/50">{helper}</p>
            </FinaSurface>
          ))}
        </section>
      </main>
    </FinaPage>
  )
}

export default Home
