import {
  expect,
  test,
  type Locator,
  type Page,
  type Response,
} from "@playwright/test";

const longDescription =
  "Fixture subscription with a deliberately long description to verify that transaction rows stay on one line at every viewport size";

async function signInAsFixture(page: Page) {
  await page.goto("/login");
  await page
    .getByRole("textbox", { name: "Email address" })
    .fill("browser-review@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("browser-fixture-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
}

function transactionFilterMenu(page: Page) {
  return page
    .getByRole("dialog", { name: "Transaction filters", exact: true })
    .or(
      page.getByRole("complementary", {
        name: "Transaction filters",
        exact: true,
      }),
    );
}

async function openTransactionFilters(page: Page) {
  await expect(
    page.locator('[role="dialog"][aria-label="Transaction filters"]'),
  ).toHaveCount(0);
  await page.getByRole("button", { name: /^Filter(?: \d+)?$/ }).click();
  const menu = transactionFilterMenu(page);
  await expect(menu).toBeVisible();
  return menu;
}

async function openFilterProperty(
  page: Page,
  property:
    | "Description"
    | "Category"
    | "Bank account"
    | "Card"
    | "Import source"
    | "Amount"
    | "Date range",
) {
  const menu = await openTransactionFilters(page);
  const propertyButton = menu.getByRole("button", {
    name: property,
    exact: true,
  });
  if ((await menu.getAttribute("role")) === "dialog") {
    await expect(propertyButton).toBeVisible();
    await propertyButton.click();
    await expect(menu).toBeVisible();
    const editor = page.getByRole("dialog", {
      name: `${property} filter`,
      exact: true,
    });
    await expect(editor).toBeVisible();
    return editor;
  }
  return menu;
}

async function closeTransactionFilters(page: Page) {
  const submenu = page.getByRole("dialog", {
    name: /^(Description|Category|Bank account|Card|Import source|Amount|Date range) filter$/,
  });
  if (await submenu.isVisible()) {
    await page.keyboard.press("Escape");
    await expect(submenu).toHaveCount(0);
  }
  const menu = transactionFilterMenu(page);
  if (await menu.isVisible()) {
    await page.keyboard.press("Escape");
    await expect(menu).not.toBeVisible();
  }
  await expect(
    page.locator('[role="dialog"][aria-label="Transaction filters"]'),
  ).toHaveCount(0);
}

async function expectPopupSettled(popup: Locator) {
  await expect(popup).toBeVisible();
  await expect(popup).toHaveCSS("opacity", "1");
  await expect
    .poll(() =>
      popup.evaluate((element) =>
        element
          .getAnimations()
          .every((animation) => animation.playState === "finished"),
      ),
    )
    .toBe(true);
}

async function expectFiniteAnimationsSettled(page: Page) {
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
}

async function expectSelectionCheckboxShown(checkbox: Locator, shown: boolean) {
  await expect
    .poll(() =>
      checkbox.evaluate((element) => {
        let opacity = 1;
        let current: Element | null = element;
        while (current) {
          opacity *= Number.parseFloat(getComputedStyle(current).opacity);
          if (current.getAttribute("role") === "row") break;
          current = current.parentElement;
        }
        return opacity;
      }),
    )
    .toBe(shown ? 1 : 0);
}

async function searchByDescription(page: Page, description: string) {
  const menu = await openFilterProperty(page, "Description");
  const search = menu.getByLabel("Search description", { exact: true });
  await search.fill(description);
  return search;
}

async function clearTransactionFilters(page: Page) {
  const menu = await openTransactionFilters(page);
  await menu
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await closeTransactionFilters(page);
}

async function chooseFixtureInstitution(
  page: Page,
  type: "checkout" | "credit",
  name = "Other / not listed",
) {
  await page
    .getByRole("combobox", {
      name: type === "credit" ? "Card issuer" : "Financial institution",
      exact: true,
    })
    .click();
  await page.getByRole("option", { name, exact: true }).click();
}

async function addFixtureAccount(
  page: Page,
  name: string,
  type: "checkout" | "credit" = "checkout",
  institution = "Other / not listed",
) {
  await page.goto("/bank-accounts");
  await page.getByRole("textbox", { name: "Account name" }).fill(name);
  if (type === "credit") {
    await page.getByRole("combobox", { name: "Account type" }).click();
    await page
      .getByRole("option", { name: "Credit card", exact: true })
      .click();
    await page.getByRole("spinbutton", { name: "Due day" }).fill("10");
  }
  await chooseFixtureInstitution(page, type, institution);
  const created = page.waitForResponse(
    (response) =>
      !response.request().isNavigationRequest() &&
      new URL(response.url()).pathname === "/bankaccounts" &&
      response.request().method() === "POST" &&
      response.ok(),
  );
  await page.getByRole("button", { name: "Add account", exact: true }).click();
  await expect(page.getByText(name, { exact: true })).toBeVisible();
  const account = (await (await created).json()) as {
    id: string;
    institutionId: string | null;
  };
  if (institution === "Other / not listed") {
    expect(account.institutionId).toBeNull();
  }
  return account;
}

async function expectInstitutionLogo(
  container: Locator,
  institutionId: string,
) {
  const logo = container
    .locator(`[data-institution-id="${institutionId}"]`)
    .first();
  await expect(logo).toBeVisible();
  await expect(logo).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(logo).toHaveCSS("box-shadow", "none");
  await expect
    .poll(() =>
      logo
        .locator("img")
        .evaluate(
          (element: HTMLImageElement) =>
            element.complete && element.naturalWidth > 0,
        ),
    )
    .toBe(true);
}

async function expectOriginalArtworkCornerAlpha(
  image: Locator,
  expectedAlpha: 0 | 255,
) {
  const pixels = await image.evaluate((element: HTMLImageElement) => {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext("2d")!;
    context.drawImage(element, 0, 0, 64, 64);
    const data = context.getImageData(0, 0, 64, 64).data;
    return {
      corners: [
        data[3],
        data[63 * 4 + 3],
        data[63 * 64 * 4 + 3],
        data[data.length - 1],
      ],
      hasArtwork: data.some((value, index) => index % 4 === 3 && value > 0),
    };
  });
  expect(pixels.hasArtwork).toBe(true);
  expect(pixels.corners).toEqual(Array(4).fill(expectedAlpha));
}

type FixturePurchaseCard = {
  id: string;
  accountId: string;
  name: string;
  last4: string | null;
  archived: boolean;
};

type FixtureSharedBill = {
  bill: {
    accountId: string;
    billMonth: string;
    total: number;
    transactionCount: number;
    status: string;
    payment: { transactionId: string; accountId: string; value: number } | null;
  };
  transactions: Array<{
    id: string;
    description: string | null;
    creditCard: FixturePurchaseCard | null;
  }>;
  cardSummaries: Array<{
    creditCard: FixturePurchaseCard | null;
    transactionCount: number;
    total: number;
  }>;
};

async function addFixturePurchaseCard(
  page: Page,
  accountName: string,
  accountId: string,
  name: string,
  last4: string,
) {
  const disclosure = page.getByRole("button", {
    name: `Cards for ${accountName}`,
    exact: true,
  });
  if ((await disclosure.getAttribute("aria-expanded")) !== "true")
    await disclosure.click();
  await page
    .getByRole("button", { name: `Add card to ${accountName}`, exact: true })
    .click();
  const editor = page.getByRole("dialog", { name: "Add card", exact: true });
  await editor.getByLabel("Card nickname", { exact: true }).fill(name);
  await editor
    .getByLabel("Last 4 digits (optional)", { exact: true })
    .fill(last4);
  const created = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname === "/credit-cards" &&
      response.ok(),
  );
  await editor.getByRole("button", { name: "Add card", exact: true }).click();
  const card = (await (await created).json()) as FixturePurchaseCard;
  expect(card).toMatchObject({ accountId, name, last4, archived: false });
  await expect(editor).toHaveCount(0);
  await expect(
    page
      .getByRole("list", { name: `Cards on ${accountName}`, exact: true })
      .getByText(`${name} · ••${last4}`, { exact: true }),
  ).toBeVisible();
  return card;
}

async function openFixtureSharedBill(
  page: Page,
  accountId: string,
  month: string,
) {
  const path = `/credit-card-bills/${accountId}/${month}`;
  const detail = page.waitForResponse(
    (response) =>
      !response.request().isNavigationRequest() &&
      response.request().method() === "GET" &&
      new URL(response.url()).pathname === path &&
      response.ok(),
  );
  await page.goto(path);
  const result = (await (await detail).json()) as FixtureSharedBill;
  await expect(
    page.getByRole("region", { name: "Bill summary", exact: true }),
  ).toBeVisible();
  return result;
}

async function expectReviewBalance(page: Page, amount: RegExp) {
  await page
    .getByRole("button", { name: "Period totals", exact: true })
    .click();
  const totals = page.getByRole("dialog", {
    name: "Period totals",
    exact: true,
  });
  await expect(
    totals
      .getByText("Review balance", { exact: true })
      .locator("../..")
      .locator("p"),
  ).toHaveText(amount);
  await page.keyboard.press("Escape");
  await expect(totals).toHaveCount(0);
}

async function orderTransactionsBy(
  page: Page,
  field: "Date" | "Amount" | "Description" | "Category",
  direction: "asc" | "desc",
) {
  const display = page.getByRole("dialog", {
    name: "Display options",
    exact: true,
  });
  await display
    .getByRole("combobox", { name: "Ordering", exact: true })
    .click();
  await page.getByRole("option", { name: field, exact: true }).click();
  const changeDirection = display.getByRole("button", {
    name: direction === "asc" ? "Sort ascending" : "Sort descending",
    exact: true,
  });
  if (await changeDirection.count()) await changeDirection.click();
  await expect(display).toBeVisible();
}

async function selectReviewMonth(page: Page, month: string) {
  await page
    .getByRole("button", { name: "Review months", exact: true })
    .click();
  const picker = page.getByRole("dialog", {
    name: "Review months",
    exact: true,
  });
  const label = new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const target = picker.getByRole("button", { name: label, exact: true });
  if ((await target.getAttribute("aria-pressed")) !== "true") {
    await target.click();
  }
  const selectedLabels = await picker
    .locator('button[aria-pressed="true"]')
    .evaluateAll((buttons) =>
      buttons.map((button) => button.getAttribute("aria-label")),
    );
  for (const selectedLabel of selectedLabels) {
    if (selectedLabel && selectedLabel !== label) {
      await picker
        .getByRole("button", { name: selectedLabel, exact: true })
        .click();
    }
  }
  await expect(target).toHaveAttribute("aria-pressed", "true");
  await expect(target).toBeDisabled();
  await picker.getByRole("button", { name: "Done", exact: true }).click();
  await expect(picker).toHaveCount(0);
}

