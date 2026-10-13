import { cva, type VariantProps } from "class-variance-authority"
import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

const finaSurfaceVariants = cva(
  "rounded-lg border border-fina-grid text-foreground",
  {
    variants: {
      tone: {
        canvas: "bg-fina-canvas",
        surface: "bg-fina-surface",
        lime: "bg-fina-lime",
        violet: "bg-fina-violet text-white",
        sky: "bg-fina-sky",
        yellow: "bg-fina-yellow",
        danger: "bg-fina-danger",
        ink: "bg-fina-ink text-white"
      },
      elevation: {
        none: "shadow-none",
        sm: "shadow-fina-sm",
        md: "shadow-fina-md",
        lg: "shadow-fina-lg"
      }
    },
    defaultVariants: {
      tone: "surface",
      elevation: "md"
    }
  }
)

type FinaSurfaceProps = ComponentProps<"div"> &
  VariantProps<typeof finaSurfaceVariants>

function FinaSurface({
  className,
  tone,
  elevation,
  ...props
}: FinaSurfaceProps) {
  return (
    <div
      data-slot="fina-surface"
      className={cn(finaSurfaceVariants({ tone, elevation }), className)}
      {...props}
    />
  )
}

const finaBadgeVariants = cva(
  "inline-flex items-center rounded-md border border-fina-grid px-2 py-1 text-[11px] font-medium tracking-[-0.01em] text-foreground",
  {
    variants: {
      tone: {
        surface: "bg-fina-surface",
        lime: "bg-fina-lime",
        sky: "bg-fina-sky",
        yellow: "bg-fina-yellow",
        danger: "bg-fina-danger"
      }
    },
    defaultVariants: {
      tone: "surface"
    }
  }
)

type FinaBadgeProps = ComponentProps<"span"> &
  VariantProps<typeof finaBadgeVariants>

function FinaBadge({ className, tone, ...props }: FinaBadgeProps) {
  return (
    <span
      data-slot="fina-badge"
      className={cn(finaBadgeVariants({ tone }), className)}
      {...props}
    />
  )
}

export { FinaBadge, FinaSurface, finaBadgeVariants, finaSurfaceVariants }
