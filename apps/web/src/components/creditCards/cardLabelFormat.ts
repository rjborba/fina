import type { CardMetadata } from "@fina/types"

export type CardOption = CardMetadata

export function formatCardLabel(card: CardOption | null | undefined): string {
  return (
    [card?.cardName, card?.cardLast4 ? `••${card.cardLast4}` : null]
      .filter(Boolean)
      .join(" · ") || "Not identified"
  )
}
