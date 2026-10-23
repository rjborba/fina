import { expect, test } from "@playwright/test";

test.use({ locale: "pt-BR" });

test("uses Portuguese through sign-in, account creation and CSV import and persists language switching", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.name));
  await page.goto("/login");
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  await expect(
    page.getByRole("heading", { name: "Boas-vindas de volta." }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "E-mail" })
    .fill("browser-review@example.test");
  await page
    .getByLabel("Senha", { exact: true })
    .fill("browser-fixture-password");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await page
    .getByRole("link", { name: "Contas bancárias", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Nome da conta" })
    .fill("I18n fixture account");
  await page
    .getByRole("combobox", { name: "Instituição financeira", exact: true })
    .click();
  await page
    .getByRole("option", { name: "Outra / não listada", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Adicionar conta", exact: true })
    .click();
  await expect(
    page.getByText("I18n fixture account", { exact: true }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Importações", exact: true }).click();
  await page
    .getByRole("button", { name: "Importar arquivo", exact: true })
    .click();
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  await page
    .getByLabel("Solte um CSV aqui ou escolha um arquivo")
    .setInputFiles({
      name: "i18n-fixture.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        [
          "Date;Description;Amount",
          `21/${month}/${now.getFullYear()};I18n fixture purchase;-1234,56`,
          `22/${month}/${now.getFullYear()};I18n fixture refund;34,56`,
        ].join("\n"),
      ),
    });
  await page.getByRole("combobox", { name: "Conta de destino" }).click();
  await page.getByRole("option", { name: /I18n fixture account/ }).click();
  await expect(
    page.getByRole("button", { name: "Validar importação", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Validar importação", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Importar 2 transações", exact: true })
    .click();
  await expect(
    page.getByText("2 transações importadas.", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Revisar transações desta conta", exact: true })
    .click();
  await expect(
    page.getByText("I18n fixture purchase", { exact: true }),
  ).toBeVisible();
  const ledger = page.getByRole("grid", { name: "Transações" });
  await expect(ledger).toContainText(/-R\$\s*1\.234,56/);
  const purchase = () =>
    page.getByRole("row").filter({ hasText: "I18n fixture purchase" });
  await purchase()
    .getByRole("button", {
      name: "Adicionar comentário à transação",
      exact: true,
    })
    .click();
  const conversation = page.getByRole("dialog", {
    name: "Conversa da transação",
    exact: true,
  });
  await conversation
    .getByRole("textbox", { name: "Comentário", exact: true })
    .fill("I18n fixture comment");
  await conversation
    .getByRole("button", { name: "Enviar comentário", exact: true })
    .click();
  await expect(
    conversation.getByText("I18n fixture comment", { exact: true }),
  ).toBeVisible();
  await conversation
    .getByRole("button", { name: "Resolver conversa", exact: true })
    .click();
  await expect(
    conversation.getByRole("button", { name: "Reabrir conversa", exact: true }),
  ).toBeVisible();
  await conversation
    .getByRole("button", { name: "Fechar", exact: true })
    .click();

  await page.getByRole("button", { name: /^Filtrar/ }).click();
  await page
    .getByRole("textbox", { name: "Buscar propriedades dos filtros" })
    .fill("categoria");
  await expect(
    page.getByRole("button", { name: "Categoria", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByRole("link", { name: "Configurações", exact: true }).click();
  await page.getByRole("combobox", { name: "Idioma" }).selectOption("en");
  await expect(
    page.getByRole("heading", { name: "Workspaces", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("combobox", { name: "Language" })).toHaveValue(
    "en",
  );
  await page.getByRole("link", { name: "Transactions", exact: true }).click();
  await expect(
    page.getByText("I18n fixture purchase", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("grid", { name: "Transactions" })).toContainText(
    "-R$1,234.56",
  );
  await purchase()
    .getByRole("button", { name: "Open transaction conversation", exact: true })
    .click();
  const englishConversation = page.getByRole("dialog", {
    name: "Transaction conversation",
    exact: true,
  });
  await expect(
    englishConversation.getByText("I18n fixture comment", { exact: true }),
  ).toBeVisible();
  await expect(
    englishConversation.getByRole("button", {
      name: "Reopen conversation",
      exact: true,
    }),
  ).toBeVisible();
  await englishConversation
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await page.getByRole("combobox", { name: "Language" }).selectOption("pt-BR");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  await expect(page.getByRole("combobox", { name: "Idioma" })).toHaveValue(
    "pt-BR",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("combobox", { name: "Idioma" })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await page.goto("/transactions");
  await page
    .getByRole("button", { name: "Opções de visualização", exact: true })
    .click();
  const tools = page.getByRole("dialog", {
    name: "Opções de visualização",
    exact: true,
  });
  await expect(
    tools.getByText("Buscar transações", { exact: true }),
  ).toBeVisible();
  await expect(
    tools.getByText("Colunas e ordenação", { exact: true }),
  ).toBeVisible();
  await expect(
    tools.getByRole("button", { name: "Fluxo de caixa", exact: true }),
  ).toBeVisible();
  await tools.getByRole("button", { name: "Concluir", exact: true }).click();
  await expect(tools).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  expect(errors).toEqual([]);
});
