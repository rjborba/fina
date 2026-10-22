import {
  formulaParts,
  FORMULA_REFERENCE_CLASS,
  type FormulaOption
} from "./formulaEditor"

export function FormulaText({
  value,
  options
}: {
  value: string
  options: FormulaOption[]
}) {
  return (
    <span className="[font-feature-settings:normal] [font-variant-ligatures:none]">
      {formulaParts(value, options).map((part) =>
        part.reference ? (
          <span
            key={part.start}
            className={FORMULA_REFERENCE_CLASS}
            title={`${part.reference.kind}: ${part.reference.name}`}
            aria-label={`${part.reference.kind}: ${part.reference.name}`}
          >
            {part.reference.name}
          </span>
        ) : (
          <span key={part.start}>{part.text}</span>
        )
      )}
    </span>
  )
}
