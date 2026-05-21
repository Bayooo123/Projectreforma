# Reforma — Technical & Developer Reference

> Version 1.0 | May 2026 | For engineers building on or maintaining Reforma

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Authentication & RBAC](#authentication--rbac)
5. [Database Schema Reference](#database-schema-reference)
6. [Server Actions vs API Routes](#server-actions-vs-api-routes)
7. [AI Systems](#ai-systems)
8. [File & Document Processing](#file--document-processing)
9. [Anomaly Detection System](#anomaly-detection-system)
10. [Email Architecture](#email-architecture)
11. [Payment Processing](#payment-processing)
12. [PWA & Push Notifications](#pwa--push-notifications)
13. [Performance Patterns](#performance-patterns)
14. [Key Conventions](#key-conventions)

---

## Architecture Overview

Reforma is a **Next.js 16 App Router** application deployed on Vercel. It follows a server-first architecture where the majority of data fetching, mutations, and business logic run as **React Server Components** or **Server Actions**, with client components reserved for interactive UI.

```
Browser ──► Vercel Edge ──► Next.js App Router
                                │
                    ┌───────────┼───────────────┐
                    │           │               │
             Server Components  Server Actions  API Routes
                    │           │               │
                    └───────────┴──────┬────────┘
                                       │
                              Prisma ORM (pooled)
                                       │
                              Supabase PostgreSQL
                                       │
                          ┌────────────┴────────────┐
                    Vercel Blob                Anthropic API
                    (files/images)             (AI features)
```

### Request Lifecycle

1. User navigates to a page → Next.js App Router renders a **Server Component** tree.
2. Server components call `auth()` to identify the user, then call `prisma.*` directly.
3. User interactions trigger **Server Actions** (form submissions, button clicks) which run on the server and revalidate the React cache.
4. Background jobs run via **Vercel Cron** → `POST /api/cron/*` routes protected by `CRON_SECRET`.

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js | 16 (App Router) |
| React | React | 19 |
| Styling | Tailwind CSS | 4 + CSS Modules |
| ORM | Prisma | 6.x |
| Database | PostgreSQL (Supabase) | 15+ |
| Auth | NextAuth | v5 (JWT strategy) |
| AI | Anthropic Claude | claude-sonnet-4-6 |
| AI Embeddings | Voyage AI | voyage-3-large |
| Email | Resend | Latest |
| File Storage | Vercel Blob | Latest |
| Payments | Monnify | REST API |
| PDF | jsPDF | Latest |
| Word | docx | Latest |
| Rich Text | TipTap | 2.x |
| OCR | Tesseract.js | 5.x |
| Push Notifications | web-push + Serwist | Latest |
| Language | TypeScript | 5.x |

---

## Project Structure

```
reforma-os/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Route group: login, register, reset
│   │   ├── (landing)/          # Public marketing pages
│   │   ├── api/                # API routes (webhooks, cron, BICA)
│   │   │   ├── bica/           # BICA platform execute endpoint
│   │   │   ├── cron/           # Vercel Cron handlers
│   │   │   ├── email/          # Inbound email webhook
│   │   │   └── monnify/        # Payment webhook
│   │   ├── actions/            # Server Actions
│   │   │   ├── briefs.ts
│   │   │   ├── clients.ts
│   │   │   ├── matters.ts
│   │   │   ├── invoices.ts
│   │   │   ├── payments.ts
│   │   │   ├── bank-accounts.ts
│   │   │   ├── compliance.ts
│   │   │   └── ...
│   │   ├── management/         # Client-facing app pages
│   │   │   ├── clients/
│   │   │   ├── matters/
│   │   │   ├── briefs/
│   │   │   └── ...
│   │   ├── pulse/              # Dashboard
│   │   ├── analytics/          # Reports
│   │   ├── settings/           # Workspace settings
│   │   └── layout.tsx          # Root layout (auth, workspace init)
│   ├── components/             # React components
│   │   ├── management/         # Domain-specific components
│   │   ├── ui/                 # Generic UI components
│   │   └── ...
│   ├── lib/                    # Shared utilities
│   │   ├── prisma.ts           # Prisma client singleton
│   │   ├── anomaly/            # Anomaly detection engine
│   │   │   └── detector.ts
│   │   ├── invoice-pdf.ts      # PDF generation
│   │   ├── invoice-docx.ts     # Word generation
│   │   ├── ai/                 # AI agent tools
│   │   └── auth/               # Auth helpers (getCurrentUserWithWorkspace)
│   └── auth.ts                 # NextAuth configuration
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── migrations/             # Migration history
├── public/                     # Static assets
├── vercel.json                 # Build + cron config
└── next.config.ts              # Next.js config
```

---

## Authentication & RBAC

### NextAuth v5 JWT Strategy

Authentication is handled by **NextAuth v5** using a **JWT session strategy**. Sessions are encoded in signed JWTs stored in cookies — no server-side session store is required.

Key JWT payload fields:

| Field | Type | Purpose |
|---|---|---|
| `sub` | string | User ID |
| `sessionVersion` | number | Mirrors `User.sessionVersion` in DB — incremented on password change or force-logout |
| `lastVersionCheck` | number | Unix timestamp of last DB sessionVersion check (throttle: 60s) |
| `workspaceId` | string | Active workspace |
| `role` | string | Current workspace role |

#### Session Version Check (Throttled)

On each authenticated request, `auth.ts` checks whether `sessionVersion` in the JWT matches the database. To avoid a DB hit on every request, the check is throttled to once per 60 seconds using `lastVersionCheck`:

```typescript
const now = Date.now();
if (now - (token.lastVersionCheck ?? 0) > 60_000) {
    const dbUser = await prisma.user.findUnique({
        where: { id: token.sub },
        select: { sessionVersion: true }
    });
    if (!dbUser || dbUser.sessionVersion > (token.sessionVersion ?? 0)) return null;
    token.lastVersionCheck = now;
}
```

Force-logout propagates within ~60 seconds.

### getCurrentUserWithWorkspace()

The root layout uses a `React.cache()`-wrapped helper that fetches user + workspace in a single call. Any server component on the same request that calls the same function gets a cache hit — no duplicate DB queries.

```typescript
// src/lib/auth/getCurrentUserWithWorkspace.ts
import { cache } from 'react';

export const getCurrentUserWithWorkspace = cache(async () => {
    const session = await auth();
    if (!session?.user?.id) return null;
    // ... fetch workspace member + workspace in one query
});
```

### RBAC — Role Hierarchy

Roles are stored as strings on `WorkspaceMember.role`. Seniority order (lowest → highest):

```
intern < extern < paralegal < junior_associate < associate
  < senior_associate < partner < senior_partner < managing_partner
```

The workspace `ownerId` is a superuser not subject to role restrictions.

Permission checks are performed in server actions using the pattern:

```typescript
const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } }
});
if (!member || !hasPermission(member.role, 'create_invoice')) {
    return { success: false, error: 'Insufficient permissions' };
}
```

### Multi-Factor Authentication (MFA)

Users can enable TOTP-based MFA. `User.mfaSecret` stores the TOTP secret (encrypted). MFA is enforced at the NextAuth `authorize` callback — users with `mfaEnabled = true` must supply a valid TOTP code on login.

---

## Database Schema Reference

All models are in `prisma/schema.prisma`. The database uses `uuid-ossp` and `pgvector` PostgreSQL extensions.

### Core Models

#### `Workspace`
Top-level entity. One workspace per law firm. Key fields:
- `firmCode` — unique short code for joining
- `letterheadUrl` — Vercel Blob URL for invoice headers
- `subscriptionStatus` / `subscriptionBand` / `subscriptionTier` — Monnify subscription state
- `geofenceEnabled` + lat/lng/radius — attendance location enforcement
- `revenuePin` / `litigationPin` — role-gated access PINs

#### `User`
Platform user. May belong to multiple workspaces via `WorkspaceMember`. Key fields:
- `sessionVersion` — incremented to force-logout all sessions
- `mfaEnabled` / `mfaSecret` — TOTP MFA
- `lawyerToken` — unique token for non-authenticated court reporting submissions
- `isPlatformAdmin` — global platform admin flag

#### `WorkspaceMember`
Join table between `User` and `Workspace`. Carries:
- `role` — seniority role string
- `isGuest` / `expiresAt` — time-limited guest access
- `canDownload` / `canDelete` — per-member permission overrides

#### `Brief`
Primary document container. Key fields:
- `briefNumber` — unique human-readable identifier
- `lawyerInChargeId` — assigned lawyer
- `parentBriefId` — hierarchical brief nesting
- `inboundEmailId` — UUID for email-to-brief ingestion
- `deletedAt` — soft delete (briefs are never hard-deleted)

#### `Document`
File attached to a `Brief`. Key fields:
- `url` — Vercel Blob URL
- `ocrStatus` — `pending | processing | done | failed`
- `ocrText` — extracted text from OCR
- Related `DocumentChunk` records store text chunks with pgvector embeddings

#### `Matter`
A legal case/matter linked to a `Client`. Key fields:
- `caseNumber` — court-assigned unique identifier
- `status` — `active | closed | on_hold`
- `nextCourtDate` — drives calendar and reminders
- `lawyerInChargeId` — primary responsible lawyer
- `deletedAt` — soft delete

#### `Client`
A client of the law firm. Unique by `email` per workspace.
- `deletedAt` — soft delete
- `status` — `active | inactive`

#### `Invoice` + `InvoiceItem`
Invoice with line items. Totals computed from items:
- `subtotal` — sum of (quantity × amount) per item
- `vatAmount` — 7.5% of subtotal by default (`vatRate` field)
- `securityChargeAmount` — 1% of subtotal by default
- `totalAmount` — subtotal + vat + security
- `status` — `pending | partially_paid | paid | overdue`

#### `Payment`
Records a payment against an `Invoice`. Updating invoice status is handled by a server action after payment creation (recalculates `paid` vs `outstanding`).

#### `WorkspaceAnomaly`
Auto-detected system health issues. Key fields:
- `type` — anomaly type identifier (e.g. `matter_no_lawyer`, `overdue_invoice`)
- `resourceId` — the ID of the affected record
- `status` — `open | acknowledged | resolved | dismissed`
- `resolvedAt` — set automatically by anomaly scan when issue is fixed
- Composite business key: `type::resourceId` for deduplication

#### `CalendarEntry`
Court dates and appointments. Type enum: `COURT | APPOINTMENT | DEADLINE | OTHER`.
- `deletedAt` — soft delete
- `scheduledNotifications` — pre-scheduled reminder notifications

#### `ComplianceTask`
Regulatory obligation or deadline.
- `recurrence` — e.g. `annual`, `quarterly`, `none`
- Auto-renewal: completing a recurring task creates the next occurrence

#### `AttendanceRecord`
Clock-in/clock-out records. If geofencing is enabled, stores `latitude`/`longitude` of clock event.

#### `WorkEntry`
Billable/non-billable time log per user per matter/brief.

#### `BankAccount`
Firm bank accounts for invoice payment details.

#### `DraftingTemplate` + `DraftingSession`
Template-driven document drafting system. `DraftingNode` defines a step (question/content), `NodeOption` defines branching, `DraftingVariable` defines template variables.

#### `MatterQuestion`
Post-court outcome questions sent by the Proactive AI agent. Records the AI question, the lawyer's response, and the court date it refers to.

#### `LitigationMilestone`
Milestones tracking progression through litigation stages.

#### `SubscriptionPayment`
Monnify subscription payments for workspace upgrade.

---

## Server Actions vs API Routes

### Server Actions (`src/app/actions/`)

Used for all **user-initiated mutations** (create, update, delete). Called directly from client components via `import`. They run on the server and receive validated user context.

Pattern:

```typescript
'use server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function createClient(data: CreateClientInput) {
    const session = await auth();
    if (!session?.user) return { success: false, error: 'Unauthorized' };
    // ... validate workspace membership, then mutate
    const client = await prisma.client.create({ data: { ...data, workspaceId } });
    return { success: true, data: client };
}
```

### API Routes (`src/app/api/`)

Used for:
- **Webhooks** — Monnify payment confirmation, Resend inbound email, BICA execute
- **Cron Jobs** — `/api/cron/*` handlers
- **Public endpoints** — BICA token validation, invite acceptance

API routes validate auth differently:
- Webhooks: validate via HMAC signature (`BICA_SHARED_SECRET`, `CRON_SECRET`, Monnify signature)
- Cron jobs: `Authorization: Bearer CRON_SECRET` header check

### When to Use Which

| Use Case | Approach |
|---|---|
| Form submission, button click | Server Action |
| External webhook (payment, email) | API Route |
| Scheduled job | API Route (cron) |
| File download/stream | API Route |
| Third-party OAuth callback | API Route |

---

## AI Systems

### Eureka AI Assistant

**Location:** `src/app/actions/ai/` + `/api/eureka`

**Model:** `claude-sonnet-4-6` (hardcoded — update to `claude-sonnet-4-7` when ready to migrate)

Eureka uses Claude's **tool use** (function calling) to answer workspace-specific questions. The system prompt provides firm context; tools allow Claude to query live workspace data.

**Available Tools (20+):**

| Tool | Description |
|---|---|
| `get_client_by_name` | Fetch client details by name |
| `get_matter_details` | Fetch matter status, lawyers, court dates |
| `get_brief_content` | Read brief text content |
| `search_documents` | Full-text search across briefs/documents |
| `get_invoices_for_client` | List invoices for a client |
| `get_payment_history` | Payment records for a client or invoice |
| `get_compliance_tasks` | Upcoming or overdue compliance items |
| `get_calendar_events` | Court dates in a date range |
| `list_all_clients` | All workspace clients |
| `list_active_matters` | All open matters |
| `draft_document` | Start a drafting session |
| `get_analytics_summary` | Revenue/activity metrics |
| `get_workspace_members` | Team member list |
| `get_anomalies` | Current open anomaly alerts |

Eureka calls tools iteratively — it may make multiple tool calls in a single user request before returning a final answer.

### Proactive AI Agent

**Location:** `src/lib/ai/proactive-agent.ts`

Runs on a schedule (via cron or triggered by events). Unlike Eureka (reactive), the Proactive Agent acts autonomously:

1. **Court Outcome Questions** (6 PM daily): After each court date, sends a structured question to the assigned lawyer asking them to record what happened.
2. **Anomaly Notifications**: After anomaly scan, may notify relevant team members of newly detected issues.
3. **Week in Court digest**: Aggregates all court proceedings from the week into a formatted email.

**Mutation Tools (6):**

| Tool | Description |
|---|---|
| `record_court_outcome` | Saves full proceedings to `CalendarEntry` |
| `create_matter_question` | Stores a `MatterQuestion` record |
| `send_notification` | Creates a `Notification` for a user |
| `update_matter_status` | Updates `Matter.status` |
| `create_compliance_alert` | Flags a compliance issue |
| `schedule_follow_up` | Schedules a `ScheduledNotification` |

The Proactive Agent uses `claude-sonnet-4-6` for reasoning and returns structured JSON for each mutation.

---

## File & Document Processing

### Upload Flow

1. Client-side: user selects a file.
2. Server Action calls `put(filename, buffer, { access: 'public' })` from `@vercel/blob`.
3. The returned `url` is stored in `Document.url`.
4. A background job (or immediate async call) triggers OCR.

### OCR

Uses **Tesseract.js** (in-process WASM). For PDFs, pages are rasterised to images first.

OCR status lifecycle: `pending → processing → done | failed`

Extracted text stored in `Document.ocrText`. On completion, text is chunked and embeddings are generated via Voyage AI (`voyage-3-large`) and stored in `DocumentChunk.embedding` as pgvector `vector` type.

### PDF Generation (`src/lib/invoice-pdf.ts`)

Uses **jsPDF**. Takes structured invoice data and produces a formatted PDF with letterhead (fetched from `letterheadUrl`), line items table, VAT breakdown, and bank details.

### Word Generation (`src/lib/invoice-docx.ts`)

Uses the **docx** npm package. Same data structure as PDF. Produces an editable `.docx` file.

---

## Anomaly Detection System

**Location:** `src/lib/anomaly/detector.ts`

The anomaly system runs on a daily cron (`/api/cron/anomaly-scan`, 9 AM UTC) and on the Pulse page load.

### Architecture

```
detectAnomalies(workspaceId)
  → returns ALL current problem conditions (no deduplication)

runAnomalyScan(workspaceId)
  → calls detectAnomalies()
  → diffs against open/acknowledged anomalies in DB
  → creates NEW anomalies not yet in DB
  → resolves STALE anomalies whose underlying issue is fixed
  → returns { created: number, resolved: number }
```

### Detected Anomaly Types

| Type | Condition |
|---|---|
| `matter_no_lawyer` | Matter with no `lawyerInChargeId` assigned |
| `overdue_invoice` | Invoice status=pending, dueDate > 30 days ago |
| `client_no_matter` | Client with no active matters for 90+ days |
| `compliance_due_soon` | ComplianceTask due within 7 days, not complete |
| `compliance_overdue` | ComplianceTask past due date |
| `brief_no_activity` | Brief with no activity for 60+ days |
| `court_date_no_outcome` | CalendarEntry past date with no recorded outcome |

### Auto-Resolution

When `runAnomalyScan` finds that an existing open/acknowledged anomaly's `type::resourceId` is no longer in the current problems list, it marks the anomaly as `resolved` with `resolvedAt = now()`. No manual action required.

### Deduplication

The `type::resourceId` composite key ensures each problem appears at most once in the `open` or `acknowledged` state. If a record was resolved and the problem recurs, a new anomaly is created.

---

## Email Architecture

### Outbound Email (Resend)

All outbound email goes through Resend's API. React Email templates are in `src/lib/email/templates/`.

**Email types:**
- `PasswordResetEmail` — password reset link
- `InvitationEmail` — workspace invitation
- `CourtReminderEmail` — 48-hour court date alert
- `WeekInCourtEmail` — Friday court summary digest
- `WeeklyDigestEmail` — firm performance digest

Templates use React Email components rendered to HTML server-side.

### Inbound Email (Optional)

If `WorkspaceEmailConfig` is set, inbound emails to the workspace address (`workspace@inbound.yourdomain.com`) are routed to `/api/email/inbound`. The handler creates a `Task` or `Brief` from the email content using AI classification.

### Cron Digest

The `weekly-digest` cron fires twice: Friday 8 PM and Sunday 7 AM. `DIGEST_WORKSPACE_IDS` can restrict which workspaces receive the digest.

---

## Payment Processing

### Client Invoice Payments (Monnify)

1. Invoice generation creates a Monnify payment order via `createMonnifyPayment()`.
2. Payment link is embedded in the invoice PDF and email.
3. Monnify sends a webhook to `/api/monnify/webhook` when payment is confirmed.
4. The webhook handler validates Monnify's HMAC signature, then calls `createPayment()` server action to record the payment and update invoice status.

### Subscription Payments

Workspace subscriptions are also handled via Monnify. Subscription status is stored on `Workspace.subscriptionStatus` / `subscriptionBand` / `subscriptionTier` / `subscriptionExpiresAt`.

---

## PWA & Push Notifications

### Service Worker

Built with **Serwist** (Workbox wrapper for Next.js). The service worker handles:
- Offline caching of static assets
- Push notification receipt and display

Manifest at `public/manifest.json`. Service worker at `public/sw.js` (generated by Serwist).

### Push Notification Flow

1. User grants notification permission in browser.
2. Browser creates a push subscription (endpoint + VAPID keys).
3. Subscription stored in `PushSubscription` table.
4. Server calls `webpush.sendNotification(subscription, payload)` to push.
5. Service worker receives the push event and shows a notification.

### VAPID Keys

Generated once with `npx web-push generate-vapid-keys`. Stored in environment variables:
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — sent to browser during subscription creation
- `VAPID_PRIVATE_KEY` — used server-side to sign push requests

**Never change VAPID keys after users have subscribed** — this invalidates all existing subscriptions silently.

---

## Performance Patterns

### React.cache() Deduplication

`src/lib/auth/getCurrentUserWithWorkspace.ts` uses `React.cache()` so the root layout and any child server components that call it share a single DB query per request.

### JWT Throttling

`sessionVersion` DB check runs at most once per 60 seconds per session (controlled by `lastVersionCheck` in JWT payload). Prevents auth middleware from hammering the database.

### Pagination

`getClients()`, `getBriefs()`, and similar list actions use `take` and `skip` for cursor-based pagination. The default page size is 20–50 records. The briefs limit was reduced from 500 to 50 in May 2026 to cut initial payload.

### Prisma Connection Pooling

`DATABASE_URL` uses Supabase's PgBouncer (port 6543, transaction mode). The connection string includes `?pgbouncer=true&connection_limit=1` to prevent serverless function concurrency from exhausting the pool.

`DIRECT_URL` (port 5432) is used only for `prisma migrate deploy` — not at runtime.

### Shimmer Skeleton Loading

All data-fetching components show shimmer skeleton placeholders while loading. The `@keyframes shimmer` animation is defined in each component's CSS module:

```css
@keyframes shimmer {
    0% { background-position: -400px 0; }
    100% { background-position: 400px 0; }
}
```

---

## Key Conventions

### Server Actions Return Shape

All server actions return `{ success: boolean, data?: T, error?: string }`. Never throw — always return an error object.

### Soft Deletes

`Client`, `Matter`, `Brief`, and `CalendarEntry` use soft deletes via `deletedAt DateTime?`. List queries always filter `where: { deletedAt: null }`.

### Workspace Isolation

Every query for workspace-scoped data includes `workspaceId` in the `where` clause. Never fetch records without scoping to the authenticated user's workspace.

### CSS Modules

Component styles use CSS Modules (`.module.css`). Avoid Tailwind utility classes inside component files when a CSS module class already exists — CSS modules are the source of truth for component styles. Use CSS custom properties (`var(--primary)`, `var(--bg-primary)`) for theming instead of hardcoded colours.

### Dark Mode

CSS custom properties handle dark mode. Never hardcode colours like `bg-white` in component className strings — use CSS module variables which adapt to the current theme.

### Error Logging

Use `console.error()` in server actions and API routes for unexpected errors. Structured logging (e.g. Sentry) can be added by integrating `@sentry/nextjs` and wrapping server actions.

### TypeScript

The project targets strict TypeScript. `any` usage in component props is a temporary placeholder for Prisma `Decimal` type conflicts — address on a case-by-case basis when types can be tightened.
