import { Bot } from "grammy";
import { loadConfig } from "./config.js";
import { PostedState } from "./state.js";
import { listModelFolders, pickPost } from "./media.js";
import { postAlbum } from "./poster.js";

const args = new Set(process.argv.slice(2));
const once = args.has("--once");
const dryFlag = args.has("--dry-run");

function isAdmin(ctx, config) {
  const id = ctx.from?.id;
  if (!id) return false;
  if (config.adminUserIds.size === 0) return false;
  return config.adminUserIds.has(id);
}

async function runPost(bot, config, state, reason = "schedule") {
  console.log(`[post] Starting (${reason})…`);
  const selection = pickPost(config.mediaRoot, state, {
    photoCount: config.photoCount,
    videoCount: config.videoCount,
  });
  const result = await postAlbum(bot, config, selection);
  if (!result.dryRun) {
    state.markPosted(selection.model, selection.filenames);
  } else {
    console.log("[post] Dry-run: state file not updated");
  }
  console.log(`[post] Done: model=${selection.model} files=${selection.filenames.length}`);
  return selection;
}

async function main() {
  const config = loadConfig({
    dryRunOnly: dryFlag || process.env.DRY_RUN === "1",
  });
  if (dryFlag) config.dryRun = true;

  const state = new PostedState(config.stateFile).load();

  console.log(`[boot] MEDIA_ROOT=${config.mediaRoot}`);
  console.log(`[boot] CHAT_ID=${config.chatId || "(dry-run)"}`);
  console.log(`[boot] interval=${config.postIntervalHours}h dryRun=${config.dryRun}`);
  console.log(`[boot] state=${config.stateFile}`);
  console.log(`[boot] admins=${[...config.adminUserIds].join(",") || "(none)"}`);

  const models = listModelFolders(config.mediaRoot);
  console.log(`[boot] models found: ${models.length}`);

  // Dry-run / --once without a real token: skip Bot creation for network.
  if (config.dryRun && (!config.token || config.token.includes("your_token"))) {
    if (once || dryFlag || process.env.DRY_RUN === "1") {
      console.log("[boot] Dry-run without bot token — picker only");
      await runPost({ api: {} }, config, state, once ? "once" : "dry-run");
      return;
    }
  }

  if (!config.token) {
    throw new Error("TELEGRAM_BOT_TOKEN is required unless DRY_RUN=1");
  }

  const bot = new Bot(config.token);

  bot.command("start", async (ctx) => {
    await ctx.reply(
      "OF Telegram poster is running.\nAdmins: /post /status /models",
    );
  });

  bot.command("post", async (ctx) => {
    if (!isAdmin(ctx, config)) {
      await ctx.reply("Unauthorized.");
      return;
    }
    try {
      await ctx.reply("Posting…");
      const selection = await runPost(bot, config, state, "manual /post");
      await ctx.reply(
        `Posted album for ${selection.model} (${selection.filenames.length} items).`,
      );
    } catch (err) {
      console.error("[post] manual failed:", err);
      await ctx.reply(`Post failed: ${err.message}`);
    }
  });

  bot.command("status", async (ctx) => {
    if (!isAdmin(ctx, config)) {
      await ctx.reply("Unauthorized.");
      return;
    }
    const s = state.summary();
    await ctx.reply(
      [
        `Models on disk: ${listModelFolders(config.mediaRoot).length}`,
        `Tracked models: ${s.modelsTracked}`,
        `Tracked files: ${s.filesTracked}`,
        `Last post: ${s.lastPostAt || "never"}`,
        `Last model: ${s.lastModel || "—"}`,
        `Interval: ${config.postIntervalHours}h`,
        `Dry-run: ${config.dryRun}`,
      ].join("\n"),
    );
  });

  bot.command("models", async (ctx) => {
    if (!isAdmin(ctx, config)) {
      await ctx.reply("Unauthorized.");
      return;
    }
    const names = listModelFolders(config.mediaRoot);
    const preview = names.slice(0, 40).join("\n") || "(none)";
    const more =
      names.length > 40 ? `\n…and ${names.length - 40} more` : "";
    await ctx.reply(`Models (${names.length}):\n${preview}${more}`);
  });

  bot.catch((err) => {
    console.error("[bot] Unhandled error:", err.error ?? err);
  });

  if (once) {
    await runPost(bot, config, state, "cli --once");
    process.exit(0);
  }

  // Schedule first post after a short delay so the process can finish booting;
  // then every POST_INTERVAL_HOURS.
  const FIRST_DELAY_MS = 15_000;
  console.log(
    `[boot] First scheduled post in ${FIRST_DELAY_MS / 1000}s, then every ${config.postIntervalHours}h`,
  );

  let posting = false;
  const tick = async (reason) => {
    if (posting) {
      console.warn("[schedule] Previous post still running, skip");
      return;
    }
    posting = true;
    try {
      await runPost(bot, config, state, reason);
    } catch (err) {
      console.error("[schedule] Post failed:", err);
    } finally {
      posting = false;
    }
  };

  setTimeout(() => {
    tick("schedule-first");
    setInterval(() => tick("schedule"), config.postIntervalMs);
  }, FIRST_DELAY_MS);

  console.log("[boot] Starting long-polling for admin commands…");
  await bot.start({
    onStart: (info) => console.log(`[boot] Bot @${info.username} online`),
  });
}

main().catch((err) => {
  console.error("[fatal]", err);
  process.exit(1);
});
