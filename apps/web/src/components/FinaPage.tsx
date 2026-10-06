import type { ReactNode } from "react"

import { FinaBadge } from "@/components/ui/fina"
import { cn } from "@/lib/utils"

interface FinaPageProps {
  children: ReactNode
  className?: string
}

interface FinaPageHeaderProps {
  actions?: ReactNode
  description: ReactNode
  eyebrow: string
  marker?: string
  title: string
}

export function FinaPage({ children, className }: FinaPageProps) {
  return (
    <div className="min-h-svh bg-fina-grid text-fina-ink">
      <div className={cn("mx-auto w-full max-w-[1600px]", className)}>
        {children}
      </div>
    </div>
  )
}

export function FinaPageHeader({
  actions,
  description,
  eyebrow,
  marker = "01",
  title
}: FinaPageHeaderProps) {
  return (
    <header className="transactions-hero border-b-[3px] border-fina-ink px-5 pb-10 pt-16 md:px-8 md:py-12">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-4xl">
          <FinaBadge>{`${eyebrow} / ${marker}`}</FinaBadge>
          <h1 className="mt-5 max-w-4xl text-5xl font-black uppercase leading-[0.86] tracking-[-0.075em] sm:text-6xl lg:text-7xl">
            {title}
          </h1>
          <div className="mt-6 max-w-2xl text-sm font-semibold leading-6 text-fina-ink/70 sm:text-base">
            {description}
          </div>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
    </header>
  )
}

export function FinaSectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-fina-ink/60">
      {children}
    </div>
  )
}
