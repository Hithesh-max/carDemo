import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const routes = [
  "/index.html",
  "/cars.html",
  "/car.html?id=creta",
  "/create-group.html",
  "/groups.html?id=1",
  "/bids.html?id=1",
  "/dealers.html",
  "/dealer.html",
];
for (const width of [390, 768, 1440])
  test(`Eight pages render without overflow at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("https://*.tile.openstreetmap.org/**", (r) => r.abort());
    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator("#connection")).toHaveText("Live connection");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
      await expect
        .poll(() =>
          page
            .locator("img:not(.leaflet-tile)")
            .evaluateAll((imgs) =>
              imgs.every((i) => i.complete && i.naturalWidth > 0),
            ),
        )
        .toBe(true);
    }
    expect(errors).toEqual([]);
  });
test("Accessibility checks on every page", async ({ page }) => {
  await page.route("https://*.tile.openstreetmap.org/**", (r) => r.abort());
  for (const route of routes) {
    await page.goto(route);
    await expect(page.locator("h1")).toBeVisible();
    let result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      result.violations,
      JSON.stringify(
        result.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => n.target),
        })),
      ),
    ).toEqual([]);
  }
});
test("Buyer creates group, dealer publishes live offer, buyer records interest", async ({
  browser,
}) => {
  const buyer = await browser.newContext(),
    dealer = await browser.newContext();
  const b = await buyer.newPage(),
    d = await dealer.newPage();
  await b.goto("/create-group.html");
  await b.getByRole("button", { name: /Sign in/ }).click();
  await b.getByRole("button", { name: "Try as buyer" }).click();
  await expect(b.locator("#dialog")).toBeHidden();
  await b.locator("#target").fill("3");
  await b.locator("#create-form input[type=checkbox]").check();
  await b.getByRole("button", { name: /Create my collective/ }).click();
  await expect(b).toHaveURL(/groups.html\?id=/);
  const id = new URL(b.url()).searchParams.get("id");
  await expect(b.locator("#member-count")).toContainText("1");
  await d.goto("/dealer.html");
  await d.getByRole("button", { name: "Sign in as a demo dealer ↗" }).click();
  await d.getByRole("button", { name: "Try as dealer" }).click();
  await expect(d.locator("#bid-form")).toBeVisible();
  await d.locator("#dealer-group").selectOption(id);
  await expect(d.locator("#existing-bid")).toContainText("first offer");
  await d.locator("#bid-discount").fill("82000");
  await d
    .locator("#bid-extras")
    .fill("Standard warranty. Demo availability in 14 days.");
  await d.locator("#bid-confirm").check();
  await d.getByRole("button", { name: "Publish demo offer ↗" }).click();
  await expect(d.locator("#existing-bid")).toContainText("version 1");
  await expect(b.locator(".bid-row")).toHaveCount(1);
  await b.getByRole("link", { name: /Compare 1 offers/ }).click();
  await b.getByRole("button", { name: "Review & express interest" }).click();
  await b.locator("#consent").check();
  await b.getByRole("button", { name: "Confirm interest" }).click();
  await expect(b.locator("#dialog")).toBeHidden();
  await expect(d.locator("#dealer-leads")).toContainText("1 buyers");
  await b.getByRole("link", { name: "← Group overview" }).click();
  await expect(
    b.getByText("Interest recorded:", { exact: false }),
  ).toBeVisible();
  await b.locator("#message-body").fill("<img src=x onerror=alert(1)>");
  await b.getByRole("button", { name: "Post update" }).click();
  await expect(b.locator(".message p")).toHaveText(
    "<img src=x onerror=alert(1)>",
  );
  await b.reload();
  await expect(
    b.getByText("Interest recorded:", { exact: false }),
  ).toBeVisible();
  await buyer.close();
  await dealer.close();
});
test("Filters, compare, calculators and keyboard navigation", async ({
  page,
}) => {
  await page.goto("/cars.html");
  await page.locator("#search").fill("swift");
  await expect(page.locator(".car-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.locator(".car-card")).toHaveCount(6);
  await page
    .getByRole("checkbox", { name: "Compare Creta", exact: true })
    .check();
  await page
    .getByRole("checkbox", { name: "Compare Nexon", exact: true })
    .check();
  await page.getByRole("button", { name: "Compare cars", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.goto("/car.html?id=creta");
  await expect(page.locator("#calc-total")).toHaveText("₹17,77,750");
  await page.locator("#calc-discount").fill("77750");
  await expect(page.locator("#calc-total")).toHaveText("₹17,00,000");
  await page.locator("#rate").fill("0");
  await page.locator("#down").fill("500000");
  await expect(page.locator("#emi")).toHaveText("₹20,000");
  await page.goto("/index.html");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to main content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeFocused();
});
test("Authenticated dealer form and account dialogs are accessible on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dealer.html");
  await page
    .getByRole("button", { name: "Sign in as a demo dealer ↗" })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.getByRole("button", { name: "Try as dealer" }).click();
  await expect(page.locator("#bid-form")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});
test("Map failure retains listings, and city filtering does not invent showrooms", async ({
  page,
}) => {
  await page.route("https://*.tile.openstreetmap.org/**", (r) => r.abort());
  await page.goto("/dealers.html");
  await expect(page.locator(".dealer-card")).toHaveCount(3);
  await expect(page.locator("#map-note")).toContainText(
    "Map tiles are unavailable",
  );
  await page.locator("#dealer-city").selectOption("Pune");
  await expect(page.locator(".dealer-card")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Tata dealer locator ↗" }),
  ).toBeVisible();
});
