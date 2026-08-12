#!/usr/bin/env python3
"""
Manual mailbox -> Reforma sync.

Pulls emails from the ascolp@reforma.ng mailbox over IMAP and pushes them
into Reforma through POST /api/import/emails — the same intent-classification,
brief-matching, and attachment-ingestion pipeline live inbound email goes
through (see src/app/api/import/emails/route.ts). This is the manual
fallback for while auto-forwarding to Reforma's inbound webhook is broken on
the provider side; rerunning it is safe, since the API dedupes by
Message-ID (falling back to sender+subject+time window).

Usage:
    python sync_emails.py --range week
    python sync_emails.py --range month
    python sync_emails.py --range 2months
    python sync_emails.py --start 2026-01-01 --end 2026-02-01
    python sync_emails.py --range month --dry-run   # fetch + parse only, don't send

Setup:
    pip install -r requirements.txt

Credentials — never hardcode these. Set via environment variables, or the
script will prompt for whatever's missing:
    REFORMA_IMAP_HOST      IMAP server (default: imap.zoho.com — see README
                            if reforma.ng's Zoho plan needs imappro.zoho.com)
    REFORMA_IMAP_USER      e.g. ascolp@reforma.ng
    REFORMA_IMAP_PASSWORD  IMAP app password (not your normal login password
                            if 2FA is on — Zoho requires a separate app
                            password for IMAP access)
    REFORMA_API_KEY        Reforma API key, from Settings -> API Keys in the
                            app (starts with rf_sk_)
    REFORMA_API_URL        default: https://www.reforma.ng/api/import/emails
"""

from __future__ import annotations

import argparse
import base64
import email
import getpass
import imaplib
import json
import os
import time
from datetime import date, datetime, timedelta
from email.header import decode_header
from email.utils import parsedate_to_datetime

import requests

DEFAULT_IMAP_HOST = "imap.zoho.com"
DEFAULT_IMAP_PORT = 993
DEFAULT_API_URL = "https://www.reforma.ng/api/import/emails"
BATCH_SIZE = 25  # server caps at 100/request; smaller batches keep attachment payloads manageable
MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024  # matches the server's per-attachment cap
ALLOWED_ATTACHMENT_TYPES = {
    "application/pdf", "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "image/jpeg", "image/png", "image/gif", "image/webp", "text/plain",
}


def subtract_months(d: date, months: int) -> date:
    """Calendar-correct month subtraction without needing dateutil."""
    days_in_month = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    month_index = d.month - 1 - months
    year = d.year + month_index // 12
    month = month_index % 12 + 1
    if month == 2 and (year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)):
        max_day = 29
    else:
        max_day = days_in_month[month - 1]
    return date(year, month, min(d.day, max_day))


RANGE_PRESETS = {
    "today": lambda today: today,
    "3days": lambda today: today - timedelta(days=3),
    "week": lambda today: today - timedelta(weeks=1),
    "2weeks": lambda today: today - timedelta(weeks=2),
    "month": lambda today: subtract_months(today, 1),
    "2months": lambda today: subtract_months(today, 2),
    "3months": lambda today: subtract_months(today, 3),
    "6months": lambda today: subtract_months(today, 6),
    "year": lambda today: subtract_months(today, 12),
}


def decode_mime_words(s: str | None) -> str:
    if not s:
        return ""
    parts = []
    for text, charset in decode_header(s):
        if isinstance(text, bytes):
            parts.append(text.decode(charset or "utf-8", errors="replace"))
        else:
            parts.append(text)
    return "".join(parts)


def decode_part_text(part) -> str:
    try:
        payload = part.get_payload(decode=True)
        if payload is None:
            return ""
        charset = part.get_content_charset() or "utf-8"
        return payload.decode(charset, errors="replace")
    except Exception:
        return ""


