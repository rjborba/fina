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
    cardName: string | null;
    cardLast4: string | null;
  }>;
  cardSummaries: Array<{
    cardName: string | null;
    cardLast4: string | null;
    transactionCount: number;
    total: number;
  }>;
};

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
    await page
      .getByRole("button", { name: "Bill due in", exact: true })
      .click();
    await page.getByRole("button", { name: label, exact: true }).click();
    await expect(
      page.getByRole("button", { name: label, exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", {
        name: "Include in monthly review",
        exact: true,
      }),
    ).toHaveCount(0);
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

async function expectCompactTransactionList(
  page: Page,
  categoryVisible = true,
) {
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
    ledger.locator('[data-inline-metadata="account-icon"]'),
  ).toHaveCount(0);
  if (!categoryVisible) {
    await expect(ledger.locator('[data-metadata-slot="category"]')).toHaveCount(
      0,
    );
    await expect(ledger.locator("[data-category-dot]")).toHaveCount(0);
    await expect(ledger.getByRole("combobox")).toHaveCount(0);
  }
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
      const transactionField = row.querySelector(
        '[data-column="transaction"]',
      )!;
      const descriptionRange = document.createRange();
      if (description) descriptionRange.selectNodeContents(description);
      const tracks = Array.from(
        row.querySelectorAll(
          '[data-metadata-slot], [data-column="date"], [data-column="value"]',
        ),
      ).map((field) => {
        const fieldBounds = field.getBoundingClientRect();
        const name =
          field.getAttribute("data-metadata-slot") ??
          field.getAttribute("data-column");
        const categoryTrigger = field.querySelector('[role="combobox"]');
        const content =
          name === "card"
            ? field.querySelector(
                '[data-testid="transaction-card"] > span > :last-child',
              )
            : name === "category"
              ? categoryTrigger?.querySelector("[data-category-chip]")
              : name === "value"
                ? field.querySelector("[data-field-value]")
                : field.firstElementChild;
        let contentRight = content?.getBoundingClientRect().right;
        if (name === "installment" && content) {
          const range = document.createRange();
          range.selectNodeContents(content);
          contentRight = range.getBoundingClientRect().right;
        }
        const categoryDot = content?.querySelector("[data-category-dot]");
        return {
          name,
          x: fieldBounds.left - bounds.left,
          width: fieldBounds.width,
          visible:
            getComputedStyle(field).display !== "none" && fieldBounds.width > 0,
          empty: field.getAttribute("data-empty") === "true",
          ariaHidden: field.getAttribute("aria-hidden"),
          controls: field.querySelectorAll(
            "button, a[href], input, select, textarea, [tabindex]",
          ).length,
          categoryBlank:
            name === "category" && categoryTrigger !== null && !content,
          categoryLabel: categoryTrigger?.getAttribute("aria-label"),
          categoryText: categoryTrigger?.textContent,
          contentEndGap:
            contentRight === undefined
              ? null
              : fieldBounds.right - contentRight,
          expectedContentEndGap: 0,
          categoryChip:
            name === "category" && content
              ? {
                  height: content.getBoundingClientRect().height,
                  radius: getComputedStyle(content).borderRadius,
                  border: getComputedStyle(content).borderRightWidth,
                  placeholder: content.hasAttribute(
                    "data-category-placeholder",
                  ),
                  muted: content.classList.contains("text-foreground/35"),
                  truncated:
                    (content.querySelector(".truncate")?.scrollWidth ?? 0) >
                    (content.querySelector(".truncate")?.clientWidth ?? 0),
                  dotWidth: categoryDot?.getBoundingClientRect().width,
                  dotHeight: categoryDot?.getBoundingClientRect().height,
                  dotRadius: categoryDot
                    ? getComputedStyle(categoryDot).borderRadius
                    : null,
                  svgCount: content.querySelectorAll("svg").length,
                }
              : null,
          accountChip:
            name === "account" && content
              ? {
                  height: content.getBoundingClientRect().height,
                  border: getComputedStyle(content).borderRightWidth,
                  radius: getComputedStyle(content).borderRadius,
                  logoWidth:
                    content.firstElementChild?.getBoundingClientRect().width,
                  role: content.getAttribute("role"),
                  text: content.textContent,
                }
              : null,
        };
      });
      return {
        rowIndex: Number(row.getAttribute("aria-rowindex")),
        gridcellDisplay: gridcell ? getComputedStyle(gridcell).display : null,
        columnGap: gridcell ? getComputedStyle(gridcell).columnGap : null,
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
        descriptionTextWidth: descriptionRange.getBoundingClientRect().width,
        descriptionWhitespace: descriptionStyle?.whiteSpace ?? "nowrap",
        descriptionTextAlign: descriptionStyle?.textAlign,
        descriptionTextStart:
          description && descriptionStyle
            ? descriptionRange.getBoundingClientRect().left -
              description.getBoundingClientRect().left -
              Number.parseFloat(descriptionStyle.paddingLeft) -
              Number.parseFloat(descriptionStyle.borderLeftWidth)
            : null,
        transactionRight:
          transactionField.getBoundingClientRect().right - bounds.left,
        metadataGridCount: row.querySelectorAll(".transaction-metadata-grid")
          .length,
        metadataDisplay: metadataStyle?.display ?? null,
        metadataGap: metadataStyle?.columnGap ?? null,
        metadataColumns: metadataStyle?.gridTemplateColumns ?? null,
        metadataCursors: Array.from(
          row.querySelectorAll('[data-transaction-metadata="true"]'),
        ).map((element) => getComputedStyle(element).cursor),
        inlineIcons: Array.from(
          row.querySelectorAll("[data-inline-metadata]"),
        ).map((element, index, icons) => {
          const iconBounds = element.getBoundingClientRect();
          const previous = index > 0 ? icons[index - 1] : description!;
          return {
            name: element.getAttribute("data-inline-metadata"),
            width: iconBounds.width,
            gap: iconBounds.left - previous.getBoundingClientRect().right,
            endSpace:
              element
                .closest('[data-metadata-slot="description"]')!
                .getBoundingClientRect().right - iconBounds.right,
          };
        }),
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
    expect(measurement.columnGap).toBe("8px");
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
    expect(measurement.descriptionWidth).toBeGreaterThanOrEqual(
      Math.min(48, measurement.descriptionTextWidth),
    );
    expect(measurement.descriptionLines).toBeLessThanOrEqual(1.05);
    expect(measurement.descriptionTextAlign).toBe("left");
    expect(measurement.descriptionTextStart).toBeCloseTo(0, 1);
    expect(measurement.metadataGridCount).toBe(1);
    expect(measurement.metadataDisplay).toBe("grid");
    expect(measurement.metadataGap).toBe("8px");
    expect(measurement.metadataColumns).not.toBe("none");
    expect(measurement.metadataColumns).toBe(measurements[0].metadataColumns);
    expect(
      measurement.metadataCursors.every((cursor) => cursor === "default"),
    ).toBe(true);
    const inlineOrder = ["import", "card-icon"];
    expect(measurement.inlineIcons.map((icon) => icon.name)).toEqual(
      inlineOrder.filter((name) =>
        measurement.inlineIcons.some((icon) => icon.name === name),
      ),
    );
    for (const icon of measurement.inlineIcons) {
      expect(icon.width).toBe(14);
      expect(
        icon.gap,
        `${icon.name} follows description or previous icon`,
      ).toBeCloseTo(6, 1);
      expect(icon.endSpace).toBeGreaterThanOrEqual(-0.1);
    }
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
      if (track.name === "account") expect(track.width).toBe(128);
      if (track.accountChip) {
        expect(track.accountChip.height).toBe(24);
        expect(track.accountChip.border).toBe("1px");
        expect(
          Number.parseFloat(track.accountChip.radius),
        ).toBeGreaterThanOrEqual(12);
        expect(track.accountChip.logoWidth).toBe(14);
        expect(track.accountChip.role).toBe("group");
        expect(track.accountChip.text?.trim().length).toBeGreaterThan(0);
      }
      if (track.name === "card") expect(track.width).toBe(144);
      if (track.name === "card-number") expect(track.width).toBe(56);
      if (track.name === "date") expect(track.width).toBe(80);
      if (track.name === "category") expect(track.width).toBe(112);
      if (track.name === "value") expect(track.width).toBe(132);
      if (track.name === "installment") expect(track.width).toBe(40);
      if (track.categoryChip) {
        expect(track.categoryChip.height).toBe(24);
        expect(
          Number.parseFloat(track.categoryChip.radius),
        ).toBeGreaterThanOrEqual(12);
        expect(track.categoryChip.border).toBe("1px");
        if (track.categoryChip.placeholder) {
          expect(track.categoryText).toBe("Uncategorized");
          expect(track.categoryLabel).toMatch(/^Change category for /);
          expect(track.categoryChip.muted).toBe(true);
          expect(track.categoryChip.truncated).toBe(false);
          expect(track.categoryChip.dotWidth).toBeUndefined();
          expect(track.controls).toBeGreaterThan(0);
        } else {
          expect(track.categoryChip.dotWidth).toBe(8);
          expect(track.categoryChip.dotHeight).toBe(8);
          expect(
            Number.parseFloat(track.categoryChip.dotRadius!),
          ).toBeGreaterThanOrEqual(4);
        }
        expect(track.categoryChip.svgCount).toBe(0);
      }
      if (
        track.name !== "description" &&
        track.name !== "date" &&
        !track.empty &&
        !track.categoryBlank
      ) {
        expect(
          track.contentEndGap,
          `${track.name} rendered end`,
        ).not.toBeNull();
        expect(track.contentEndGap, `${track.name} rendered end`).toBeCloseTo(
          track.expectedContentEndGap,
          1,
        );
      }
      if (track.categoryBlank) {
        expect(track.categoryText).toBe("");
        expect(track.categoryLabel).toMatch(/^Change category for /);
        expect(track.controls).toBeGreaterThan(0);
      }
    }
    const metadataTracks = visibleTracks.filter(
      (track) => !["description", "date", "value"].includes(track.name!),
    );
    const lastMetadataTrack = metadataTracks.at(-1);
    if (lastMetadataTrack)
      expect(lastMetadataTrack.x + lastMetadataTrack.width).toBeCloseTo(
        measurement.transactionRight,
        2,
      );
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
  await expect(
    page.getByRole("button", {
      name: "Include in monthly review",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.screenshot({
    path: "test-results/import-bill-due-month-only.png",
    fullPage: true,
  });
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
  const commentedPurchase = page
    .getByRole("row")
    .filter({ hasText: "Fixture groceries" });
  await commentedPurchase
    .getByRole("button", { name: "Add transaction note" })
    .click();
  const noteDialog = page.getByRole("dialog", {
    name: "Transaction note",
    exact: true,
  });
  await noteDialog
    .getByRole("textbox", { name: "Transaction note" })
    .fill("Check this charge");
  await noteDialog.getByRole("button", { name: "Save note" }).click();
  await expect(noteDialog).toHaveCount(0);
  await expect(commentedPurchase).toHaveAttribute("data-flagged", "true");
  await commentedPurchase.locator('[data-column="date"]').hover();
  await expect(page.getByRole("tooltip")).toHaveText("Check this charge");
  await page.locator(".transactions-list-shell").focus();
  await page.mouse.move(0, 0);
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await page.reload();
  await commentedPurchase
    .getByRole("button", { name: "Edit transaction note" })
    .click();
  await expect(
    noteDialog.getByRole("textbox", { name: "Transaction note" }),
  ).toHaveValue("Check this charge");
  await noteDialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await commentedPurchase
    .getByRole("button", { name: "Open transaction: Fixture groceries" })
    .click();
  const purchaseDetails = page.getByRole("dialog", {
    name: "Fixture groceries",
    exact: true,
  });
  await expect(
    purchaseDetails.getByText("Check this charge", { exact: true }),
  ).toBeVisible();
  await purchaseDetails
    .getByRole("button", { name: "Edit note", exact: true })
    .click();
  await purchaseDetails
    .getByRole("textbox", { name: "Transaction note" })
    .fill("Updated in details");
  await purchaseDetails.getByRole("button", { name: "Save note" }).click();
  await expect(
    purchaseDetails.getByText("Updated in details", { exact: true }),
  ).toBeVisible();
  await purchaseDetails
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await commentedPurchase
    .getByRole("button", { name: "Edit transaction note" })
    .click();
  await expect(
    noteDialog.getByRole("textbox", { name: "Transaction note" }),
  ).toHaveValue("Updated in details");
  await expectFiniteAnimationsSettled(page);
  await page.screenshot({ path: "test-results/transaction-note-dialog.png" });
  await noteDialog.getByRole("button", { name: "Remove comment" }).click();
  await expect(noteDialog).toHaveCount(0);
  await expect(commentedPurchase).not.toHaveAttribute("data-flagged", "true");

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
    "Card name",
    "Card number",
    "Category",
    "Installment",
    "Amount",
  ];
  for (const name of displayPropertyNames) {
    const property = display.getByRole("button", { name, exact: true });
    if ((await property.getAttribute("aria-pressed")) === "true")
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
  await expect(
    restoredLedger.locator('[data-transaction-metadata="true"]'),
  ).toHaveCount(10);
  await expect(restoredLedger.getByTestId("transaction-account")).toHaveCount(
    0,
  );
  await expectCompactTransactionList(page, false);
  for (const slot of [
    "account",
    "card",
    "card-number",
    "installment",
    "category",
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

  await page
    .getByRole("button", { name: "Display options", exact: true })
    .click();
  const amountProperty = display.getByRole("button", {
    name: "Amount",
    exact: true,
  });
  await amountProperty.click();
  await expect(amountProperty).toHaveAttribute("aria-pressed", "false");
  await page.keyboard.press("Escape");
  await expect(display).toHaveCount(0);
  await expect(restoredLedger.locator('[data-column="value"]')).toHaveCount(0);
  const [amountHiddenLayout] = await expectCompactTransactionList(page);
  await expectFiniteAnimationsSettled(page);
  await page.screenshot({
    path: "test-results/transactions-end-aligned-amount-hidden.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 720 });
  await expectFiniteAnimationsSettled(page);
  const [widerLayout] = await expectCompactTransactionList(page);
  const descriptionTrack = amountHiddenLayout.tracks.find(
    (track) => track.name === "description",
  )!;
  const widerDescriptionTrack = widerLayout.tracks.find(
    (track) => track.name === "description",
  )!;
  expect(widerDescriptionTrack.x).toBeCloseTo(descriptionTrack.x, 2);
  expect(widerDescriptionTrack.width).toBeGreaterThan(descriptionTrack.width);
  for (const track of amountHiddenLayout.tracks.filter(
    (track) =>
      track.visible && !["description", "date", "value"].includes(track.name!),
  )) {
    const widerTrack = widerLayout.tracks.find(
      (candidate) => candidate.name === track.name,
    )!;
    expect(
      widerLayout.transactionRight - widerTrack.x - widerTrack.width,
    ).toBeCloseTo(
      amountHiddenLayout.transactionRight - track.x - track.width,
      2,
    );
  }
  await page.setViewportSize({ width: 1280, height: 720 });
  await page
    .getByRole("button", { name: "Display options", exact: true })
    .click();
  await amountProperty.click();
  await expect(amountProperty).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");
  await expect(display).toHaveCount(0);
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
  await expect(blankInstallment).toHaveCSS("width", "40px");
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
  await expect(page.getByRole("textbox", { name: "Account name" })).toHaveValue(
    "",
  );
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
      month: `${year}-${String(Number(month) + 1).padStart(2, "0")}`,
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
    month: `${year}-07`,
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
  for (const slot of ["import", "card-icon"])
    await expect(
      manualCheckingRow.locator(`[data-inline-metadata="${slot}"]`),
    ).toHaveCount(0);
  const importedCreditRow = ledger
    .getByRole("row")
    .filter({ hasText: "Filter fixture card expense" });
  await expect(
    importedCreditRow.locator('[data-inline-metadata="import"]'),
  ).toBeVisible();
  await expect(
    importedCreditRow.locator('[data-inline-metadata="card-icon"]'),
  ).toBeVisible();
  await expect(
    importedCreditRow.getByRole("img", {
      name: "Credit card: Not identified",
      exact: true,
    }),
  ).toBeVisible();
  await expect(importedCreditRow.getByTestId("transaction-card")).toHaveText(
    "Not identified",
  );
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
  await expect(bill.locator('[data-inline-metadata="import"]')).toHaveCount(0);
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
    rows: [`30/06/${year};${paymentDescription};-100,00`],
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
    month: `${year}-07`,
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
  const accountProperty = display.getByRole("button", {
    name: "Account",
    exact: true,
  });
  await expect(accountProperty).toHaveAttribute("aria-pressed", "false");
  await accountProperty.click();
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
    new RegExp(`/credit-card-bills/${card.id}/${year}-07$`),
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
  await billRow.getByTestId("transaction-account").scrollIntoViewIfNeeded();
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
  await expect(
    page.getByRole("radiogroup", { name: "Category icon", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("radio", { name: "Coral", exact: true }).click();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("radio", { name: "Amber", exact: true }),
  ).toBeChecked();
  await page.keyboard.press("ArrowLeft");
  await expect(
    page.getByRole("radio", { name: "Coral", exact: true }),
  ).toBeChecked();
  const categoryPreview = page.getByLabel("Category preview", { exact: true });
  await expect(categoryPreview).toHaveText(categoryName);
  await expect(categoryPreview.locator("[data-category-dot]")).toHaveClass(
    /bg-red-500/,
  );
  await expect(categoryPreview.locator("svg")).toHaveCount(0);
  await page.screenshot({
    path: "test-results/category-dot-chip-creation.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Add category", exact: true }).click();
  const categoryRegistry = page.getByRole("region", {
    name: "Existing categories",
    exact: true,
  });
  const savedCategory = categoryRegistry
    .locator("[data-category-chip]")
    .filter({ hasText: categoryName });
  await expect(savedCategory).toBeVisible();
  await expect(savedCategory.locator("[data-category-dot]")).toHaveClass(
    /bg-red-500/,
  );
  await page
    .getByRole("button", {
      name: `Edit ${categoryName} appearance`,
      exact: true,
    })
    .click();
  const appearanceEditor = page.getByRole("dialog");
  await expect(
    appearanceEditor.getByRole("radiogroup", {
      name: "Category icon",
      exact: true,
    }),
  ).toHaveCount(0);
  await appearanceEditor
    .getByRole("radio", { name: "Amber", exact: true })
    .click();
  await appearanceEditor
    .getByRole("button", { name: "Save appearance", exact: true })
    .click();
  await expect(appearanceEditor).toHaveCount(0);
  await expect(savedCategory.locator("[data-category-dot]")).toHaveClass(
    /bg-amber-400/,
  );
  await page.reload();
  await expect(savedCategory.locator("[data-category-dot]")).toHaveClass(
    /bg-amber-400/,
  );
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
    month: `${year}-07`,
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

  const categoryPlaceholder = row(descriptions[0]).getByRole("combobox");
  await expect(categoryPlaceholder).toHaveText("Uncategorized");
  await categoryPlaceholder.click();
  const categoryAssigned = page.waitForResponse(
    (response) =>
      response.request().method() === "PATCH" &&
      /^\/transactions\/\d+$/.test(new URL(response.url()).pathname) &&
      response.ok(),
  );
  await page.getByRole("option", { name: categoryName, exact: true }).click();
  await categoryAssigned;
  await expect(categoryPlaceholder).toHaveText(categoryName);
  await categoryPlaceholder.click();
  const categoryCleared = page.waitForResponse(
    (response) =>
      response.request().method() === "PATCH" &&
      /^\/transactions\/\d+$/.test(new URL(response.url()).pathname) &&
      response.ok(),
  );
  await page
    .getByRole("option", { name: "Uncategorized", exact: true })
    .click();
  await categoryCleared;
  await expect(categoryPlaceholder).toHaveText("Uncategorized");
  await expect(
    categoryPlaceholder.locator("[data-category-placeholder]"),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(bar.getByText("2 selected", { exact: true })).toBeVisible();

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
  await expectCompactTransactionList(page);
  await page.screenshot({
    path: "test-results/transaction-category-chips-light.png",
    fullPage: true,
  });
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await expectCompactTransactionList(page);
  await page.screenshot({
    path: "test-results/transaction-category-chips-dark.png",
    fullPage: true,
  });
  await page.evaluate(() => document.documentElement.classList.remove("dark"));
  await page
    .getByRole("button", { name: "Display options", exact: true })
    .click();
  const categoryProperty = display.getByRole("button", {
    name: "Category",
    exact: true,
  });
  await expect(categoryProperty).toHaveAttribute("aria-pressed", "true");
  await categoryProperty.click();
  await page.keyboard.press("Escape");
  await expectCompactTransactionList(page, false);
  await expect(bar.getByText("2 selected", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Display options", exact: true })
    .click();
  await categoryProperty.click();
  await page.keyboard.press("Escape");
  await expectCompactTransactionList(page);
  await expect(row(descriptions[2]).getByRole("combobox")).toContainText(
    categoryName,
  );

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

test("imports three C6 card labels directly and preserves transaction metadata, display choices, and one shared bill", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const year = new Date().getFullYear();
  const accountName = "Direct metadata fixture C6";
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.name));
  await signInAsFixture(page);
  const parent = await addFixtureAccount(
    page,
    accountName,
    "credit",
    "C6 Bank",
  );
  await expect(
    page.getByRole("button", { name: /Cards for|Add card to/ }),
  ).toHaveCount(0);
  await page.goto("/imports");
  await page.getByRole("button", { name: "Import file", exact: true }).click();
  await page.getByLabel("Drop a CSV here or choose a file").setInputFiles({
    name: "browser-direct-card-metadata.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      [
        "Date;Description;Installment;Amount;Card name;Last4",
        `19/06/${year};Metadata Personal purchase;Single;-60,00;Personal;0042`,
        `20/06/${year};Metadata Family purchase;Single;-40,00;Family;**** 5151`,
        `21/06/${year};Metadata Virtual purchase;Single;-20,00;Virtual;6161`,
        `22/06/${year};Metadata Personal refund;Single;10,00;Personal;0042`,
        `23/06/${year};Metadata unknown purchase;Single;-15,00;;`,
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
    page.getByText("Identify cards in this statement", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("combobox", { name: "Card for this file", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /^Edit Card name mapping/ }),
  ).toHaveAttribute("aria-label", "Edit Card name mapping. Card name");
  await expect(
    page.getByRole("button", { name: /^Edit Card number mapping/ }),
  ).toHaveAttribute("aria-label", "Edit Card number mapping. Last4");
  await expect(
    page.getByRole("button", { name: `July ${year}`, exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("columnheader", { name: /Card number/ })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "test-results/card-metadata-import.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Validate import", exact: true })
    .click();
  const imported = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname === "/imports" &&
      response.ok(),
  );
  await page
    .getByRole("button", { name: "Import 5 transactions", exact: true })
    .click();
  await imported;
  let detail = await openFixtureSharedBill(page, parent.id, `${year}-07`);
  expect(detail.bill).toMatchObject({
    accountId: parent.id,
    transactionCount: 5,
    total: -125,
  });
  expect(detail.cardSummaries).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        cardName: "Personal",
        cardLast4: "0042",
        transactionCount: 2,
        total: -50,
      }),
      expect.objectContaining({
        cardName: "Family",
        cardLast4: "5151",
        transactionCount: 1,
        total: -40,
      }),
      expect.objectContaining({
        cardName: "Virtual",
        cardLast4: "6161",
        transactionCount: 1,
        total: -20,
      }),
      expect.objectContaining({
        cardName: null,
        cardLast4: null,
        transactionCount: 1,
        total: -15,
      }),
    ]),
  );
  await expect(page.getByTestId("transaction-card")).toHaveCount(5);
  await expect(page.getByTestId("transaction-card-number")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Display options", exact: true })
    .click();
  const display = page.getByRole("dialog", {
    name: "Display options",
    exact: true,
  });
  await display.getByRole("button", { name: "Card name", exact: true }).click();
  await expect(page.getByTestId("transaction-card")).toHaveCount(0);
  await expect(
    page.locator('[data-inline-metadata="card-icon"] [role="img"]'),
  ).toHaveCount(5);
  await display
    .getByRole("button", { name: "Card number", exact: true })
    .click();
  await expect(page.getByTestId("transaction-card-number")).toHaveCount(4);
  await display.getByRole("button", { name: "Card name", exact: true }).click();
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", {
      name: "Filter purchases by Family · ••5151",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Open transaction: Metadata Family purchase",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByTestId("transaction-card")).toHaveCount(1);
  await page
    .getByRole("button", {
      name: "Filter purchases by Family · ••5151",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", {
      name: "Open transaction: Metadata Family purchase",
      exact: true,
    })
    .click();
  const modal = page.getByRole("dialog", {
    name: "Metadata Family purchase",
    exact: true,
  });
  await expect(
    modal.getByText("Family · ••5151", { exact: true }),
  ).toBeVisible();
  await expect(modal.getByLabel("Card name", { exact: true })).toHaveCount(0);
  await expect(modal.getByText("Considered", { exact: true })).toHaveCount(0);
  await expect(modal.getByText("Calculated", { exact: true })).toHaveCount(0);
  await expect(
    modal.getByText("Transaction date", { exact: true }),
  ).toHaveCount(1);
  await expectFiniteAnimationsSettled(page);
  await page.screenshot({
    path: "test-results/transaction-details-light.png",
  });
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await expect(modal).toHaveCSS("color", "rgb(236, 236, 241)");
  await page.screenshot({
    path: "test-results/transaction-details-dark.png",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    modal.getByRole("button", { name: "Uncategorized", exact: false }),
  ).toBeVisible();
  expect(
    await modal.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  await expectFiniteAnimationsSettled(page);
  const modalBounds = await modal.boundingBox();
  expect(modalBounds!.x).toBeGreaterThanOrEqual(0);
  expect(modalBounds!.x + modalBounds!.width).toBeLessThanOrEqual(391);
  await page.screenshot({
    path: "test-results/transaction-details-mobile.png",
  });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.evaluate(() => document.documentElement.classList.remove("dark"));
  await page.keyboard.press("Escape");
  detail = await openFixtureSharedBill(page, parent.id, `${year}-07`);
  expect(
    detail.transactions.find(
      (purchase) => purchase.description === "Metadata Family purchase",
    ),
  ).toMatchObject({ cardName: "Family", cardLast4: "5151" });
  expect(detail.bill.total).toBe(-125);
  await expect(
    page.getByTestId("transaction-card-number").filter({ hasText: "••5151" }),
  ).toHaveCount(1);
  await expectCompactTransactionList(page);
  await page.screenshot({
    path: "test-results/card-metadata-light.png",
    fullPage: true,
  });
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await page.screenshot({
    path: "test-results/card-metadata-dark.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expectCompactTransactionList(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/card-metadata-mobile.png",
    fullPage: true,
  });
  expect(browserErrors).toEqual([]);
});

test("saves a C6 column mapping and automatically reuses it across statements and C6 credit accounts", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const year = new Date().getFullYear();
  const primaryName = "Saved mapping fixture C6 personal";
  const sharedName = "Saved mapping fixture C6 shared";
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.name));
  await signInAsFixture(page);
  const primary = await addFixtureAccount(
    page,
    primaryName,
    "credit",
    "C6 Bank",
  );
  const shared = await addFixtureAccount(page, sharedName, "credit", "C6 Bank");

  const openStatement = async (month: number) => {
    await page.goto("/imports");
    await page
      .getByRole("button", { name: "Import file", exact: true })
      .click();
    const profileQuery = page.waitForResponse(
      (response) =>
        response.request().method() === "GET" &&
        new URL(response.url()).pathname === "/imports/profiles" &&
        response.ok(),
    );
    const period = month.toString().padStart(2, "0");
    await page.getByLabel("Drop a CSV here or choose a file").setInputFiles({
      name: `browser-saved-c6-${period}.csv`,
      mimeType: "text/csv",
      buffer: Buffer.from(
        [
          "Date;Description;Installment;Amount;Plastic label;Suffix",
          `13/${period}/${year};Saved mapping personal;Single;60,00;Personal;0042`,
          `14/${period}/${year};Saved mapping family;Single;40,00;Family;5151`,
          `15/${period}/${year};Saved mapping refund;Single;-5,00;Personal;0042`,
        ].join("\n"),
      ),
    });
    return (await (await profileQuery).json()) as {
      accountId: string;
      config: {
        cardNameColumn: number;
        cardLast4Column: number;
        chargesPositive: boolean;
      };
    }[];
  };
  const selectAccount = async (name: string) => {
    const destination = page.getByRole("combobox", {
      name: "Destination account",
      exact: true,
    });
    await expect(destination).toBeVisible();
    if (!(await destination.textContent())?.includes(name)) {
      await destination.click();
      await page
        .getByRole("option", { name: `${name} (credit)`, exact: true })
        .click();
    }
  };
  const confirmStatement = async (monthLabel: string) => {
    await page
      .getByRole("button", { name: "Bill due in", exact: true })
      .click();
    await page.getByRole("button", { name: monthLabel, exact: true }).click();
    await page
      .getByRole("button", { name: "Validate import", exact: true })
      .click();
    const imported = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/imports" &&
        response.ok(),
    );
    await page
      .getByRole("button", { name: "Import 3 transactions", exact: true })
      .click();
    await imported;
    await expect(
      page.getByRole("dialog", { name: "Review and import" }),
    ).toHaveCount(0);
  };

  expect(await openStatement(6)).toEqual([]);
  await selectAccount(primaryName);
  for (const [field, source] of [
    ["Card name", "Plastic label"],
    ["Card number", "Suffix"],
  ]) {
    await page
      .getByRole("button", { name: new RegExp(`^Edit ${field} mapping`) })
      .click();
    await page
      .getByRole("combobox", { name: `${field} source column`, exact: true })
      .click();
    await page.getByRole("option", { name: new RegExp(`${source}$`) }).click();
    await page.keyboard.press("Escape");
  }
  await page
    .getByRole("button", { name: "Edit Amount mapping. Amount", exact: true })
    .click();
  await page.getByRole("checkbox", { name: /^Invert amount signs/ }).check();
  await page.keyboard.press("Escape");
  await confirmStatement(`July ${year}`);
  const originalBill = await openFixtureSharedBill(
    page,
    primary.id,
    `${year}-07`,
  );
  expect(originalBill.bill.total).toBe(-95);
  expect(originalBill.transactions).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ cardName: "Personal", cardLast4: "0042" }),
      expect.objectContaining({ cardName: "Family", cardLast4: "5151" }),
    ]),
  );

  // Navigate afresh: no importer draft or user-supplied row values survive.
  const profiles = await openStatement(7);
  expect(profiles).toHaveLength(1);
  expect(profiles[0]).toMatchObject({
    accountId: primary.id,
    config: { cardNameColumn: 4, cardLast4Column: 5, chargesPositive: true },
  });
  await expect(page.getByRole("status")).toHaveText(
    `Saved mapping applied from ${primaryName}.`,
  );
  await expect(
    page.getByRole("combobox", { name: "Destination account", exact: true }),
  ).toHaveText(`${primaryName} (credit)`);
  await expect(
    page.getByRole("button", { name: "Validate import", exact: true }),
  ).toBeDisabled();
  for (const [field, source] of [
    ["Card name", "Plastic label"],
    ["Card number", "Suffix"],
  ]) {
    await expect(
      page.getByRole("button", {
        name: `Edit ${field} mapping. ${source}`,
        exact: true,
      }),
    ).toBeVisible();
  }
  await page.screenshot({ path: "test-results/saved-c6-mapping.png" });
  await confirmStatement(`August ${year}`);
  const nextBill = await openFixtureSharedBill(page, primary.id, `${year}-08`);
  expect(nextBill.bill).toMatchObject({ transactionCount: 3, total: -95 });

  await openStatement(8);
  await expect(page.getByRole("status")).toHaveText(
    `Saved mapping applied from ${primaryName}.`,
  );
  await selectAccount(sharedName);
  await expect(page.getByRole("status")).toHaveText(
    `Saved mapping applied from ${primaryName}.`,
  );
  await confirmStatement(`September ${year}`);
  const sharedBill = await openFixtureSharedBill(page, shared.id, `${year}-09`);
  expect(sharedBill.bill).toMatchObject({ transactionCount: 3, total: -95 });
  expect(sharedBill.transactions).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ cardName: "Personal", cardLast4: "0042" }),
      expect.objectContaining({ cardName: "Family", cardLast4: "5151" }),
    ]),
  );

  const severalProfiles = await openStatement(9);
  expect(severalProfiles).toHaveLength(2);
  await expect(
    page.getByRole("combobox", { name: "Destination account", exact: true }),
  ).toHaveText("Select the account to confirm");
  await selectAccount(sharedName);
  await expect(page.getByRole("status")).toHaveText(
    `Saved mapping applied from ${sharedName}.`,
  );
  expect(browserErrors).toEqual([]);
});

