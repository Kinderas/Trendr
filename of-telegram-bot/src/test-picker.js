/**
 * Offline unit-style test: creates a fake MEDIA_ROOT, runs the picker,
 * asserts album mix, and prints captions — no Telegram token needed.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PostedState } from "./state.js";
import { pickPost, listModelFolders } from "./media.js";

function touch(filePath, size = 16) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, Buffer.alloc(size));
}

function setupFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "of-tg-media-"));
  const models = {
    "Model Alpha": { photos: 8, videos: 5 },
    "Model Beta": { photos: 6, videos: 4 },
  };

  for (const [name, counts] of Object.entries(models)) {
    const dir = path.join(root, name);
    fs.mkdirSync(dir, { recursive: true });
    for (let i = 1; i <= counts.photos; i++) {
      touch(path.join(dir, `photo_${String(i).padStart(2, "0")}.jpg`));
    }
    for (let i = 1; i <= counts.videos; i++) {
      touch(path.join(dir, `clip_${String(i).padStart(2, "0")}.mp4`));
    }
  }

  // Empty / incomplete folders should be skipped
  fs.mkdirSync(path.join(root, "_empty"), { recursive: true });
  touch(path.join(root, "Too Thin", "only.jpg"));

  return root;
}

function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERT: ${msg}`);
}

function main() {
  const mediaRoot = setupFixture();
  const stateFile = path.join(mediaRoot, "posted-state.json");
  const state = new PostedState(stateFile).load();

  console.log("MEDIA_ROOT fixture:", mediaRoot);
  console.log("Models:", listModelFolders(mediaRoot));

  const first = pickPost(mediaRoot, state, {
    photoCount: { min: 4, max: 5 },
    videoCount: { min: 2, max: 3 },
  });

  const photos = first.album.filter((a) => a.type === "photo").length;
  const videos = first.album.filter((a) => a.type === "video").length;

  assert(photos >= 4 && photos <= 5, `photos ${photos} not in 4–5`);
  assert(videos >= 2 && videos <= 3, `videos ${videos} not in 2–3`);
  assert(first.album.length <= 10, "album exceeds 10");
  assert(
    first.caption === `🔞✅ ${first.model} 📸`,
    `bad caption: ${first.caption}`,
  );

  state.markPosted(first.model, first.filenames);
  console.log("First pick OK:", {
    model: first.model,
    caption: first.caption,
    photos,
    videos,
    files: first.filenames,
  });

  // Exhaust Model Alpha and ensure picker still works / resets
  const alphaState = new PostedState(stateFile).load();
  const alphaPhotos = fs
    .readdirSync(path.join(mediaRoot, "Model Alpha"))
    .filter((f) => f.endsWith(".jpg"));
  const alphaVideos = fs
    .readdirSync(path.join(mediaRoot, "Model Alpha"))
    .filter((f) => f.endsWith(".mp4"));
  alphaState.markPosted("Model Alpha", [...alphaPhotos, ...alphaVideos]);

  // Force many picks; should never throw
  for (let i = 0; i < 12; i++) {
    const s = new PostedState(stateFile).load();
    const pick = pickPost(mediaRoot, s, {
      photoCount: { min: 4, max: 5 },
      videoCount: { min: 2, max: 3 },
    });
    s.markPosted(pick.model, pick.filenames);
    console.log(`  pick#${i + 1}: ${pick.model} (${pick.filenames.length} files)`);
  }

  console.log("\nAll picker tests passed.");
}

main();
