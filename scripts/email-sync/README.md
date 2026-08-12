# Manual email sync

Pulls emails from the `ascolp@reforma.ng` mailbox over IMAP and pushes them
into Reforma through `POST /api/import/emails` — the same intent
classification, brief-matching, and attachment-ingestion pipeline live
inbound email already goes through.

This exists as the manual fallback for while auto-forwarding from the mail
provider to Reforma's inbound webhook is broken. Once forwarding is fixed on
the provider side, this script isn't needed for day-to-day use — keep it
around for backfills or the next outage.

Safe to rerun: the API dedupes by Message-ID (falling back to
sender+subject+time-window), so running the same date range twice won't
create duplicate records.

## Setup (one-time)

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Get an IMAP app password.** In Zoho Mail (Settings → Mail Accounts →
   your account → App Passwords, or similar under Security), generate an
   app-specific password for IMAP — do not use the normal account login
   password, especially if 2FA is on. Make sure IMAP access is enabled for
   the account (Zoho Mail Settings → Mail Accounts → IMAP).

   Note: `imap.zoho.com` is the default host in the script. If `reforma.ng`
   is on a paid Zoho plan the correct host may instead be
   `imappro.zoho.com` — check Zoho's IMAP docs for the account, or just try
   both with `--imap-host`.

3. **Get a Reforma API key.** In the app: Settings → **API Keys** → generate
   a new key. Copy it immediately — it's only shown once (starts with
   `rf_sk_`).

4. Set credentials as environment variables so you're not typing them (or
   putting them in shell history) every run:
   ```bash
   export REFORMA_IMAP_USER="ascolp@reforma.ng"
   export REFORMA_IMAP_PASSWORD="<the app password from step 2>"
   export REFORMA_API_KEY="rf_sk_..."
   ```
   Anything not set as an env var, the script will prompt for interactively
   (password entry is hidden).

## Usage

```bash
# Preset ranges
python sync_emails.py --range week
python sync_emails.py --range month
python sync_emails.py --range 2months
python sync_emails.py --range 3months
python sync_emails.py --range 6months
python sync_emails.py --range year

# Explicit date range
python sync_emails.py --start 2026-01-01 --end 2026-02-01

# Preview what would be sent without actually sending anything
python sync_emails.py --range month --dry-run
```

Full list of `--range` presets: `today`, `3days`, `week`, `2weeks`, `month`,
`2months`, `3months`, `6months`, `year`.

By default it reads the `INBOX` folder — pass `--folder "Sent"` (or whatever
folder name Zoho uses) to pull from somewhere else.

## What it does with attachments

Attachments over 10MB or of an unsupported type are skipped (logged to the
console, not silently dropped without a trace) — this matches what the
Reforma API itself would do with them anyway, so skipping client-side just
avoids wasting time encoding/uploading something that would be rejected.
