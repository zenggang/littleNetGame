import fs from "node:fs/promises";
import path from "node:path";

import { chromium } from "playwright";

import {
  extractRoomCodeFromUrl,
  normalizeBaseUrl,
} from "./smoke-prod-lib.mjs";

const baseUrl = normalizeBaseUrl(process.env.SMOKE_BASE_URL);
const artifactDir = path.resolve(process.env.SMOKE_ARTIFACT_DIR ?? "output/smoke");
const maxAttempts = Number.parseInt(process.env.SMOKE_MAX_ATTEMPTS ?? "16", 10);
const retryDelayMs = Number.parseInt(process.env.SMOKE_RETRY_DELAY_MS ?? "30000", 10);
const pageTimeoutMs = Number.parseInt(process.env.SMOKE_PAGE_TIMEOUT_MS ?? "20000", 10);

async function main() {
  await fs.mkdir(artifactDir, { recursive: true });

  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const roomCode = await runSmokeAttempt(attempt);
      console.log(`Smoke flow passed on attempt ${attempt} for room ${roomCode}.`);
      return;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Smoke attempt ${attempt} failed: ${message}`);

      if (attempt >= maxAttempts) {
        break;
      }

      console.log(`Waiting ${retryDelayMs}ms before retrying production smoke flow...`);
      await sleep(retryDelayMs);
    }
  }

  throw lastError ?? new Error("PRODUCTION_SMOKE_FAILED");
}

async function runSmokeAttempt(attempt) {
  const browser = await chromium.launch({ headless: true });
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();

  const hostNickname = `HostCI${attempt}`;
  const guestNickname = `GuestCI${attempt}`;

  try {
    // 每次都新建房间，避免 smoke 重试复用脏状态。
    await hostPage.goto(baseUrl, { waitUntil: "networkidle" });
    await hostPage.getByRole("textbox", { name: "输入一个短昵称" }).fill(hostNickname);
    await hostPage.getByRole("button", { name: "创建游戏" }).click();
    await hostPage.getByRole("button", { name: "立即建房" }).click();
    await hostPage.waitForURL(/\/room\/[A-Z0-9]{4}$/i, { timeout: pageTimeoutMs });

    const roomCode = extractRoomCodeFromUrl(hostPage.url());

    // 第二个上下文模拟真实外部玩家，完整走首页加入链路。
    await guestPage.goto(baseUrl, { waitUntil: "networkidle" });
    await guestPage.getByRole("textbox", { name: "输入一个短昵称" }).fill(guestNickname);
    await guestPage.getByRole("button", { name: "加入游戏" }).click();
    await guestPage.getByPlaceholder("输入 4 位房间码").fill(roomCode);
    await guestPage.getByRole("button", { name: "进入房间" }).click();
    await guestPage.waitForURL(new RegExp(`/room/${roomCode}$`, "i"), {
      timeout: pageTimeoutMs,
    });

    await hostPage.getByText(guestNickname).waitFor({ timeout: pageTimeoutMs });

    // 只有房主看到真正可点的开战按钮，才说明数据库快照和 coordinator 权威态已对齐。
    const startButton = hostPage.getByRole("button", { name: "房主开始对战" });
    await waitForEnabled(startButton, pageTimeoutMs);
    await hostPage.getByText("可开战").waitFor({ timeout: pageTimeoutMs });

    await startButton.click();

    await hostPage.waitForURL(/\/battle\//i, { timeout: pageTimeoutMs });
    await guestPage.waitForURL(/\/battle\//i, { timeout: pageTimeoutMs });
    await hostPage.getByText("全房同题").waitFor({ timeout: pageTimeoutMs });

    return roomCode;
  } catch (error) {
    await captureFailureArtifacts(attempt, hostPage, guestPage);
    throw error;
  } finally {
    await browser.close();
  }
}

async function waitForEnabled(locator, timeoutMs) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await locator.isEnabled()) {
      return;
    }

    await sleep(250);
  }

  throw new Error("START_BUTTON_NOT_ENABLED");
}

async function captureFailureArtifacts(attempt, hostPage, guestPage) {
  const hostPath = path.join(artifactDir, `attempt-${attempt}-host.png`);
  const guestPath = path.join(artifactDir, `attempt-${attempt}-guest.png`);

  await Promise.allSettled([
    hostPage.screenshot({ path: hostPath, fullPage: true }),
    guestPage.screenshot({ path: guestPath, fullPage: true }),
    fs.writeFile(
      path.join(artifactDir, `attempt-${attempt}-urls.txt`),
      [
        `host=${hostPage.url()}`,
        `guest=${guestPage.url()}`,
      ].join("\n"),
      "utf8",
    ),
  ]);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
