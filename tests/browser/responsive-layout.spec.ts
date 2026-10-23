import { expect, test, type Page } from "@playwright/test";

const workspaceName = "HouseholdTravelAndEverydayExpensesSharedWorkspace2026";
const accountName = "Everyday checking with a long household account name";
const categoryName = "HouseholdTravelAndEverydayExpensesCategory";

async function openViewOptions(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() =>
        document
          .getAnimations()
          .filter((animation) =>
            Number.isFinite(animation.effect?.getComputedTiming().endTime),
          )
          .every((animation) => animation.playState === "finished"),
      ),
    )
    .toBe(true);
  await page.getByRole("button", { name: "View options", exact: true }).click();
  const tools = page.getByRole("dialog", { name: "View options", exact: true });
  await expect(tools).toBeVisible();
  await expect
    .poll(() =>
      tools.evaluate((element) =>
        element
          .getAnimations()
          .every((animation) => animation.playState === "finished"),
      ),
    )
    .toBe(true);
  return tools;
}

async function pageFits(page: Page) {
  return page.evaluate(() => ({
    viewport: window.innerWidth,
    content: document.documentElement.scrollWidth,
    toolbarHeight: document
      .querySelector('[aria-label="Transaction view controls"]')
      ?.getBoundingClientRect().height,
  }));
}

