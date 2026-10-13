import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-xs hover:bg-primary",
        destructive:
          "bg-destructive text-white shadow-xs hover:bg-destructive focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive",
        outline:
          "border bg-background text-foreground shadow-xs hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary",
        ghost:
          "bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground",
        "fina-primary":
          "rounded-md border border-fina-violet bg-fina-violet font-medium text-white shadow-fina-sm hover:bg-fina-violet/90 hover:text-white active:bg-fina-violet/80",
        "fina-secondary":
          "rounded-md border border-fina-grid bg-fina-surface font-medium text-foreground shadow-fina-sm hover:bg-fina-canvas hover:text-foreground active:bg-fina-canvas/60",
        "fina-ghost":
          "rounded-md bg-transparent font-medium text-foreground hover:bg-fina-canvas/60 hover:text-foreground",
        "fina-danger":
          "rounded-md border border-red-200 bg-fina-surface font-medium text-red-600 shadow-fina-sm hover:bg-fina-danger hover:text-red-700 dark:border-red-900/60 dark:text-red-300",
        link: "text-primary underline-offset-4 hover:underline"
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9"
      },
      lift: {
        true: "",
        false: ""
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      lift: false
    }
  }
)

function Button({
  className,
  variant,
  size,
  lift,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, lift, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
