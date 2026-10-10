import { test, expect } from "@playwright/test";

const firstAddress = "11111111111111111111111111111111";
const secondAddress = "Vote111111111111111111111111111111111111111";

test("offers Phantom install when the extension is absent", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /understand your wallet/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Get Phantom" }).first(),
  ).toHaveAttribute("href", "https://phantom.com/download");
});

test("opens a clearly labeled sample without connecting or requesting network data", async ({
  page,
}) => {
  let rpcRequests = 0;
  await page.route(
    /https:\/\/api\.(mainnet|devnet)\.solana\.com\/?/,
    async (route) => {
      rpcRequests += 1;
      await route.abort();
    },
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Explore sample dashboard" }).click();
  await expect(
    page.getByText(/SAMPLE VIEW · Illustrative data only/),
  ).toBeVisible();
  await expect(page.locator(".balance-value")).toContainText("2.47812");
  await expect(page.locator(".transaction-list .transaction")).toHaveCount(3);
  await expect(
    page.getByRole("link", { name: /View on Solana Explorer/ }),
  ).toHaveCount(0);
  await page.getByRole("radio", { name: "Devnet" }).check();
  await expect(page.locator(".balance-value")).toContainText("0.83");
  expect(rpcRequests).toBe(0);
  await page.getByRole("button", { name: /Sample view.*Exit/ }).click();
  await expect(
    page.getByRole("heading", { name: /understand your wallet/i }),
  ).toBeVisible();
});

test("reads a connected wallet and responds to network, account, and disconnect changes", async ({
  page,
}) => {
  await page.addInitScript((address) => {
    let currentAddress = address;
    const listeners = new Map();
    const emit = (event, value) => {
      for (const callback of listeners.get(event) || []) callback(value);
    };
    const provider = {
      isPhantom: true,
      isConnected: true,
      publicKey: { toString: () => currentAddress },
      connect: async () => ({ publicKey: { toString: () => currentAddress } }),
      disconnect: async () => {
        emit("disconnect");
        provider.isConnected = false;
      },
      on: (event, callback) =>
        listeners.set(event, [...(listeners.get(event) || []), callback]),
      removeListener: (event, callback) =>
        listeners.set(
          event,
          (listeners.get(event) || []).filter((item) => item !== callback),
        ),
    };
    window.phantom = { solana: provider };
    window.switchMockAccount = (nextAddress) => {
      currentAddress = nextAddress;
      emit("accountChanged", { toString: () => nextAddress });
    };
  }, firstAddress);

  await page.route(
    /https:\/\/api\.(mainnet|devnet)\.solana\.com\/?/,
    async (route) => {
      if (route.request().method() === "OPTIONS") {
        await route.fulfill({
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "POST, OPTIONS",
            "access-control-allow-headers": "Content-Type",
          },
        });
        return;
      }
      const request = route.request().postDataJSON();
      const devnet = route.request().url().includes("devnet");
      const response =
        request.method === "getBalance"
          ? {
              context: { slot: 1 },
              value: devnet ? 2_500_000_000 : 1_250_000_000,
            }
          : [
              {
                signature: "A".repeat(88),
                slot: 1,
                err: null,
                memo: null,
                blockTime: Math.floor(Date.now() / 1000),
                confirmationStatus: "confirmed",
              },
            ];
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, result: response }),
      });
    },
  );

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /your wallet, clearly/i }),
  ).toBeVisible();
  await expect(page.locator(".balance-value")).toContainText("1.25");
  await expect(
    page.getByRole("heading", { name: "Recent transactions" }),
  ).toBeVisible();
  await expect(page.locator(".transaction")).toHaveCount(1);
  await page.screenshot({
    path: "test-results/connected-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 375, height: 812 });
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await page.screenshot({
    path: "test-results/connected-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 720 });

  await page.getByRole("radio", { name: "Devnet" }).check();
  await expect(page.locator(".balance-value")).toContainText("2.5");
  await expect(
    page.getByText("On Solana Devnet. Token holdings are not included."),
  ).toBeVisible();

  await page.evaluate(
    (nextAddress) => window.switchMockAccount(nextAddress),
    secondAddress,
  );
  await expect(page.locator(".address-display")).toContainText(
    secondAddress.slice(0, 9),
  );
  await page.getByRole("button", { name: /disconnect/i }).click();
  await expect(
    page.getByRole("heading", { name: /understand your wallet/i }),
  ).toBeVisible();
});
