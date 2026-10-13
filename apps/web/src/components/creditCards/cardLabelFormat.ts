import type { CreditCardReference } from "@fina/types"

export type CardOption = Pick<
  CreditCardReference,
  "id" | "accountId" | "name" | "last4" | "archived"
>

export function formatCardLabel(card: CardOption | null | undefined): string {
  if (!card) return "Not identified"
  return card.last4 ? `${card.name} · ••${card.last4}` : card.name
}
