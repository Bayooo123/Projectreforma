# Reforma — Deployment & DevOps Guide

> Version 1.0 | May 2026 | For infrastructure owners and DevOps engineers

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Variables](#environment-variables)
3. [Database Setup (Supabase / PostgreSQL)](#database-setup-supabase--postgresql)
4. [Vercel Deployment](#vercel-deployment)
5. [Cron Jobs](#cron-jobs)
6. [File Storage (Vercel Blob)](#file-storage-vercel-blob)
7. [Email (Resend)](#email-resend)
8. [Payment Gateway (Monnify)](#payment-gateway-monnify)
9. [BICA Platform Integration](#bica-platform-integration)
10. [Push Notifications (Web Push)](#push-notifications-web-push)
11. [Authentication Configuration](#authentication-configuration)
12. [Production Security Checklist](#production-security-checklist)
13. [Database Migrations](#database-migrations)
14. [Monitoring & Observability](#monitoring--observability)
15. [Rollback Procedure](#rollback-procedure)

---

## Prerequisites

| Requirement | Version |
|---|---|
| Node.js | 20.x or later |
| npm | 10.x or later |
| PostgreSQL | 15+ (via Supabase recommended) |
| Vercel account | Any paid plan (Hobby does not support cron jobs) |

---

## Environment Variables

All variables must be set in **Vercel → Project → Settings → Environment Variables** before deploying.

### Core (Required)

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string (pooled — port 6543 for Supabase) | `postgresql://postgres.xxxx:password@aws-0-eu-central-1.pooler.supabase.com:6543/postgres` |
| `DIRECT_URL` | Direct (non-pooled) connection string for Prisma migrations (port 5432) | `postgresql://postgres.xxxx:password@aws-0-eu-central-1.pooler.supabase.com:5432/postgres` |
| `NEXTAUTH_SECRET` | Random secret for JWT signing — **must be 32+ bytes** | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Canonical app URL (no trailing slash) | `https://reforma.yourdomain.com` |
| `NEXT_PUBLIC_APP_URL` | Same as NEXTAUTH_URL but exposed to the browser | `https://reforma.yourdomain.com` |

### AI (Required for Eureka & Proactive Agent)

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API key — obtain from console.anthropic.com |
| `VOYAGE_API_KEY` | Voyage AI key for vector embeddings (optional — degrades gracefully if absent) |

### File Storage (Required)

| Variable | Description |
|---|---|
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token — generated in Vercel Storage dashboard |

### Email (Required)

| Variable | Description | Example |
|---|---|---|
| `RESEND_API_KEY` | Resend API key — obtain from resend.com | `re_...` |
| `MAIL_FROM` | Sender address (must be a verified domain in Resend) | `Reforma <noreply@yourdomain.com>` |

### Cron Jobs (Required)

| Variable | Description |
|---|---|
| `CRON_SECRET` | Shared secret to authenticate cron requests — `openssl rand -base64 32` |

### Monnify Payments (Required for Nigerian payment processing)

| Variable | Description |
|---|---|
| `MONNIFY_API_KEY` | Monnify API key from your Monnify merchant dashboard |
| `MONNIFY_SECRET_KEY` | Monnify secret key |
| `MONNIFY_CONTRACT_CODE` | Monnify contract code for your merchant account |
| `MONNIFY_BASE_URL` | `https://api.monnify.com` (production) or `https://sandbox.monnify.com` (sandbox) |

### BICA Platform Integration (Required if using BICA)

| Variable | Description | Production Value |
|---|---|---|
| `BICA_PLATFORM_ID` | Your platform ID issued by BICA | Set as given |
| `BICA_SHARED_SECRET` | Shared secret for HMAC signature validation | Set as given |
| `BICA_DISABLE_HMAC` | **MUST be `false` or omitted in production** | `false` |
| `BICA_DEBUG_ERRORS` | **MUST be `false` or omitted in production** (exposes internal error details) | `false` |

### Email Webhook (Optional)

| Variable | Description |
|---|---|
| `EMAIL_WEBHOOK_SECRET` | Secret to authenticate inbound email webhooks from Resend |

### Digest / Scheduled Reports (Optional)

| Variable | Description |
|---|---|
| `DIGEST_WORKSPACE_IDS` | Comma-separated workspace IDs to include in the weekly digest email. If absent, digest covers all workspaces. |

---

## Database Setup (Supabase / PostgreSQL)

### 1. Create a Supabase Project

1. Log in to [supabase.com](https://supabase.com) and create a new project.
2. Note your **Project Ref** and **Database Password**.
3. Under **Settings → Database**, copy both:
   - **Connection string (pooled)** → use as `DATABASE_URL` (port 6543, `?pgbouncer=true&connection_limit=1` appended automatically by Prisma)
   - **Connection string (direct)** → use as `DIRECT_URL` (port 5432)

### 2. Enable Required Extensions

In the Supabase SQL editor, run:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS vector;
```

These are declared in `prisma/schema.prisma` and must exist before the first migration.

### 3. Run Migrations

Locally (first deploy):

```bash
npx prisma migrate deploy
```

Or via the Vercel build command — migrations are **not** run automatically during build. Run them manually from your local machine or a CI step with `DIRECT_URL` set.

### 4. Connection Pool Settings

For Supabase's PgBouncer (transaction mode), Prisma requires:

```
DATABASE_URL="...?pgbouncer=true&connection_limit=1"
```

The `connection_limit=1` prevents connection exhaustion from serverless function concurrency.

---

## Vercel Deployment

### Initial Deployment

1. Push the repository to GitHub.
2. Import the repository in Vercel.
3. Set **Framework Preset** to `Next.js`.
4. Set **Build Command** to `next build --webpack` (already in `vercel.json`).
5. Add all environment variables from the table above.
6. Deploy.

### Build Command

The build uses `--webpack` flag (not Turbopack). This is intentional — Turbopack and the current config are incompatible. Do not change this.

```json
// vercel.json
{
  "buildCommand": "next build --webpack"
}
```

### Custom Domain

1. In Vercel → Domains, add your custom domain.
2. Update `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` to match.
3. Redeploy.

### Environment-Specific Variables

Use Vercel's **Environment** selector (Production / Preview / Development) to scope variables. Never set `BICA_DISABLE_HMAC=true` or `BICA_DEBUG_ERRORS=true` in the Production environment.

---

## Cron Jobs

Cron jobs are declared in `vercel.json` and run on Vercel's infrastructure. They require a **Vercel Pro or Enterprise** plan.

### Schedule

| Job | Path | Schedule | Purpose |
|---|---|---|---|
| Process Notifications | `/api/cron/process-notifications` | `0 8 * * *` | Sends daily notification emails at 8 AM |
| Court Outcome Questions | `/api/cron/court-outcome-questions` | `0 18 * * *` | Prompts lawyers to log court outcomes at 6 PM |
| Anomaly Scan | `/api/cron/anomaly-scan` | `0 9 * * *` | Detects and auto-resolves workspace anomalies at 9 AM |
| Week in Court | `/api/cron/week-in-court` | `0 18 * * 5` | Friday 6 PM weekly court summary email |
| Weekly Digest (Friday) | `/api/cron/weekly-digest` | `0 20 * * 5` | Friday 8 PM weekly firm digest |
| Weekly Digest (Sunday) | `/api/cron/weekly-digest` | `0 7 * * 0` | Sunday 7 AM weekly firm digest repeat |

All cron times are **UTC**. Adjust for WAT (UTC+1) accordingly.

### Cron Authentication

Every cron route validates the `Authorization: Bearer <CRON_SECRET>` header. Requests without a valid secret return 401.

**Never expose `CRON_SECRET` in client-side code or public repositories.**

### Manual Trigger

To trigger a cron job manually (e.g. for testing):

```bash
curl -X POST https://your-app.vercel.app/api/cron/anomaly-scan \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## File Storage (Vercel Blob)

Reforma uses Vercel Blob for:
- Firm letterhead images
- Profile photos
- Uploaded documents (PDFs, images)

### Setup

1. In Vercel → Storage, create a new **Blob** store.
2. Copy the `BLOB_READ_WRITE_TOKEN` and add it to environment variables.
3. Blob files are publicly readable by URL but only writable with the token.

### Limits

Default Vercel Blob limits (Hobby: 500 MB, Pro: 5 GB). Contact Vercel for higher limits.

---

## Email (Resend)

### Setup

1. Create an account at [resend.com](https://resend.com).
2. Add and verify your sending domain (DNS records provided by Resend).
3. Create an API key with full access and add as `RESEND_API_KEY`.
4. Set `MAIL_FROM` to an address on your verified domain.

### Email Types Sent

- Password reset
- Workspace invitation
- Court date reminders
- Weekly digest (Friday + Sunday)
- Week in Court summary (Friday)
- Invoice delivery (when triggered manually)

### Inbound Email (Optional)

If using Resend's inbound routing for email-to-brief features, configure the webhook endpoint at `/api/email/inbound` and set `EMAIL_WEBHOOK_SECRET`.

---

## Payment Gateway (Monnify)

### Setup

1. Register a merchant account at [monnify.com](https://monnify.com).
2. Complete KYC and obtain your API Key, Secret Key, and Contract Code.
3. For sandbox testing, use `https://sandbox.monnify.com` as `MONNIFY_BASE_URL`.
4. For production, use `https://api.monnify.com`.

### Webhook

Set your Monnify webhook URL to:

```
https://your-app.vercel.app/api/monnify/webhook
```

The webhook validates incoming payment notifications and automatically records confirmed payments.

---

## BICA Platform Integration

BICA is a Nigerian legal tech platform that can execute actions in Reforma on behalf of authorised users.

### HMAC Validation

All inbound BICA requests to `/api/bica/execute` are validated with an HMAC-SHA256 signature using `BICA_SHARED_SECRET`. This prevents spoofed requests.

### Critical Production Flags

```bash
# MUST be absent or false in production
BICA_DISABLE_HMAC=false

# MUST be absent or false in production (prevents internal error leakage)
BICA_DEBUG_ERRORS=false
```

Setting `BICA_DISABLE_HMAC=true` in production removes all request authentication on the BICA execute route, allowing any caller to perform actions in any workspace.

---

## Push Notifications (Web Push)

Reforma is a Progressive Web App (PWA) with push notification support via `web-push` and Serwist service worker.

### VAPID Keys

Generate VAPID keys once and store them as environment variables:

```bash
npx web-push generate-vapid-keys
```

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Public VAPID key (exposed to browser) |
| `VAPID_PRIVATE_KEY` | Private VAPID key (server-side only) |

**VAPID keys must never change after production users have subscribed.** Changing them invalidates all existing push subscriptions.

---

## Authentication Configuration

### JWT Strategy

Reforma uses NextAuth v5 with a JWT session strategy. Sessions are stored in signed JWTs (not server-side sessions), which means:

- No Redis or database session store required
- Session invalidation propagates within ~60 seconds (the `lastVersionCheck` TTL)
- Force-logout works by incrementing `user.sessionVersion` in the database

### Session Version Throttle

The `sessionVersion` database check runs at most once per 60 seconds per active session (cached in the JWT `lastVersionCheck` field). This is intentional to reduce database load. Maximum propagation delay for force-logout is 60 seconds.

### Secret Rotation

To rotate `NEXTAUTH_SECRET` in production:

1. Generate a new secret: `openssl rand -base64 32`
2. Update `NEXTAUTH_SECRET` in Vercel environment variables.
3. Redeploy.
4. **All active sessions will be immediately invalidated.** All users will be logged out.

Do this during off-hours and communicate to users in advance.

### Default Admin PIN

The `revenuePin` and `litigationPin` on workspace records default to a hash of `'0987'` if not set. Firm owners should set custom PINs under Settings immediately after setup.

---

## Production Security Checklist

Before going live, verify each item:

- [ ] `NEXTAUTH_SECRET` is a cryptographically random 32+ byte string (not a human-readable password)
- [ ] `CRON_SECRET` is a cryptographically random 32+ byte string
- [ ] `BICA_DISABLE_HMAC` is `false` or absent
- [ ] `BICA_DEBUG_ERRORS` is `false` or absent
- [ ] `NEXTAUTH_URL` matches the production domain exactly (no trailing slash)
- [ ] `MONNIFY_BASE_URL` points to `https://api.monnify.com` (not sandbox)
- [ ] `DATABASE_URL` uses the **pooled** connection string (port 6543)
- [ ] `DIRECT_URL` uses the **direct** connection string (port 5432) — only needed for migrations
- [ ] Vercel Blob token is scoped to this project only
- [ ] Resend sending domain is verified (not the sandbox relay)
- [ ] Firm owners have changed default admin/litigation PINs
- [ ] VAPID keys are set if push notifications are required
- [ ] All `.env` and `.env.local` files are in `.gitignore` (never committed)
- [ ] Supabase Row Level Security (RLS) is disabled or configured — Reforma enforces auth at the application layer, not the DB layer. Confirm this matches your security model.
- [ ] Supabase database password is strong and not reused elsewhere

---

## Database Migrations

### Running Migrations

Always use the `DIRECT_URL` (non-pooled) connection for migrations:

```bash
# Set DIRECT_URL in your local .env, then:
npx prisma migrate deploy
```

### Creating a New Migration

```bash
# After editing prisma/schema.prisma:
npx prisma migrate dev --name describe_your_change
```

This creates a migration file under `prisma/migrations/`. Commit this file.

### Applying to Production

```bash
DATABASE_URL="$DIRECT_URL" npx prisma migrate deploy
```

Or set `DIRECT_URL` temporarily in your shell environment and run:

```bash
npx prisma migrate deploy
```

### Prisma Generate

After any schema change, regenerate the Prisma client:

```bash
npx prisma generate
```

This runs automatically during `next build` via the `postinstall` script in `package.json`.

### Rollback

Prisma does not support automatic rollback. To roll back:

1. Write a new migration that undoes the change.
2. Run `npx prisma migrate deploy` with the new migration.

For data loss scenarios, restore from a Supabase point-in-time backup.

---

## Monitoring & Observability

### Vercel Analytics

Enable Vercel Analytics in the project dashboard. This provides:
- Page-level performance data (Core Web Vitals)
- Function execution times
- Error rates

### Vercel Logs

Access real-time and historical function logs in Vercel → Project → Logs. Filter by function route, status code, or time range.

### Cron Job Monitoring

Check cron execution logs in Vercel → Project → Logs → filter by `/api/cron/*`. Each cron route returns a JSON body with results (e.g. `{ created: 2, resolved: 1 }` for the anomaly scan).

### Database Monitoring

In Supabase → Reports, monitor:
- Connection pool usage
- Query performance
- Row count per table

Typical warning signs:
- Connection pool saturation (>80% of max connections in use) — tune `connection_limit` in DATABASE_URL
- Slow queries on `Brief`, `Matter`, or `Client` — add indexes if needed
- Large table growth on `WorkspaceActivityLog` — archive old records if >1M rows

### Alerting

Vercel does not provide built-in alerting. For production monitoring, integrate:
- [Sentry](https://sentry.io) — JavaScript error tracking (add `SENTRY_DSN` and install `@sentry/nextjs`)
- [Uptime Robot](https://uptimerobot.com) or Better Uptime — endpoint availability monitoring

---

## Rollback Procedure

### Code Rollback

1. In Vercel → Deployments, find the last stable deployment.
2. Click **Promote to Production**.
3. No code changes required.

### Database Rollback

1. In Supabase → Database → Backups, select a point in time before the breaking change.
2. Restore to a new project first and verify.
3. Swap connection strings.

> Database rollbacks are destructive — they will lose all data written since the backup point. Coordinate with the team before executing.
