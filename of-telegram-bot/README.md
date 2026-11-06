# OF Telegram Auto-Poster

Posts a media album every few hours into a Telegram channel/group: **4–5 photos + 2–3 videos** from one model folder under `MEDIA_ROOT`, with caption `🔞✅ <folder-name> 📸` and a **Get Premium** inline button.

Stack: **Node.js 18+** + [grammY](https://grammy.dev).

---

## How a post works

1. Pick one model subfolder under `MEDIA_ROOT`.
2. Prefer files not yet recorded in local state (`data/posted-state.json`).
3. Build an album of 4–5 photos and 2–3 videos (≤ 10 items total — Telegram’s limit).
4. `sendMediaGroup` with caption on the first item.
5. Immediately send a short follow-up message (`⬇️`) with an inline **Get Premium** URL button  
   (Telegram does **not** allow keyboards on `sendMediaGroup`).

---

## Media layout

```
MEDIA_ROOT/
  Model Name A/
    photo1.jpg
    photo2.png
    clip1.mp4
    …
  Model Name B/
    …
```

- One **immediate** subfolder per model (folder name = caption name).
- Photos: `.jpg` `.jpeg` `.png` `.webp`
- Videos: `.mp4` `.mov` `.mkv` `.webm` `.m4v`
- Nested folders are ignored; only files directly in the model folder are used.
- Each model needs at least **4 photos** and **2 videos** to be eligible.

### Windows source (your PC)

```
C:\Users\alexa\Pictures\Telegram Models
```

### VPS destination (example)

```
/var/media/telegram-models
```

Set `MEDIA_ROOT` to whichever path the bot can read on the machine where it runs.

---

## Sync Windows → VPS

Pick one approach; keep folder names identical.

### Option A — `rsync` over SSH (recommended)

From Windows (WSL, or [cwRsync](https://www.itefix.com/products/cwrsync/)):

```bash
rsync -av --progress \
  "/mnt/c/Users/alexa/Pictures/Telegram Models/" \
  user@your-vps:/var/media/telegram-models/
```

Or from PowerShell with `scp`/`rsync` if installed. Schedule via Task Scheduler if you want periodic sync.

### Option B — cloud drive / Syncthing

Point Syncthing (or similar) at `Telegram Models` on Windows and `/var/media/telegram-models` on the VPS. Ensure the bot user can read the files (`chmod` / ACLs).

### Option C — manual upload

`scp -r` the folder tree when you add new models. The bot rescans the tree on every post — no restart needed for new files.

---

## Telegram setup

### 1. Create the bot

1. Open [@BotFather](https://t.me/BotFather) → `/newbot`
2. Copy the token → `TELEGRAM_BOT_TOKEN`

### 2. Channel vs group (default: **channel**)

| | Channel | Group / Supergroup |
|---|---|---|
| Typical use | Broadcast / leak channel | Discussion chat |
| Chat id | `@channelusername` or `-100…` | Usually `-100…` |
| Bot rights | Add bot as **administrator** with **Post messages** | Add bot; for groups may need privacy mode off (`/setprivacy` → Disable in BotFather) |

**Default recommendation:** use a **channel**. Add the bot as admin with permission to post messages.

To get a numeric id: post something in the chat, forward it to [@userinfobot](https://t.me/userinfobot) or [@getidsbot](https://t.me/getidsbot), or call `getUpdates` after messaging the bot.

### 3. Admin commands (optional)

Set `ADMIN_USER_IDS` to your Telegram user id(s), comma-separated. Then in a private chat with the bot (or anywhere the bot can see commands):

| Command | Action |
|---------|--------|
| `/post` | Post one album now |
| `/status` | Last post + state summary |
| `/models` | List model folders |

---

## Configuration

Copy env example and edit:

```bash
cd of-telegram-bot
cp .env.example .env
# edit .env — never commit .env
```

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TELEGRAM_BOT_TOKEN` | yes* | — | BotFather token |
| `TELEGRAM_CHAT_ID` | yes* | — | Channel `@name` or numeric id |
| `MEDIA_ROOT` | yes | — | Path to model folders |
| `PREMIUM_URL` | no | `https://dailyleaksss.com` | Get Premium button URL |
| `POST_INTERVAL_HOURS` | no | `3` | Hours between automatic posts |
| `ADMIN_USER_IDS` | no | empty | Comma-separated admin Telegram user ids |
| `DRY_RUN` | no | `0` | `1` = select media, log, do not send |
| `STATE_FILE` | no | `./data/posted-state.json` | Posted-file tracking |

\* Not required for `npm run dry-run` / `npm run test:picker`.

---

## Local install & test

```bash
cd of-telegram-bot
npm install

# Offline picker test (creates temp fake media, no Telegram needed)
npm run test:picker

# Dry-run against your real MEDIA_ROOT (set MEDIA_ROOT in .env; token optional)
npm run dry-run

# Send exactly one real post, then exit
npm run post-once

# Run 24/7 (scheduler + admin commands)
npm start
```

First scheduled post fires ~15 seconds after start, then every `POST_INTERVAL_HOURS`.

---

## VPS deploy (systemd)

Example on Ubuntu:

```bash
sudo mkdir -p /opt/of-telegram-bot /var/media/telegram-models
sudo rsync -a ./of-telegram-bot/ /opt/of-telegram-bot/
cd /opt/of-telegram-bot && sudo npm ci --omit=dev

sudo cp .env.example /opt/of-telegram-bot/.env
sudo nano /opt/of-telegram-bot/.env   # fill token, chat id, MEDIA_ROOT

sudo cp systemd/of-telegram-bot.service /etc/systemd/system/
# Adjust User= and paths in the unit if needed
sudo systemctl daemon-reload
sudo systemctl enable --now of-telegram-bot
sudo systemctl status of-telegram-bot
journalctl -u of-telegram-bot -f
```

### Smoke test on VPS

```bash
cd /opt/of-telegram-bot
sudo -u ubuntu DRY_RUN=1 node src/index.js --once
sudo -u ubuntu node src/index.js --once   # real single post
```

---

## Alternative: pm2

```bash
npm install -g pm2
cd /opt/of-telegram-bot
pm2 start src/index.js --name of-telegram-bot
pm2 save
pm2 startup
```

---

## Docker (optional)

```bash
cd of-telegram-bot
docker build -t of-telegram-bot .
docker run -d --name of-telegram-bot --restart unless-stopped \
  --env-file .env \
  -v /var/media/telegram-models:/media:ro \
  -v of-tg-state:/app/data \
  -e MEDIA_ROOT=/media \
  of-telegram-bot
```

---

## State / reuse avoidance

Posted filenames are stored per model in `data/posted-state.json`. When a model runs out of unused files, that model’s history is cleared and the cycle restarts so posting never stalls.

---

## Security notes

- Never commit `.env` or real tokens.
- Restrict filesystem permissions on `MEDIA_ROOT` and the service user.
- Prefer a dedicated bot; do not reuse tokens across unrelated projects.
