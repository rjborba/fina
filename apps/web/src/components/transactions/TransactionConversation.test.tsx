// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type {
  TransactionConversation as Conversation,
  QueryTransactionOutputDtoType,
  CreditCardBillDetail
} from "@fina/types"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { TransactionConversation } from "./TransactionConversation"

const api = vi.hoisted(() => ({
  read: vi.fn(),
  add: vi.fn(),
  resolve: vi.fn()
}))
vi.mock("@/api/generated", () => ({
  transactionsControllerConversation: api.read,
  transactionsControllerAddComment: api.add,
  transactionsControllerResolveConversation: api.resolve
}))
let stored: Conversation
let client: QueryClient
function setup() {
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  })
  client.setQueryData(["transactions", "test"], {
    data: [
      {
        id: "7",
        commentCount: 0,
        conversationResolved: false,
        category: { id: "10" }
      }
    ],
    totalCount: 1
  })
  client.setQueryData(["credit-card-bills", "detail", "test"], {
    transactions: [{ id: "7", commentCount: 0, conversationResolved: false }]
  })
  render(
    <QueryClientProvider client={client}>
      <TransactionConversation id="7" />
    </QueryClientProvider>
  )
}
describe("transaction conversations", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    stored = { transactionId: "7", resolved: false, messages: [] }
    api.read.mockImplementation(async () => structuredClone(stored))
    api.add.mockImplementation(
      async ({ requestBody }: { requestBody: { body: string } }) => {
        stored = {
          ...stored,
          resolved: false,
          messages: [
            ...stored.messages,
            {
              id: String(stored.messages.length + 1),
              body: requestBody.body,
              createdAt: "2026-10-22T12:00:00.000Z",
              author: {
                id: "1a5a3df4-4964-4b51-8b95-635c92833282",
                name: stored.messages.length ? "Other member" : "First member"
              }
            }
          ]
        }
        return structuredClone(stored)
      }
    )
    api.resolve.mockImplementation(
      async ({ requestBody }: { requestBody: { resolved: boolean } }) => {
        stored = { ...stored, resolved: requestBody.resolved }
        return structuredClone(stored)
      }
    )
  })
  afterEach(() => {
    cleanup()
    client?.clear()
  })

  it("posts attributed messages, resolves, reopens and reopens on reply while refreshing both ledgers", async () => {
    const user = userEvent.setup()
    setup()
    await user.type(
      await screen.findByRole("textbox", { name: "Comment" }),
      "  Review this charge  "
    )
    await user.click(screen.getByRole("button", { name: "Send comment" }))
    expect(await screen.findByText("Review this charge")).toBeVisible()
    expect(screen.getByText("First member")).toBeVisible()
    await user.click(
      screen.getByRole("button", { name: "Resolve conversation" })
    )
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Resolved")
    )
    expect(
      client.getQueryData<QueryTransactionOutputDtoType>([
        "transactions",
        "test"
      ])?.data[0]
    ).toMatchObject({
      commentCount: 1,
      conversationResolved: true,
      category: { id: "10" }
    })
    expect(
      client.getQueryData<CreditCardBillDetail>([
        "credit-card-bills",
        "detail",
        "test"
      ])?.transactions[0].conversationResolved
    ).toBe(true)
    await user.click(
      screen.getByRole("button", { name: "Reopen conversation" })
    )
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Unresolved")
    )
    await user.click(
      screen.getByRole("button", { name: "Resolve conversation" })
    )
    await screen.findByRole("button", { name: "Reopen conversation" })
    await user.type(
      screen.getByRole("textbox", { name: "Reply to conversation" }),
      "A reply"
    )
    await user.keyboard("{Control>}{Enter}{/Control}")
    expect(await screen.findByText("A reply")).toBeVisible()
    expect(screen.getByText("Other member")).toBeVisible()
    expect(screen.getByRole("status")).toHaveTextContent("Unresolved")
    expect(screen.getAllByRole("listitem")).toHaveLength(2)
    expect(
      client.getQueryData<QueryTransactionOutputDtoType>([
        "transactions",
        "test"
      ])?.data[0]
    ).toMatchObject({ commentCount: 2, conversationResolved: false })
  })

  it("keeps failed drafts for retry, preserves history on resolution failures, and renders text safely", async () => {
    const user = userEvent.setup()
    stored.messages = [
      {
        id: "1",
        body: "<script>example</script>",
        createdAt: "2026-10-22T12:00:00.000Z",
        author: null
      }
    ]
    setup()
    expect(await screen.findByText("<script>example</script>")).toBeVisible()
    expect(screen.getByText("Previous note · author unavailable")).toBeVisible()
    const input = screen.getByRole("textbox", { name: "Reply to conversation" })
    await user.type(input, "Retry this")
    api.add.mockRejectedValueOnce(new Error("offline"))
    await user.click(screen.getByRole("button", { name: "Send reply" }))
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not send comment"
    )
    expect(input).toHaveValue("Retry this")
    await user.click(screen.getByRole("button", { name: "Send reply" }))
    expect(await screen.findByText("Retry this")).toBeVisible()
    api.resolve.mockRejectedValueOnce(new Error("offline"))
    await user.click(
      screen.getByRole("button", { name: "Resolve conversation" })
    )
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not update conversation"
    )
    expect(screen.getByRole("status")).toHaveTextContent("Unresolved")
    expect(screen.getAllByRole("listitem")).toHaveLength(2)
  })

  it("refreshes the thread and both ledger indicators when another member replies", async () => {
    stored = {
      transactionId: "7",
      resolved: true,
      messages: [
        {
          id: "1",
          body: "Original comment",
          createdAt: "2026-10-22T12:00:00.000Z",
          author: null
        }
      ]
    }
    setup()
    await screen.findByText("Original comment")
    await waitFor(() =>
      expect(
        client.getQueryData<QueryTransactionOutputDtoType>([
          "transactions",
          "test"
        ])?.data[0].conversationResolved
      ).toBe(true)
    )
    stored = {
      ...stored,
      resolved: false,
      messages: [
        ...stored.messages,
        {
          id: "2",
          body: "Reply from another member",
          createdAt: "2026-10-22T13:00:00.000Z",
          author: {
            id: "2a5a3df4-4964-4b51-8b95-635c92833282",
            name: "Other member"
          }
        }
      ]
    }
    await client.invalidateQueries({
      queryKey: ["transaction-conversation", "7"]
    })
    expect(await screen.findByText("Reply from another member")).toBeVisible()
    expect(screen.getByRole("status")).toHaveTextContent("Unresolved")
    await waitFor(() => {
      expect(
        client.getQueryData<QueryTransactionOutputDtoType>([
          "transactions",
          "test"
        ])?.data[0]
      ).toMatchObject({ commentCount: 2, conversationResolved: false })
      expect(
        client.getQueryData<CreditCardBillDetail>([
          "credit-card-bills",
          "detail",
          "test"
        ])?.transactions[0]
      ).toMatchObject({ commentCount: 2, conversationResolved: false })
    })
  })
})
