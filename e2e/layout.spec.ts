import { expect, test } from "@playwright/test";

const getWidth = async (locator: import("@playwright/test").Locator) => {
  const width = await locator.evaluate((element) =>
    window.getComputedStyle(element).width
  );
  return parseFloat(width);
};

test.describe("Layout ContaCerta", () => {
  test("topbar e sidebar permanecem fixos enquanto apenas o conteúdo rola", async ({ page }) => {
    await page.goto("/");

    const topbar = page.locator("#topbar");
    const sidebar = page.locator("#sidebar");
    const main = page.locator("main#main-content");

    await expect(topbar).toBeVisible();
    await expect(sidebar).toBeVisible();

    const topbarBox = await topbar.boundingBox();
    const sidebarBox = await sidebar.boundingBox();
    expect(topbarBox?.y).toBe(0);
    expect(sidebarBox?.x).toBe(0);

    await main.evaluate((element) => element.scrollTo({ top: 600 }));
    await expect.poll(async () => main.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);

    const topbarAfterScroll = await topbar.boundingBox();
    const sidebarAfterScroll = await sidebar.boundingBox();
    expect(topbarAfterScroll?.y).toBe(topbarBox?.y);
    expect(sidebarAfterScroll?.x).toBe(sidebarBox?.x);

    const bodyNoScroll = await page.evaluate(() => document.body.scrollHeight === window.innerHeight);
    expect(bodyNoScroll).toBeTruthy();

    const widthBefore = await getWidth(sidebar);
    await page.keyboard.press("[");
    await expect.poll(async () => getWidth(sidebar)).not.toBe(widthBefore);
    const widthAfter = await getWidth(sidebar);
    expect(widthAfter).not.toBe(widthBefore);
  });
});
