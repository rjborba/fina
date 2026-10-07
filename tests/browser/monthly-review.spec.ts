import { expect, test } from "@playwright/test";

test("imports a July card bill into June review while preserving July cash flow", async ({
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
        `18/06/${year};Fixture groceries;Single;-100,00`,
        `19/06/${year};Fixture transport;Single;-50,00`,
        `02/07/${year};Fixture July purchase;Single;-25,00`,
        `12/05/${year};Fixture older installment;2/3;-75,00`,
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
    page.getByText("Fixture July purchase", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Fixture older installment", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/monthly-review.png",
    fullPage: true,
  });

  await page.getByLabel("Review month", { exact: true }).fill(`${year}-07`);
  await expect(
    page.getByText("Fixture July purchase", { exact: true }),
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
    page.getByText("Fixture July purchase", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Fixture older installment", { exact: true }),
  ).toBeVisible();
  expect(browserErrors).toEqual([]);
});
