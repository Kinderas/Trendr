import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BOT_ROOT = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(BOT_ROOT, ".env") });

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function parseAdminIds(raw) {
  if (!raw?.trim()) return new Set();
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => Number(s))
      .filter((n) => Number.isFinite(n)),
  );
}

/**
 * Load config. When dryRunOnly is true (e.g. local picker tests),
 * TELEGRAM_* secrets are optional.
 */
export function loadConfig({ dryRunOnly = false } = {}) {
  const dryRun =
    dryRunOnly ||
    process.env.DRY_RUN === "1" ||
    process.env.DRY_RUN === "true";

  const mediaRoot = process.env.MEDIA_ROOT?.trim();
  if (!mediaRoot) {
    throw new Error("Missing required env var: MEDIA_ROOT");
  }

  let token = process.env.TELEGRAM_BOT_TOKEN?.trim() || "";
  let chatId = process.env.TELEGRAM_CHAT_ID?.trim() || "";

  if (!dryRun) {
    token = requireEnv("TELEGRAM_BOT_TOKEN");
    chatId = requireEnv("TELEGRAM_CHAT_ID");
  }

  const intervalHours = Number(process.env.POST_INTERVAL_HOURS || "3");
  if (!Number.isFinite(intervalHours) || intervalHours <= 0) {
    throw new Error("POST_INTERVAL_HOURS must be a positive number");
  }

  return {
    botRoot: BOT_ROOT,
    token,
    chatId,
    mediaRoot: path.resolve(mediaRoot),
    premiumUrl: (process.env.PREMIUM_URL || "https://dailyleaksss.com").trim(),
    postIntervalMs: intervalHours * 60 * 60 * 1000,
    postIntervalHours: intervalHours,
    adminUserIds: parseAdminIds(process.env.ADMIN_USER_IDS),
    dryRun,
    stateFile: path.resolve(
      process.env.STATE_FILE?.trim() ||
        path.join(BOT_ROOT, "data", "posted-state.json"),
    ),
    // Media mix targets (album ≤ 10 Telegram items)
    photoCount: { min: 4, max: 5 },
    videoCount: { min: 2, max: 3 },
  };
}
