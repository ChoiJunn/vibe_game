import { expect, test } from "@playwright/test";
import { mockGameApi } from "./support/gameApi";

test.beforeEach(async ({ page }) => {
  await mockGameApi(page);
  await page.goto("/practice");
});

test("shows five populated Korean categories and no empty rest category", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "패턴 도감" })).toBeVisible();
  await expect(page.locator(".pattern-kind-card")).toHaveCount(5);
  await expect(page.locator(".pattern-kind-card")).toContainText([
    "정박",
    "엇박",
    "박자 전환",
    "길게 누르기",
    "빠른 연타",
  ]);
  await expect(page.getByRole("button", { name: "전체", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "쉼표", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "엇박", exact: true }).click();
  await expect(page.locator(".pattern-kind-card")).toHaveCount(1);
  await expect(page.locator(".pattern-kind-card--offbeat")).toBeVisible();
  await page.getByRole("button", { name: "전체", exact: true }).click();
  await expect(page.locator(".pattern-kind-card")).toHaveCount(5);
});

test("labels same-kind same-scene variations with distinct ordinals", async ({ page }) => {
  await page.locator(".pattern-kind-card--straight").click();

  await expect(page.getByRole("heading", { name: "정박", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "출근길 · 정박 1" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "출근길 · 정박 2" })).toBeVisible();
  await expect(page.locator(".pattern-variation")).toHaveCount(17);
});

test("renders note-type previews from the source events for every populated kind", async ({ page }) => {
  const cases = [
    { kind: "straight", marker: ".pattern-beat-preview__tap" },
    { kind: "offbeat", marker: ".pattern-beat-preview__tap" },
    { kind: "transition", marker: ".pattern-beat-preview__burst" },
    { kind: "hold", marker: ".pattern-beat-preview__hold" },
    { kind: "burst", marker: ".pattern-beat-preview__burst" },
  ];

  for (const { kind, marker } of cases) {
    await page.locator(`.pattern-kind-card--${kind}`).click();
    const firstVariation = page.locator(".pattern-variation").first();
    await expect(firstVariation.locator(".pattern-beat-preview")).toHaveAttribute("aria-label", /미리보기/);
    await expect(firstVariation.locator(marker).first()).toBeAttached();
    await page.getByRole("button", { name: "종류 목록" }).click();
  }
});

test("practices the selected source pattern and returns to its variation list", async ({ page }) => {
  await page.locator(".pattern-kind-card--straight").click();
  await page.getByRole("button", { name: "출근길 · 정박 1, 4개 노트, 연습 시작" }).click();

  const practice = page.getByRole("region", { name: "패턴 연습" });
  await expect(practice).toHaveAttribute("data-source-pattern-id", "pattern-002");
  await expect(practice.getByRole("heading", { name: "출근길 · 정박 1" })).toBeVisible();
  await expect(page.locator(".practice-count-in")).toContainText("준비");
  await page.getByRole("button", { name: "연습 종료" }).click();
  await expect(page.getByRole("region", { name: "연습 결과 요약" })).toBeVisible();
  await expect(page.getByText("완료한 루프가 없어요. 연습한 구간은 통계에 포함되지 않았습니다.")).toBeVisible();
  await page.getByRole("button", { name: "변형 목록으로" }).click();

  await expect(page.getByRole("heading", { name: "출근길 · 정박 1" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "출근길 · 정박 2" })).toBeVisible();
});

test("keeps variation previews and actions within a narrow mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".pattern-kind-card--burst").click();

  await expect(page.locator(".pattern-variation").first().locator(".pattern-beat-preview")).toBeVisible();
  const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const overflowing = await page.locator("body *").evaluateAll((elements) => elements.flatMap((element) => {
    const rect = element.getBoundingClientRect();
    return rect.right > window.innerWidth + 1 ? [`${element.tagName}.${(element as HTMLElement).className}: ${rect.right}`] : [];
  }));
  expect(pageWidth, overflowing.join("\n")).toBeLessThanOrEqual(390);
});

test("supports a held touch input in practice on coarse-pointer devices", async ({ page }) => {
  await installCoarsePointer(page);
  await page.reload();
  await page.locator(".pattern-kind-card--straight").click();
  await page.locator(".pattern-variation__start").first().click();

  const touchButton = page.locator(".practice-viewport .rhythm-touch-button");
  await expect(touchButton).toBeVisible({ timeout: 10_000 });
  await touchButton.hover();
  await page.mouse.down();
  await expect(touchButton).toHaveAttribute("aria-pressed", "true");
  await page.mouse.up();
  await expect(touchButton).toHaveAttribute("aria-pressed", "false");
});

test("does not render the touch input on a fine-pointer desktop", async ({ page }) => {
  await page.locator(".pattern-kind-card--straight").click();
  await page.locator(".pattern-variation__start").first().click();
  await expect(page.locator(".practice-count-in")).toHaveCount(0, { timeout: 10_000 });
  await expect(page.locator(".practice-viewport .rhythm-touch-button")).toHaveCount(0);
});

test("offers coarse-pointer input in main gameplay and records its down/up pair", async ({ page }) => {
  const submittedEvents: string[] = [];
  page.on("request", (request) => {
    if (!request.url().includes("/api/game/session/events") || request.method() !== "POST") return;
    const body = request.postDataJSON() as { events?: Array<{ type: string }> };
    submittedEvents.push(...(body.events ?? []).map((event) => event.type));
  });
  await installCoarsePointer(page);
  await page.addInitScript(() => window.localStorage.setItem("office-rhythm-manager:tutorial-complete", "true"));
  await page.goto("/game");

  await page.locator(".game-frame button.primary").click();
  const touchButton = page.locator(".game-frame .rhythm-touch-button");
  await expect(touchButton).toBeVisible({ timeout: 15_000 });
  await touchButton.hover();
  await page.mouse.down();
  await expect(touchButton).toHaveAttribute("aria-pressed", "true");
  await page.mouse.up();
  await expect(touchButton).toHaveAttribute("aria-pressed", "false");
  await expect.poll(() => submittedEvents).toContain("keydown");
  await expect.poll(() => submittedEvents).toContain("keyup");
});

async function installCoarsePointer(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    const originalMatchMedia = window.matchMedia.bind(window);
    window.matchMedia = (query: string) => query === "(pointer: coarse)"
      ? {
          matches: true,
          media: query,
          onchange: null,
          addListener: () => undefined,
          removeListener: () => undefined,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
          dispatchEvent: () => false,
        } as MediaQueryList
      : originalMatchMedia(query);
  });
}
