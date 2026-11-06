import fs from "node:fs";
import path from "node:path";

const PHOTO_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const VIDEO_EXT = new Set([".mp4", ".mov", ".mkv", ".webm", ".m4v"]);

export function isPhoto(filename) {
  return PHOTO_EXT.has(path.extname(filename).toLowerCase());
}

export function isVideo(filename) {
  return VIDEO_EXT.has(path.extname(filename).toLowerCase());
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/**
 * List immediate subdirectories of MEDIA_ROOT (one folder = one model).
 */
export function listModelFolders(mediaRoot) {
  if (!fs.existsSync(mediaRoot)) {
    throw new Error(`MEDIA_ROOT does not exist: ${mediaRoot}`);
  }
  return fs
    .readdirSync(mediaRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("."))
    .map((d) => d.name)
    .sort();
}

/**
 * Scan a model folder for photos and videos (non-recursive; ignores nested dirs).
 */
export function scanModelMedia(mediaRoot, model) {
  const dir = path.join(mediaRoot, model);
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const photos = [];
  const videos = [];
  for (const e of entries) {
    if (!e.isFile()) continue;
    if (e.name.startsWith(".")) continue;
    if (isPhoto(e.name)) photos.push(e.name);
    else if (isVideo(e.name)) videos.push(e.name);
  }
  return { photos, videos, dir };
}

/**
 * Prefer unused files. If unused runs short, top up from already-posted files
 * (avoids immediate full reuse when possible). Caller may reset history when a
 * model has zero unused files left of either type.
 */
function pickPreferUnused(all, postedSet, count) {
  if (all.length === 0 || count <= 0) return [];
  const unused = shuffle(all.filter((f) => !postedSet.has(f)));
  if (unused.length >= count) {
    return unused.slice(0, count);
  }
  const used = shuffle(all.filter((f) => postedSet.has(f)));
  return [...unused, ...used].slice(0, Math.min(count, all.length));
}

/**
 * Choose one model and a random mix of 4–5 photos + 2–3 videos (≤10 total).
 * Avoids immediate re-use via PostedState when possible.
 */
export function pickPost(mediaRoot, state, options = {}) {
  const photoMin = options.photoCount?.min ?? 4;
  const photoMax = options.photoCount?.max ?? 5;
  const videoMin = options.videoCount?.min ?? 2;
  const videoMax = options.videoCount?.max ?? 3;

  const models = listModelFolders(mediaRoot);
  if (models.length === 0) {
    throw new Error(`No model folders found under MEDIA_ROOT: ${mediaRoot}`);
  }

  // Prefer models that still have unused media; fall back to any viable model.
  const viable = [];
  for (const model of models) {
    const { photos, videos } = scanModelMedia(mediaRoot, model);
    if (photos.length >= photoMin && videos.length >= videoMin) {
      const posted = state.getPosted(model);
      const unusedPhotos = photos.filter((f) => !posted.has(f)).length;
      const unusedVideos = videos.filter((f) => !posted.has(f)).length;
      viable.push({
        model,
        photos,
        videos,
        freshness: unusedPhotos + unusedVideos,
      });
    }
  }

  if (viable.length === 0) {
    throw new Error(
      `No model folder has at least ${photoMin} photos and ${videoMin} videos under ${mediaRoot}`,
    );
  }

  // Weight toward fresher folders; still random among them.
  viable.sort((a, b) => b.freshness - a.freshness);
  const top = viable.filter((v) => v.freshness === viable[0].freshness);
  const chosen = shuffle(top.length ? top : viable)[0];

  const wantPhotos = randInt(photoMin, photoMax);
  const wantVideos = randInt(videoMin, videoMax);
  // Cap album at 10 (Telegram limit)
  let nPhotos = wantPhotos;
  let nVideos = wantVideos;
  while (nPhotos + nVideos > 10) {
    if (nVideos > videoMin) nVideos--;
    else if (nPhotos > photoMin) nPhotos--;
    else break;
  }

  let posted = state.getPosted(chosen.model);
  const unusedPhotos = chosen.photos.filter((f) => !posted.has(f)).length;
  const unusedVideos = chosen.videos.filter((f) => !posted.has(f)).length;

  // Full cycle complete for this model — clear history so files become "unused" again.
  if (unusedPhotos === 0 && unusedVideos === 0) {
    console.log(`[media] All files used for "${chosen.model}", resetting history`);
    state.resetModel(chosen.model);
    posted = state.getPosted(chosen.model);
  }

  const photos = pickPreferUnused(chosen.photos, posted, nPhotos);
  const videos = pickPreferUnused(chosen.videos, posted, nVideos);

  if (photos.length < photoMin || videos.length < videoMin) {
    throw new Error(
      `Model "${chosen.model}" could not satisfy mix after scan (photos=${photos.length}, videos=${videos.length})`,
    );
  }

  const dir = path.join(mediaRoot, chosen.model);
  const items = [
    ...photos.map((name) => ({
      type: "photo",
      name,
      path: path.join(dir, name),
    })),
    ...videos.map((name) => ({
      type: "video",
      name,
      path: path.join(dir, name),
    })),
  ];

  // Shuffle album order so videos aren't always last.
  const album = shuffle(items);

  return {
    model: chosen.model,
    caption: `🔞✅ ${chosen.model} 📸`,
    album,
    filenames: album.map((i) => i.name),
  };
}
