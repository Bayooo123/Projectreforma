# Reforma — User & Client Manual

> Version 1.0 | May 2026 | For all law firm staff using Reforma

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard & Pulse](#dashboard--pulse)
3. [Briefs (Document Repository)](#briefs-document-repository)
4. [Calendar](#calendar)
5. [Matters (Litigation)](#matters-litigation)
6. [Clients & Client Manager](#clients--client-manager)
7. [Invoicing & Payments](#invoicing--payments)
8. [Compliance Tracker](#compliance-tracker)
9. [Analytics](#analytics)
10. [Eureka AI Assistant](#eureka-ai-assistant)
11. [Attendance & Work Entries](#attendance--work-entries)
12. [Settings](#settings)
13. [Notifications](#notifications)
14. [Role Permissions Reference](#role-permissions-reference)

---

## Getting Started

### Signing In

1. Navigate to your firm's Reforma URL (e.g. `https://reforma.vercel.app`).
2. Enter your email and password.
3. If your firm uses two-factor authentication, enter the code from your authenticator app.

### First-Time Setup (Firm Owners)

When you log in for the first time as a firm owner:

1. Complete the **Branding Setup** wizard — enter your firm name, upload your letterhead, and choose accent colours.
2. Add your **Bank Account** in Settings → Bank Accounts. This is required before any invoice can be generated.
3. Invite team members under Settings → Team Members.
4. Configure geofencing (optional) under Settings → Workspace Settings if you need attendance location enforcement.

### Joining an Existing Workspace

If your firm owner sent you an invitation link or gave you the Firm Code + password:
- **Invitation link:** Click the link in your email — it will create your account and add you to the workspace automatically.
- **Firm Code:** Register at the login page, then enter the Firm Code and join password when prompted.

---

## Dashboard & Pulse

The **Pulse** page is your command centre. It loads automatically on login.

### What You See

| Section | Description |
|---|---|
| Today's Court Dates | Matters with hearings today |
| Upcoming Deadlines | Tasks and compliance items due within 7 days |
| Recent Activity | Latest brief uploads, client updates, payments |
| Anomaly Alerts | System-detected issues (missing info, overdue items) |
| Quick Stats | Total clients, active matters, open invoices |

### Anomaly Alerts

Reforma automatically scans your workspace daily (9 AM) and flags issues such as:

- Matters with no assigned lawyer
- Overdue invoices past 30 days
- Clients with no active matter
- Compliance tasks approaching their deadline

Anomalies are **automatically resolved** the next time the scan runs after you fix the underlying issue. You do not need to manually dismiss them (though you can acknowledge or dismiss individual items).

---

## Briefs (Document Repository)

Briefs are the primary document store. All case documents, research notes, and legal drafts live here.

### Uploading a Brief

1. Click **New Brief** on the Briefs page.
2. Fill in:
   - **Title** (required)
   - **Matter** (links the brief to a client case)
   - **Category** (e.g. Research, Pleading, Correspondence)
   - **Content** — use the rich-text editor, or attach a file
3. Set **visibility**: Public (all members) or Restricted (specific people only).
4. Click **Save**.

### Searching & Filtering

Use the search bar to find briefs by title or content keywords. Filter by:
- Matter
- Category
- Date range
- Author

### Restricted Access

Owners and Senior Associates+ can restrict individual briefs to specific members. Junior staff see only briefs they have been granted access to.

### OCR / Document Scan

When you upload a PDF or image, Reforma uses OCR (Tesseract) to extract text. The extracted text becomes searchable. This may take a few seconds for large documents.

---

## Calendar

The Calendar shows all firm-wide court dates, task deadlines, and appointments.

### Adding an Event

1. Click a date on the calendar grid, or click **+ Add Event**.
2. Fill in event type, title, related matter (optional), and time.
3. Assigned members receive a notification.

### Court Date Reminders

Court dates linked to Matters automatically generate reminders 48 hours before the hearing. The Proactive AI agent may also send a summary of what to expect based on the case history.

### Syncing

You can export the calendar as an ICS file from the top-right menu to import into Google Calendar, Outlook, or Apple Calendar.

---

## Matters (Litigation)

Matters track individual client cases through their entire litigation lifecycle.

### Creating a Matter

1. Go to **Matters** and click **New Matter**.
2. Required fields:
   - **Client** (select from Clients list)
   - **Matter Name / Case Title**
   - **Court** and **Case Number** (if assigned)
   - **Assigned Lawyer**
3. Optional: set milestones for key litigation stages.

### Matter Stages

Matters progress through these stages:

`Intake → Pre-Litigation → Filed → Discovery → Trial → Judgment → Closed`

Update the stage from the matter detail page as the case progresses.

### Court Outcome Questions

After every court date, the Proactive AI will prompt the assigned lawyer to record the outcome (what happened, next steps, adjournment date). This feeds the **Week in Court** email digest.

### Milestones

Add milestones (e.g. "File motion", "Service of process") with due dates. Overdue milestones appear in the Pulse anomaly feed.

---

## Clients & Client Manager

### Adding a Client

1. Go to **Clients** and click **Add New Client**.
2. Fill in:
   - Full name or company name
   - Email and phone number
   - Address (optional)
   - Client type (Individual / Corporate)
3. Click **Save**.

Recently added or edited clients float to the top of the list automatically.

### Editing a Client

Click the **edit icon** next to any client. Make your changes and click **Save**. The client moves to the top of the list after saving.

### Client Stats Bar

At the top of the Clients page you will see:

- **Total Clients** — click to reset any active filter
- **Active Litigation** — click to filter to clients with open matters
- **View All Invoices** — opens the full invoice table across all clients
- **View All Payments** — opens the payment history across all clients

### Viewing a Client's Details

Click on any client name to open their detail panel. Tabs include:
- **Overview** — contact info and linked matters
- **Invoices** — invoices raised for this client (create new invoice from here)
- **Payments** — payment history
- **Documents** — briefs linked to this client's matters

---

## Invoicing & Payments

### Setting Up Your Bank Account (Required)

Before generating any invoice, at least one bank account must be saved in **Settings → Bank Accounts**. If no account is saved, the invoice form will show inline fields to enter the account details manually. The account name is always your firm's registered name.

### Generating an Invoice

1. Open a Client's detail page and click the **Invoices** tab.
2. Click **Create Invoice**.
3. Fill in:
   - **Invoice Number** (auto-generated, can be overridden)
   - **Matter** (optional — links invoice to a specific case)
   - **Bill To Name** (auto-filled from client name)
   - **Due Date**
   - **Line Items** — description, quantity, and amount per item
4. The form calculates totals automatically (subtotal + 7.5% VAT + 1% security levy).
5. Click **Save Invoice**.

> An invoice cannot be created without a bank account. If no account is saved in settings, you must enter the account details manually on the form.

### Invoice Statuses

| Status | Meaning |
|---|---|
| Pending | Invoice sent, awaiting payment |
| Partially Paid | Some payment received, balance outstanding |
| Paid | Fully settled |
| Overdue | Past due date, unpaid |

### Recording a Payment

From any invoice row (in the client's Invoices tab or in **View All Invoices**):

1. Click **Record Payment** next to the invoice.
2. Choose **Full Payment** (auto-fills outstanding balance) or **Vary Amount** to enter a partial payment.
3. Select the payment method and enter a transaction reference (optional).
4. Click **Submit Payment**.

The invoice status updates automatically (Pending → Partially Paid → Paid).

### Downloading Invoices

From any invoice row, click **PDF** or **Word** to download the formatted invoice with your firm's letterhead, line items, VAT breakdown, and bank details.

### View All Invoices

Click **View All Invoices** from the Clients page stats bar to see every invoice across all clients in a single table. You can record payments and download invoices directly from this view.

### Monnify Online Payments

Clients can pay online via the Monnify payment gateway (Nigerian Naira). The payment link is included on generated invoices. Verified payments are automatically recorded.

---

## Compliance Tracker

The Compliance module tracks regulatory obligations, filing deadlines, and internal policies.

### Adding a Compliance Task

1. Go to **Compliance** and click **Add Task**.
2. Fill in:
   - **Title** (e.g. "File Annual Returns — CAC")
   - **Category** (Regulatory / Internal / Court-Ordered)
   - **Due Date**
   - **Assigned To**
   - **Recurrence** (if this is a repeating obligation)
3. Save.

### Compliance Score

The Compliance page shows your firm's compliance score — a percentage of tasks that are on track. Tasks approaching their deadline in the next 7 days are highlighted. Overdue tasks reduce the score.

### Auto-Renewal

Tasks with a recurrence setting (e.g. Annual, Quarterly) automatically create the next occurrence when the current one is marked complete.

---

## Analytics

Analytics gives partners and senior staff visibility into firm performance.

### Available Reports

| Report | Description |
|---|---|
| Revenue | Total invoiced and collected, by month and client |
| Matter Activity | Open vs closed matters over time |
| Staff Workload | Work entries per team member |
| Client Engagement | Activity per client (matters, invoices, briefs) |
| Compliance Score | Trend over time |

### Filtering

Use the date range picker and workspace filters to narrow reports. Data refreshes on page load.

---

## Eureka AI Assistant

Eureka is Reforma's built-in AI assistant powered by Claude. Access it from any page via the **Eureka** button in the sidebar.

### What Eureka Can Do

- Answer questions about any case, client, brief, or matter in your workspace
- Draft legal documents (letters, notices, research summaries)
- Summarise a matter's history
- Explain compliance obligations
- Search for specific briefs or documents
- Pull invoice and payment data on demand

### How to Use It

Type your question in natural language. Examples:

- _"What is the status of the Adeyemi matter?"_
- _"Draft a letter of demand to XYZ Ltd for outstanding invoice INV-0042."_
- _"How much has Balogun & Co paid us this year?"_
- _"List all matters with court dates next week."_

Eureka can read and act on real data from your workspace. It does not hallucinate case details — if it cannot find information, it will tell you.

### Privacy

Eureka interactions are workspace-scoped. Data shared with Eureka stays within your workspace and is processed via Anthropic's API under their data processing agreement.

---

## Attendance & Work Entries

### Clocking In / Out

From the **Attendance** section, click **Clock In** when you arrive. The system records your time and — if geofencing is enabled — your location.

If geofencing is active, you must be within the configured radius of the office to clock in.

### Work Entries

Log billable and non-billable work from **Work Entries**. Each entry captures:
- Matter (optional)
- Description of work done
- Duration
- Billable flag

Work entries feed into the Analytics workload reports and can be used to justify invoice line items.

---

## Settings

### Profile

Update your name, email, profile photo, and password from **Settings → Profile**.

### Bank Accounts

Add one or more firm bank accounts. These appear on all generated invoices. At least one account is required to generate invoices.

Required fields per account:
- Account Name (must be the firm's registered name)
- Bank Name
- Account Number

### Team Members

Owners and Managing Partners can:
- Invite new members via email or by sharing the firm's join link
- Assign/change roles
- Deactivate members who leave the firm

### Workspace Settings

- **Firm Name & Slug** — changes the workspace URL
- **Letterhead** — upload a PNG/JPG for invoice and document headers
- **Brand Colours** — accent and secondary colours for the UI
- **Geofencing** — enable/disable and configure the office radius

### Subscription & Billing

View your current plan, usage, and payment history under **Settings → Subscription**.

---

## Notifications

Reforma sends in-app and (optionally) push notifications for:

- New brief assigned to you
- Court date reminder (48 hours before)
- Invoice payment recorded
- Task due tomorrow
- New team member joined
- Proactive AI insights

Enable push notifications by clicking **Allow** when your browser prompts you after logging in.

---

## Role Permissions Reference

Reforma uses 9 seniority-based roles. Higher roles inherit all permissions of lower roles.

| Role | Typical User | Key Permissions |
|---|---|---|
| Intern | Law student intern | View briefs (if granted), read-only calendar |
| Extern | Secondee / external counsel | View granted briefs, limited client access |
| Paralegal | Legal assistant | View/edit briefs, log work entries |
| Junior Associate | Associate (0–3 yrs) | Add clients, create briefs, log attendance |
| Associate | Associate (3–6 yrs) | Create matters, generate invoices |
| Senior Associate | Senior associate | Edit all matters, manage compliance tasks |
| Partner | Equity/non-equity partner | View analytics, approve invoices |
| Senior Partner | Senior equity partner | Full write access except workspace deletion |
| Managing Partner | Firm head | Full access, can modify roles |
| Owner | Account creator | Superuser — full unrestricted access |

> **Guests** are time-limited members (e.g. external co-counsel). They can be granted access to specific briefs only.
