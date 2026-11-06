import { InputFile, InlineKeyboard } from "grammy";

/**
 * Post one album + a short follow-up with the Get Premium inline button.
 * Telegram sendMediaGroup cannot attach reply markups, so the button is a
 * separate minimal message right under the album.
 */
export async function postAlbum(bot, config, selection) {
  const { chatId, premiumUrl, dryRun } = config;
  const { model, caption, album, filenames } = selection;

  console.log(
    `[poster] ${dryRun ? "DRY-RUN " : ""}model="${model}" items=${album.length} ` +
      `(${album.filter((a) => a.type === "photo").length} photos, ` +
      `${album.filter((a) => a.type === "video").length} videos)`,
  );
  for (const item of album) {
    console.log(`  - ${item.type}: ${item.name}`);
  }
  console.log(`  caption: ${caption}`);

  if (dryRun) {
    console.log(`[poster] Would send premium button → ${premiumUrl}`);
    return { dryRun: true, model, filenames };
  }

  const media = album.map((item, index) => {
    const base = {
      type: item.type,
      media: new InputFile(item.path),
    };
    if (index === 0) {
      base.caption = caption;
    }
    return base;
  });

  await bot.api.sendMediaGroup(chatId, media);

  const keyboard = new InlineKeyboard().url("Get Premium", premiumUrl);
  // Minimal follow-up so the album stays the visual focus.
  await bot.api.sendMessage(chatId, "⬇️", {
    reply_markup: keyboard,
    disable_notification: true,
  });

  return { dryRun: false, model, filenames };
}