test("keeps mobile pages, transaction controls and dialogs usable at narrow widths", async ({
  page,
}) => {
  test.setTimeout(120_000);
  page.setDefaultTimeout(10_000);
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
  await page.goto("/settings");
  await page
    .getByRole("textbox", { name: "Group name", exact: true })
    .fill(workspaceName);
  const groupCreated = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname === "/groups" &&
      response.ok(),
  );
  await page.getByRole("button", { name: "Create group", exact: true }).click();
  const group = (await (await groupCreated).json()) as { id: string };
  await page.getByRole("button", { name: /Active workspace$/ }).click();
  await page
    .getByRole("menuitem", { name: workspaceName, exact: true })
    .click();
  await page.goto("/categories");
  await page
    .getByRole("textbox", { name: "Category name", exact: true })
    .fill(categoryName);
  await page.getByRole("button", { name: "Add category", exact: true }).click();
  await expect(
    page
      .getByRole("region", { name: "Existing categories" })
      .getByText(categoryName, { exact: true }),
  ).toBeVisible();
  let creditAccountId = "";
  for (const [name, type] of [
    [accountName, "checkout"],
    ["MobileCreditCardWithAnUnusuallyLongAccountName", "credit"],
  ] as const) {
    await page.goto("/bank-accounts");
    await page.getByRole("textbox", { name: "Account name" }).fill(name);
    if (type === "credit") {
      await page.getByRole("combobox", { name: "Account type" }).click();
      await page
        .getByRole("option", { name: "Credit card", exact: true })
        .click();
      await page.getByRole("spinbutton", { name: "Due day" }).fill("10");
    }
    await page
      .getByRole("combobox", {
        name: type === "credit" ? "Card issuer" : "Financial institution",
        exact: true,
      })
      .click();
    await page
      .getByRole("option", { name: "Other / not listed", exact: true })
      .click();
    const created = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/bankaccounts" &&
        response.ok(),
    );
    await page
      .getByRole("button", { name: "Add account", exact: true })
      .click();
    const account = (await (await created).json()) as { id: string };
    if (type === "credit") creditAccountId = account.id;
    await expect(page.getByText(name, { exact: true })).toBeVisible();
  }
  await page.goto("/transactions");
  await page.getByRole("button", { name: /^New entry/ }).click();
  const create = page.getByRole("dialog", {
    name: "Create New Transaction",
    exact: true,
  });
  await create.getByRole("combobox", { name: "Account", exact: true }).click();
  await page
    .getByRole("option", {
      name: "MobileCreditCardWithAnUnusuallyLongAccountName",
      exact: true,
    })
    .click();
  await create
    .getByRole("textbox", { name: "Description", exact: true })
    .fill("Responsive fixture purchase");
  await create
    .getByRole("spinbutton", { name: "Value", exact: true })
    .fill("-987.65");
  await create
    .getByRole("button", { name: "Bill due in", exact: true })
    .click();
  const month = new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  await page.getByRole("button", { name: month, exact: true }).click();
  await create
    .getByRole("button", { name: "Create Transaction", exact: true })
    .click();
  await expect(create).toHaveCount(0);
  const now = new Date();
  const billMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const fileName =
    "MobileStatementWithAVeryLongFilenameForResponsiveImportHistory.csv";
  await page.goto("/imports");
  await page.getByRole("button", { name: "Import file", exact: true }).click();
  await page.getByLabel("Drop a CSV here or choose a file").setInputFiles({
    name: fileName,
    mimeType: "text/csv",
    buffer: Buffer.from(
      `Date;Description;Amount\n${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()};Mobile checking fixture;-45,50`,
    ),
  });
  const destination = page.getByRole("combobox", {
    name: "Destination account",
  });
  await destination.click();
  await page
    .getByRole("option", { name: `${accountName} (checkout)`, exact: true })
    .click();
  await page
    .getByRole("button", { name: "Validate import", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Import 1 transaction", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Import file", exact: true }),
  ).toBeVisible();
  const routes = [
    "/",
    "/transactions",
    "/bank-accounts",
    "/categories",
    "/imports",
    "/settings",
    `/group-details/${group.id}`,
    "/invites",
    `/credit-card-bills/${creditAccountId}/${billMonth}`,
  ];
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    for (const [index, route] of routes.entries()) {
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      if (route === "/transactions" || route.includes("/credit-card-bills/"))
        await expect(
          page.getByRole("grid", { name: "Transactions", exact: true }),
        ).toBeVisible();
      if (route === "/imports")
        await expect(page.getByText(fileName, { exact: true })).toBeVisible();
      await page.screenshot({
        path: `test-results/mobile-${width}-${index}.png`,
        fullPage: true,
        animations: "disabled",
      });
      const layout = await pageFits(page);
      expect(
        layout.content,
        `Page width at ${width}px: ${route}`,
      ).toBeLessThanOrEqual(width);
      if (route === "/transactions") expect(layout.toolbarHeight).toBe(56);
      const clipped = await page
        .locator(
          'main input:not([type="file"]), main button, main [role="combobox"], header h1, [data-slot="fina-surface"]',
        )
        .evaluateAll((elements) =>
          elements
            .filter((element) => {
              if (
                element.closest(
                  '[aria-hidden="true"], [inert], [role="grid"]',
                ) ||
                !element.getClientRects().length
              )
                return false;
              const bounds = element.getBoundingClientRect();
              return bounds.left < -1 || bounds.right > window.innerWidth + 1;
            })
            .map((element) => element.tagName),
        );
      expect(clipped, `Clipped controls at ${width}px: ${route}`).toEqual([]);
      expect(
        await page
          .getByRole("heading", { level: 1 })
          .evaluate((element) => element.scrollWidth <= element.clientWidth),
        `Clipped page title: ${route}`,
      ).toBe(true);
    }
    await page.goto("/transactions");
    const tools = await openViewOptions(page);
    await expect(tools).toBeInViewport();
    await page.screenshot({
      path: `test-results/mobile-${width}-tools.png`,
      animations: "disabled",
    });
    await tools
      .getByRole("button", { name: "Display options", exact: true })
      .click();
    const display = page.getByRole("dialog", {
      name: "Display options",
      exact: true,
    });
    await expect(display).toBeInViewport();
    await page.keyboard.press("Escape");
    await expect(tools).toHaveCount(0);
    await openViewOptions(page);
    await tools
      .getByRole("button", { name: "Find in view", exact: true })
      .click();
    await tools
      .getByRole("textbox", { name: "Find in view", exact: true })
      .fill("Mobile checking");
    await tools.getByRole("button", { name: "Done", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Clear search", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Clear search", exact: true })
      .click();
    await openViewOptions(page);
    await tools
      .getByRole("button", { name: "Monthly review", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Review months", exact: true })
      .click();
    await expect(
      page.getByRole("dialog", { name: "Review months", exact: true }),
    ).toBeInViewport();
    await page.keyboard.press("Escape");
    await openViewOptions(page);
    await tools.getByRole("button", { name: "Cash flow", exact: true }).click();
    await page.getByRole("button", { name: "Date range", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeInViewport();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: /^Filter(?: \d+)?$/ }).click();
    const filters = page.getByRole("dialog", {
      name: "Transaction filters",
      exact: true,
    });
    await filters
      .getByRole("button", { name: "Category", exact: true })
      .click();
    const categoryEditor = page.getByRole("dialog", {
      name: "Category filter",
      exact: true,
    });
    await expect(categoryEditor).toBeInViewport();
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    const checkingRow = page
      .getByRole("row")
      .filter({ hasText: "Mobile checking fixture" });
    await checkingRow
      .getByRole("checkbox", { name: "Select transaction", exact: true })
      .click();
    const selection = page.getByRole("toolbar", {
      name: "Selected transaction actions",
      exact: true,
    });
    await expect(selection).toBeInViewport();
    for (const action of await selection.getByRole("button").all()) {
      await expect(action).toBeInViewport();
      expect((await action.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    await selection
      .getByRole("button", { name: "Unselect all", exact: true })
      .click();
    await page.getByRole("button", { name: /^New entry/ }).click();
    await expect(create).toBeVisible();
    await create
      .getByRole("combobox", { name: "Account", exact: true })
      .click();
    await page.getByRole("option", { name: accountName, exact: true }).click();
    await page.screenshot({
      path: `test-results/mobile-${width}-create.png`,
      fullPage: true,
      animations: "disabled",
    });
    const dialogBounds = await create.boundingBox();
    expect(dialogBounds!.x).toBeGreaterThanOrEqual(7);
    expect(dialogBounds!.x + dialogBounds!.width).toBeLessThanOrEqual(
      width - 7,
    );
    expect(
      await create.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
    await page.setViewportSize({ width, height: 568 });
    await expect(
      create.getByRole("button", { name: "Create Transaction", exact: true }),
    ).toBeInViewport();
    await expect(
      create.getByRole("button", { name: "Close", exact: true }),
    ).toBeInViewport();
    await create.getByRole("button", { name: "Close", exact: true }).click();
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/imports");
    await page
      .getByRole("button", { name: "Import file", exact: true })
      .click();
    await page.getByLabel("Drop a CSV here or choose a file").setInputFiles({
      name: `review-${fileName}`,
      mimeType: "text/csv",
      buffer: Buffer.from(
        `Date;Description;Amount\n${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()};Another mobile fixture;-12,34`,
      ),
    });
    const review = page.getByRole("dialog", {
      name: "Review and import",
      exact: true,
    });
    await expect(review).toBeVisible();
    await expect(review).toHaveCSS("width", `${width}px`);
    expect(
      await review.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/mobile-${width}-import.png`,
      animations: "disabled",
    });
    await review.getByRole("button", { name: "Close", exact: true }).click();
  }
  expect(browserErrors).toEqual([]);
});
