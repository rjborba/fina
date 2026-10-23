import { beforeEach } from "vitest"
import { i18n, LANGUAGE_STORAGE_KEY } from "@/i18n"

beforeEach(async () => {
  await i18n.changeLanguage("en")
  if (typeof localStorage !== "undefined")
    localStorage.removeItem(LANGUAGE_STORAGE_KEY)
})
