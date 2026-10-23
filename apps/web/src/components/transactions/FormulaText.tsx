import { isCustomFormulaCode } from "@fina/types"
import { formulaParts, type FormulaOption } from "./formulaEditor"

export function FormulaText({
  value,
  options
}: {
  value: string
  options: FormulaOption[]
}) {
  return (
    <span className="whitespace-pre-wrap [font-feature-settings:normal] [font-variant-ligatures:none]">
      {formulaParts(
        value,
        options,
        isCustomFormulaCode(value) ? "code" : "simple"
      ).map((part) => (
        <span
          key={part.start}
          className={part.className}
          title={
            part.reference
              ? `${part.reference.kind}: ${part.reference.name}`
              : undefined
          }
          aria-label={
            part.reference
              ? `${part.reference.kind}: ${part.reference.name}`
              : undefined
          }
        >
          {part.display ?? part.text}
        </span>
      ))}
    </span>
  )
}
