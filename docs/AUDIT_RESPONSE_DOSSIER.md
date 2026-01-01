# AUDIT RESPONSE DOSSIER: Security & Infrastructure

**Date:** Jan 1, 2026
**To:** Reforma Leadership
**From:** Engineering Team

---

## Executive Summary

Reforma’s core foundation is **structurally sound regarding authentication and data isolation**, which are the highest-risk areas for a multi-tenant legal SaaS. We strictly enforce workspace boundaries at the API level, preventing cross-firm data leaks.

However, our **file processing pipeline is immature** and poses a scalability risk. We also lack **enterprise-grade observability** (logging) and **field-level encryption** for ultra-sensitive data.

**Overall Rating:** 🟡 **AMBER (Growth Ready, but needs specific upgrades)**

---

## 1. Architecture & Infrastructure
**Status:** 🟢 **GREEN** (with notes)

*   **Hosting:** Vercel (AWS underhood). excellent global CDN and redundancy.
*   **Database:** Supabase (PostgreSQL). Enterprise-grade, automated backups, point-in-time recovery enabled.
*   **Isolation:** Logical isolation via `workspaceId` enforcement in every critical API query.

**Action Item:** Ensure Supabase "Point-in-Time Recovery" (PITR) is explicitly active for the production tier.

---

## 2. Authentication & Access Control
**Status:** 🟢 **GREEN**

*   **Mechanism:** NextAuth v5 (Industry Standard).
*   **RBAC:** Role-Based Access Control (`owner`, `partner`, `associate`) is baked into the session and database schema.
*   **API Security:** All v1 API endpoints use a standardized `withApiAuth` wrapper that strictly validates the Bearer token and enforces workspace context.
    *   *Audit Proof:* `src/app/api/v1/matters/route.ts` explicitly forces `where: { workspaceId: auth.workspaceId }`.

**Action Item:** Implement **MFA (Multi-Factor Authentication)**. Currently, we rely on password/email. Enterprise firms will mandate 2FA.

---

## 3. Data Security & Encryption
**Status:** 🟡 **AMBER**

*   **At Rest:** Database storage is encrypted by Supabase/AWS.
*   **In Transit:** All traffic is TLS 1.3 (HTTPS).
*   **Sensitive Fields:**
    *   Passwords are hashed (`bcrypt`).
    *   `revenuePin` appears to be stored in plain text or simple hash.
    *   Case descriptions and client notes are stored as plain text in the DB.

**Action Item (Critical for Enterprise):** Implement **Field-Level Encryption** for highly sensitive columns (e.g., `Matter.description`, `Client.phone`) so that even a DB dump is unreadable without application keys.

---

## 4. File Storage & Processing
**Status:** 🔴 **RED (Critical Priority)**

*   **Current State:** Vercel Blob with synchronous uploads.
*   **Risk:**
    *   **Timeouts:** Large legal PDFs (50MB+) often fail to upload/process within the 60s serverless limit.
    *   **Cost:** Vercel Blob is expensive at scale.
    *   **Performance:** OCR (`tesseract.js`) runs on the main thread, blocking the server.

**Action Item:** **IMMEDIATE MIGRATION** to Cloudflare R2 + Asynchronous Background Workers (Inngest). See `docs/SCALABILITY_STRATEGY.md`.

---

## 5. Monitoring & Logging
**Status:** 🔴 **RED**

*   **Current State:** Reliance on `console.log` / `console.error`. Logs are ephemeral in Vercel.
*   **Risk:** If a firm reports "data missing", we have limited history to debug *who* deleted it and *when* if the logs have rotated.

**Action Item:** Integrate a structured logging provider (e.g., **Sentry** or **Datadog**). We need to track:
    *   Failed login attempts (Security)
    *   Permission denied errors (Security)
    *   API performance latency (Scale)

---

## 6. Compliance (NDPR/GDPR)
**Status:** 🟡 **AMBER**

*   **Data Residency:** Supabase region is likely us-east-1 or eu-central-1. NDPR often prefers local or EU hosting.
*   **Right to Erasure:** We have `DELETE` endpoints, but we need a "Soft Delete" mechanism to recover accidental deletions (legal requirement for evidence preservation).

**Action Item:** Implement **Soft Deletes** (`deletedAt` timestamp) for all core models (`Matter`, `Brief`, `Document`).

---

## Remediation Roadmap

### Phase 1: High Velocity (Next 2 Weeks)
1.  [ ] **Files:** Migrate Storage to Cloudflare R2 (Scalability Strategy).
2.  [ ] **Logging:** Install Sentry for error tracking.

### Phase 2: Enterprise Trust (Month 1)
3.  [ ] **Security:** Enable MFA for `owner` and `partner` accounts.
4.  [ ] **Compliance:** Implement Soft Deletes for Matters/Documents.

### Phase 3: Institutional Grade (Quarter 1)
5.  [ ] **Encryption:** Encrypt sensitive DB fields at rest.
6.  [ ] **Audit:** Build an "Audit Log" UI for Firm Admins to see who accessed what case.
