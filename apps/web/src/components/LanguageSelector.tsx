import { useTranslation } from "react-i18next"
import { Languages } from "lucide-react"
import { setLanguage, type Language } from "@/i18n"

export function LanguageSelector() {
  const { t, i18n } = useTranslation()
  return (
    <label className="flex items-center gap-2 text-xs text-foreground/70">
      <Languages className="size-4 shrink-0" aria-hidden="true" />
      <span>{t("Language")}</span>
      <select
        aria-label={t("Language")}
        value={i18n.resolvedLanguage === "pt-BR" ? "pt-BR" : "en"}
        onChange={(event) => setLanguage(event.target.value as Language)}
        className="h-9 min-w-0 rounded-md border border-fina-grid bg-fina-surface px-2 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-fina-violet"
      >
        <option value="en" lang="en">
          English
        </option>
        <option value="pt-BR" lang="pt-BR">
          Português (Brasil)
        </option>
      </select>
    </label>
  )
}
