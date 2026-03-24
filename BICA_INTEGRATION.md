# BICA Integration — Complete Reference

**Single Source of Truth for AI Agents, Engineers, and Integrators**

> **What is Bica?**
> Bica is the AI conversational intelligence platform (operated by **Fladov**) that connects to **Reforma Legal OS** as a native App. Bica can read and write Reforma data via natural language on behalf of authenticated users, subject to Reforma's internal RBAC. The Fladov SaaS platform hosts the AI layer; Reforma is the backend data source — the "App" embedded into Fladov's workspace.

---

## Table of Contents

1. [Platform Identity](#1-platform-identity)
2. [Architecture Overview](#2-architecture-overview)
3. [Authentication & Session Flow](#3-authentication--session-flow)
4. [The Execute Endpoint (Core API)](#4-the-execute-endpoint-core-api)
5. [Operation Types](#5-operation-types)
6. [JEQL Query Language](#6-jeql-query-language)
7. [CRUD Engine & Write Operations](#7-crud-engine--write-operations)
8. [Entity Playbooks (Data Models)](#8-entity-playbooks-data-models)
9. [Role-Based Access Control (RBAC)](#9-role-based-access-control-rbac)
10. [Morph Registry & Polymorphic Scoping](#10-morph-registry--polymorphic-scoping)
11. [Security Model](#11-security-model)
12. [Idempotency](#12-idempotency)
13. [Error Codes & Response Shape](#13-error-codes--response-shape)
14. [Environment Variables](#14-environment-variables)
15. [End-to-End Request Lifecycle](#15-end-to-end-request-lifecycle)
16. [Bica Behavioural Protocols](#16-bica-behavioural-protocols)
17. [Entity Parentage Map](#17-entity-parentage-map)
18. [Preview Cards](#18-preview-cards)
19. [Integration Test Script](#19-integration-test-script)
20. [Key Constraints & Business Rules](#20-key-constraints--business-rules)

---

## 1. Platform Identity

| Property | Value |
|---|---|
| **App ID** | `reforma_os` |
| **App Name** | Reforma Legal OS |
| **Version** | 1.2.0 (manifest) |
| **Platform Operator** | Fladov (`fladov.app`) |
| **Bot Name** | Reforma Assistant |
| **Brand Color** | `#121826` |
| **Accent Color** | `#3182ce` |
| **Logo** | `https://reforma.ng/assets/logo-icon.png` |
| **Greeting** | `"Good morning. How can Reforma assist your practice and compliance needs today?"` |

### Suggested Conversation Starters

- "View upcoming court dates"
- "Summarize meeting recordings"
- "Check pending compliance tasks"
- "Generate an invoice for Client X"
- "Draft a new litigation brief"
- "Record a payment of ₦50,000"

---

## 2. Architecture Overview

```
┌────────────────────────────────────────────────┐
│                  Fladov (Bica)                  │
│  Conversational AI · Natural Language Interface │
└──────────────┬────────────────┬────────────────┘
               │ POST (HMAC)    │ GET (iframe)
               ▼                ▼
┌──────────────────────┐  ┌────────────────────────┐
│  /api/bica/execute   │  │  /api/bica/sessions    │
│  (Core data ops)     │  │  (Magic Entry Token)   │
└──────────┬───────────┘  └────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────┐
│            Bica Handler Layer                    │
│  lookup · direct_lookup · write · preview        │
└──────────┬───────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────┐
│           JEQL Compiler + CRUD Engine            │
│         Translates Bica ops → Prisma args        │
└──────────┬───────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────┐
│         PostgreSQL via Prisma ORM                │
│     (Supabase · multi-tenant by workspaceId)     │
└──────────────────────────────────────────────────┘
```

**Key files:**

| File | Purpose |
|---|---|
| `src/app/api/bica/execute/route.ts` | Main Bica inbound endpoint |
| `src/app/api/bica/sessions/route.ts` | Generates Magic Entry Token for Bica iframe |
| `src/lib/bica/handlers/index.ts` | Routes `operation_type` → handler class |
| `src/lib/bica/operations/lookup.ts` | JEQL-based data reads |
| `src/lib/bica/operations/direct-lookup.ts` | Text-search lookups |
| `src/lib/bica/operations/write.ts` | Crud write operations |
| `src/lib/bica/operations/preview.ts` | HTML preview card generation |
| `src/lib/bica/crud-engine.ts` | Executes parameterSet arrays |
| `src/lib/bica/morph-registry.ts` | Resolves platform entity by type + ID |
| `src/lib/bica/playbooks/index.ts` | Playbook registry + per-model metadata |
| `src/lib/bica/handlers/utils.ts` | Polymorphic relation scope resolver |
| `src/lib/bica/handlers/label-config.ts` | Human-readable label/secondaryLabel per model |
| `src/lib/bica/lib/jeql/compiler.ts` | JEQL → Prisma query compiler |
| `src/lib/bica/lib/jeql/operators.ts` | Operator translation helpers |
| `src/lib/bica/lib/jeql/types.ts` | JEQL type definitions |
| `src/lib/bica/lib/jeql/utils.ts` | Date, pattern, and search utilities |
| `bica-integration/` | Canonical entity playbook JSON files + manifests |

---

## 3. Authentication & Session Flow

### 3.1 Inbound (Fladov → Reforma)

All inbound requests to `/api/bica/execute` are **signed with HMAC-SHA256**:

```
X-Custom-Platform-Signature: <hex(HMAC-SHA256(BICA_SHARED_SECRET, rawBody))>
```

Reforma verifies this signature using `crypto.timingSafeEqual`. A 5-minute timestamp window provides **replay protection**.

> **Dev override:** Setting `BICA_DISABLE_HMAC=true` disables signature verification locally. **Never enable in production.**

### 3.2 Session Generation (Reforma → Fladov)

When a Reforma user opens the Bica embedded iframe:

1. Reforma frontend calls `POST /api/bica/sessions` (must have a live NextAuth session).
2. Reforma backend fetches the user's profile from the database.
3. Reforma signs a payload and calls Fladov's session API:
   ```
   POST https://fladov.app/api/v1/platforms/{BICA_PLATFORM_ID}/generate-session
   ```
   Body:
   ```json
   {
     "platform_entity_type": "App\\Models\\User",
     "platform_entity_id": "<userId>",
     "email": "<user.email>",
     "profile": { "name": "<user.name>", "avatar_url": "<user.image>" }
   }
   ```
4. Fladov returns `{ token, entry_url }`.
5. Reforma returns `entry_url` to the frontend for iframe rendering.

### 3.3 API Keys (v1 REST)

For direct API consumers (not Bica), keys follow the pattern `rf_sk_live_*`. Keys are stored as SHA-256 hashes (`keyHash`) in the `ApiKey` table — the raw key is shown only once on creation. Keys are workspace-scoped.

---

## 4. The Execute Endpoint (Core API)

```
POST /api/bica/execute
Content-Type: application/json
X-Custom-Platform-Signature: <hmac>
```

### Request Body Shape

```json
{
  "operation_type": "lookup | direct_lookup | write | preview",
  "operation_id": "unique-uuid-for-idempotency",
  "test_mode": false,
  "timestamp": "2026-03-24T12:00:00.000Z",
  "user_context": {
    "platform_entity_type": "user | workspace",
    "platform_entity_id": "<cuid>"
  },
  "payload": { ... }
}
```

### Response Body Shape

```json
{
  "status": "success | failed",
  "data": { ... },
  "error": null
}
```

On failure:
```json
{
  "status": "failed",
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR | NOT_FOUND | UNAUTHORIZED | SERVER_ERROR",
    "message": "Human-readable description"
  }
}
```

---

## 5. Operation Types

Four operation types are supported. The `operation_type` field in the request body selects the handler.

| `operation_type` | Handler Class | Purpose |
|---|---|---|
| `lookup` | `LookupHandler` | JEQL-based structured query to read records |
| `direct_lookup` | `DirectLookupHandler` | Free-text search across searchable fields |
| `write` | `WriteHandler` | Create / update / delete via Crud parameterSets |
| `preview` | `PreviewHandler` | Generate HTML preview cards for given record IDs |

---

## 6. JEQL Query Language

JEQL (JSON Entity Query Language) is Reforma's internal query DSL. It compiles to Prisma read-query arguments through the modular implementation under `src/lib/bica/lib/jeql/`.

### Type Definition

```ts
type JEQLQuery = {
  $select?: string[];
  $with?: Record<string, JEQLQuery>;          // eager-load relations
  $whereAll?: JEQLCondition[];                // AND conditions
  $whereAny?: JEQLCondition[];                // OR conditions
  $whereHas?: Record<string, JEQLQuery>;      // relation EXISTS filter
  $whereNotHas?: Record<string, JEQLQuery>;
  $orderBy?: [string, 'asc' | 'desc'][];
  $limit?: number;
  $offset?: number;
  $withSemanticMatches?: string | string[] | Record<string, string>;
};

type JEQLCondition =
  | [field: string, operator: JEQLOperator, value: any]
  | { $whereAll: JEQLCondition[] }
  | { $whereAny: JEQLCondition[] };

type JEQLOperator =
  | '=' | '!=' | '>' | '<' | '>=' | '<='
  | 'in' | 'not in' | 'like' | 'search' | 'json_contains'
  | 'date>' | 'date<' | 'date>=' | 'date<=' | 'date=' | 'date!=' | 'date_between';
```

### Current Prisma-Backed Semantics

- `$whereAll` and `$whereAny` compile to nested Prisma `AND` and `OR` clauses.
- `$whereHas` and `$whereNotHas` compile to relation `some` and `none` filters.
- `like` is translated to Prisma string filters using `%term%`, `term%`, `%term`, or exact case-insensitive matching.
- `search` is implemented as broad, case-insensitive candidate matching over the full term plus tokenized words. Prisma does not expose SOUNDEX, so phonetic matching is not part of the current compiler.
- `date=` and `date_between` are compiled as inclusive UTC date ranges.
- `$withSemanticMatches` currently throws a validation error until the analytics-backed semantic matching layer is restored.

### Example: Lookup with JEQL

```json
{
  "operation_type": "lookup",
  "payload": {
    "query_lang": "jeql",
    "scope": "Client",
    "operations": {
      "$whereAll": [["status", "=", "active"]],
      "$orderBy": [["name", "asc"]],
      "$limit": 20
    }
  }
}
```

### Lookup Response

```json
{
  "status": "success",
  "data": {
    "matches": [
      {
        "id": "cuid...",
        "label": "Dangote Industries",
        "secondaryLabel": "Company: Dangote Group",
        "confidence": 1.0
      }
    ]
  }
}
```

---

## 7. CRUD Engine & Write Operations

`WriteHandler` exclusively supports `action: "Crud"`. It accepts an array of **parameterSets**, each describing one atomic DB operation.

### Write Request Shape

```json
{
  "operation_type": "write",
  "payload": {
    "action": "Crud",
    "parameterSets": [
      {
        "action": "create | createMany | read | count | update | updateEach | delete",
        "parentEntityType": "workspace | user",
        "parentEntityId": "<cuid>",
        "data": { ... }
      }
    ]
  }
}
```

### Supported Crud Actions

#### `create`
```json
{
  "action": "create",
  "data": {
    "relationName": "clients",
    "definition": {
      "name": "First Bank of Nigeria",
      "email": "legal@firstbanknigeria.com",
      "status": "active"
    }
  }
}
```
Returns: `{ id, created: true, record }`

#### `createMany`
```json
{
  "action": "createMany",
  "data": {
    "relationName": "tasks",
    "definition": [
      { "title": "File Motion", "status": "pending", "priority": "high" },
      { "title": "Client Call", "status": "pending", "priority": "medium" }
    ]
  }
}
```
Returns: `{ count, created: true }`

#### `read`
```json
{
  "action": "read",
  "data": {
    "scope": "briefs",
    "targetOperations": {
      "$whereAll": [["status", "=", "active"]],
      "$limit": 10
    }
  }
}
```
Returns: `{ records: [...] }`

#### `count`
```json
{
  "action": "count",
  "data": {
    "scope": "matters",
    "targetOperations": {
      "$whereAll": [["status", "=", "active"]]
    }
  }
}
```
Returns: `{ count: 7 }`

#### `update`
```json
{
  "action": "update",
  "data": {
    "scope": "briefs",
    "targetOperations": { "$whereAll": [["id", "=", "<id>"]] },
    "attributes": { "status": "completed" }
  }
}
```
Returns: `{ count, updated: true }`

#### `updateEach`
Applies a distinct `attributes` object to each matched record (index-aligned).

Returns: `{ count, updated: true }`

#### `delete`
```json
{
  "action": "delete",
  "data": {
    "scope": "clients",
    "targetOperations": { "$whereAll": [["id", "=", "<id>"]] }
  }
}
```
Returns: `{ count, deleted: true }`

### Relation → Model Mapping (CRUD Engine)

| Relation name (plural) | Prisma model |
|---|---|
| `clients` | `client` |
| `matters` | `matter` |
| `briefs` | `brief` |
| `tasks` | `task` |
| `invoices` | `invoice` |
| `payments` | `payment` |
| `calendarEntries` | `calendarEntry` |
| `meetingRecordings` | `meetingRecording` |
| `complianceTasks` | `complianceTask` |
| `draftingTemplates` | `draftingTemplate` |
| `documents` | `document` |

---

## 8. Entity Playbooks (Data Models)

All entities live in a **workspace-scoped** multi-tenant PostgreSQL database via Prisma. IDs are CUIDs. Monetary amounts are in **kobo** (100 kobo = ₦1.00).

---

### Client
> Central entity — everything else relates to a Client.

| Field | Type | Rules |
|---|---|---|
| `id` | CUID | Auto-generated. Prohibited in writes. |
| `name` | String (255) | **Required.** Full legal name. |
| `email` | String (255) | **Required.** Must be unique within workspace. |
| `phone` | String (20) | Nullable. |
| `company` | String (255) | Nullable. Organization name. |
| `industry` | String (100) | Nullable. |
| `status` | Enum | **Required.** `active` or `inactive`. |

**Children:** Matter, Brief, Invoice, Task, CalendarEntry, Payment

**⚠️ Business rule:** Before creating a Client, Bica **must** search for existing clients with similar names to prevent duplicates (conflict of interest check).

**Preview link:** `https://app.reforma.ng/management/clients/{entity_id}`

---

### Matter
> A specific legal case. Tracks the court, judge, opponent, and hearing schedule.

| Field | Type | Rules |
|---|---|---|
| `id` | CUID | Auto-generated. Prohibited in writes. |
| `caseNumber` | String | Nullable. Official court reference. Unique system-wide. |
| `name` | String (255) | **Required.** Internal case title. |
| `court` | String (255) | Nullable. Presiding court jurisdiction. |
| `judge` | String | Nullable. Presiding judge name. |
| `opponentName` | String | Nullable. Opposing party. |
| `opponentCounsel` | String | Nullable. Opposing counsel. |
| `status` | Enum | **Required.** `active`, `closed`, or `pending`. |
| `nextCourtDate` | DateTime | Nullable. |

**Children:** Brief, CalendarEntry, Task, MeetingRecording, Invoice

**Preview link:** `https://app.reforma.ng/matters/{entity_id}`

---

### Brief
> Formal legal document, assignment, or court-related task.

| Field | Type | Rules |
|---|---|---|
| `id` | CUID | Auto-generated. Prohibited in writes. |
| `briefNumber` | String | System-generated. Prohibited in writes. |
| `customBriefNumber` | String (100) | Nullable. Firm's internal numbering override. |
| `name` | String (255) | **Required.** Title or subject. |
| `category` | String (100) | **Required.** e.g., `Litigation`, `Advisory`, `Corporate`. |
| `status` | Enum | **Required.** `active`, `completed`, `pending`, or `archived`. |
| `dueDate` | Date | Nullable. Filing deadline. |
| `description` | String | Nullable. Background notes. |

**Children:** Document, Task, CourtDate (CalendarEntry)

**⚠️ Business rules:**
- Every Brief **must** be linked to a parent Client.
- Editing/deleting briefs is restricted to **Admin** and **Managing Partner** roles.
- `customBriefNumber` must be unique across the workspace.

**Preview link:** `https://app.reforma.ng/briefs/{entity_id}`

---

### Invoice
> Bill for legal services. **Financially restricted.**

| Field | Type | Rules |
|---|---|---|
| `id` | CUID | Auto-generated. Prohibited in writes. |
| `invoiceNumber` | String | System-generated unique reference. Prohibited in writes. |
| `status` | Enum | **Required.** `pending`, `paid`, `overdue`, or `cancelled`. |
| `billToName` | String (255) | **Required.** The entity being billed. |
| `totalAmount` | Integer (kobo) | **Required.** Min: 0. Must be in kobo. |
| `dueDate` | Date | Nullable. |
| `notes` | String | Nullable. Payment instructions. |

**Children:** InvoiceItem, Payment

**⚠️ Business rules:**
- Can only be created/modified by users with **Admin** or **Managing Partner** roles.
- Bica **must verify role** before creating or modifying an invoice.
- Every Invoice **must** be linked to a Client, ideally also to a Matter.
- All amounts are in **kobo** (1000 = ₦10.00).

**Preview link:** `https://app.reforma.ng/management/office/invoices/{entity_id}`

---

### Payment
> Inbound financial transaction. **Highly restricted.**

| Field | Type | Rules |
|---|---|---|
| `id` | CUID | Auto-generated. Prohibited in writes. |
| `amount` | Integer (kobo) | **Required.** Min: 0. |
| `method` | String (50) | **Required.** e.g., `Transfer`, `Cash`, `POS`. |
| `reference` | String (255) | Nullable. Transaction ID. |
| `date` | Date | **Required.** Date payment was received. |

**⚠️ Business rules:**
- Recording a payment requires **Finance** or **Admin** clearance.
- Must be tied to a Client and optionally an Invoice.

**Preview link:** `https://app.reforma.ng/management/office/payments/{entity_id}`

---

### CalendarEntry
> Firm calendar entry: hearings, court dates, client meetings, deadlines.

| Field | Type | Rules |
|---|---|---|
| `id` | CUID | Auto-generated. Prohibited in writes. |
| `date` | DateTime | **Required.** |
| `type` | Enum | **Required.** `COURT_DATE`, `FILING_DEADLINE`, `CLIENT_MEETING`, `INTERNAL_MEETING`, `OTHER`. |
| `title` | String (255) | **Required.** Event title. |
| `proceedings` | String | Nullable. What transpired. |
| `outcome` | String | Nullable. Result summary. |
| `adjournedFor` | String | Nullable. Reason for adjournment. |
| `judge` | String | Nullable. Judge for this specific date. |
| `externalCounsel` | String | Nullable. External counsel appearing. |

**Children:** MeetingRecording

**Preview link:** `https://app.reforma.ng/calendar`

---

### Task
> General action item within a workspace.

| Field | Type | Rules |
|---|---|---|
| `id` | CUID | Prohibited in writes. |
| `title` | String (255) | **Required.** |
| `description` | String | Nullable. |
| `status` | Enum | **Required.** `pending`, `in_progress`, `completed`, `on_hold`. |
| `priority` | Enum | **Required.** `low`, `medium`, `high`, `urgent`. |
| `dueDate` | Date | Nullable. |

**Preview link:** `https://app.reforma.ng/management/tasks`

---

### ComplianceTask
> Regulatory compliance monitoring and reporting task.

| Field | Type | Rules |
|---|---|---|
| `id` | CUID | Prohibited in writes. |
| `status` | Enum | **Required.** `pending`, `concluded`, `overdue`. |
| `dueDate` | Date | Nullable. Regulatory deadline. |
| `period` | String | Nullable. e.g., `Q1 2024`. |
| `evidenceUrl` | URL | Nullable. Proof of compliance upload. |

**Preview link:** `https://app.reforma.ng/management/compliance`

---

### MeetingRecording
> Audio and AI transcription of a court/client meeting session.

| Field | Type | Rules |
|---|---|---|
| `id` | CUID | Prohibited in writes. |
| `audioFileUrl` | URL | Nullable. Stored audio file reference. |
| `transcriptText` | String | Nullable. Full AI transcription. |
| `recordingDuration` | Integer | Nullable. Duration in seconds. |

**Preview link:** `https://app.reforma.ng/matters/{matterId}`

---

### DraftingTemplate
> Automation template for legal document generation.

| Field | Type | Rules |
|---|---|---|
| `id` | CUID | Prohibited in writes. |
| `name` | String (255) | **Required.** |
| `category` | String (100) | **Required.** |
| `isPublished` | Boolean | **Required.** Whether active for use. |

**Preview link:** `https://app.reforma.ng/drafting`

---

## 9. Role-Based Access Control (RBAC)

### Roles (ascending seniority)

| Level | Role | Description |
|---|---|---|
| 0 | `Intern / Extern` | Temporary or external staff |
| 1 | `Associate` | Junior lawyer |
| 2 | `Senior Associate` | Experienced lawyer |
| 3 | `Practice Manager` | Manages operations |
| 4 | `Deputy Head of Chamber` | Deputy leadership |
| 5 | `Head of Chamber` | Chamber leadership |
| 6 | `Partner` | Firm partner |
| 7 | `Managing Partner` | Top authority |

Plus special system role: **`owner`** (workspace creator — can assign any role).

### Permission Reference

| Action | Minimum Role |
|---|---|
| Delete a Brief | Head of Chamber / Managing Partner |
| Edit Lawyer-in-Charge on Brief | Practice Manager+ |
| Edit custom brief number | Practice Manager+ |
| Create/modify Invoice | Managing Partner / Admin |
| Record Payment | Finance / Admin |
| Invite members | Partner / Managing Partner / Owner |
| Manage office (RBAC-gated UI) | Practice Manager |

### How RBAC Surfaces to Bica

Bica learns about role requirements from the `description` field in each entity playbook. When Bica attempts a financial mutation, it must:
1. **Confirm** the `user_context.platform_entity_type` is `user`
2. **Verify** the user's role meets the minimum threshold
3. **Alert** the user if they lack clearance — do not attempt the write

---

## 10. Morph Registry & Polymorphic Scoping

Every inbound Bica request identifies **who is acting** via `user_context`:

```json
{
  "user_context": {
    "platform_entity_type": "user",
    "platform_entity_id": "<userId>"
  }
}
```

The **Morph Registry** (`src/lib/bica/morph-registry.ts`) resolves this to a live Prisma entity. Registered types:

| `platform_entity_type` | Resolves to |
|---|---|
| `user` | `prisma.user.findUnique({ where: { id } })` |
| `workspace` | `prisma.workspace.findUnique({ where: { id } })` |

Errors thrown:
- `UnknownMorphTypeError` — type not in registry
- `MorphEntityNotFoundError` — record not found

### Relation Scope Resolution

Once the entity is resolved, every query is **scoped** to that entity's data. The resolver (`src/lib/bica/handlers/utils.ts`) maps entity types to Prisma `where` filters:

**User scope:**
| Relation | Prisma Filter |
|---|---|
| `clients` | `workspace.members.some(userId)` |
| `matters` | `lawyerInChargeId = userId OR lawyers.some(lawyerId = userId)` |
| `briefs` | `lawyerId = userId OR lawyerInChargeId = userId` |
| `tasks` | `assignedToId = userId OR assignedById = userId` |
| `calendarEntries` | `submittingLawyerId = userId OR appearances.some(userId)` |

**Workspace / Firm scope:**
All relations → `{ workspaceId: firm.id }` (simple workspace isolation).

> A user can **only see and act on** records scoped to their identity. Cross-firm data leakage is structurally impossible.

---

## 11. Security Model

### Signature Verification

- **Algorithm:** HMAC-SHA256
- **Header:** `X-Custom-Platform-Signature`
- **Key:** `BICA_SHARED_SECRET` (min recommended: 32+ character random string)
- **Comparison:** `crypto.timingSafeEqual` (prevents timing attacks)

### Timestamp Replay Protection

- Request timestamp must be within **±5 minutes** of server time.
- Stale requests are rejected with `401 UNAUTHORIZED`.

### Workspace Isolation

- Every Prisma query enforces `workspaceId` (or equivalent relation filter) at the server.
- Server-side enforcement — not dependent on UI or Bica's own logic.

### Idempotency Log

- `BICA_EXECUTE` events are recorded in `SecurityAuditLog` with the `operation_id`.
- Duplicate `operation_id` within a session returns the cached result without re-executing.

---

## 12. Idempotency

If a request includes a non-empty `operation_id` and `test_mode` is not `true`:

1. Reforma checks `SecurityAuditLog` for a record with `event = 'BICA_EXECUTE'` and `description = operation_id`.
2. If found, the cached `metadata` is returned immediately — **no DB write re-executed**.
3. If not found, the operation runs and the result is stored.

```ts
// Idempotency check (simplified)
const existing = await prisma.securityAuditLog.findFirst({
  where: { event: 'BICA_EXECUTE', description: operationId }
});
if (existing) return cached response;
```

---

## 13. Error Codes & Response Shape

| Code | HTTP | Meaning |
|---|---|---|
| `UNAUTHORIZED` | 401 | HMAC signature invalid, stale timestamp, missing user_context |
| `NOT_FOUND` | 404 | Morph entity (user/workspace) not found |
| `VALIDATION_ERROR` | 400 | Missing required fields, unknown operation_type, unknown relation |
| `SERVER_ERROR` | 500 | Unexpected internal error |
| `SESSION_GENERATION_FAILED` | 502 | Fladov returned an error when generating Magic Entry Token |

---

## 14. Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `BICA_PLATFORM_ID` | `reforma_os` | App slug used in Fladov API URLs |
| `BICA_SHARED_SECRET` | `dev_secret_keys` | HMAC signing key (change in production!) |
| `BICA_DISABLE_HMAC` | `false` | Disables signature check for local dev **only** |
| `FLADOV_BASE_URL` | `https://fladov.app` | Fladov platform base URL |
| `DATABASE_URL` | — | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | — | NextAuth session encryption key (min 32 chars) |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Public app URL |

> **Security note:** `BICA_SHARED_SECRET` must be a strong random string in production. The default `dev_secret_keys` is publicly documented and insecure.

---

## 15. End-to-End Request Lifecycle

```
Bica/Fladov               Reforma /api/bica/execute
─────────────────────────────────────────────────────────
1. Build request body
   (operation_type, payload, user_context, operation_id)
   ↓
2. Sign body with HMAC-SHA256
   X-Custom-Platform-Signature: <hash>
   ↓
3. POST ──────────────────────────────────────────────────►
                                         4. Parse raw body
                                         5. Verify HMAC signature
                                         6. Validate timestamp (±5 min)
                                         7. Resolve platform entity
                                            via MorphRegistry
                                         8. Check idempotency log
                                         9. Route to handler:
                                            lookup / direct_lookup
                                            / write / preview
                                        10. Handler resolves
                                            relation scope
                                        11. Execute Prisma query
                                            (JEQL compile if needed)
                                        12. Log to SecurityAuditLog
                                        13. Return response ◄──────
4. Receive { status, data, error }
```

---

## 16. Bica Behavioural Protocols

These are **hard rules** Bica must follow, encoded in the `platform.json` playbook protocols:

### RBAC Verification
> Before any financial mutation (Invoice/Payment creation or modification) or sensitive record deletion, Bica **must** explicitly confirm the user has `Admin` or `Finance` role clearance. Do not proceed without confirmation.

### Conflict of Interest Check (Deduplication)
> When creating a new Client, Bica **must** search for existing records with identical or phonetically similar names and **flag potential duplicates** to the user before creating.

### Relationship Integrity
> Every Brief must be strictly linked to a parent Client. Matters should be associated with parent Clients before any court dates or recordings follow. Bica should refuse or warn if these links are missing.

### Compliance Monitoring
> When querying for deadlines, Bica should cross-reference `ComplianceTasks` alongside court calendar entries to provide a **unified risk view** for the firm. Never report court dates in isolation.

---

## 17. Entity Parentage Map

This is the canonical model hierarchy. Bica should understand these relationships when resolving context:

```
Workspace
├── ComplianceTask
└── DraftingTemplate

Client
├── Matter
│   ├── Brief
│   ├── CalendarEntry
│   │   └── MeetingRecording
│   ├── Task
│   ├── MeetingRecording
│   └── Invoice
│       └── Payment (InvoiceItem)
├── Brief
│   ├── Task
│   └── CalendarEntry
├── Invoice
│   └── Payment
└── Task
```

---

## 18. Preview Cards

The `preview` operation generates embeddable HTML cards for Bica to show contextual record summaries.

### Request
```json
{
  "operation_type": "preview",
  "payload": {
    "model": "Client",
    "ids": ["cuid1", "cuid2"]
  }
}
```

### Response
```json
{
  "status": "success",
  "data": {
    "cuid1": "<div class=\"bica-preview-card\">...</div>",
    "cuid2": "<div class=\"bica-preview-card\">...</div>"
  }
}
```

HTML preview cards include: primary label, secondary label, model type, and record ID. All values are HTML-escaped against XSS.

### Label Resolution Per Model

| Model | `label` | `secondaryLabel` |
|---|---|---|
| `client` | `name` or `company` | `Company: {company}` or `email` |
| `matter` | `name` or `caseNumber` | `Case: {caseNumber}` or `status` |
| `task` | `title` | `[{status}]` |
| `user` | `name` or `email` | `email` |
| *(default)* | `name / title / caseNumber / briefNumber / id` | `[{status}]` + `email` |

---

## 19. Integration Test Script

File: `scripts/bica-test.mjs`

Tests all four operation types against a running Reforma instance.

```bash
# Set environment
$env:BICA_SHARED_SECRET = "dev_secret_keys"
$env:EXTERNAL_USER_ID   = "<a valid userId from the database>"
$env:BASE_URL           = "http://localhost:3000"

# Run
node scripts/bica-test.mjs
```

**Test suite covers:**
1. `lookup` — JEQL query for clients (limit 5)
2. `direct_lookup` — Text search for clients matching "Okafor"
3. `write` (create) — Creates a test client
4. `preview` — HTML card for the newly created client
5. `write` (delete) — Cleans up the test client
6. Security — Verifies invalid HMAC returns `401`

Unit coverage for the JEQL compiler lives under `src/lib/bica/lib/jeql/__tests__/compiler.test.ts` and runs with `vitest`.

---

## 20. Key Constraints & Business Rules

- **Monetary amounts** are always in **kobo** (integer). Never store or accept Naira floats. (100 kobo = ₦1.00)
- **IDs** are CUIDs (auto). The `id` field is always `prohibited` in write payloads — Reforma generates it.
- **System fields** (`briefNumber`, `invoiceNumber`) are server-generated and prohibited in write payloads.
- **Multi-tenancy**: Every entity is isolated per workspace. An entity in Firm A is never visible to Firm B.
- **Soft deletes**: The `Brief` model has `deletedAt`. The platform is moving toward soft deletes for `Matter` and `Document` for legal evidence preservation.
- **MFA**: Not yet enforced at login, but `mfaEnabled`/`mfaSecret` columns exist on `User`. Enterprise clients will require it.
- **Conversation cap**: Max 50 messages per Bica conversation session.
- **Searchable fields** (used by `direct_lookup`):
  - `workspace`: name, slug, firmCode
  - `user`: name, email
  - `client`: name, email, company
  - `matter`: name, caseNumber
  - `brief`: name, briefNumber
  - `task`: title, description
  - `invoice`: invoiceNumber
- **Request timeout**: Fladov expects responses within **30,000ms** (30 seconds).
- **Direct lookup limit**: Returns a maximum of **20** records.

---

*Document generated from full source analysis of Reforma Legal OS — March 2026.*
*Engineering Team, Reforma.*
