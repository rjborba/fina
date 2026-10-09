import { expect, test } from "@playwright/test";

test("inverts charges and refunds on a July card bill in June review while preserving July cash flow", async ({
  page,
}) => {
  const year = new Date().getFullYear();
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.name));

  await page.goto("/login");
  await page
    .getByRole("textbox", { name: "Email address" })
    .fill("browser-review@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("browser-fixture-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/bank-accounts");
  await page
    .getByRole("textbox", { name: "Account name" })
    .fill("Review fixture card");
  await page.getByRole("combobox", { name: "Account type" }).click();
  await page.getByRole("option", { name: "Credit card", exact: true }).click();
  await page.getByRole("spinbutton", { name: "Due day" }).fill("10");
  await page.getByRole("button", { name: "Add account", exact: true }).click();
  await expect(
    page.getByText("Review fixture card", { exact: true }),
  ).toBeVisible();

  await page.goto("/imports");
  await page.getByRole("button", { name: "Import file", exact: true }).click();
  await page.getByLabel("Drop a CSV here or choose a file").setInputFiles({
    name: "browser-review-fixture.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      [
        "Date;Description;Installment;Amount",
        `18/06/${year};Fixture groceries;Single;100,00`,
        `19/06/${year};Fixture transport;Single;50,00`,
        `02/07/${year};Fixture July refund;Single;-25,00`,
        `12/05/${year};Fixture older installment;2/3;75,00`,
      ].join("\n"),
    ),
  });
  await page.getByRole("combobox", { name: "Destination account" }).click();
  await page
    .getByRole("option", { name: "Review fixture card (credit)", exact: true })
    .click();
  await page.getByRole("button", { name: "Bill due in", exact: true }).click();
  await page.getByRole("button", { name: `July ${year}`, exact: true }).click();
  await expect(
    page.getByRole("button", { name: `July ${year}`, exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Include in monthly review", exact: true })
    .click();
  await page.getByRole("button", { name: `June ${year}`, exact: true }).click();
  await page
    .getByRole("button", { name: "Edit Amount mapping. Amount", exact: true })
    .click();
  await page.getByRole("checkbox", { name: /Invert amount signs/ }).check();
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Validate import", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Import 4 transactions", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Import file", exact: true }),
  ).toBeVisible();

  await page.goto("/transactions");
  await page
    .getByRole("button", { name: "Monthly review", exact: true })
    .click();
  await page.getByLabel("Review month", { exact: true }).fill(`${year}-06`);
  await expect(
    page.getByText("Fixture groceries", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Fixture July refund", { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("row")
      .filter({ hasText: "Fixture July refund" })
      .getByRole("cell", { name: /^R\$\s*25,00$/ }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("row")
      .filter({ hasText: "Fixture groceries" })
      .getByRole("cell", { name: /^[−-]R\$\s*100,00$/ }),
  ).toBeVisible();
  await expect(
    page.getByText("Fixture older installment", { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("row")
      .filter({ hasText: "Fixture July refund" })
      .getByRole("cell", { name: `02 Jul ${year}`, exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("row")
      .filter({ hasText: "Fixture older installment" })
      .getByRole("cell", { name: `12 May ${year}`, exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/monthly-review.png",
    fullPage: true,
  });

  await page.getByLabel("Review month", { exact: true }).fill(`${year}-07`);
  await expect(
    page.getByText("Fixture July refund", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Cash flow", exact: true }).click();
  await expect(
    page
      .getByTestId("credit-card-bill-row")
      .filter({ hasText: "Review fixture card bill" }),
  ).toBeVisible();
  await page
    .getByTestId("credit-card-bill-row")
    .filter({ hasText: "Review fixture card bill" })
    .click();
  await expect(
    page.getByText("Fixture July refund", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Fixture older installment", { exact: true }),
  ).toBeVisible();
  const billSummary = page.getByRole("region", { name: "Bill summary" });
  const completeSummary = (await billSummary.textContent()) ?? "";
  await page.getByRole("button", { name: /^Filter/ }).click();
  const descriptionFilter = page.getByLabel("Search description", {
    exact: true,
  });
  await descriptionFilter.fill("JULY REFUND");
  await expect(
    page.getByText("1 of 4 purchases", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Fixture July refund", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Fixture groceries", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Fixture older installment", { exact: true }),
  ).toHaveCount(0);
  await expect(billSummary).toHaveText(completeSummary);
  await expect(
    page.getByLabel("Matching purchases total", { exact: true }),
  ).toHaveText(/Matching purchases total:\s*R\$\s*25,00/);
  await descriptionFilter.fill("No synthetic purchases match this");
  await expect(
    page.getByText("No purchases match these filters", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Fixture July refund", { exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .first()
    .click();
  await expect(descriptionFilter).toHaveValue("");
  await expect(
    page.getByText("Fixture July refund", { exact: true }),
  ).toBeVisible();
  await page.getByRole("checkbox", { name: "None", exact: true }).check();
  await expect(
    page.getByText("4 of 4 purchases", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Fixture groceries", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Fixture older installment", { exact: true }),
  ).toBeVisible();
  await expect(billSummary).toHaveText(completeSummary);
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("checkbox", { name: "None", exact: true }),
  ).not.toBeChecked();
  await page
    .getByRole("button", { name: "Close filters", exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Filter", exact: true }).click();
  await descriptionFilter.fill("groceries");
  await expect(
    page.getByText("1 of 4 purchases", { exact: true }),
  ).toBeVisible();
  const mobileFilters = page.getByRole("complementary", {
    name: "Transaction filters",
  });
  await mobileFilters
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await mobileFilters
    .getByRole("button", { name: "Close filters", exact: true })
    .click();
  await expect(
    page.getByText("4 of 4 purchases", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Fixture July refund", { exact: true }),
  ).toBeVisible();
  expect(browserErrors).toEqual([]);
});
