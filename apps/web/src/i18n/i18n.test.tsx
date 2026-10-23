// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import { act, cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { MemoryRouter } from "react-router"
import { dayjs } from "@/dayjs"
import Login from "@/components/Login"
import { LanguageSelector } from "@/components/LanguageSelector"
import { TransactionShortcuts } from "@/components/transactions/TransactionShortcuts"
import { Calendar } from "@/components/ui/calendar"
import { ApiError } from "@/api/generated"
import { apiErrorMessage, authErrorMessage } from "./errors"
import {
  detectLanguage,
  formatCurrency,
  formatDate,
  formatNumber,
  i18n,
  LANGUAGE_STORAGE_KEY,
  localizeMessage,
  resolveLanguage,
  setLanguage
} from "."
import english from "./locales/en.json"
import portuguese from "./locales/pt-BR.json"

const auth = vi.hoisted(() => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  signInWithGoogle: vi.fn(),
  user: null
}))
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => auth }))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("English and Brazilian Portuguese", () => {
  it("resolves every literal translation key used by application code", () => {
    const sources = import.meta.glob<string>(
      ["../**/*.{ts,tsx}", "!../**/*.test.*", "!../api/generated/**"],
      { query: "?raw", import: "default", eager: true }
    )
    for (const [path, source] of Object.entries(sources)) {
      for (const match of source.matchAll(
        /\b(?:t|translate)\(\s*("(?:[^"\\]|\\.)*")/g
      )) {
        const key: string = JSON.parse(match[1])
        expect(
          Object.prototype.hasOwnProperty.call(english, key) ||
            Object.prototype.hasOwnProperty.call(english, `${key}_one`),
          `${path}: ${key}`
        ).toBe(true)
      }
    }
  })
  it("keeps complete catalogs with matching interpolation parameters", () => {
    expect(Object.keys(portuguese).sort()).toEqual(Object.keys(english).sort())
    for (const key of Object.keys(english) as (keyof typeof english)[]) {
      expect(portuguese[key].trim(), key).not.toBe("")
      const parameters = (text: string) =>
        [...text.matchAll(/{{\s*(\w+)\s*}}/g)].map((match) => match[1]).sort()
      expect(parameters(portuguese[key]), key).toEqual(parameters(english[key]))
    }
  })

  it("negotiates browser languages with a saved preference and English fallback", () => {
    vi.spyOn(navigator, "languages", "get").mockReturnValue([
      "fr-FR",
      "pt-PT",
      "en-US"
    ])
    expect(detectLanguage()).toBe("pt-BR")
    localStorage.setItem(LANGUAGE_STORAGE_KEY, "en")
    expect(detectLanguage()).toBe("en")
    localStorage.setItem(LANGUAGE_STORAGE_KEY, "invalid")
    expect(detectLanguage()).toBe("pt-BR")
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["de-DE"])
    expect(detectLanguage()).toBe("en")
    expect(resolveLanguage("en-GB")).toBe("en")
    expect(resolveLanguage(null)).toBeNull()
  })

  it("updates document language, calendars and formatting while retaining BRL", async () => {
    render(
      <>
        <LanguageSelector />
        <Calendar month={new Date(2026, 9, 1)} />
      </>
    )
    expect(screen.getByText("October 2026")).toBeVisible()
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Language" }),
      "pt-BR"
    )
    expect(document.documentElement.lang).toBe("pt-BR")
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("pt-BR")
    expect(detectLanguage()).toBe("pt-BR")
    expect(screen.getByText("outubro 2026")).toBeVisible()
    expect(screen.getByRole("button", { name: "Próximo mês" })).toBeVisible()
    expect(dayjs("2026-10-12").format("MMMM")).toBe("outubro")
    expect(formatCurrency(-1234.56)).toBe(
      new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL"
      }).format(-1234.56)
    )
    expect(formatNumber(1234.56)).toBe("1.234,56")
    expect(
      formatDate("2026-10-12", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit"
      })
    ).toBe("12/10/26")
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Idioma" }),
      "en"
    )
    expect(document.documentElement.lang).toBe("en")
    expect(dayjs("2026-10-12").format("MMMM")).toBe("October")
    expect(formatCurrency(-1234.56)).toBe("-R$1,234.56")
    expect(formatNumber(1234.56)).toBe("1,234.56")
    expect(
      formatDate("2026-10-12", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit"
      })
    ).toBe("10/12/26")
  })

  it("works when browser storage is unavailable", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("Blocked")
    })
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Blocked")
    })
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["pt-BR"])
    expect(detectLanguage()).toBe("pt-BR")
    await act(async () => setLanguage("pt-BR"))
    expect(i18n.t("Transactions")).toBe("Transações")
  })

  it("switches sign-in copy and existing validation messages without discarding inputs", async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )
    await user.type(
      screen.getByRole("textbox", { name: "Email address" }),
      "person@example.test"
    )
    await user.type(screen.getByLabelText("Password", { exact: true }), "123")
    await user.click(screen.getByRole("button", { name: "Sign in" }))
    expect(
      await screen.findByText("Password must be at least 6 characters")
    ).toBeVisible()
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Language" }),
      "pt-BR"
    )
    expect(
      screen.getByRole("heading", { name: "Boas-vindas de volta." })
    ).toBeVisible()
    expect(screen.getByRole("textbox", { name: "E-mail" })).toHaveValue(
      "person@example.test"
    )
    expect(screen.getByLabelText(/^Senha/)).toHaveValue("123")
    expect(
      screen.getByText("A senha deve ter pelo menos 6 caracteres")
    ).toBeVisible()
    expect(auth.signIn).not.toHaveBeenCalled()
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Idioma" }),
      "en"
    )
    expect(
      screen.getByText("Password must be at least 6 characters")
    ).toBeVisible()
  })

  it("translates static option lists, parser messages, formulas, and all plural forms", async () => {
    await i18n.changeLanguage("pt-BR")
    render(<TransactionShortcuts open onOpenChange={() => undefined} />)
    expect(
      screen.getByRole("heading", { name: "Atalhos do teclado" })
    ).toBeVisible()
    expect(screen.getByText("Criar lançamento")).toBeVisible()
    expect(localizeMessage("Choose a date format that matches this row")).toBe(
      "Escolha um formato de data compatível com esta linha"
    )
    expect(localizeMessage("Referenced tile: Cannot divide by zero.")).toBe(
      "Indicador referenciado: Não é possível dividir por zero."
    )
    expect(
      localizeMessage("String must contain at most 120 character(s)")
    ).toBe("Use no máximo 120 caracteres.")
    expect(
      localizeMessage(
        "Use numbers, {{references}}, +, -, *, / and parentheses only."
      )
    ).toContain("{{references}}")
    for (const [count, expected] of [
      [0, "0 transações"],
      [1, "1 transação"],
      [2, "2 transações"],
      [1000000, "1000000 transações"]
    ] as const) {
      expect(i18n.t("transactionsCount", { count })).toBe(expected)
    }
  })

  it("maps stable API and Auth codes without rendering unknown provider diagnostics", async () => {
    await i18n.changeLanguage("pt-BR")
    expect(i18n.t(authErrorMessage({ code: "invalid_credentials" }))).toBe(
      "E-mail ou senha inválidos."
    )
    expect(i18n.t(authErrorMessage(new Error("private diagnostic")))).toBe(
      "Não foi possível entrar. Tente novamente."
    )
    const failure = (body: object) =>
      new ApiError(
        { method: "GET", url: "/fixture" },
        {
          url: "/fixture",
          ok: false,
          status: 400,
          statusText: "Bad Request",
          body
        },
        "Request failed"
      )
    expect(
      apiErrorMessage(
        failure({ code: "INVALID_REQUEST", message: "private diagnostic" }),
        "Something went wrong"
      )
    ).toBe("Verifique os campos obrigatórios e tente novamente.")
    expect(
      apiErrorMessage(
        failure({ code: "DUPLICATE_IMPORT" }),
        "Something went wrong"
      )
    ).toBe("Este mesmo arquivo já foi importado para a conta selecionada.")
    expect(
      apiErrorMessage(
        failure({
          code: "CONFLICT",
          message:
            "This tile is used by another formula. Update that formula before deleting it."
        }),
        "Something went wrong"
      )
    ).toContain("outra fórmula")
  })
})
