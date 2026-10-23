import i18next from "i18next"
import { initReactI18next } from "react-i18next"
import { dayjs } from "@/dayjs"
import "dayjs/locale/pt-br"
import english from "./locales/en.json"
import portuguese from "./locales/pt-BR.json"

export type Language = "en" | "pt-BR"
export const LANGUAGE_STORAGE_KEY = "fina-language"

export function resolveLanguage(
  value: string | null | undefined
): Language | null {
  if (/^pt(?:-|$)/i.test(value ?? "")) return "pt-BR"
  if (/^en(?:-|$)/i.test(value ?? "")) return "en"
  return null
}

export function detectLanguage(): Language {
  try {
    const saved = resolveLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY))
    if (saved) return saved
  } catch {
    // A blocked browser store must not prevent using the app.
  }
  for (const language of typeof navigator === "undefined"
    ? []
    : (navigator.languages ?? [navigator.language])) {
    const supported = resolveLanguage(language)
    if (supported) return supported
  }
  return "en"
}

export const i18n = i18next.createInstance()

function syncLanguage(language: string) {
  const selected = resolveLanguage(language) ?? "en"
  if (typeof document !== "undefined") document.documentElement.lang = selected
  dayjs.locale(selected === "pt-BR" ? "pt-br" : "en")
}

i18n.on("languageChanged", syncLanguage)
void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: english },
    "pt-BR": { translation: portuguese }
  },
  lng: detectLanguage(),
  fallbackLng: "en",
  supportedLngs: ["en", "pt-BR"],
  keySeparator: false,
  nsSeparator: false,
  interpolation: { escapeValue: false },
  initAsync: false,
  react: { useSuspense: false }
})

export function setLanguage(language: Language) {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  } catch {
    // The language can still be changed for this session.
  }
  void i18n.changeLanguage(language)
}

export function getLocale(): "en-US" | "pt-BR" {
  return i18n.resolvedLanguage === "pt-BR" ? "pt-BR" : "en-US"
}

/** For non-React formatters and event handlers. Components use useTranslation. */
export function translate(
  key: string,
  values?: Record<string, unknown>
): string {
  return i18n.t(key, values ?? {}) as string
}

export function localizeMessage(message: string): string {
  const minimum = /^String must contain at least (\d+) character\(s\)$/.exec(
    message
  )
  if (minimum)
    return translate("Enter at least {{count}} characters.", {
      count: Number(minimum[1])
    })
  const maximum = /^String must contain at most (\d+) character\(s\)$/.exec(
    message
  )
  if (maximum)
    return translate("Use at most {{count}} characters.", {
      count: Number(maximum[1])
    })
  if (/^Expected .+, received .+$|^Invalid enum value\./.test(message))
    return translate("Invalid value.")
  if (message.startsWith("Referenced tile: ")) {
    return translate("Referenced tile: {{value0}}", {
      value0: localizeMessage(message.slice(17))
    })
  }
  // Formula syntax uses literal braces, not an interpolation variable.
  return translate(message, { references: "{{references}}" })
}

const currencyFormatters = {
  "en-US": new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "BRL"
  }),
  "pt-BR": new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  })
}

export function formatCurrency(value: number): string {
  return currencyFormatters[getLocale()].format(value)
}

export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(getLocale(), options).format(value)
}

export function formatDate(
  value: string | Date,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" }
): string {
  return new Intl.DateTimeFormat(getLocale(), options).format(
    dayjs(value).toDate()
  )
}
