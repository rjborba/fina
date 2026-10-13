// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip"

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe = vi.fn()
      unobserve = vi.fn()
      disconnect = vi.fn()
    }
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("Tooltip", () => {
  it.each(["hover", "keyboard focus"] as const)(
    "shows an accessible arrowless tooltip on %s and dismisses it with Escape",
    async (interaction) => {
      const user = userEvent.setup()
      render(
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button">Account information</button>
          </TooltipTrigger>
          <TooltipContent>Banco Inter</TooltipContent>
        </Tooltip>
      )
      const trigger = screen.getByRole("button", {
        name: "Account information"
      })

      if (interaction === "hover") await user.hover(trigger)
      else {
        await user.tab()
        expect(trigger).toHaveFocus()
      }

      expect(await screen.findByRole("tooltip")).toHaveTextContent(
        "Banco Inter"
      )
      expect(trigger).toHaveAccessibleDescription("Banco Inter")
      const content = document.querySelector('[data-slot="tooltip-content"]')
      expect(content).toBeVisible()
      expect(content?.querySelector("svg")).toBeNull()

      await user.keyboard("{Escape}")
      await waitFor(() => {
        expect(screen.queryByRole("tooltip")).not.toBeInTheDocument()
      })
      expect(trigger).not.toHaveAttribute("aria-describedby")
    }
  )
})
