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
          "rounded-none border-2 border-fina-ink bg-fina-lime font-black uppercase text-fina-ink shadow-fina-md hover:bg-fina-lime hover:text-fina-ink hover:shadow-fina-lg active:shadow-fina-sm",
        "fina-secondary":
          "rounded-none border-2 border-fina-ink bg-fina-surface font-black uppercase text-fina-ink shadow-fina-md hover:bg-fina-sky hover:text-fina-ink hover:shadow-fina-lg active:shadow-fina-sm",
        "fina-ghost":
          "rounded-none bg-transparent text-fina-ink hover:bg-fina-yellow hover:text-fina-ink",
        "fina-danger":
          "rounded-none border-2 border-fina-ink bg-fina-danger font-black text-fina-ink shadow-fina-sm hover:bg-fina-danger hover:text-fina-ink",
        link: "text-primary underline-offset-4 hover:underline"
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9"
      },
      lift: {
        true: "hover:-translate-y-0.5 active:translate-y-0",
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
