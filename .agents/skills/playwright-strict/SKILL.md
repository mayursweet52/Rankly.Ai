---
name: playwright-strict
description: "Strict, ultra-resilient Playwright end-to-end testing standards. Use when writing, debugging, or auditing Playwright tests to ensure zero flakiness, strict accessibility locators (getByRole, getByTestId), auto-waiting, visual regression checks, network mocking, and failure trace isolation."
---

# Playwright Strict: Resilient End-to-End Testing Standard

`playwright-strict` enforces deterministic, 100% reliable end-to-end (E2E) testing practices with zero flakiness, accessible user-centric locators, strict auto-waiting, network stability, and visual regression fidelity.

---

## 1. The 7 Golden Rules of Playwright Strict

### 1. User-Facing Locators Over Brittle Selectors
- **ALWAYS** prioritize accessibility and user-visible locators:
  ```typescript
  // ✅ STRICT & RESILIENT
  page.getByRole('button', { name: /submit application/i });
  page.getByRole('heading', { name: /candidate analytics/i, level: 1 });
  page.getByLabel('Work Email Address');
  page.getByPlaceholder('Search candidates by skill...');
  page.getByTestId('ats-score-badge');

  // ❌ FORBIDDEN (Brittle CSS & XPath)
  page.locator('div.container > div:nth-child(3) > button');
  page.locator('//button[contains(@class, "btn-primary")]');
  ```

### 2. Auto-Waiting & Web-First Assertions
- Never use arbitrary `page.waitForTimeout(3000)` or manual `sleep()`.
- Use Playwright's built-in web-first assertions with automatic retry:
  ```typescript
  // ✅ AUTOMATICALLY RETRIES UNTIL CONDITION PASSES (Default 5s timeout)
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByTestId('upload-status')).toHaveText(/extraction complete/i);
  await expect(page.getByRole('button', { name: /save/i })).toBeEnabled();
  ```

### 3. Strict Actionability & Navigation Guards
- Always wait for network or DOM settlement when initiating page navigations:
  ```typescript
  await Promise.all([
    page.waitForURL('**/dashboard'),
    page.getByRole('button', { name: /log in/i }).click(),
  ]);
  ```

### 4. Deterministic Network Mocking & Interception
- Isolate external dependencies, rate limits, and flaky third-party APIs with `page.route()`:
  ```typescript
  await page.route('**/api/v1/ai/infer', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'SUCCESS',
        model: 'nemotron-70b',
        atsScore: 94,
        confidence: 0.98,
      }),
    });
  });
  ```

### 5. Multi-Device & Mobile Viewport Rigor
- Test core user journeys across standard desktop and mobile profiles:
  ```typescript
  import { test, devices } from '@playwright/test';

  test.use({ ...devices['iPhone 14 Pro'] });
  test('Mobile responsive menu opens and interacts cleanly', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /open navigation menu/i }).click();
    await expect(page.getByRole('navigation')).toBeVisible();
  });
  ```

### 6. Visual Regression with Strict Thresholds
- Verify visual consistency while preventing cross-platform pixel jitter:
  ```typescript
  await expect(page).toHaveScreenshot('dashboard-home.png', {
    maxDiffPixelRatio: 0.02,
    animations: 'disabled',
  });
  ```

### 7. Traces, Video & Artifact Recording on Failure
- Configure Playwright config to retain traces and screenshots on first retry:
  ```typescript
  // playwright.config.ts
  export default defineConfig({
    use: {
      trace: 'on-first-retry',
      screenshot: 'only-on-failure',
      video: 'retain-on-failure',
    },
  });
  ```

---

## 2. Playwright Strict Execution Checklist

- [ ] Are all element selectors using `getByRole`, `getByLabel`, `getByText`, or `getByTestId`?
- [ ] Are all assertions using web-first `await expect(locator)...`?
- [ ] Are zero `waitForTimeout` or hardcoded `sleep` calls present?
- [ ] Are external payment/AI APIs mocked when testing pure UI mechanics?
- [ ] Are mobile viewport tests verifying tap target accessibility?