def extract_body(msg) -> tuple[str, str]:
    """Returns (text, html) — either may be empty."""
    text, html = "", ""
    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            disposition = str(part.get("Content-Disposition") or "")
            if "attachment" in disposition:
                continue
            if content_type == "text/plain" and not text:
                text = decode_part_text(part)
            elif content_type == "text/html" and not html:
                html = decode_part_text(part)
    else:
        content_type = msg.get_content_type()
        if content_type == "text/html":
            html = decode_part_text(msg)
        else:
            text = decode_part_text(msg)
    return text, html


def extract_attachments(msg) -> list[dict]:
    attachments = []
    if not msg.is_multipart():
        return attachments
    for part in msg.walk():
        disposition = str(part.get("Content-Disposition") or "")
        filename = part.get_filename()
        if "attachment" not in disposition and not filename:
            continue
        if not filename:
            continue
        content_type = part.get_content_type()
        payload = part.get_payload(decode=True)
        if payload is None:
            continue
        if len(payload) > MAX_ATTACHMENT_BYTES:
            print(f"    (skipping attachment '{filename}' — {len(payload)} bytes, over 10MB cap)")
            continue
        if content_type not in ALLOWED_ATTACHMENT_TYPES:
            print(f"    (skipping attachment '{filename}' — unsupported type {content_type})")
            continue
        attachments.append({
            "filename": decode_mime_words(filename),
            "content_type": content_type,
            "data": base64.b64encode(payload).decode("ascii"),
        })
    return attachments


def message_to_import_payload(msg) -> dict:
    subject = decode_mime_words(msg.get("Subject", "")) or "(no subject)"
    from_ = decode_mime_words(msg.get("From", ""))
    to_ = decode_mime_words(msg.get("To", ""))
    cc_ = decode_mime_words(msg.get("Cc", ""))
    message_id = (msg.get("Message-ID") or "").strip() or None

    date_hdr = msg.get("Date")
    iso_date = None
    if date_hdr:
        try:
            iso_date = parsedate_to_datetime(date_hdr).isoformat()
        except Exception:
            iso_date = None

    text, html = extract_body(msg)
    attachments = extract_attachments(msg)

    return {
        "message_id": message_id,
        "from": from_,
        "to": to_ or None,
        "cc": cc_ or None,
        "date": iso_date,
        "subject": subject,
        "body_text": text or None,
        "body_html": html or None,
        "attachments": attachments,
    }


def fetch_emails(host: str, port: int, user: str, password: str, folder: str, since: date, until: date | None) -> list[dict]:
    print(f"Connecting to {host}:{port} as {user} ...")
    conn = imaplib.IMAP4_SSL(host, port)
    conn.login(user, password)
    conn.select(folder)

    if until:
        criteria = f'(SINCE "{since.strftime("%d-%b-%Y")}" BEFORE "{until.strftime("%d-%b-%Y")}")'
    else:
        criteria = f'(SINCE "{since.strftime("%d-%b-%Y")}")'

    status, data = conn.search(None, criteria)
    if status != "OK":
        raise RuntimeError(f"IMAP search failed: {status}")

    uids = data[0].split()
    range_desc = f"since {since.isoformat()}" + (f" until {until.isoformat()}" if until else "")
    print(f"Found {len(uids)} messages in '{folder}' {range_desc}")

    emails = []
    for i, uid in enumerate(uids, 1):
        status, msg_data = conn.fetch(uid, "(RFC822)")
        if status != "OK" or not msg_data or msg_data[0] is None:
            print(f"  [{i}/{len(uids)}] fetch failed for UID {uid!r}, skipping")
            continue
        raw = msg_data[0][1]
        msg = email.message_from_bytes(raw)
        payload = message_to_import_payload(msg)
        emails.append(payload)
        print(f"  [{i}/{len(uids)}] {payload['subject'][:70]}")

    conn.logout()
    return emails


