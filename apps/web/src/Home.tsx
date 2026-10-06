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
    tone: "bg-fina-lime"
  },
  {
    description: "Bring statement files into the active workspace.",
    icon: FileUp,
    label: "Imports",
    number: "02",
    to: "/imports",
    tone: "bg-fina-violet text-white"
  },
  {
    description: "Manage checking accounts and credit cards.",
    icon: Banknote,
    label: "Accounts",
    number: "03",
    to: "/bank-accounts",
    tone: "bg-fina-sky"
  },
  {
    description: "Shape the labels used to organize your spending.",
    icon: Tag,
    label: "Categories",
    number: "04",
    to: "/categories",
    tone: "bg-fina-yellow"
  }
] as const

function Home() {
  const { selectedGroup } = useActiveGroup()
  const groupId = selectedGroup?.id?.toString()
  const { data: accounts } = useBankAccounts({ groupId })
  const { data: categories } = useCategories({ groupId })
  const { data: imports } = useImports({ groupId })

  return (
    <FinaPage>
      <FinaPageHeader
        eyebrow="Dashboard"
        title="Money, in focus."
        description={
          <>
            Your working view for{" "}
            <strong>{selectedGroup?.name ?? "Fina"}</strong>. Start with a
            statement, then keep the ledger clean.
          </>
        }
      />

      <main className="space-y-8 p-5 md:p-8">
        <section aria-labelledby="workspace-title">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <FinaSectionLabel>Workspace / Quick access</FinaSectionLabel>
              <h2
                id="workspace-title"
                className="mt-2 text-2xl font-black uppercase tracking-[-0.045em]"
              >
                Keep the books moving
              </h2>
            </div>
            <FinaBadge tone="surface">
              {selectedGroup?.name ?? "No group"}
            </FinaBadge>
          </div>

          <div className="grid border-l-2 border-t-2 border-fina-ink sm:grid-cols-2 xl:grid-cols-4">
            {WORKSPACE_LINKS.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`${item.tone} group min-h-64 border-b-2 border-r-2 border-fina-ink p-5 transition-transform hover:-translate-y-1 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-fina-violet`}
                >
                  <div className="flex items-start justify-between">
                    <span className="font-mono text-xs font-black tracking-[0.16em]">
                      / {item.number}
                    </span>
                    <Icon className="size-7" strokeWidth={2.5} />
                  </div>
                  <div className="mt-20">
                    <div className="flex items-end justify-between gap-4">
                      <h3 className="text-2xl font-black uppercase tracking-[-0.05em]">
                        {item.label}
                      </h3>
                      <ArrowUpRight className="size-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                    </div>
                    <p className="mt-3 max-w-xs text-sm font-semibold leading-5 opacity-70">
                      {item.description}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        <section
          aria-label="Workspace totals"
          className="grid gap-4 md:grid-cols-3"
        >
          {[
            ["Accounts", accounts?.length ?? "—", "Active money sources"],
            ["Categories", categories?.length ?? "—", "Ledger labels"],
            ["Imports", imports?.length ?? "—", "Statement files"]
          ].map(([label, value, helper], index) => (
            <FinaSurface
              key={label}
              elevation="sm"
              tone={index === 1 ? "yellow" : "surface"}
              className="p-5"
            >
              <FinaSectionLabel>{label}</FinaSectionLabel>
              <div className="mt-3 text-5xl font-black tracking-[-0.06em]">
                {value}
              </div>
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.08em] text-fina-ink/55">
                {helper}
              </p>
            </FinaSurface>
          ))}
        </section>
      </main>
    </FinaPage>
  )
}

export default Home
