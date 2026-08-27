# Reforma Zoom join-bot

Joins a Zoom meeting the firm is attending but not hosting, records the
audio, and uploads it to Reforma to be filed and transcribed — the same
Recordings pipeline as everything else, just triggered by a WhatsApp
request ("join_zoom_meeting") instead of Zoom's Cloud Recording webhook.

**This is not the same integration as the Cloud Recording webhook** already
live in the main app (`src/app/api/webhooks/zoom-meeting`). That one only
ever fires for meetings hosted on the firm's own Zoom account. This bot
exists specifically for meetings the firm doesn't host, where there's no
recording on our account for that webhook to ever pick up.

**Be upfront with yourself about what this is:** it joins by scripting a
real browser through Zoom's web client, and captures audio by routing the
PC's system audio through a virtual cable — not through any official
"headless meeting bot" API (Zoom doesn't offer one for the web client). It
works, but it's more fragile than the Cloud Recording integration: if Zoom
changes their join page's layout, or the meeting has a waiting room nobody
admits the bot from, it won't join. Treat "did it actually join" as
something to glance at, not something to fully trust unattended at first.

## One-time setup on the Windows machine that will run this

This machine needs to be **left on** whenever the bot might be needed — it
polls Reforma for join requests and can only act while it's running.

1. **Install [Node.js](https://nodejs.org/)** (LTS version).
2. **Install [VB-Cable](https://vb-audio.com/Cable/)** (free) — this is what
   lets the bot "hear" the meeting. After installing, you'll see two new
   audio devices: `CABLE Input` and `CABLE Output`.
3. **Set the Windows default playback device to `CABLE Input (VB-Audio
   Virtual Cable)`**: Settings → System → Sound → Output. This routes
   everything the PC plays — including the browser's meeting audio — into
   the cable instead of real speakers. **You will not hear anything play
   out loud on this machine while this is set** — that's expected, and this
   machine shouldn't be used for anything else while the bot might run.
4. **Install [ffmpeg](https://www.gyan.dev/ffmpeg/builds/)** and add it to
   your Windows PATH (so typing `ffmpeg` in any terminal works). Confirm
   with `ffmpeg -version`.
5. **Confirm the device name ffmpeg sees matches `.env`:**
   ```
   ffmpeg -list_devices true -f dshow -i dummy
   ```
   Look for `CABLE Output (VB-Audio Virtual Cable)` in the audio devices
   list. If it's named slightly differently on your install, update
   `AUDIO_DEVICE_NAME` in `.env` to match exactly.
6. **Install this bot's dependencies** (from this `zoom-bot` folder, in a
   terminal):
   ```
   npm install
   ```
   This also downloads a Chromium browser for Playwright to drive.
7. **Copy `.env.example` to `.env`** and fill in `REFORMA_API_URL` and
   `REFORMA_API_KEY`. Someone with owner/partner access generates the key
   from Reforma's Settings → API Integrations page, or (if that's not
   available yet) by running, from the main `Projectreforma` checkout:
   ```
   npx tsx scripts/generate-email-sync-api-key.ts <your-email> "Zoom join-bot"
   ```
   The key is only ever shown once — copy it into `.env` immediately.

## Running it

```
npm start
```

Leave this running in a terminal window on the always-on machine. It logs
what it's doing (polling, joining, recording, uploading) — leave a terminal
window visible if you want to keep an eye on it, especially at first.

To actually request a join, message the WhatsApp agent with the Zoom link
(and which brief it's for, if any) — e.g. "join this Zoom meeting for the
Adeyemi matter: https://zoom.us/j/123456789?pwd=...". The bot picks it up
on its next poll (every `POLL_INTERVAL_MS`, 15s by default) — it is not
instant, and nothing happens until this machine is on and this is running.

## What "done" looks like

Once the meeting ends and the bot detects it, the recording uploads
automatically and shows up on Reforma's Recordings page, transcribing the
same way any other recording does. If it fails partway (couldn't join,
never got admitted from a waiting room, upload failed), that's recorded
against the request with a reason — nothing silently disappears.

## Known limitations (read before relying on this)

- **Zoom only.** No Google Meet or Teams support — Zoom's web client is the
  only one this scripts against.
- **A waiting room needs a human to admit the bot**, same as any guest —
  there's a 10-minute window for that before the bot gives up on that job.
- **One bot, one meeting at a time.** It doesn't run multiple meetings in
  parallel — if a second join request comes in while it's already in a
  meeting, it waits.
- **This machine's audio output is claimed the whole time the bot might
  run.** Don't use it to play anything else meanwhile, or that ends up in
  the recording too.