test("creates, chains, edits and deletes workspace custom summary tiles safely", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.name));
  await signInAsFixture(page);
  await page.goto("/categories");
  for (const name of ["Dividido Proporcionalmente", "Vale"]) {
    await page.getByRole("textbox", { name: "Category name" }).fill(name);
    await page
      .getByRole("button", { name: "Add category", exact: true })
      .click();
    await expect(
      page
        .getByRole("region", { name: "Existing categories" })
        .getByText(name, { exact: true }),
    ).toBeVisible();
  }
  const account = await addFixtureAccount(
    page,
    "Custom values checking fixture",
  );
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  await importMonthFixture(page, {
    name: "custom-values.csv",
    accountName: "Custom values checking fixture",
    accountType: "checkout",
    rows: [
      `19/${month}/${now.getFullYear()};Custom shared purchase;-100,00`,
      `20/${month}/${now.getFullYear()};Custom benefit;40,00`,
    ],
  });
  await page.goto(`/transactions?accountId=${account.id}`);
  for (const [description, category] of [
    ["Custom shared purchase", "Dividido Proporcionalmente"],
    ["Custom benefit", "Vale"],
  ]) {
    await page
      .getByRole("button", {
        name: `Open transaction: ${description}`,
        exact: true,
      })
      .click();
    const dialog = page.getByRole("dialog", { name: description, exact: true });
    const saved = page.waitForResponse(
      (response) =>
        response.request().method() === "PATCH" &&
        new URL(response.url()).pathname.startsWith("/transactions/") &&
        response.ok(),
    );
    await dialog
      .getByRole("button", { name: new RegExp(` ${category}$`) })
      .click();
    await saved;
    await page.keyboard.press("Escape");
  }
  await page
    .getByRole("button", { name: "Period totals", exact: true })
    .click();
  const summary = page.getByRole("dialog", {
    name: "Period totals",
    exact: true,
  });
  const section = summary.getByRole("region", { name: "Customizable Values" });
  await section.getByRole("button", { name: "Add tile", exact: true }).click();
  await section
    .getByRole("textbox", { name: "Title", exact: true })
    .fill("My Custom Tile");
  await section.getByRole("radio", { name: "Teal", exact: true }).click();
  const logic = section.getByRole("combobox", { name: "Logic", exact: true });
  await logic.fill("({{Dividido");
  await section
    .getByRole("option", { name: /^Dividido Proporcionalmente/ })
    .click();
  await logic.press("ArrowLeft");
  await logic.press("ArrowLeft");
  await section
    .getByRole("option", { name: /^Dividido Proporcionalmente/ })
    .click();
  await logic.pressSequentially(") * 0.3");
  await expect(logic).toHaveValue("({{Dividido Proporcionalmente}}) * 0.3");
  await expect(section.getByText(/^Preview:/)).toHaveText(/-R\$\s*30,00/);
  await section.getByRole("button", { name: "Save tile", exact: true }).click();
  const first = section.getByRole("article", {
    name: "My Custom Tile",
    exact: true,
  });
  await expect(first).toContainText(/-R\$\s*30,00/);
  await expect(
    first.getByRole("img", { name: "Tile color: teal" }),
  ).toBeVisible();
  await section.getByRole("button", { name: "Add tile", exact: true }).click();
  await section
    .getByRole("textbox", { name: "Title", exact: true })
    .fill("Combined tile");
  await logic.fill("{{My");
  await section.getByRole("option", { name: /^My Custom Tile/ }).click();
  await logic.press("End");
  await logic.pressSequentially(" + {{Va");
  await expect(section.getByRole("option", { name: /^Vale/ })).toBeVisible();
  await page.screenshot({
    path: "test-results/custom-values-autocomplete.png",
  });
  await logic.press("ArrowDown");
  await logic.press("Enter");
  await section.getByRole("button", { name: "Save tile", exact: true }).click();
  const combined = section.getByRole("article", {
    name: "Combined tile",
    exact: true,
  });
  await expect(combined).toContainText(/R\$\s*10,00/);
  await page.reload();
  await expect(combined).toContainText(/R\$\s*10,00/);
  await expect(
    first.getByRole("img", { name: "Tile color: teal" }),
  ).toBeVisible();
  await first
    .getByRole("button", { name: "Edit My Custom Tile", exact: true })
    .click();
  await expect(
    section.getByRole("radio", { name: "Teal", exact: true }),
  ).toBeChecked();
  await section.getByRole("radio", { name: "Sky", exact: true }).click();
  await section
    .getByRole("textbox", { name: "Title", exact: true })
    .fill("Renamed tile");
  await logic.fill("{{Dividido Proporcionalmente}}*0.5");
  await section.getByRole("button", { name: "Save tile", exact: true }).click();
  await expect(combined).toContainText(/-R\$\s*10,00/);
  await expect(combined).toContainText("{{Renamed tile}} + {{Vale}}");
  const renamed = section.getByRole("article", {
    name: "Renamed tile",
    exact: true,
  });
  await expect(
    renamed.getByRole("img", { name: "Tile color: sky" }),
  ).toBeVisible();
  await renamed
    .getByRole("button", { name: "Delete Renamed tile", exact: true })
    .click();
  await renamed
    .getByRole("button", { name: "Delete tile", exact: true })
    .click();
  await expect(section.getByRole("alert")).toHaveText(
    /used by another formula/,
  );
  await renamed.getByRole("button", { name: "Keep tile", exact: true }).click();
  await combined
    .getByRole("button", { name: "Edit Combined tile", exact: true })
    .click();
  await logic.fill("1 / 0");
  await section.getByRole("button", { name: "Save tile", exact: true }).click();
  await expect(combined).toContainText("Cannot divide by zero.");
  await expect(combined).not.toContainText(/Infinity|NaN/);
  await section.scrollIntoViewIfNeeded();
  await expectFiniteAnimationsSettled(page);
  await page.screenshot({ path: "test-results/custom-values-light.png" });
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await page.screenshot({ path: "test-results/custom-values-dark.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await section.scrollIntoViewIfNeeded();
  await expect(combined).toBeInViewport();
  expect(
    await summary.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "test-results/custom-values-mobile.png" });
  for (const tile of [combined, renamed]) {
    await tile.getByRole("button", { name: /^Delete .+/ }).click();
    await tile
      .getByRole("button", { name: "Delete tile", exact: true })
      .click();
    await expect(tile).toHaveCount(0);
  }
  await page.reload();
  await expect(section.getByRole("article")).toHaveCount(0);
  expect(errors).toEqual([]);
});
