import type { ReactNode } from "react"

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
    <div className="min-h-svh bg-fina-canvas text-foreground">
      <div className={cn("mx-auto w-full max-w-[1680px]", className)}>
        {children}
      </div>
    </div>
  )
}

export function FinaPageHeader(props: FinaPageHeaderProps) {
  const { actions, description, eyebrow, title } = props

  return (
    <header className="transactions-hero border-b border-fina-grid px-5 pb-7 pt-16 md:px-8 md:py-7">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-4xl">
          <div className="text-xs font-medium text-foreground/45">
            {eyebrow}
          </div>
          <h1 className="mt-4 max-w-4xl text-3xl font-semibold leading-tight tracking-[-0.035em] sm:text-4xl">
            {title}
          </h1>
          <div className="mt-2 max-w-2xl text-sm leading-6 text-foreground/60">
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
    <div className="text-xs font-medium text-foreground/50">{children}</div>
  )
}
