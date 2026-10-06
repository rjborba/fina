// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, describe, expect, it } from "vitest"
import { takePendingImportFile } from "@/imports/pendingImport"
import { GlobalCsvDropTarget } from "./GlobalCsvDropTarget"

describe("GlobalCsvDropTarget", () => {
  afterEach(() => {
    cleanup()
    takePendingImportFile()
  })

  it("queues a dropped file and navigates to the import workflow", async () => {
    render(
      <MemoryRouter initialEntries={["/transactions"]}>
        <GlobalCsvDropTarget />
        <Routes>
          <Route path="/transactions" element={<div>Transactions route</div>} />
          <Route path="/imports" element={<div>Imports route</div>} />
        </Routes>
      </MemoryRouter>
    )
    const file = new File(["Date;Amount"], "statement.csv", {
      type: "text/csv"
    })
    const dataTransfer = {
      dropEffect: "none",
      files: [file],
      types: ["Files"]
    }

    fireEvent.dragEnter(window, { dataTransfer })
    expect(screen.getByText("Drop file to import")).toBeInTheDocument()

    fireEvent.drop(window, { dataTransfer })

    expect(await screen.findByText("Imports route")).toBeInTheDocument()
    expect(screen.queryByText("Drop file to import")).not.toBeInTheDocument()
    expect(takePendingImportFile()).toBe(file)
  })

  it("ignores drags that do not contain files", () => {
    render(
      <MemoryRouter>
        <GlobalCsvDropTarget />
      </MemoryRouter>
    )

    fireEvent.dragEnter(window, {
      dataTransfer: { files: [], types: ["text/plain"] }
    })

    expect(screen.queryByText("Drop file to import")).not.toBeInTheDocument()
  })
})
