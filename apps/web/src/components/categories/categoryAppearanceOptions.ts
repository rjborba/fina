import type { CategoryColor } from "@fina/types"

export const categoryColorOptions = [
  { value: "yellow", label: "Yellow" },
  { value: "lime", label: "Lime" },
  { value: "sky", label: "Sky" },
  { value: "violet", label: "Violet" },
  { value: "danger", label: "Coral" },
  { value: "amber", label: "Amber" },
  { value: "orange", label: "Orange" },
  { value: "rose", label: "Rose" },
  { value: "pink", label: "Pink" },
  { value: "fuchsia", label: "Fuchsia" },
  { value: "indigo", label: "Indigo" },
  { value: "teal", label: "Teal" }
] as const satisfies ReadonlyArray<{
  value: CategoryColor
  label: string
}>

const categoryColorClassNames: Record<CategoryColor, string> = {
  yellow: "bg-yellow-400",
  lime: "bg-lime-500",
  sky: "bg-sky-400",
  violet: "bg-violet-500",
  danger: "bg-red-500",
  amber: "bg-amber-400",
  orange: "bg-orange-400",
  rose: "bg-rose-400",
  pink: "bg-pink-400",
  fuchsia: "bg-fuchsia-500",
  indigo: "bg-indigo-500",
  teal: "bg-teal-400"
}

export function getCategoryColorClassName(color: CategoryColor) {
  return categoryColorClassNames[color]
}