async function importMonthFixture(
  page: Page,
  fixture: {
    name: string;
    accountName: string;
    accountType: "checkout" | "credit";
    rows: string[];
    month?: string;
  },
) {
  await page.goto("/imports");
  await page.getByRole("button", { name: "Import file", exact: true }).click();
  const profileQuery = page.waitForResponse(
    (response) =>
      !response.request().isNavigationRequest() &&
      response.request().method() === "GET" &&
      new URL(response.url()).pathname === "/imports/profiles",
  );
  await page.getByLabel("Drop a CSV here or choose a file").setInputFiles({
    name: fixture.name,
    mimeType: "text/csv",
    buffer: Buffer.from(
      ["Date;Description;Amount", ...fixture.rows].join("\n"),
    ),
  });
  const profiles: unknown[] = await (await profileQuery).json();
  const destination = page.getByRole("combobox", {
    name: "Destination account",
  });
  if (profiles.length === 1) {
    await expect(destination).not.toHaveText("Select the account to confirm");
  }
  const accountLabel = `${fixture.accountName} (${fixture.accountType})`;
  if ((await destination.textContent()) !== accountLabel) {
    await destination.click();
    await page.getByRole("option", { name: accountLabel, exact: true }).click();
  }
  await expect(destination).toHaveText(accountLabel);
  if (fixture.month) {
    const label = new Date(`${fixture.month}-01T00:00:00Z`).toLocaleDateString(
      "en-US",
      { month: "long", year: "numeric", timeZone: "UTC" },
    );
    for (const name of ["Bill due in", "Include in monthly review"]) {
      await page.getByRole("button", { name, exact: true }).click();
      await page.getByRole("button", { name: label, exact: true }).click();
      await expect(
        page.getByRole("button", { name: label, exact: true }),
      ).toHaveCount(0);
    }
  }
  await page
    .getByRole("button", { name: "Validate import", exact: true })
    .click();
  const importResponse = page.waitForResponse(
    (response) =>
      !response.request().isNavigationRequest() &&
      response.request().method() === "POST" &&
      new URL(response.url()).pathname === "/imports" &&
      response.ok(),
  );
  await page
    .getByRole("button", {
      name: `Import ${fixture.rows.length} ${fixture.rows.length === 1 ? "transaction" : "transactions"}`,
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", { name: "Import file", exact: true }),
  ).toBeVisible();
  return (await (await importResponse).json()) as { id: string };
}

async function reloadWithSavedTransactionFilters(
  page: Page,
  filters: {
    dateBasis: "monthly-review" | "cash-flow";
    startDate: string;
    endDate: string;
    reviewMonths?: string[];
    search?: string;
    categories?: string[];
    accounts?: string[];
    importSource?: "imported" | "manual";
    imports?: string[];
    minValue?: number;
    maxValue?: number;
    totalCount?: number;
  },
) {
  const firstQuery = page.waitForRequest(
    (request) =>
      request.method() === "GET" &&
      !request.isNavigationRequest() &&
      new URL(request.url()).pathname === "/transactions",
  );
  await page.reload();
  const request = await firstQuery;
  const query = new URL(request.url()).searchParams;
  expect(query.get("dateBasis")).toBe(filters.dateBasis);
  expect(query.get("startDate")).toBe(filters.startDate);
  expect(query.get("endDate")).toBe(filters.endDate);
  expect(query.getAll("reviewMonths")).toEqual(
    filters.reviewMonths ??
      (filters.dateBasis === "monthly-review"
        ? [filters.startDate.slice(0, 7)]
        : []),
  );
  expect(query.get("search")).toBe(filters.search ?? null);
  expect(query.getAll("categoryIdList")).toEqual(filters.categories ?? []);
  expect(query.getAll("accountIdList")).toEqual(filters.accounts ?? []);
  expect(query.get("importSource")).toBe(filters.importSource ?? null);
  expect(query.getAll("importIdList")).toEqual(filters.imports ?? []);
  expect(query.get("minValue")).toBe(
    filters.minValue === undefined ? null : String(filters.minValue),
  );
  expect(query.get("maxValue")).toBe(
    filters.maxValue === undefined ? null : String(filters.maxValue),
  );
  const response = await request.response();
  expect(response?.status()).toBe(200);
  if (filters.totalCount !== undefined) {
    expect((await response!.json()).totalCount).toBe(filters.totalCount);
  }
}

async function expectCompactTransactionList(page: Page) {
  const ledger = page.getByRole("grid", { name: "Transactions", exact: true });
  await expect(ledger).toBeVisible();
  await expect(ledger.locator("table, tbody, tr, td")).toHaveCount(0);
  await expect(ledger).toHaveAttribute("aria-colcount", "1");
  await expect(ledger).toHaveAttribute("aria-multiselectable", "true");
  await expect(ledger.getByRole("columnheader")).toHaveCount(0);
  const rows = ledger.getByRole("row");
  expect(await rows.count()).toBeGreaterThan(0);
  const totalRows = Number(await ledger.getAttribute("aria-rowcount"));
  expect(totalRows).toBeGreaterThanOrEqual(await rows.count());
  await expect(ledger.getByRole("gridcell")).toHaveCount(await rows.count());
  await expect(rows.locator("button[data-list-open]")).toHaveCount(
    await rows.count(),
  );
  await expect(
    ledger.locator(
      '[data-list-open] [role="combobox"], [data-list-open] button',
    ),
  ).toHaveCount(0);
  const measurements = await rows.evaluateAll((elements) =>
    elements.map((row) => {
      const style = getComputedStyle(row);
      const bounds = row.getBoundingClientRect();
      const grid = row.closest('[role="grid"]')!;
      const gridStyle = getComputedStyle(grid);
      const shell = row.closest<HTMLElement>(".transactions-list-shell")!;
      const shellBounds = shell.getBoundingClientRect();
      const gridcell = row.querySelector('[role="gridcell"]');
      const description = row.querySelector(
        '[data-testid="transaction-description"]',
      );
      const descriptionStyle = description
        ? getComputedStyle(description)
        : null;
      const metadataGrid = row.querySelector(".transaction-metadata-grid");
      const metadataStyle = metadataGrid
        ? getComputedStyle(metadataGrid)
        : null;
      const tracks = Array.from(
        row.querySelectorAll(
          '[data-metadata-slot], [data-column="date"], [data-column="value"]',
        ),
      ).map((field) => {
        const fieldBounds = field.getBoundingClientRect();
        return {
          name:
            field.getAttribute("data-metadata-slot") ??
            field.getAttribute("data-column"),
          x: fieldBounds.left - bounds.left,
          width: fieldBounds.width,
          visible:
            getComputedStyle(field).display !== "none" && fieldBounds.width > 0,
          empty: field.getAttribute("data-empty") === "true",
          ariaHidden: field.getAttribute("aria-hidden"),
          controls: field.querySelectorAll(
            "button, a[href], input, select, textarea, [tabindex]",
          ).length,
        };
      });
      return {
        rowIndex: Number(row.getAttribute("aria-rowindex")),
        gridcellDisplay: gridcell ? getComputedStyle(gridcell).display : null,
        top: bounds.top,
        height: bounds.height,
        borderRadius: style.borderRadius,
        marginLeft: gridStyle.marginLeft,
        marginRight: gridStyle.marginRight,
        startInset:
          bounds.left - shellBounds.left + shell.scrollLeft - shell.clientLeft,
        endInset:
          shellBounds.left +
          shell.clientLeft +
          shell.clientWidth -
          bounds.right,
        scrollableEndInset:
          shell.scrollWidth -
          (bounds.right -
            shellBounds.left +
            shell.scrollLeft -
            shell.clientLeft),
        contentFits: shell.scrollWidth <= shell.clientWidth,
        borderTop: style.borderTopWidth,
        borderBottom: style.borderBottomWidth,
        fieldBorders: Array.from(row.querySelectorAll("[data-column]")).map(
          (field) => {
            const fieldStyle = getComputedStyle(field);
            return [fieldStyle.borderTopWidth, fieldStyle.borderBottomWidth];
          },
        ),
        descriptionLines: description
          ? description.scrollHeight /
            Number.parseFloat(descriptionStyle?.lineHeight ?? "0")
          : 1,
        descriptionWidth: description?.getBoundingClientRect().width ?? 0,
        descriptionWhitespace: descriptionStyle?.whiteSpace ?? "nowrap",
        metadataGridCount: row.querySelectorAll(".transaction-metadata-grid")
          .length,
        metadataDisplay: metadataStyle?.display ?? null,
        metadataColumns: metadataStyle?.gridTemplateColumns ?? null,
        tracks,
      };
    }),
  );
  for (const [index, measurement] of measurements.entries()) {
    expect(measurement.rowIndex).toBeGreaterThanOrEqual(1);
    expect(measurement.rowIndex).toBeLessThanOrEqual(totalRows);
    if (index > 0) {
      expect(measurement.rowIndex).toBe(measurements[index - 1].rowIndex + 1);
      expect(measurement.top - measurements[index - 1].top).toBeCloseTo(40);
    }
    expect(measurement.gridcellDisplay).toBe("grid");
    expect(measurement.height).toBe(40);
    expect(measurement.borderRadius).toBe("8px");
    expect(measurement.marginLeft).toBe("8px");
    expect(measurement.marginRight).toBe("8px");
    expect(measurement.startInset).toBeCloseTo(8);
    expect(measurement.scrollableEndInset).toBeCloseTo(8);
    if (measurement.contentFits) expect(measurement.endInset).toBeCloseTo(8);
    expect(measurement.borderTop).toBe("0px");
    expect(measurement.borderBottom).toBe("0px");
    expect(
      measurement.fieldBorders.flat().every((width) => width === "0px"),
    ).toBe(true);
    expect(measurement.descriptionWhitespace).toBe("nowrap");
    expect(measurement.descriptionWidth).toBeGreaterThanOrEqual(48);
    expect(measurement.descriptionLines).toBeLessThanOrEqual(1.05);
    expect(measurement.metadataGridCount).toBe(1);
    expect(measurement.metadataDisplay).toBe("grid");
    expect(measurement.metadataColumns).not.toBe("none");
    expect(measurement.metadataColumns).toBe(measurements[0].metadataColumns);
    const visibleTracks = measurement.tracks.filter((track) => track.visible);
    const referenceTracks = measurements[0].tracks.filter(
      (track) => track.visible,
    );
    expect(visibleTracks.map((track) => track.name)).toEqual(
      referenceTracks.map((track) => track.name),
    );
    expect(visibleTracks.map((track) => track.name)).toContain("description");
    for (const [trackIndex, track] of visibleTracks.entries()) {
      const reference = referenceTracks[trackIndex];
      expect(track.x, `${track.name} track start`).toBeCloseTo(reference.x, 2);
      expect(track.width, `${track.name} track width`).toBeCloseTo(
        reference.width,
        2,
      );
      if (trackIndex > 0) {
        const previous = visibleTracks[trackIndex - 1];
        expect(track.x).toBeGreaterThanOrEqual(previous.x + previous.width);
      }
      if (track.name === "description")
        expect(track.width).toBeGreaterThanOrEqual(120);
      if (track.name === "account") expect(track.width).toBe(96);
      if (track.name === "card") expect(track.width).toBe(176);
      if (track.name === "category") expect(track.width).toBe(128);
      if (track.name === "value") expect(track.width).toBe(132);
      if (track.name === "installment") expect(track.width).toBe(64);
    }
    for (const track of measurement.tracks.filter((track) => track.empty)) {
      expect(track.ariaHidden, `${track.name} empty slot`).toBe("true");
      expect(track.controls, `${track.name} empty slot controls`).toBe(0);
    }
  }
  return measurements;
}

async function expectTransactionListEndClearance(page: Page, selected = false) {
  const shell = page.locator(".transactions-list-shell");
  const ledger = page.getByRole("grid", {
    name: "Transactions",
    exact: true,
  });
  await shell.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(ledger.getByRole("row").last()).toHaveAttribute(
    "aria-rowindex",
    (await ledger.getAttribute("aria-rowcount"))!,
  );
  await expect
    .poll(() =>
      shell.evaluate((element) => {
        const lastRow = element.querySelector('[role="row"]:last-child')!;
        const bounds = element.getBoundingClientRect();
        return (
          bounds.top +
          element.clientTop +
          element.clientHeight -
          lastRow.getBoundingClientRect().bottom
        );
      }),
    )
    .toBeGreaterThanOrEqual(48);
  if (selected) {
    const bar = page.getByRole("toolbar", {
      name: "Selected transaction actions",
      exact: true,
    });
    await expect(bar).toBeVisible();
    await expect
      .poll(async () => {
        const rowBounds = await ledger.getByRole("row").last().boundingBox();
        const barBounds = await bar.boundingBox();
        return rowBounds && barBounds
          ? barBounds.y - rowBounds.y - rowBounds.height
          : 0;
      })
      .toBeGreaterThanOrEqual(12);
  }
}

test("inverts charges and refunds on a July card bill in June review while preserving July cash flow", async ({
  page,
}) => {
  const year = new Date().getFullYear();
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.name));

  await signInAsFixture(page);

  await page.goto("/bank-accounts");
  await page
    .getByRole("textbox", { name: "Account name" })
    .fill("Review fixture card");
  await page.getByRole("combobox", { name: "Account type" }).click();
  await page.getByRole("option", { name: "Credit card", exact: true }).click();
  await page.getByRole("spinbutton", { name: "Due day" }).fill("10");
  await chooseFixtureInstitution(page, "credit");
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
        `20/06/${year};${longDescription};Single;12,50`,
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
    .getByRole("button", { name: "Import 5 transactions", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Import file", exact: true }),
  ).toBeVisible();

  await page.goto("/transactions");
  await page
    .getByRole("button", { name: "Monthly review", exact: true })
    .click();
  await selectReviewMonth(page, `${year}-06`);
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
      .locator('[data-column="value"] [data-field-value]'),
  ).toHaveText(/^R\$\s*25,00$/);
  await expect(
    page
      .getByRole("row")
      .filter({ hasText: "Fixture July refund" })
      .locator('[data-column="value"]'),
  ).toBeVisible();
  await expect(
    page
      .getByRole("row")
      .filter({ hasText: "Fixture groceries" })
      .locator('[data-column="value"] [data-field-value]'),
  ).toHaveText(/^[−-]R\$\s*100,00$/);
  await expect(
    page.getByText("Fixture older installment", { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("row")
      .filter({ hasText: "Fixture July refund" })
      .locator('[data-column="date"] [data-field-value]'),
  ).toHaveText(`02 Jul ${year}`);
  await expect(
    page
      .getByRole("row")
      .filter({ hasText: "Fixture older installment" })
      .locator('[data-column="date"] [data-field-value]'),
  ).toHaveText(`12 May ${year}`);
  await expect(page.getByText(longDescription, { exact: true })).toBeVisible();
  await expectCompactTransactionList(page);
  await expect(
    page
      .getByRole("row")
      .filter({ hasText: "Fixture July refund" })
      .locator('[data-metadata-slot="installment"]'),
  ).toHaveAttribute("data-empty", "true");
  await expect(
    page
      .getByRole("row")
      .filter({ hasText: "Fixture older installment" })
      .locator('[data-metadata-slot="installment"]'),
  ).toHaveText("2/3");
  const titleFontSize = await page
    .getByRole("heading", { name: "Transactions", exact: true })
    .evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).fontSize),
    );
  expect(titleFontSize).toBeLessThanOrEqual(14);
  await expect(
    page.getByText(/Paid card bills appear on their confirmed payment dates/),
  ).toHaveCount(0);
  await page.locator(".transactions-list-shell").focus();
  await page.mouse.move(0, 0);
  await page.screenshot({
    path: "test-results/monthly-review.png",
    fullPage: true,
  });
  const hoveredRow = page.getByRole("row").filter({ hasText: longDescription });
  const restingBackground = await hoveredRow.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  await hoveredRow.hover();
  await expect
    .poll(() =>
      hoveredRow.evaluate(
        (element) => getComputedStyle(element).backgroundColor,
      ),
    )
    .not.toBe(restingBackground);
  await page.screenshot({
    path: "test-results/transactions-compact-hover.png",
    fullPage: true,
  });
  await page.mouse.move(0, 0);

  const transactionHeader = page.locator("header").filter({
    has: page.getByRole("heading", { name: "Transactions", exact: true }),
  });
  const transactionPage = transactionHeader.locator("..");
  const ledgerShell = page.locator(".transactions-list-shell");
  const sidebar = page.locator('[data-slot="sidebar-inner"]');
  const pageSurfaces = [
    transactionPage,
    transactionHeader,
    ledgerShell,
    hoveredRow,
  ];
  for (const surface of pageSurfaces) {
    await expect(surface).toHaveCSS("background-color", "rgb(255, 255, 255)");
  }
  await expect(sidebar).toHaveCSS("background-color", "rgb(242, 242, 243)");
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await expect(sidebar).toHaveCSS("background-color", "rgb(10, 11, 11)");
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(18, 18, 18)",
  );
  for (const surface of pageSurfaces) {
    await expect(surface).toHaveCSS("background-color", "rgb(18, 18, 18)");
  }
  await hoveredRow.hover();
  await expect(hoveredRow).not.toHaveCSS("background-color", "rgb(18, 18, 18)");
  await hoveredRow.click({ modifiers: ["ControlOrMeta"] });
  await page.mouse.move(0, 0);
  await expect(hoveredRow).toHaveAttribute("aria-selected", "true");
  await expect(hoveredRow).not.toHaveCSS("background-color", "rgb(18, 18, 18)");
  await page
    .getByRole("button", { name: "Display options", exact: true })
    .click();
  const darkDisplay = page.getByRole("dialog", {
    name: "Display options",
    exact: true,
  });
  await expect(darkDisplay).toHaveCSS("background-color", "rgb(32, 32, 36)");
  await expect(darkDisplay).toHaveCSS("opacity", "1");
  await page.screenshot({
    path: "test-results/transactions-dark-page.png",
    fullPage: true,
  });
  const darkInlinePreference = darkDisplay.getByRole("switch", {
    name: "Inline credit card transactions",
    exact: true,
  });
  await darkInlinePreference.click();
  await expect(page.getByTestId("credit-card-bill-row").first()).toHaveCSS(
    "background-color",
    "rgb(18, 18, 18)",
  );
  await expect(ledgerShell).toHaveCSS("background-color", "rgb(18, 18, 18)");
  await expectCompactTransactionList(page);
  await expect(
    page.getByTestId("credit-card-bill-row").first(),
  ).not.toHaveAttribute("aria-selected");
  await darkInlinePreference.click();
  await expect(hoveredRow).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(darkDisplay).toHaveCount(0);
  await ledgerShell.focus();
  await page.keyboard.press("Escape");
  await expect(hoveredRow).toHaveAttribute("aria-selected", "false");
  await page.evaluate(() => document.documentElement.classList.remove("dark"));
  for (const surface of pageSurfaces) {
    await expect(surface).toHaveCSS("background-color", "rgb(255, 255, 255)");
  }
  await expect(sidebar).toHaveCSS("background-color", "rgb(242, 242, 243)");
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(247, 247, 248)",
  );

  await page.locator(".transactions-list-shell").focus();
  await page.keyboard.press("f");
  const filterMenu = page.getByRole("dialog", {
    name: "Transaction filters",
    exact: true,
  });
  await expect(filterMenu).toBeVisible();
  await filterMenu
    .getByRole("button", { name: "Description", exact: true })
    .click();
  const ledgerSearch = page.getByLabel("Search description", { exact: true });
  await expect(ledgerSearch).toBeVisible();
  await expect(ledgerSearch).toBeFocused();
  await ledgerSearch.fill("JULY REFUND");
  await expect(
    page.getByText("Fixture groceries", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Fixture July refund", { exact: true }),
  ).toBeVisible();
  await expectPopupSettled(filterMenu);
  await expectPopupSettled(
    page.getByRole("dialog", { name: "Description filter", exact: true }),
  );
  await page.screenshot({
    path: "test-results/transactions-compact-filter.png",
    fullPage: true,
  });
  await closeTransactionFilters(page);
  await openFilterProperty(page, "Category");
  const uncategorizedQuery = page.waitForResponse((response) => {
    const query = new URL(response.url());
    return (
      !response.request().isNavigationRequest() &&
      response.request().method() === "GET" &&
      query.pathname === "/transactions" &&
      query.searchParams.get("search") === "JULY REFUND" &&
      query.searchParams.getAll("categoryIdList").includes("-1")
    );
  });
  await page.getByRole("checkbox", { name: "None", exact: true }).check();
  expect((await uncategorizedQuery).status()).toBe(200);
  await closeTransactionFilters(page);
  await reloadWithSavedTransactionFilters(page, {
    dateBasis: "monthly-review",
    startDate: `${year}-06-01`,
    endDate: `${year}-06-30`,
    search: "JULY REFUND",
    categories: ["-1"],
    totalCount: 1,
  });
  await expect(
    page.getByRole("button", { name: "Review months", exact: true }),
  ).toHaveText(`Jun ${year}`);
  await expect(
    page.getByRole("textbox", { name: "Find in view", exact: true }),
  ).toHaveValue("JULY REFUND");
  await expect(
    page.getByText("Fixture July refund", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Fixture groceries", { exact: true }),
  ).toHaveCount(0);
  await openFilterProperty(page, "Description");
  await expect(ledgerSearch).toHaveValue("JULY REFUND");
  await closeTransactionFilters(page);
  await openFilterProperty(page, "Category");
  await expect(
    page.getByRole("checkbox", { name: "None", exact: true }),
  ).toBeChecked();
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .first()
    .click();
  await closeTransactionFilters(page);
  await expect(ledgerSearch).toHaveCount(0);
  await expect(page.getByText(longDescription, { exact: true })).toBeVisible();
  await reloadWithSavedTransactionFilters(page, {
    dateBasis: "monthly-review",
    startDate: `${year}-06-01`,
    endDate: `${year}-06-30`,
    totalCount: 5,
  });
  await expect(
    page.getByRole("button", { name: "Review months", exact: true }),
  ).toHaveText(`Jun ${year}`);
  await expect(
    page.getByRole("textbox", { name: "Find in view", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("grid", { name: "Transactions", exact: true }),
  ).toHaveAttribute("aria-rowcount", "5");
  await page.locator(".transactions-list-shell").focus();

  await page.keyboard.press("Shift+V");
  const display = page.getByRole("dialog", {
    name: "Display options",
    exact: true,
  });
  await expect(display).toBeVisible();
  await expect(
    display.getByRole("switch", {
      name: "Inline credit card transactions",
    }),
  ).toBeVisible();
  await expect(display).toHaveCSS("opacity", "1");
  await page.screenshot({
    path: "test-results/transactions-compact-display.png",
    fullPage: true,
  });
  await orderTransactionsBy(page, "Description", "asc");
  const displayPropertyNames = [
    "Date",
    "Account",
    "Card",
    "Category",
    "Installment",
    "Amount",
    "Import",
  ];
  for (const name of displayPropertyNames) {
    const property = display.getByRole("button", { name, exact: true });
    await property.click();
    await expect(property).toHaveAttribute("aria-pressed", "false");
    await expect(display).toBeVisible();
  }
  await page.keyboard.press("Escape");
  await expect(display).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Review months", exact: true }),
  ).toHaveText(`Jun ${year}`);
  const restoredLedger = page.getByRole("grid", {
    name: "Transactions",
    exact: true,
  });
  await expect(
    page.getByText("Fixture groceries", { exact: true }),
  ).toBeVisible();
  await expect(restoredLedger.locator('[data-column="date"]')).toHaveCount(0);
  await expect(restoredLedger.locator('[data-column="value"]')).toHaveCount(0);
  await expect(restoredLedger.getByRole("combobox")).toHaveCount(0);
  for (const slot of [
    "account-icon",
    "account",
    "card",
    "category",
    "installment",
    "import",
  ])
    await expect(
      restoredLedger.locator(`[data-metadata-slot="${slot}"]:visible`),
    ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Display options", exact: true })
    .click();
  await expect(
    display.getByRole("combobox", { name: "Ordering", exact: true }),
  ).toHaveText("Description");
  await expect(
    display.getByRole("button", { name: "Sort descending", exact: true }),
  ).toBeVisible();
  for (const name of displayPropertyNames) {
    const property = display.getByRole("button", { name, exact: true });
    await expect(property).toHaveAttribute("aria-pressed", "false");
    await property.click();
    await expect(property).toHaveAttribute("aria-pressed", "true");
  }
  await page.keyboard.press("Escape");
  await expect(display).toHaveCount(0);
  await expect(
    page
      .getByRole("grid", { name: "Transactions", exact: true })
      .getByRole("row")
      .first(),
  ).toContainText("Fixture groceries");
  await expectCompactTransactionList(page);

  await page.keyboard.press("ControlOrMeta+f");
  await expect(
    page.getByRole("textbox", { name: "Find in view", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("textbox", { name: "Find in view", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("heading", { name: "Transactions", exact: true })
    .click();
  await page.keyboard.press("?");
  await expect(
    page.getByRole("dialog", { name: "Keyboard shortcuts", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Keyboard shortcuts", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.locator('[role="dialog"]:not([aria-hidden="true"])'),
  ).toHaveCount(0);
  await page.keyboard.press("c");
  await expect(
    page.getByRole("dialog", { name: "Create New Transaction", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Create New Transaction", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.locator('[role="dialog"]:not([aria-hidden="true"])'),
  ).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await expectCompactTransactionList(page);
  const mobileShell = page.locator(".transactions-list-shell");
  await mobileShell.evaluate((element) => {
    element.scrollLeft = element.scrollWidth;
  });
  await expect
    .poll(() => mobileShell.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(0);
  await expectCompactTransactionList(page);
  await expectFiniteAnimationsSettled(page);
  await page.screenshot({
    path: "test-results/transactions-aligned-mobile-end.png",
    fullPage: true,
  });
  await mobileShell.evaluate((element) => {
    element.scrollLeft = 0;
  });
  await expectCompactTransactionList(page);
  const mobileWidth = await page.evaluate(() => ({
    content: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(mobileWidth.content).toBeLessThanOrEqual(mobileWidth.viewport);
  await page.screenshot({
    path: "test-results/transactions-compact-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 720 });

  await selectReviewMonth(page, `${year}-07`);
  await expect(
    page.getByText("Fixture July refund", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Cash flow", exact: true }).click();
  await expect(
    page
      .getByTestId("credit-card-bill-row")
      .filter({ hasText: "Review fixture card bill" }),
  ).toBeVisible();
  await expectCompactTransactionList(page);
  await reloadWithSavedTransactionFilters(page, {
    dateBasis: "cash-flow",
    startDate: `${year}-07-01`,
    endDate: `${year}-07-31`,
  });
  await expect(
    page.getByRole("button", { name: "Date range", exact: true }),
  ).toHaveText(`Jul ${year}`);
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
  await expectCompactTransactionList(page);
  await expect(
    page.getByRole("grid", { name: "Transactions", exact: true }),
  ).toHaveAttribute("aria-rowcount", "5");
  await expectFiniteAnimationsSettled(page);
  await page.screenshot({
    path: "test-results/transactions-aligned-bill-detail.png",
    fullPage: true,
  });
  const billSummary = page.getByRole("region", { name: "Bill summary" });
  const completeSummary = (await billSummary.textContent()) ?? "";
  const descriptionMenu = await openFilterProperty(page, "Description");
  const descriptionFilter = descriptionMenu.getByLabel("Search description", {
    exact: true,
  });
  await expectFiniteAnimationsSettled(page);
  const [unfilteredLayout] = await expectCompactTransactionList(page);
  await page.screenshot({
    path: "test-results/installment-track-unfiltered.png",
    fullPage: true,
  });
  await descriptionFilter.fill("JULY REFUND");
  await expect(
    page.getByText("1 of 5 purchases", { exact: true }),
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
  await expect(
    page.getByRole("grid", { name: "Transactions", exact: true }),
  ).toHaveAttribute("aria-rowcount", "1");
  const [filteredLayout] = await expectCompactTransactionList(page);
  expect(filteredLayout.metadataColumns).toBe(unfilteredLayout.metadataColumns);
  const unfilteredTracks = unfilteredLayout.tracks.filter(
    (track) => track.visible,
  );
  const filteredTracks = filteredLayout.tracks.filter((track) => track.visible);
  expect(filteredTracks.map((track) => track.name)).toEqual(
    unfilteredTracks.map((track) => track.name),
  );
  for (const [index, track] of filteredTracks.entries()) {
    expect(
      track.x,
      `${track.name} remains aligned after filtering`,
    ).toBeCloseTo(unfilteredTracks[index].x, 2);
    expect(
      track.width,
      `${track.name} retains width after filtering`,
    ).toBeCloseTo(unfilteredTracks[index].width, 2);
  }
  const blankInstallment = page
    .getByRole("row")
    .filter({ hasText: "Fixture July refund" })
    .locator('[data-metadata-slot="installment"]');
  await expect(blankInstallment).toHaveAttribute("data-empty", "true");
  await expect(blankInstallment).toHaveAttribute("aria-hidden", "true");
  await expect(blankInstallment).toHaveText("");
  await expect(blankInstallment).toHaveCSS("width", "64px");
  await expect(
    blankInstallment.locator(
      "button, a[href], input, select, textarea, [tabindex]",
    ),
  ).toHaveCount(0);
  await expectFiniteAnimationsSettled(page);
  await page.screenshot({
    path: "test-results/installment-track-no-installments.png",
    fullPage: true,
  });
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
  await page.keyboard.press("Escape");
  await openFilterProperty(page, "Category");
  await page.getByRole("checkbox", { name: "None", exact: true }).check();
  await expect(
    page.getByText("5 of 5 purchases", { exact: true }),
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
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 390, height: 844 });
  await searchByDescription(page, "groceries");
  await expect(
    page.getByText("1 of 5 purchases", { exact: true }),
  ).toBeVisible();
  const mobileFilters = page
    .getByRole("dialog", { name: "Transaction filters", exact: true })
    .or(
      page.getByRole("complementary", {
        name: "Transaction filters",
        exact: true,
      }),
    );
  await mobileFilters
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await expect(
    page.getByText("5 of 5 purchases", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Fixture July refund", { exact: true }),
  ).toBeVisible();
  expect(browserErrors).toEqual([]);
});

test("reviews selected nonadjacent months across years with the same inline and grouped totals after reload", async ({
  page,
}) => {
  const year = new Date().getFullYear();
  const prefix = "Multi-month fixture";
  const cardName = `${prefix} card`;
  const checkingName = `${prefix} checking`;
  const reviewMonths = [`${year - 1}-12`, `${year}-06`, `${year}-08`];
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.name));
  await signInAsFixture(page);

  await page.goto("/bank-accounts");
  await page.getByRole("textbox", { name: "Account name" }).fill(cardName);
  await page.getByRole("combobox", { name: "Account type" }).click();
  await page.getByRole("option", { name: "Credit card", exact: true }).click();
  await page.getByRole("spinbutton", { name: "Due day" }).fill("10");
  await chooseFixtureInstitution(page, "credit");
  await page.getByRole("button", { name: "Add account", exact: true }).click();
  await expect(page.getByText(cardName, { exact: true })).toBeVisible();
  await page.getByRole("textbox", { name: "Account name" }).fill(checkingName);
  await chooseFixtureInstitution(page, "checkout");
  await page.getByRole("button", { name: "Add account", exact: true }).click();
  await expect(page.getByText(checkingName, { exact: true })).toBeVisible();

  for (const [month, rows] of [
    [
      "06",
      [
        `18/06/${year};${prefix} June groceries;-40,00`,
        `19/06/${year};${prefix} June transport;-60,00`,
      ],
    ],
    ["07", [`18/07/${year};${prefix} July card gap;-900,00`]],
    ["08", [`18/08/${year};${prefix} August purchase;-80,00`]],
  ] as const) {
    await importMonthFixture(page, {
      name: `browser-multiple-months-card-${month}.csv`,
      accountName: cardName,
      accountType: "credit",
      month: `${year}-${month}`,
      rows: [...rows],
    });
  }
  await importMonthFixture(page, {
    name: "browser-multiple-months-checking.csv",
    accountName: checkingName,
    accountType: "checkout",
    rows: [
      `18/06/${year};${prefix} June checking;-10,00`,
      `18/07/${year};${prefix} July checking gap;-1000,00`,
      `18/08/${year};${prefix} August checking;-20,00`,
    ],
  });

  await page.goto("/transactions");
  await page
    .getByRole("button", { name: "Monthly review", exact: true })
    .click();
  await selectReviewMonth(page, `${year}-06`);
  await searchByDescription(page, prefix);
  await closeTransactionFilters(page);
  await expect(
    page.getByText(`${prefix} June groceries`, { exact: true }),
  ).toBeVisible();

  const picker = page.getByRole("dialog", {
    name: "Review months",
    exact: true,
  });
  await page
    .getByRole("button", { name: "Review months", exact: true })
    .click();
  const june = picker.getByRole("button", {
    name: `June ${year}`,
    exact: true,
  });
  const august = picker.getByRole("button", {
    name: `August ${year}`,
    exact: true,
  });
  await expect(june).toBeDisabled();
  await august.click();
  await expect(picker).toBeVisible();
  await expect(august).toHaveAttribute("aria-pressed", "true");
  await expect(june).toBeEnabled();
  await expect(
    picker.getByRole("button", { name: `July ${year}`, exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await june.click();
  await expect(june).toHaveAttribute("aria-pressed", "false");
  await expect(august).toBeDisabled();
  await june.click();
  await expect(june).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({
    path: "test-results/multi-month-picker.png",
    fullPage: true,
  });
  await picker
    .getByRole("button", { name: "Previous year", exact: true })
    .click();
  await picker
    .getByRole("button", { name: `December ${year - 1}`, exact: true })
    .click();
  await expect(picker).toBeVisible();
  await expect(
    picker.getByRole("button", { name: `December ${year - 1}`, exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await picker.getByRole("button", { name: "Done", exact: true }).click();
  await expect(picker).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Review months", exact: true }),
  ).toHaveText("3 months");

  const ledger = page.getByRole("grid", { name: "Transactions", exact: true });
  await expect(ledger).toHaveAttribute("aria-rowcount", "5");
  await expect(
    page.getByText(`${prefix} August purchase`, { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(`${prefix} June checking`, { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(`${prefix} August checking`, { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(`${prefix} July card gap`, { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText(`${prefix} July checking gap`, { exact: true }),
  ).toHaveCount(0);
  await reloadWithSavedTransactionFilters(page, {
    dateBasis: "monthly-review",
    startDate: `${year - 1}-12-01`,
    endDate: `${year}-08-31`,
    reviewMonths,
    search: prefix,
    totalCount: 5,
  });
  await expect(ledger).toHaveAttribute("aria-rowcount", "5");

  const totals = page.getByRole("dialog", {
    name: "Period totals",
    exact: true,
  });
  await page
    .getByRole("button", { name: "Period totals", exact: true })
    .click();
  await expect(
    totals
      .getByText("Review balance", { exact: true })
      .locator("../..")
      .locator("p"),
  ).toHaveText(/^[−-]R\$\s*210,00$/);
  await page.keyboard.press("Escape");
  await expect(totals).not.toBeVisible();

  const firstBillQuery = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return (
      !request.isNavigationRequest() &&
      request.method() === "GET" &&
      url.pathname === "/credit-card-bills" &&
      url.searchParams.getAll("reviewMonths").join(",") ===
        reviewMonths.join(",")
    );
  });
  await page
    .getByRole("button", { name: "Display options", exact: true })
    .click();
  await page
    .getByRole("switch", {
      name: "Inline credit card transactions",
      exact: true,
    })
    .click();
  await page.keyboard.press("Escape");
  const billsRequest = await firstBillQuery;
  expect((await billsRequest.response())?.status()).toBe(200);
  const bills = page
    .getByTestId("credit-card-bill-row")
    .filter({ hasText: `${cardName} bill` });
  await expect(bills).toHaveCount(2);
  await expect(ledger).toHaveAttribute("aria-rowcount", "4");
  await expect(bills.filter({ hasText: `Jun ${year}` })).toHaveCount(1);
  await expect(bills.filter({ hasText: `Aug ${year}` })).toHaveCount(1);
  await expect(bills.filter({ hasText: `Jul ${year}` })).toHaveCount(0);
  await expect(
    page.getByText(`${prefix} July checking gap`, { exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Period totals", exact: true })
    .click();
  await expect(
    totals
      .getByText("Review balance", { exact: true })
      .locator("../..")
      .locator("p"),
  ).toHaveText(/^[−-]R\$\s*210,00$/);
  await page.keyboard.press("Escape");

  const restoredBillQuery = page.waitForRequest(
    (request) =>
      !request.isNavigationRequest() &&
      request.method() === "GET" &&
      new URL(request.url()).pathname === "/credit-card-bills",
  );
  await reloadWithSavedTransactionFilters(page, {
    dateBasis: "monthly-review",
    startDate: `${year - 1}-12-01`,
    endDate: `${year}-08-31`,
    reviewMonths,
    search: prefix,
    totalCount: 5,
  });
  const restoredBillsRequest = await restoredBillQuery;
  expect(
    new URL(restoredBillsRequest.url()).searchParams.getAll("reviewMonths"),
  ).toEqual(reviewMonths);
  expect((await restoredBillsRequest.response())?.status()).toBe(200);
  await expect(bills).toHaveCount(2);
  await expect(ledger).toHaveAttribute("aria-rowcount", "4");

  await page.getByRole("button", { name: "Next month", exact: true }).click();
  await expect(bills).toHaveCount(1);
  await expect(
    page.getByText(`${prefix} July checking gap`, { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Review months", exact: true })
    .click();
  for (const label of [
    `January ${year}`,
    `July ${year}`,
    `September ${year}`,
  ]) {
    await expect(
      picker.getByRole("button", { name: label, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  }
  await picker.getByRole("button", { name: "Done", exact: true }).click();
  await page
    .getByRole("button", { name: "Previous month", exact: true })
    .click();
  await expect(bills).toHaveCount(2);
  await expect(
    page.getByText(`${prefix} July checking gap`, { exact: true }),
  ).toHaveCount(0);
  expect(browserErrors).toEqual([]);
});

test("combines account, import, amount, and date filters with matching totals and saved preferences", async ({
  page,
  browser,
}) => {
  test.setTimeout(120_000);
  const year = new Date().getFullYear();
  const checkingName = "Filter fixture checking";
  const cardName = "Filter fixture card";
  const otherName = "Filter fixture other checking";
  const sourceFile = "browser-filter-checking.csv";
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.name));
  await signInAsFixture(page);

  const checking = await addFixtureAccount(page, checkingName);
  await addFixtureAccount(page, otherName);
  const card = await addFixtureAccount(page, cardName, "credit");
  const source = await importMonthFixture(page, {
    name: sourceFile,
    accountName: checkingName,
    accountType: "checkout",
    rows: [
      `10/06/${year};Filter fixture small expense;-10,00`,
      `18/06/${year};Filter fixture large expense;-50,00`,
      `20/06/${year};Filter fixture refund;20,00`,
    ],
  });
  await importMonthFixture(page, {
    name: "browser-filter-second.csv",
    accountName: checkingName,
    accountType: "checkout",
    rows: [`22/06/${year};Filter fixture second source;-75,00`],
  });
  await importMonthFixture(page, {
    name: "browser-filter-card.csv",
    accountName: cardName,
    accountType: "credit",
    month: `${year}-06`,
    rows: [
      `12/06/${year};Filter fixture card expense;-35,00`,
      `13/06/${year};Filter fixture excluded card expense;-5,00`,
    ],
  });
  await importMonthFixture(page, {
    name: "browser-filter-other.csv",
    accountName: otherName,
    accountType: "checkout",
    rows: [`18/06/${year};Filter fixture other account;-15,00`],
  });

  await page.goto("/transactions");
  await page.getByRole("button", { name: /^New entry/ }).click();
  const create = page.getByRole("dialog", {
    name: "Create New Transaction",
    exact: true,
  });
  await create.getByRole("combobox", { name: "Account", exact: true }).click();
  await page.getByRole("option", { name: checkingName, exact: true }).click();
  await create.getByLabel("Date", { exact: true }).fill(`${year}-06-23`);
  await create
    .getByLabel("Description", { exact: true })
    .fill("Filter fixture manual expense");
  await create.getByLabel("Value", { exact: true }).fill("-25");
  await create
    .getByRole("button", { name: "Create Transaction", exact: true })
    .click();
  await expect(create).toHaveCount(0);
  await page
    .getByRole("button", { name: "Monthly review", exact: true })
    .click();
  await selectReviewMonth(page, `${year}-06`);

  const propertyMenu = await openTransactionFilters(page);
  const accountProperty = propertyMenu.getByRole("button", {
    name: "Bank account",
    exact: true,
  });
  await accountProperty.hover();
  let menu = page.getByRole("dialog", {
    name: "Bank account filter",
    exact: true,
  });
  await expectPopupSettled(propertyMenu);
  await expectPopupSettled(menu);
  await expect(accountProperty).toBeVisible();
  await expect(
    propertyMenu.getByRole("textbox", { name: "Search filter properties" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/filters-hover-light.png",
    fullPage: true,
  });
  const lightPopupBackground = await propertyMenu.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await expect(propertyMenu).not.toHaveCSS(
    "background-color",
    lightPopupBackground,
  );
  await expectPopupSettled(menu);
  await page.screenshot({
    path: "test-results/filters-hover-dark.png",
    fullPage: true,
  });
  await page.evaluate(() => document.documentElement.classList.remove("dark"));

  const propertyBounds = await accountProperty.boundingBox();
  const parentBounds = await propertyMenu.boundingBox();
  const submenuBounds = await menu.boundingBox();
  expect(propertyBounds).not.toBeNull();
  expect(parentBounds).not.toBeNull();
  expect(submenuBounds).not.toBeNull();
  const pointerY = propertyBounds!.y + propertyBounds!.height / 2;
  const opensRight = submenuBounds!.x > parentBounds!.x;
  await page.mouse.move(
    opensRight
      ? parentBounds!.x + parentBounds!.width - 1
      : parentBounds!.x + 1,
    pointerY,
  );
  await page.mouse.move(
    opensRight
      ? submenuBounds!.x + 2
      : submenuBounds!.x + submenuBounds!.width - 2,
    pointerY,
    { steps: 8 },
  );
  await expect(menu).toBeVisible();
  await menu.getByRole("checkbox", { name: checkingName, exact: true }).check();
  await menu.getByRole("checkbox", { name: cardName, exact: true }).check();
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(propertyMenu).toBeVisible();
  await expect(accountProperty).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(menu).toBeVisible();
  await expect(
    menu.getByRole("textbox", { name: "Search bank accounts" }),
  ).toBeFocused();
  await menu.getByRole("checkbox").first().focus();
  await page.keyboard.press("ArrowLeft");
  await expect(menu).toHaveCount(0);
  await expect(accountProperty).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(menu).toBeVisible();
  await closeTransactionFilters(page);
  const ledger = page.getByRole("grid", { name: "Transactions", exact: true });
  await expect(ledger).toHaveAttribute("aria-rowcount", "7");
  await expectCompactTransactionList(page);
  const manualCheckingRow = ledger
    .getByRole("row")
    .filter({ hasText: "Filter fixture manual expense" });
  for (const slot of ["import", "card"])
    await expect(
      manualCheckingRow.locator(`[data-metadata-slot="${slot}"]`),
    ).toHaveAttribute("data-empty", "true");
  const importedCreditRow = ledger
    .getByRole("row")
    .filter({ hasText: "Filter fixture card expense" });
  await expect(
    importedCreditRow.locator('[data-metadata-slot="import"]'),
  ).not.toHaveAttribute("data-empty", "true");
  await expect(
    importedCreditRow.locator('[data-metadata-slot="card"]'),
  ).toContainText("Not identified");
  await expectFiniteAnimationsSettled(page);
  await page.screenshot({
    path: "test-results/transactions-aligned-inline.png",
    fullPage: true,
  });
  await expect(
    page.getByText("Filter fixture other account", { exact: true }),
  ).toHaveCount(0);

  menu = await openFilterProperty(page, "Import source");
  await menu.getByRole("button", { name: "Imported", exact: true }).click();
  await closeTransactionFilters(page);
  await expect(ledger).toHaveAttribute("aria-rowcount", "6");
  await expect(
    page.getByText("Filter fixture manual expense", { exact: true }),
  ).toHaveCount(0);

  menu = await openFilterProperty(page, "Amount");
  await menu
    .getByRole("combobox", { name: "Amount condition", exact: true })
    .selectOption({ label: "Between" });
  await menu.getByLabel("Minimum amount", { exact: true }).fill("-50");
  await menu.getByLabel("Maximum amount", { exact: true }).fill("-10");
  await menu.getByRole("button", { name: "Apply amount", exact: true }).click();
  await closeTransactionFilters(page);
  await expect(menu).toHaveCount(0);
  menu = await openFilterProperty(page, "Category");
  await menu.getByRole("checkbox", { name: "None", exact: true }).check();
  await closeTransactionFilters(page);
  await expect(ledger).toHaveAttribute("aria-rowcount", "3");
  await expect(
    page.getByText("Filter fixture card expense", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Filter fixture excluded card expense", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Filter fixture refund", { exact: true }),
  ).toHaveCount(0);
  await expectReviewBalance(page, /^[−-]R\$\s*95,00$/);

  await reloadWithSavedTransactionFilters(page, {
    dateBasis: "monthly-review",
    startDate: `${year}-06-01`,
    endDate: `${year}-06-30`,
    categories: ["-1"],
    accounts: [checking.id, card.id],
    importSource: "imported",
    minValue: -50,
    maxValue: -10,
    totalCount: 3,
  });
  await expect(ledger).toHaveAttribute("aria-rowcount", "3");
  await page.getByRole("button", { name: /^Edit Amount between/ }).click();
  const amountEditor = page.getByRole("dialog", {
    name: "Edit transaction filter",
    exact: true,
  });
  await expect(
    amountEditor.getByLabel("Minimum amount", { exact: true }),
  ).toHaveValue("-50");
  await expect(
    amountEditor.getByLabel("Maximum amount", { exact: true }),
  ).toHaveValue("-10");
  await page.screenshot({
    path: "test-results/filters-bank-source-amount.png",
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Display options", exact: true })
    .click();
  await page
    .getByRole("switch", {
      name: "Inline credit card transactions",
      exact: true,
    })
    .click();
  await page.keyboard.press("Escape");
  const bill = page
    .getByTestId("credit-card-bill-row")
    .filter({ hasText: `${cardName} bill` });
  await expect(bill).toBeVisible();
  await expect(
    bill.locator('[data-column="value"] [data-field-value]'),
  ).toHaveText(/^[−-]R\$\s*40,00$/);
  await expect(ledger).toHaveAttribute("aria-rowcount", "3");
  await expectCompactTransactionList(page);
  await expect(bill.locator('[data-metadata-slot="import"]')).toHaveAttribute(
    "data-empty",
    "true",
  );
  await expectFiniteAnimationsSettled(page);
  await page.screenshot({
    path: "test-results/transactions-aligned-grouped.png",
    fullPage: true,
  });
  await expectReviewBalance(page, /^[−-]R\$\s*95,00$/);

  menu = await openFilterProperty(page, "Import source");
  await menu
    .getByRole("checkbox", {
      name: new RegExp(`^${sourceFile.replaceAll(".", "\\.")} ·`),
    })
    .check();
  await closeTransactionFilters(page);
  await expect(ledger).toHaveAttribute("aria-rowcount", "2");
  await expect(bill).toHaveCount(0);
  await expectReviewBalance(page, /^[−-]R\$\s*60,00$/);
  await reloadWithSavedTransactionFilters(page, {
    dateBasis: "monthly-review",
    startDate: `${year}-06-01`,
    endDate: `${year}-06-30`,
    categories: ["-1"],
    accounts: [checking.id, card.id],
    importSource: "imported",
    imports: [source.id],
    minValue: -50,
    maxValue: -10,
    totalCount: 2,
  });

  await page
    .getByRole("button", { name: "Clear import filters", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Clear amount filter", exact: true })
    .click();
  menu = await openFilterProperty(page, "Import source");
  await menu.getByRole("button", { name: "Manual", exact: true }).click();
  await closeTransactionFilters(page);
  await expect(ledger).toHaveAttribute("aria-rowcount", "1");
  await expect(
    page.getByText("Filter fixture manual expense", { exact: true }),
  ).toBeVisible();
  await expectReviewBalance(page, /^[−-]R\$\s*25,00$/);

  await clearTransactionFilters(page);
  await expect(
    page.getByRole("button", { name: "Review months", exact: true }),
  ).toHaveText(`Jun ${year}`);
  await page.getByRole("button", { name: "Cash flow", exact: true }).click();
  menu = await openFilterProperty(page, "Bank account");
  await menu.getByRole("checkbox", { name: checkingName, exact: true }).check();
  await closeTransactionFilters(page);
  menu = await openFilterProperty(page, "Date range");
  await menu.getByLabel("Start date", { exact: true }).fill(`${year}-06-15`);
  await menu.getByLabel("End date", { exact: true }).fill(`${year}-06-19`);
  await menu.getByRole("button", { name: "Apply range", exact: true }).click();
  await closeTransactionFilters(page);
  await expect(ledger).toHaveAttribute("aria-rowcount", "1");
  await expect(
    page.getByText("Filter fixture large expense", { exact: true }),
  ).toBeVisible();
  await reloadWithSavedTransactionFilters(page, {
    dateBasis: "cash-flow",
    startDate: `${year}-06-15`,
    endDate: `${year}-06-19`,
    accounts: [checking.id],
    totalCount: 1,
  });
  await clearTransactionFilters(page);
  await reloadWithSavedTransactionFilters(page, {
    dateBasis: "cash-flow",
    startDate: `${year}-06-15`,
    endDate: `${year}-06-19`,
  });
  await expect(
    page.getByRole("button", { name: "Date range", exact: true }),
  ).toBeVisible();
  await expect(ledger).toBeVisible();

  const touchContext =
    await test.step("open a touch-capable mobile browser", () =>
      browser.newContext({
        baseURL: "http://127.0.0.1:4180",
        viewport: { width: 390, height: 844 },
        hasTouch: true,
      }));
  touchContext.setDefaultTimeout(10_000);
  touchContext.setDefaultNavigationTimeout(15_000);
  try {
    const touchPage = await touchContext.newPage();
    touchPage.on("pageerror", (error) => browserErrors.push(error.name));
    await test.step("sign in the mobile fixture", () =>
      signInAsFixture(touchPage));
    await touchPage.goto("/transactions");
    await test.step("tap the root filter trigger", () =>
      touchPage.getByRole("button", { name: /^Filter(?: \d+)?$/ }).tap());
    const touchMenu = transactionFilterMenu(touchPage);
    await expect(touchMenu).toBeVisible();
    await test.step("tap Bank account without hovering", () =>
      touchMenu
        .getByRole("button", { name: "Bank account", exact: true })
        .tap());
    const touchEditor = touchPage.getByRole("dialog", {
      name: "Bank account filter",
      exact: true,
    });
    await expect(touchMenu).toBeVisible();
    await expectPopupSettled(touchEditor);
    await touchPage.screenshot({
      path: "test-results/filters-touch-submenu.png",
      fullPage: true,
    });
    const touchBounds = await touchEditor.boundingBox();
    expect(touchBounds).not.toBeNull();
    expect(touchBounds!.x).toBeGreaterThanOrEqual(0);
    expect(touchBounds!.x + touchBounds!.width).toBeLessThanOrEqual(390);
    const mobileWidth = await touchPage.evaluate(() => ({
      content: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    }));
    expect(mobileWidth.content).toBeLessThanOrEqual(mobileWidth.viewport);
    const touchAccount = touchEditor.getByRole("checkbox", {
      name: checkingName,
      exact: true,
    });
    await test.step("select an account in the mobile submenu", () =>
      touchAccount.tap());
    await expect(touchAccount).toBeChecked();
    await touchPage.screenshot({
      path: "test-results/filters-touch-submenu.png",
      fullPage: true,
    });
    await test.step("dismiss both filter levels by tapping outside", () =>
      touchPage
        .getByRole("heading", { name: "Transactions", exact: true })
        .tap());
    await expect(touchEditor).toHaveCount(0);
    await expect(touchMenu).toHaveCount(0);
  } finally {
    await touchContext.close().catch(() => undefined);
  }
  expect(browserErrors).toEqual([]);
});

test("keeps a virtualized transaction list single-line while browsing and selecting with the keyboard", async ({
  page,
}) => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const rowCount = 120;
  const description = (index: number) =>
    `Fixture density ${String(index).padStart(3, "0")} — a deliberately long synthetic description that must remain on one line while the list virtualizes its rows and the viewport becomes narrow`;
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.name));
  await signInAsFixture(page);

  await page.goto("/bank-accounts");
  await page
    .getByRole("textbox", { name: "Account name" })
    .fill("Density fixture checking");
  await chooseFixtureInstitution(page, "checkout");
  const accountResponse = page.waitForResponse(
    (response) =>
      !response.request().isNavigationRequest() &&
      new URL(response.url()).pathname === "/bankaccounts" &&
      response.request().method() === "POST" &&
      response.ok(),
  );
  await page.getByRole("button", { name: "Add account", exact: true }).click();
  const account: { id: string } = await (await accountResponse).json();
  await expect(
    page.getByText("Density fixture checking", { exact: true }),
  ).toBeVisible();

  await page.goto("/imports");
  await page.getByRole("button", { name: "Import file", exact: true }).click();
  await page.getByLabel("Drop a CSV here or choose a file").setInputFiles({
    name: "browser-density-fixture.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      [
        "Date;Description;Amount",
        ...Array.from(
          { length: rowCount },
          (_, index) => `18/${month}/${year};${description(index + 1)};-10,00`,
        ),
      ].join("\n"),
    ),
  });
  await page.getByRole("combobox", { name: "Destination account" }).click();
  await page
    .getByRole("option", {
      name: "Density fixture checking (checkout)",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Validate import", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: `Import ${rowCount} transactions`,
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", { name: "Import file", exact: true }),
  ).toBeVisible();

  await page.goto(`/transactions?accountId=${encodeURIComponent(account.id)}`);
  await page
    .getByRole("button", { name: "Display options", exact: true })
    .click();
  await orderTransactionsBy(page, "Description", "asc");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Display options", exact: true }),
  ).toHaveCount(0);
  const ledger = page.getByRole("grid", { name: "Transactions", exact: true });
  const list = page.locator(".transactions-list-shell");
  await expect(page.getByText(description(1), { exact: true })).toBeVisible();
  await expectCompactTransactionList(page);
  await expect(ledger).toHaveAttribute("aria-rowcount", String(rowCount));
  expect(await ledger.getByRole("row").count()).toBeLessThan(rowCount);
  await expect(ledger.getByRole("row").first()).toHaveAttribute(
    "aria-rowindex",
    "1",
  );
  await expect(
    page.getByText(description(rowCount), { exact: true }),
  ).toHaveCount(0);
  const firstDescription = page.getByText(description(1), { exact: true });
  expect(
    await firstDescription.evaluate(
      (element) => element.scrollWidth > element.clientWidth,
    ),
  ).toBe(true);
  await list.focus();
  await page.mouse.move(0, 0);
  await page.screenshot({
    path: "test-results/transactions-compact-density-desktop.png",
    fullPage: true,
  });

  await list.focus();
  await page.keyboard.press("j");
  await expect(ledger.locator('[data-focused="true"]')).toContainText(
    description(1),
  );
  await expect(
    ledger.locator('[data-focused="true"]').getByRole("gridcell"),
  ).toBeFocused();
  await page.keyboard.press("x");
  await expect(ledger.locator('[aria-selected="true"]')).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(ledger.locator('[aria-selected="true"]')).toHaveCount(0);
  await page.keyboard.press("j");
  await page.keyboard.press("j");
  await expect(ledger.locator('[data-focused="true"]')).toContainText(
    description(2),
  );
  await expect(
    ledger.locator('[data-focused="true"]').getByRole("gridcell"),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page
      .getByRole("dialog")
      .getByRole("heading", { name: description(2), exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page
      .getByRole("dialog")
      .getByRole("heading", { name: description(2), exact: true }),
  ).toHaveCount(0);
  await expect(
    page.locator('[role="dialog"]:not([aria-hidden="true"])'),
  ).toHaveCount(0);

  await list.focus();
  await page.keyboard.press("Escape");
  await page.keyboard.press("j");
  for (let index = 0; index < 60; index += 1) {
    await page.keyboard.press("ArrowDown");
  }
  const keyboardRow = ledger.locator('[data-focused="true"]');
  await expect(keyboardRow).toHaveAttribute("aria-rowindex", "61");
  await expect(keyboardRow).toContainText(description(61));
  await expect(keyboardRow.getByRole("gridcell")).toBeFocused();
  await expect(page.getByText(description(1), { exact: true })).toHaveCount(0);
  expect(await ledger.getByRole("row").count()).toBeLessThan(rowCount);
  await page.keyboard.press("Shift+ArrowDown");
  await expect(ledger.locator('[aria-selected="true"]')).toHaveCount(2);
  await page.keyboard.press("ControlOrMeta+a");
  await expect(
    page.getByText(`${rowCount} selected`, { exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(ledger.locator('[aria-selected="true"]')).toHaveCount(0);

  for (const view of ["Monthly review", "Cash flow"]) {
    await page.getByRole("button", { name: view, exact: true }).click();
    await expect(ledger).toHaveAttribute("aria-rowcount", String(rowCount));
    await expect(ledger.getByRole("row").first()).toBeVisible();
    await list.evaluate((element) => {
      element.scrollTop = 60 * 40;
    });
    await expect
      .poll(() =>
        list.evaluate((element) => {
          const viewport = element.getBoundingClientRect();
          const rows = Array.from(element.querySelectorAll("[data-list-key]"));
          return {
            before: rows.filter(
              (row) => row.getBoundingClientRect().bottom <= viewport.top,
            ).length,
            after: rows.filter(
              (row) => row.getBoundingClientRect().top >= viewport.bottom,
            ).length,
          };
        }),
      )
      .toEqual({ before: 30, after: 30 });
    expect(await ledger.getByRole("row").count()).toBeLessThan(rowCount);
    await expect(page.getByText(description(1), { exact: true })).toHaveCount(
      0,
    );
    await expect(
      page.getByText(description(rowCount), { exact: true }),
    ).toHaveCount(0);
  }

  await list.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(
    page.getByText(description(rowCount), { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(description(1), { exact: true })).toHaveCount(0);
  await expectCompactTransactionList(page);
  expect(await ledger.getByRole("row").count()).toBeLessThan(rowCount);
  await expect(ledger.getByRole("row").last()).toHaveAttribute(
    "aria-rowindex",
    String(rowCount),
  );
  await expectTransactionListEndClearance(page);
  const lastRow = ledger.getByRole("row").last();
  await lastRow.hover();
  await page.screenshot({
    path: "test-results/transaction-list-spacing-desktop.png",
    fullPage: true,
  });
  await lastRow
    .getByRole("checkbox", { name: "Select transaction", exact: true })
    .click();
  await expectTransactionListEndClearance(page, true);
  await page.screenshot({
    path: "test-results/transaction-list-spacing-selection-desktop.png",
    fullPage: true,
  });
  const bar = page.getByRole("toolbar", {
    name: "Selected transaction actions",
    exact: true,
  });
  await bar.getByRole("button", { name: "Unselect all", exact: true }).click();
  await expect(bar).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await expectCompactTransactionList(page);
  await expectTransactionListEndClearance(page);
  await lastRow.hover();
  await page.screenshot({
    path: "test-results/transactions-compact-density-mobile.png",
    fullPage: true,
  });
  await lastRow
    .getByRole("checkbox", { name: "Select transaction", exact: true })
    .click();
  await expectTransactionListEndClearance(page, true);
  await page.screenshot({
    path: "test-results/transaction-list-spacing-selection-mobile.png",
    fullPage: true,
  });
  expect(browserErrors).toEqual([]);
});

test("persists bank and card issuer logos through creation, import, review, and institution changes", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const year = new Date().getFullYear();
  const checkingName = "Institution fixture checking";
  const cardName = "Institution fixture card";
  const paymentDescription = "Institution fixture checking payment";
  const cardDescription = "Institution fixture card purchase";
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.name));
  await signInAsFixture(page);

  const checking = await addFixtureAccount(
    page,
    checkingName,
    "checkout",
    "Inter",
  );
  expect(checking.institutionId).toBe("inter");
  const card = await addFixtureAccount(page, cardName, "credit", "Nubank");
  expect(card.institutionId).toBe("nubank");
  const accountRow = (name: string) =>
    page.getByRole("listitem").filter({ hasText: name });
  await expectInstitutionLogo(accountRow(checkingName), "inter");
  await expectInstitutionLogo(accountRow(cardName), "nubank");
  await page.reload();
  await expectInstitutionLogo(accountRow(checkingName), "inter");
  await expectInstitutionLogo(accountRow(cardName), "nubank");

  await page
    .getByRole("combobox", { name: "Financial institution", exact: true })
    .click();
  const institutionChoices = page.getByRole("dialog", {
    name: "Financial institution",
    exact: true,
  });
  await expectPopupSettled(institutionChoices);
  const choiceLogos = institutionChoices.locator("[data-institution-id]");
  await expect(choiceLogos).toHaveCount(21);
  const coloredBrandTiles = new Set([
    "banco-do-brasil",
    "banco-pan",
    "bmg",
    "btg-pactual",
    "caixa",
    "neon",
  ]);
  for (const logo of await choiceLogos.all()) {
    const institutionId = (await logo.getAttribute("data-institution-id"))!;
    await expectInstitutionLogo(institutionChoices, institutionId);
    // Sample the original local image, not a themed/recolored screenshot.
    await expectOriginalArtworkCornerAlpha(
      logo.locator("img"),
      coloredBrandTiles.has(institutionId) ? 255 : 0,
    );
  }
  await institutionChoices
    .getByRole("option", { name: "C6 Bank", exact: true })
    .scrollIntoViewIfNeeded();
  await expectFiniteAnimationsSettled(page);
  await page.screenshot({
    path: "test-results/institution-picker-transparency-light.png",
    fullPage: true,
  });
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await expect(page.locator("body")).toHaveCSS("color", "rgb(236, 236, 241)");
  await expectFiniteAnimationsSettled(page);
  for (const [institutionId, filter] of [
    ["c6", "brightness(0) invert(1)"],
    ["safra", "brightness(0) invert(1)"],
    ["xp", "invert(1)"],
    ["btg-pactual", "none"],
  ]) {
    await expectInstitutionLogo(institutionChoices, institutionId);
    await expect(
      institutionChoices.locator(
        `[data-institution-id="${institutionId}"] img`,
      ),
    ).toHaveCSS("filter", filter);
  }
  await page.screenshot({
    path: "test-results/institution-picker-transparency-dark.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expectFiniteAnimationsSettled(page);
  await expectInstitutionLogo(institutionChoices, "c6");
  await page.screenshot({
    path: "test-results/institution-picker-transparency-mobile.png",
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  await expect(institutionChoices).toHaveCount(0);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.evaluate(() => document.documentElement.classList.remove("dark"));
  await expectFiniteAnimationsSettled(page);

  await importMonthFixture(page, {
    name: "browser-institution-checking.csv",
    accountName: checkingName,
    accountType: "checkout",
    rows: [`19/06/${year};${paymentDescription};-100,00`],
  });
  await expectInstitutionLogo(
    page
      .getByRole("listitem")
      .filter({ hasText: "browser-institution-checking.csv" }),
    "inter",
  );
  await importMonthFixture(page, {
    name: "browser-institution-card.csv",
    accountName: cardName,
    accountType: "credit",
    month: `${year}-06`,
    rows: [`15/06/${year};${cardDescription};-100,00`],
  });
  await expectInstitutionLogo(
    page
      .getByRole("listitem")
      .filter({ hasText: "browser-institution-card.csv" }),
    "nubank",
  );

  await page.goto("/transactions");
  await page
    .getByRole("button", { name: "Monthly review", exact: true })
    .click();
  await selectReviewMonth(page, `${year}-06`);
  const accounts = await openFilterProperty(page, "Bank account");
  for (const [name, id] of [
    [checkingName, "inter"],
    [cardName, "nubank"],
  ]) {
    const checkbox = accounts.getByRole("checkbox", { name, exact: true });
    await expectInstitutionLogo(checkbox.locator(".."), id);
    await checkbox.check();
  }
  await closeTransactionFilters(page);
  await expectInstitutionLogo(
    page.getByRole("button", { name: /^Edit Account is either of/ }),
    "inter",
  );
  await page
    .getByRole("button", { name: "Display options", exact: true })
    .click();
  const display = page.getByRole("dialog", {
    name: "Display options",
    exact: true,
  });
  const inline = display.getByRole("switch", {
    name: "Inline credit card transactions",
    exact: true,
  });
  if ((await inline.getAttribute("aria-checked")) === "true")
    await inline.click();
  await page.keyboard.press("Escape");
  const checkingLedgerRow = page
    .getByTestId("grouped-transaction-row")
    .filter({ hasText: paymentDescription });
  const billRow = page
    .getByTestId("credit-card-bill-row")
    .filter({ hasText: `${cardName} bill` });
  await expectInstitutionLogo(checkingLedgerRow, "inter");
  await expectInstitutionLogo(billRow, "nubank");
  await expect(billRow).toHaveCSS("height", "40px");
  await billRow
    .getByRole("button", { name: `${cardName} bill`, exact: true })
    .click();
  await expect(page).toHaveURL(
    new RegExp(`/credit-card-bills/${card.id}/${year}-06$`),
  );
  await expectInstitutionLogo(page.locator("header"), "nubank");
  await expectInstitutionLogo(page.getByLabel("Bill summary"), "nubank");
  const paymentCandidate = page
    .getByText(paymentDescription, { exact: true })
    .locator("../..");
  await expectInstitutionLogo(paymentCandidate, "inter");
  await expectInstitutionLogo(
    page.getByRole("row").filter({ hasText: cardDescription }),
    "nubank",
  );

  await page.goto("/bank-accounts");
  await page
    .getByRole("button", {
      name: `Change institution for ${cardName}`,
      exact: true,
    })
    .click();
  const edit = page.getByRole("dialog", {
    name: "Change financial institution",
    exact: true,
  });
  await edit
    .getByRole("combobox", { name: "Financial institution", exact: true })
    .click();
  await page.getByRole("option", { name: "Itaú", exact: true }).click();
  const update = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === `/bankaccounts/${card.id}` &&
      response.request().method() === "PATCH" &&
      response.ok(),
  );
  await edit
    .getByRole("button", { name: "Save institution", exact: true })
    .click();
  expect((await (await update).json()).institutionId).toBe("itau");
  await expect(edit).toHaveCount(0);
  await expectInstitutionLogo(accountRow(cardName), "itau");
  await page.reload();
  await expectInstitutionLogo(accountRow(cardName), "itau");

  await page.goto(`/transactions?accountId=${card.id}`);
  await expectInstitutionLogo(billRow, "itau");
  await page.screenshot({
    path: "test-results/institution-logos-light.png",
    fullPage: true,
  });
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await expectInstitutionLogo(billRow, "itau");
  await page.screenshot({
    path: "test-results/institution-logos-dark.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expectInstitutionLogo(billRow, "itau");
  const logoBounds = await billRow
    .locator('[data-institution-id="itau"]')
    .boundingBox();
  expect(logoBounds).not.toBeNull();
  expect(logoBounds!.x).toBeGreaterThanOrEqual(0);
  expect(logoBounds!.x + logoBounds!.width).toBeLessThanOrEqual(390);
  await expect(billRow).toHaveCSS("height", "40px");
  await page.screenshot({
    path: "test-results/institution-logos-mobile.png",
    fullPage: true,
  });
  expect(browserErrors).toEqual([]);
});

test("selects transactions with hover and touch checkboxes and manages them from the selection bar", async ({
  page,
  browser,
}) => {
  test.setTimeout(120_000);
  const year = new Date().getFullYear();
  const checkingName = "Selection fixture checking";
  const cardName = "Selection fixture card";
  const categoryName = "Selection fixture category";
  const descriptions = [
    "Selection fixture A expense",
    "Selection fixture B expense",
    "Selection fixture C refund",
    "Selection fixture D expense",
  ];
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.name));
  await signInAsFixture(page);
  await addFixtureAccount(page, checkingName);
  await addFixtureAccount(page, cardName, "credit");
  await page.goto("/categories");
  await page.getByRole("textbox", { name: "Category name" }).fill(categoryName);
  await page.getByRole("button", { name: "Add category", exact: true }).click();
  await expect(page.getByText(categoryName, { exact: true })).toBeVisible();
  await importMonthFixture(page, {
    name: "browser-selection-checking.csv",
    accountName: checkingName,
    accountType: "checkout",
    rows: [
      `10/06/${year};${descriptions[0]};-10,00`,
      `11/06/${year};${descriptions[1]};-20,00`,
      `12/06/${year};${descriptions[2]};5,00`,
      `13/06/${year};${descriptions[3]};-15,00`,
    ],
  });
  await importMonthFixture(page, {
    name: "browser-selection-card.csv",
    accountName: cardName,
    accountType: "credit",
    month: `${year}-06`,
    rows: [`14/06/${year};Selection fixture card purchase;-30,00`],
  });
  await page.goto("/transactions");
  await page
    .getByRole("button", { name: "Monthly review", exact: true })
    .click();
  await selectReviewMonth(page, `${year}-06`);
  const accounts = await openFilterProperty(page, "Bank account");
  await accounts
    .getByRole("checkbox", { name: checkingName, exact: true })
    .check();
  await accounts.getByRole("checkbox", { name: cardName, exact: true }).check();
  await closeTransactionFilters(page);
  await page
    .getByRole("button", { name: "Display options", exact: true })
    .click();
  const display = page.getByRole("dialog", {
    name: "Display options",
    exact: true,
  });
  await orderTransactionsBy(page, "Description", "asc");
  const inline = display.getByRole("switch", {
    name: "Inline credit card transactions",
    exact: true,
  });
  if ((await inline.getAttribute("aria-checked")) !== "true")
    await inline.click();
  await page.keyboard.press("Escape");
  const ledger = page.getByRole("grid", { name: "Transactions", exact: true });
  await expect(ledger).toHaveAttribute("aria-rowcount", "5");
  const row = (description: string) =>
    ledger.getByRole("row").filter({ hasText: description });
  const checkbox = (description: string) =>
    row(description).getByRole("checkbox", {
      name: "Select transaction",
      exact: true,
    });
  const bar = page.getByRole("toolbar", {
    name: "Selected transaction actions",
    exact: true,
  });
  await page.locator(".transactions-list-shell").focus();
  await page.mouse.move(0, 0);
  await expectSelectionCheckboxShown(checkbox(descriptions[0]), false);
  await row(descriptions[0]).hover();
  await expectSelectionCheckboxShown(checkbox(descriptions[0]), true);
  await checkbox(descriptions[0]).click();
  await page.mouse.move(0, 0);
  await expect(checkbox(descriptions[0])).toBeChecked();
  await expectSelectionCheckboxShown(checkbox(descriptions[0]), true);
  await row(descriptions[1]).hover();
  await checkbox(descriptions[1]).click();
  await expect(bar.getByText("2 selected", { exact: true })).toBeVisible();
  await expect(bar).toContainText(/[−-]R\$\s*30,00/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await row(descriptions[3]).hover();
  await checkbox(descriptions[3]).click({ modifiers: ["Shift"] });
  await expect(bar.getByText("5 selected", { exact: true })).toBeVisible();
  await expect(bar).toContainText(/[−-]R\$\s*70,00/);
  await bar.getByRole("button", { name: "Unselect all", exact: true }).click();
  await expect(bar).toHaveCount(0);

  await row(descriptions[1]).hover();
  await checkbox(descriptions[1]).click();
  await row(descriptions[2]).hover();
  await checkbox(descriptions[2]).click();
  await expect(bar.getByText("2 selected", { exact: true })).toBeVisible();
  await expect(bar).toContainText(/[−-]R\$\s*15,00/);
  const expectBarWithinLedger = async () => {
    await expect
      .poll(async () => {
        const barBounds = await bar.boundingBox();
        const ledgerBounds = await page
          .locator(".transactions-list-shell")
          .boundingBox();
        const sidebarBounds = await page
          .locator('[data-slot="sidebar-container"]')
          .boundingBox();
        if (!barBounds || !ledgerBounds || !sidebarBounds) return false;
        return (
          Math.abs(
            barBounds.x +
              barBounds.width / 2 -
              ledgerBounds.x -
              ledgerBounds.width / 2,
          ) <= 2 &&
          barBounds.height === 44 &&
          barBounds.x >= sidebarBounds.x + sidebarBounds.width
        );
      })
      .toBe(true);
  };
  await expectBarWithinLedger();
  const sidebar = page.locator('[data-slot="sidebar"][data-state]');
  await expect(sidebar).toHaveAttribute("data-state", "expanded");
  await page.locator('[data-slot="sidebar-rail"]').click();
  await expect(sidebar).toHaveAttribute("data-state", "collapsed");
  await expectBarWithinLedger();
  await page.locator('[data-slot="sidebar-rail"]').click();
  await expect(sidebar).toHaveAttribute("data-state", "expanded");
  await expectBarWithinLedger();
  await page.mouse.move(0, 0);
  await page.screenshot({
    path: "test-results/transaction-selection-light.png",
    fullPage: true,
  });
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await expect(
    row(descriptions[1]).getByTestId("transaction-description"),
  ).toHaveCSS("color", "rgb(236, 236, 241)");
  await expect(
    bar.getByRole("button", { name: "Select all", exact: true }),
  ).toHaveCSS("color", "rgb(236, 236, 241)");
  await page.screenshot({
    path: "test-results/transaction-selection-dark.png",
    fullPage: true,
  });
  await page.evaluate(() => document.documentElement.classList.remove("dark"));
  await bar.getByRole("button", { name: "Delete", exact: true }).click();
  const deletion = page.getByRole("alertdialog", {
    name: "Delete 2 transactions?",
    exact: true,
  });
  await expect(deletion).toBeVisible();
  await expect(deletion).toContainText(/retained|recoverable|soft/i);
  await deletion.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(deletion).toHaveCount(0);
  await expect(ledger).toHaveAttribute("aria-rowcount", "5");

  const categoryUpdates: Array<{ categoryId?: string | null }> = [];
  const onCategoryUpdate = (response: Response) => {
    if (
      response.request().method() === "PATCH" &&
      /^\/transactions\/\d+$/.test(new URL(response.url()).pathname) &&
      response.ok()
    ) {
      categoryUpdates.push(
        response.request().postDataJSON() as { categoryId?: string | null },
      );
    }
  };
  page.on("response", onCategoryUpdate);
  await bar
    .getByRole("button", {
      name: "Category for selected transactions",
      exact: true,
    })
    .click();
  await page
    .getByRole("dialog", {
      name: "Category for selected transactions",
      exact: true,
    })
    .getByRole("option", { name: categoryName, exact: true })
    .click();
  await expect.poll(() => categoryUpdates.length).toBe(2);
  page.off("response", onCategoryUpdate);
  expect(
    categoryUpdates.every((update) => typeof update.categoryId === "string"),
  ).toBe(true);
  await expect(row(descriptions[1]).getByRole("combobox")).toContainText(
    categoryName,
  );
  await expect(row(descriptions[2]).getByRole("combobox")).toContainText(
    categoryName,
  );
  await expect(bar.getByText("2 selected", { exact: true })).toBeVisible();

  await searchByDescription(page, descriptions[2]);
  await closeTransactionFilters(page);
  await expect(ledger).toHaveAttribute("aria-rowcount", "1");
  await expect(bar.getByText("1 selected", { exact: true })).toBeVisible();
  await expect(bar).toContainText(/R\$\s*5,00/);
  await bar.getByRole("button", { name: "Unselect all", exact: true }).click();
  await page.reload();
  await expect(ledger).toHaveAttribute("aria-rowcount", "1");
  await expect(row(descriptions[2]).getByRole("combobox")).toContainText(
    categoryName,
  );
  await expect(bar).toHaveCount(0);
  await clearTransactionFilters(page);
  const matchingAccounts = await openFilterProperty(page, "Bank account");
  await matchingAccounts
    .getByRole("checkbox", { name: checkingName, exact: true })
    .check();
  await matchingAccounts
    .getByRole("checkbox", { name: cardName, exact: true })
    .check();
  await closeTransactionFilters(page);
  await page
    .getByRole("button", { name: "Display options", exact: true })
    .click();
  await display
    .getByRole("switch", {
      name: "Inline credit card transactions",
      exact: true,
    })
    .click();
  await page.keyboard.press("Escape");
  const bill = page
    .getByTestId("credit-card-bill-row")
    .filter({ hasText: `${cardName} bill` });
  await expect(bill).toBeVisible();
  await expect(bill.getByRole("checkbox")).toHaveCount(0);
  await expect(bill).not.toHaveAttribute("aria-selected");
  await row(descriptions[0]).hover();
  await checkbox(descriptions[0]).click();
  await bar.getByRole("button", { name: "Select all", exact: true }).click();
  await expect(bar.getByText("4 selected", { exact: true })).toBeVisible();
  await expect(bar).toContainText(/[−-]R\$\s*40,00/);
  await bar.getByRole("button", { name: "Unselect all", exact: true }).click();
  await expect(bar).toHaveCount(0);

  const touchContext = await browser.newContext({
    baseURL: "http://127.0.0.1:4180",
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  });
  touchContext.setDefaultTimeout(10_000);
  touchContext.setDefaultNavigationTimeout(15_000);
  try {
    const touchPage = await touchContext.newPage();
    touchPage.on("pageerror", (error) => browserErrors.push(error.name));
    await signInAsFixture(touchPage);
    await touchPage.goto("/transactions");
    await touchPage
      .getByRole("button", { name: "Monthly review", exact: true })
      .tap();
    await selectReviewMonth(touchPage, `${year}-06`);
    const touchAccounts = await openFilterProperty(touchPage, "Bank account");
    await touchAccounts
      .getByRole("checkbox", { name: checkingName, exact: true })
      .tap();
    await closeTransactionFilters(touchPage);
    const touchLedger = touchPage.getByRole("grid", {
      name: "Transactions",
      exact: true,
    });
    await expect(touchLedger).toHaveAttribute("aria-rowcount", "4");
    for (const description of descriptions.slice(0, 2)) {
      const touchCheckbox = touchLedger
        .getByRole("row")
        .filter({ hasText: description })
        .getByRole("checkbox", { name: "Select transaction", exact: true });
      await expectSelectionCheckboxShown(touchCheckbox, true);
      await touchCheckbox.tap();
      await expect(touchCheckbox).toBeChecked();
    }
    const touchBar = touchPage.getByRole("toolbar", {
      name: "Selected transaction actions",
      exact: true,
    });
    await expect(
      touchBar.getByText("2 selected", { exact: true }),
    ).toBeVisible();
    await expect(touchBar).toContainText(/[−-]R\$\s*30,00/);
    const touchBounds = await touchBar.boundingBox();
    expect(touchBounds).not.toBeNull();
    expect(touchBounds!.x).toBeGreaterThanOrEqual(0);
    expect(touchBounds!.x + touchBounds!.width).toBeLessThanOrEqual(390);
    expect(touchBounds!.y + touchBounds!.height).toBeLessThanOrEqual(844);
    await touchPage.screenshot({
      path: "test-results/transaction-selection-touch.png",
      fullPage: true,
    });
    await touchBar
      .getByRole("button", { name: "Unselect all", exact: true })
      .tap();
    await expect(touchBar).toHaveCount(0);
  } finally {
    await touchContext.close().catch(() => undefined);
  }
  expect(browserErrors).toEqual([]);
});

test("keeps two named C6 cards on one shared bill through import, editing, filtering, archiving, and reconciliation", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const year = new Date().getFullYear();
  const dueMonth = `${year}-07`;
  const accountName = "Shared cards fixture C6";
  const checkingName = "Shared cards fixture payment account";
  const paymentDescription = "Shared cards fixture full payment";
  const descriptions = {
    mine: "Shared cards Mine purchase",
    wife: "Shared cards Wife purchase",
    mineRefund: "Shared cards Mine refund",
    wifeRefund: "Shared cards Wife refund",
    fallback: "Shared cards blank identifier",
    unknown: "Shared cards initially unidentified",
    manual: "Shared cards manually created purchase",
  };
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.name));
  await signInAsFixture(page);
  const parent = await addFixtureAccount(
    page,
    accountName,
    "credit",
    "C6 Bank",
  );
  expect(parent.institutionId).toBe("c6");
  const mine = await addFixturePurchaseCard(
    page,
    accountName,
    parent.id,
    "Mine",
    "4242",
  );
  const wife = await addFixturePurchaseCard(
    page,
    accountName,
    parent.id,
    "Wife",
    "5151",
  );
  expect(mine.id).not.toBe(wife.id);
  expect(mine.accountId).toBe(wife.accountId);
  await expect(
    page.getByRole("button", { name: `Cards for ${accountName}`, exact: true }),
  ).toContainText("2");
  const checking = await addFixtureAccount(
    page,
    checkingName,
    "checkout",
    "Inter",
  );

  await page.goto("/imports");
  await page.getByRole("button", { name: "Import file", exact: true }).click();
  await page.getByLabel("Drop a CSV here or choose a file").setInputFiles({
    name: "browser-shared-cards-combined.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      [
        "Date;Description;Installment;Amount;Card",
        `19/06/${year};${descriptions.mine};Single;60,00;4242`,
        `20/06/${year};${descriptions.wife};Single;40,00;5151`,
        `21/06/${year};${descriptions.mineRefund};Single;-10,00;4242`,
        `22/06/${year};${descriptions.wifeRefund};Single;-5,00;5151`,
        `23/06/${year};${descriptions.fallback};Single;20,00;`,
        `24/06/${year};${descriptions.unknown};Single;15,00;Unknown`,
      ].join("\n"),
    ),
  });
  const destination = page.getByRole("combobox", {
    name: "Destination account",
    exact: true,
  });
  if (!(await destination.textContent())?.includes(accountName)) {
    await destination.click();
    await page
      .getByRole("option", { name: `${accountName} (credit)`, exact: true })
      .click();
  }
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
  const validate = page.getByRole("button", {
    name: "Validate import",
    exact: true,
  });
  await expect(validate).toBeDisabled();
  await expect(
    page.getByRole("combobox", { name: "Card source column", exact: true }),
  ).toHaveText("5. Card");
  for (const [source, label] of [
    ["4242", "Mine · ••4242"],
    ["5151", "Wife · ••5151"],
    ["Unknown", "Not identified"],
  ]) {
    const mapping = page.getByRole("combobox", {
      name: `Card for source ${source}`,
      exact: true,
    });
    await expect(mapping).toHaveText("Choose a card...");
    await mapping.click();
    await page.getByRole("option", { name: label, exact: true }).click();
  }
  await page
    .getByRole("combobox", { name: "Card for this file", exact: true })
    .click();
  await page
    .getByRole("option", { name: "Mine · ••4242", exact: true })
    .click();
  await expect(page.getByLabel("Card attribution summary")).toContainText(
    "Mine · ••4242: 3 transactions",
  );
  await expect(page.getByLabel("Card attribution summary")).toContainText(
    "Wife · ••5151: 2 transactions",
  );
  await expect(page.getByLabel("Card attribution summary")).toContainText(
    "Not identified: 1 transaction",
  );
  await expect(validate).toBeEnabled();
  await validate.click();
  const imported = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname === "/imports" &&
      response.ok(),
  );
  await page
    .getByRole("button", { name: "Import 6 transactions", exact: true })
    .click();
  const importResponse = await imported;
  expect(await importResponse.request().headerValue("content-type")).toMatch(
    /^multipart\/form-data;/,
  );
  await expect(
    page.getByRole("button", { name: "Import file", exact: true }),
  ).toBeVisible();

  let detail = await openFixtureSharedBill(page, parent.id, dueMonth);
  expect(detail.bill).toMatchObject({
    accountId: parent.id,
    billMonth: dueMonth,
    transactionCount: 6,
    total: -120,
  });
  expect(
    detail.cardSummaries.find((summary) => summary.creditCard?.id === mine.id),
  ).toMatchObject({ transactionCount: 3, total: -70 });
  expect(
    detail.cardSummaries.find((summary) => summary.creditCard?.id === wife.id),
  ).toMatchObject({ transactionCount: 2, total: -35 });
  expect(
    detail.cardSummaries.find((summary) => summary.creditCard === null),
  ).toMatchObject({ transactionCount: 1, total: -15 });
  const unidentified = page.getByRole("button", {
    name: "Filter purchases by Not identified",
    exact: true,
  });
  await expect(unidentified).toContainText("1 purchase");
  await expect(unidentified).toContainText(/[−-]R\$\s*15,00/);
  await expectCompactTransactionList(page);
  await page
    .getByRole("button", { name: "Display options", exact: true })
    .click();
  const cardDisplay = page.getByRole("dialog", {
    name: "Display options",
    exact: true,
  });
  const showCard = cardDisplay.getByRole("button", {
    name: "Card",
    exact: true,
  });
  await expect(showCard).toHaveAttribute("aria-pressed", "true");
  await showCard.click();
  await expect(page.getByTestId("transaction-card")).toHaveCount(0);
  await showCard.click();
  await expect(page.getByTestId("transaction-card")).toHaveCount(6);
  await page.keyboard.press("Escape");

  await page.goto("/transactions");
  await page.getByRole("button", { name: /^New entry/ }).click();
  const create = page.getByRole("dialog", {
    name: "Create New Transaction",
    exact: true,
  });
  await create.getByRole("combobox", { name: "Account", exact: true }).click();
  await page.getByRole("option", { name: accountName, exact: true }).click();
  await create
    .getByRole("combobox", { name: "Purchase card", exact: true })
    .click();
  await page
    .getByRole("option", { name: "Wife · ••5151", exact: true })
    .click();
  await create.getByLabel("Date", { exact: true }).fill(`${year}-06-25`);
  await create
    .getByLabel("Description", { exact: true })
    .fill(descriptions.manual);
  await create.getByLabel("Value", { exact: true }).fill("-10");
  await create
    .getByRole("button", { name: "Bill due in", exact: true })
    .click();
  await page.getByRole("button", { name: `July ${year}`, exact: true }).click();
  await expect(
    create.getByRole("button", {
      name: "Include in monthly review",
      exact: true,
    }),
  ).toContainText(`June ${year}`);
  const manualCreated = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname === "/transactions" &&
      response.ok(),
  );
  await create
    .getByRole("button", { name: "Create Transaction", exact: true })
    .click();
  expect((await (await manualCreated).json()).creditCard.id).toBe(wife.id);
  await expect(create).toHaveCount(0);

  detail = await openFixtureSharedBill(page, parent.id, dueMonth);
  expect(detail.bill).toMatchObject({ transactionCount: 7, total: -130 });
  const ledger = page.getByRole("grid", { name: "Transactions", exact: true });
  const row = (description: string) =>
    ledger.getByRole("row").filter({ hasText: description });
  await row(descriptions.unknown).locator("button[data-list-open]").click();
  const transactionDetails = page.getByRole("dialog", {
    name: descriptions.unknown,
    exact: true,
  });
  await transactionDetails
    .getByRole("combobox", { name: "Change purchase card", exact: true })
    .click();
  const identified = page.waitForResponse(
    (response) =>
      response.request().method() === "PATCH" &&
      /^\/transactions\/\d+$/.test(new URL(response.url()).pathname) &&
      response.ok(),
  );
  await page
    .getByRole("option", { name: "Mine · ••4242", exact: true })
    .click();
  expect((await (await identified).json()).creditCard.id).toBe(mine.id);
  await expect(
    transactionDetails.getByRole("combobox", {
      name: "Change purchase card",
      exact: true,
    }),
  ).toContainText("Mine · ••4242");
  await expect(
    page.getByRole("dialog", { name: "Change purchase card", exact: true }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(transactionDetails).toHaveCount(0);
  await expect(
    row(descriptions.unknown).getByTestId("transaction-card"),
  ).toHaveText("Mine · ••4242");

  for (const description of [descriptions.fallback, descriptions.unknown]) {
    await row(description).hover();
    await row(description)
      .getByRole("checkbox", { name: "Select transaction", exact: true })
      .click();
  }
  const bar = page.getByRole("toolbar", {
    name: "Selected transaction actions",
    exact: true,
  });
  await expect(bar.getByText("2 selected", { exact: true })).toBeVisible();
  const bulkRequests: Array<{ creditCardId?: string | null }> = [];
  const captureCardUpdate = (response: Response) => {
    if (
      response.request().method() === "PATCH" &&
      /^\/transactions\/\d+$/.test(new URL(response.url()).pathname) &&
      response.ok()
    )
      bulkRequests.push(response.request().postDataJSON());
  };
  page.on("response", captureCardUpdate);
  await bar
    .getByRole("button", { name: "Card for selected purchases", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Card for selected purchases", exact: true })
    .getByRole("option", { name: "Wife · ••5151", exact: true })
    .click();
  await expect.poll(() => bulkRequests.length).toBe(2);
  page.off("response", captureCardUpdate);
  expect(
    bulkRequests.every((request) => request.creditCardId === wife.id),
  ).toBe(true);
  for (const description of [descriptions.fallback, descriptions.unknown])
    await expect(row(description).getByTestId("transaction-card")).toHaveText(
      "Wife · ••5151",
    );
  await bar.getByRole("button", { name: "Unselect all", exact: true }).click();
  await expect(bar).toHaveCount(0);

  await importMonthFixture(page, {
    name: "browser-shared-cards-payment.csv",
    accountName: checkingName,
    accountType: "checkout",
    rows: [`19/07/${year};${paymentDescription};-130,00`],
  });
  detail = await openFixtureSharedBill(page, parent.id, dueMonth);
  expect(detail.bill.total).toBe(-130);
  expect(
    detail.cardSummaries.find((summary) => summary.creditCard?.id === mine.id),
  ).toMatchObject({ transactionCount: 2, total: -50 });
  expect(
    detail.cardSummaries.find((summary) => summary.creditCard?.id === wife.id),
  ).toMatchObject({ transactionCount: 5, total: -80 });
  await expect(
    page.getByText(paymentDescription, { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reconcile", exact: true }).click();
  const reconciliation = page.getByRole("alertdialog", {
    name: "Reconcile this payment?",
    exact: true,
  });
  const reconciled = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname ===
        `/credit-card-bills/${parent.id}/${dueMonth}/reconciliation` &&
      response.ok(),
  );
  await reconciliation
    .getByRole("button", { name: "Reconcile payment", exact: true })
    .click();
  const linked = (await (await reconciled).json()) as FixtureSharedBill;
  expect(linked.bill).toMatchObject({
    accountId: parent.id,
    total: -130,
    status: "reconciled",
    payment: { accountId: checking.id, value: -130 },
  });
  await expect(
    page.getByText("Linked checking payment", { exact: true }),
  ).toBeVisible();
  const fullSummary = page.getByRole("region", {
    name: "Bill summary",
    exact: true,
  });
  const fullSummaryText = (await fullSummary.textContent()) ?? "";
  await page
    .getByRole("button", {
      name: "Filter purchases by Mine · ••4242",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("2 of 7 purchases", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Matching purchases total", { exact: true }),
  ).toContainText(/[−-]R\$\s*50,00/);
  await expect(fullSummary).toHaveText(fullSummaryText);
  await expect(
    page.getByText(paymentDescription, { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Filter purchases by Wife · ••5151",
      exact: true,
    }),
  ).toContainText(/[−-]R\$\s*80,00/);
  await expect(ledger).toHaveAttribute("aria-rowcount", "2");
  await expectCompactTransactionList(page);
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await expect(ledger).toHaveAttribute("aria-rowcount", "7");

  await page.goto("/bank-accounts");
  await page
    .getByRole("button", { name: `Cards for ${accountName}`, exact: true })
    .click();
  await page
    .getByRole("button", { name: "Actions for Wife", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Edit card", exact: true }).click();
  const edit = page.getByRole("dialog", { name: "Edit card", exact: true });
  await edit.getByLabel("Card nickname", { exact: true }).fill("Wife renewed");
  await edit
    .getByLabel("Last 4 digits (optional)", { exact: true })
    .fill("6161");
  const updatedCard = page.waitForResponse(
    (response) =>
      response.request().method() === "PATCH" &&
      new URL(response.url()).pathname === `/credit-cards/${wife.id}` &&
      response.ok(),
  );
  await edit.getByRole("button", { name: "Save card", exact: true }).click();
  expect(await (await updatedCard).json()).toMatchObject({
    id: wife.id,
    accountId: parent.id,
    name: "Wife renewed",
    last4: "6161",
  });
  await expect(edit).toHaveCount(0);
  await page.reload();
  await page
    .getByRole("button", { name: `Cards for ${accountName}`, exact: true })
    .click();
  await expect(
    page.getByRole("list", { name: `Cards on ${accountName}`, exact: true }),
  ).toContainText("Wife renewed · ••6161");
  await page
    .getByRole("button", { name: "Actions for Wife renewed", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Archive card", exact: true })
    .click();
  const archive = page.getByRole("alertdialog", {
    name: "Archive Wife renewed?",
    exact: true,
  });
  await expect(archive).toContainText(
    "Existing transaction links and the account's combined bill will be retained",
  );
  const archived = page.waitForResponse(
    (response) =>
      response.request().method() === "DELETE" &&
      new URL(response.url()).pathname === `/credit-cards/${wife.id}` &&
      response.ok(),
  );
  await archive
    .getByRole("button", { name: "Archive card", exact: true })
    .click();
  await archived;
  await expect(archive).toHaveCount(0);
  await page
    .getByRole("button", { name: "Show archived (1)", exact: true })
    .click();
  await expect(
    page.getByRole("list", { name: `Cards on ${accountName}`, exact: true }),
  ).toContainText("Wife renewed · ••6161Archived");

  detail = await openFixtureSharedBill(page, parent.id, dueMonth);
  expect(detail.bill).toMatchObject({
    total: -130,
    transactionCount: 7,
    status: "reconciled",
    payment: { accountId: checking.id, value: -130 },
  });
  expect(
    detail.transactions.filter(
      (transaction) => transaction.creditCard?.id === wife.id,
    ),
  ).toHaveLength(5);
  expect(
    detail.transactions
      .filter((transaction) => transaction.creditCard?.id === wife.id)
      .every(
        (transaction) =>
          transaction.creditCard?.archived &&
          transaction.creditCard.name === "Wife renewed" &&
          transaction.creditCard.last4 === "6161",
      ),
  ).toBe(true);
  await expect(
    page.getByRole("button", {
      name: "Filter purchases by Wife renewed · ••6161",
      exact: true,
    }),
  ).toContainText("Archived");
  await expect(
    row(descriptions.wife).getByTestId("transaction-card"),
  ).toContainText("Wife renewed · ••6161");
  await expect(
    row(descriptions.wife).getByTestId("transaction-card"),
  ).toContainText("Archived");
  await expectCompactTransactionList(page);
  await page.mouse.move(0, 0);
  const purchaseDescription = row(descriptions.wife).getByTestId(
    "transaction-description",
  );
  await expect(purchaseDescription).toHaveCSS("color", "rgb(36, 36, 43)");
  await expectFiniteAnimationsSettled(page);
  await page.screenshot({
    path: "test-results/shared-cards-light.png",
    fullPage: true,
  });
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await expect(page.locator("body")).toHaveCSS("color", "rgb(236, 236, 241)");
  await expect(purchaseDescription).toHaveCSS("color", "rgb(236, 236, 241)");
  await expect(row(descriptions.wife)).toHaveCSS(
    "background-color",
    "rgb(18, 18, 18)",
  );
  await expectFiniteAnimationsSettled(page);
  await expect(
    row(descriptions.wife).getByTestId("transaction-card"),
  ).toBeVisible();
  const darkMetadata = await row(descriptions.wife)
    .getByTestId("transaction-card")
    .evaluate((element) => {
      const label = element.querySelector("span span") ?? element;
      return {
        fontSize: getComputedStyle(element).fontSize,
        color: getComputedStyle(element).color,
        labelWhitespace: getComputedStyle(label).whiteSpace,
      };
    });
  expect(darkMetadata.fontSize).toBe("12px");
  expect(darkMetadata.color).not.toBe("rgba(0, 0, 0, 0)");
  expect(darkMetadata.labelWhitespace).toBe("nowrap");
  await page.screenshot({
    path: "test-results/shared-cards-dark.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expectCompactTransactionList(page);
  await expect(
    row(descriptions.wife).getByTestId("transaction-card"),
  ).toBeVisible();
  const mobileWidth = await page.evaluate(() => ({
    content: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(mobileWidth.content).toBeLessThanOrEqual(mobileWidth.viewport);
  await expect(purchaseDescription).toHaveCSS("color", "rgb(236, 236, 241)");
  await expectFiniteAnimationsSettled(page);
  await page.screenshot({
    path: "test-results/shared-cards-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.evaluate(() => document.documentElement.classList.remove("dark"));

  await page.goto("/transactions");
  await page.getByRole("button", { name: /^New entry/ }).click();
  await create.getByRole("combobox", { name: "Account", exact: true }).click();
  await page.getByRole("option", { name: accountName, exact: true }).click();
  await create
    .getByRole("combobox", { name: "Purchase card", exact: true })
    .click();
  const availableOptions = page.getByRole("dialog", {
    name: "Purchase card",
    exact: true,
  });
  await expect(
    availableOptions.getByRole("option", {
      name: "Wife renewed · ••6161",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    availableOptions.getByRole("option", {
      name: "Mine · ••4242",
      exact: true,
    }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(availableOptions).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(create).toHaveCount(0);
  await page
    .getByRole("button", { name: "Monthly review", exact: true })
    .click();
  await selectReviewMonth(page, `${year}-07`);
  await page
    .getByRole("button", { name: "Display options", exact: true })
    .click();
  const display = page.getByRole("dialog", {
    name: "Display options",
    exact: true,
  });
  await expectPopupSettled(display);
  const inline = display.getByRole("switch", {
    name: "Inline credit card transactions",
    exact: true,
  });
  if ((await inline.getAttribute("aria-checked")) === "true")
    await inline.click();
  await expect(inline).toHaveAttribute("aria-checked", "false");
  await page.keyboard.press("Escape");
  await expect(display).toHaveCount(0);
  await page.getByRole("button", { name: "Cash flow", exact: true }).click();
  const accountFilter = await openFilterProperty(page, "Bank account");
  await accountFilter
    .getByRole("checkbox", { name: accountName, exact: true })
    .check();
  await accountFilter
    .getByRole("checkbox", { name: checkingName, exact: true })
    .check();
  await closeTransactionFilters(page);
  await expect(ledger).toHaveAttribute("aria-rowcount", "1");
  await expect(page.getByText(paymentDescription, { exact: true })).toHaveCount(
    0,
  );
  const cardFilter = await openFilterProperty(page, "Card");
  const filteredBillResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      response.request().method() === "GET" &&
      url.pathname === "/credit-card-bills" &&
      url.searchParams.getAll("creditCardIdList").includes(mine.id) &&
      response.ok()
    );
  });
  await cardFilter
    .getByRole("checkbox", {
      name: `Mine · ••4242 (${accountName})`,
      exact: true,
    })
    .check();
  await closeTransactionFilters(page);
  const filteredBills = (await (await filteredBillResponse).json()) as Array<{
    accountId: string;
    total: number;
    matchingTransactionCount: number;
    matchingTotal: number;
    payment: { value: number } | null;
    status: string;
  }>;
  expect(filteredBills.filter((bill) => bill.accountId === parent.id)).toEqual([
    expect.objectContaining({
      accountId: parent.id,
      total: -130,
      matchingTransactionCount: 2,
      matchingTotal: -50,
      status: "reconciled",
      payment: expect.objectContaining({ value: -130 }),
    }),
  ]);
  const billRows = page.getByTestId("credit-card-bill-row");
  await expect(billRows).toHaveCount(1);
  await expect(billRows.first()).toContainText(`${accountName} bill`);
  await expect(
    billRows.first().locator('[data-column="value"] [data-field-value]'),
  ).toHaveText(/[−-]R\$\s*130,00/);
  await expect(ledger).toHaveAttribute("aria-rowcount", "1");
  await expect(page.getByText(paymentDescription, { exact: true })).toHaveCount(
    0,
  );
  await expectCompactTransactionList(page);
  expect(browserErrors).toEqual([]);
});
