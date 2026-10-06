import type { CategoryColor, CategoryIcon } from "@fina/types"
import type { LucideIcon } from "lucide-react"
import {
  Baby,
  Bike,
  BookOpen,
  Briefcase,
  Camera,
  Car,
  Coffee,
  Dumbbell,
  Gamepad2,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  Music,
  PawPrint,
  Plane,
  Shirt,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Tag,
  Utensils,
  WalletCards,
  Wrench
} from "lucide-react"

export const categoryIconOptions = [
  { value: "tag", Icon: Tag },
  { value: "shopping-cart", Icon: ShoppingCart },
  { value: "utensils", Icon: Utensils },
  { value: "car", Icon: Car },
  { value: "house", Icon: House },
  { value: "heart-pulse", Icon: HeartPulse },
  { value: "plane", Icon: Plane },
  { value: "gamepad-2", Icon: Gamepad2 },
  { value: "briefcase", Icon: Briefcase },
  { value: "book-open", Icon: BookOpen },
  { value: "coffee", Icon: Coffee },
  { value: "dumbbell", Icon: Dumbbell },
  { value: "gift", Icon: Gift },
  { value: "paw-print", Icon: PawPrint },
  { value: "shirt", Icon: Shirt },
  { value: "smartphone", Icon: Smartphone },
  { value: "music", Icon: Music },
  { value: "baby", Icon: Baby },
  { value: "wrench", Icon: Wrench },
  { value: "wallet-cards", Icon: WalletCards },
  { value: "bike", Icon: Bike },
  { value: "camera", Icon: Camera },
  { value: "graduation-cap", Icon: GraduationCap },
  { value: "sparkles", Icon: Sparkles }
] as const satisfies ReadonlyArray<{
  value: CategoryIcon
  Icon: LucideIcon
}>

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

export const categoryIconMap: Record<CategoryIcon, LucideIcon> =
  Object.fromEntries(
    categoryIconOptions.map(({ value, Icon }) => [value, Icon])
  ) as Record<CategoryIcon, LucideIcon>

const categoryColorClassNames: Record<CategoryColor, string> = {
  yellow: "bg-fina-yellow text-fina-ink",
  lime: "bg-fina-lime text-fina-ink",
  sky: "bg-fina-sky text-fina-ink",
  violet: "bg-fina-violet text-white",
  danger: "bg-fina-danger text-fina-ink",
  amber: "bg-amber-300 text-fina-ink",
  orange: "bg-orange-400 text-fina-ink",
  rose: "bg-rose-400 text-fina-ink",
  pink: "bg-pink-400 text-fina-ink",
  fuchsia: "bg-fuchsia-500 text-white",
  indigo: "bg-indigo-500 text-white",
  teal: "bg-teal-400 text-fina-ink"
}

export function getCategoryColorClassName(color: CategoryColor) {
  return categoryColorClassNames[color]
}