def send_batch(api_url: str, api_key: str, batch: list[dict]) -> dict | None:
    resp = requests.post(
        api_url,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        data=json.dumps(batch),
        timeout=120,
    )
    if resp.status_code != 200:
        print(f"  ERROR {resp.status_code}: {resp.text[:500]}")
        return None
    return resp.json()


def main():
    parser = argparse.ArgumentParser(description="Pull emails into Reforma via IMAP (manual fallback while auto-forwarding is down)")
    range_group = parser.add_mutually_exclusive_group()
    range_group.add_argument("--range", choices=list(RANGE_PRESETS.keys()), help="Preset time range")
    range_group.add_argument("--start", help="Explicit start date, YYYY-MM-DD (overrides --range)")
    parser.add_argument("--end", help="Explicit end date, YYYY-MM-DD (defaults to now)")
    parser.add_argument("--folder", default="INBOX", help="IMAP folder to read (default: INBOX)")
    parser.add_argument("--imap-host", default=os.environ.get("REFORMA_IMAP_HOST", DEFAULT_IMAP_HOST))
    parser.add_argument("--imap-port", type=int, default=int(os.environ.get("REFORMA_IMAP_PORT", DEFAULT_IMAP_PORT)))
    parser.add_argument("--imap-user", default=os.environ.get("REFORMA_IMAP_USER"))
    parser.add_argument("--api-url", default=os.environ.get("REFORMA_API_URL", DEFAULT_API_URL))
    parser.add_argument("--batch-size", type=int, default=BATCH_SIZE)
    parser.add_argument("--dry-run", action="store_true", help="Fetch and parse only — don't send to Reforma")
    args = parser.parse_args()

    if not args.range and not args.start:
        parser.error("Pass --range (e.g. --range month) or --start YYYY-MM-DD")

    today = date.today()
    since = datetime.strptime(args.start, "%Y-%m-%d").date() if args.start else RANGE_PRESETS[args.range](today)
    until = datetime.strptime(args.end, "%Y-%m-%d").date() if args.end else None

    imap_user = args.imap_user or input("IMAP username (e.g. ascolp@reforma.ng): ").strip()
    imap_password = os.environ.get("REFORMA_IMAP_PASSWORD") or getpass.getpass("IMAP password: ")

    api_key = os.environ.get("REFORMA_API_KEY")
    if not args.dry_run and not api_key:
        api_key = getpass.getpass("Reforma API key (rf_sk_...): ")

    emails = fetch_emails(args.imap_host, args.imap_port, imap_user, imap_password, args.folder, since, until)

    if not emails:
        print("Nothing to import.")
        return

    if args.dry_run:
        print(f"\n[dry-run] Would send {len(emails)} emails to {args.api_url}. Nothing was sent.")
        return

    print(f"\nSending {len(emails)} emails to Reforma in batches of {args.batch_size} ...")
    totals = {"total": 0, "processed": 0, "duplicates": 0, "noise": 0, "errors": 0}
    for i in range(0, len(emails), args.batch_size):
        batch = emails[i:i + args.batch_size]
        print(f"  Batch {i // args.batch_size + 1} ({len(batch)} emails) ...")
        result = send_batch(args.api_url, api_key, batch)
        if result and result.get("success"):
            s = result["summary"]
            for k in totals:
                totals[k] += s.get(k, 0)
            print(f"    -> {s}")
            for r in result.get("results", []):
                if r["status"] == "error":
                    print(f"    ! error on \"{r['subject'][:60]}\": {r.get('error')}")
        else:
            print("    -> batch failed, see error above")
        time.sleep(1)  # be polite to the API

    print("\nDone.")
    print(f"  Total:      {totals['total']}")
    print(f"  Processed:  {totals['processed']}")
    print(f"  Duplicates: {totals['duplicates']}")
    print(f"  Noise:      {totals['noise']}")
    print(f"  Errors:     {totals['errors']}")


if __name__ == "__main__":
    main()
