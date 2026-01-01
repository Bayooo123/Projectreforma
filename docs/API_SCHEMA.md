# Reforma API Schema v1.0

**Base URL:** `https://www.reforma.ng/api/v1`  
**Authentication:** `Authorization: Bearer rf_sk_xxxxxxxxxxxxx`

---

## Table of Contents
1. [Authentication](#1-authentication)
2. [Briefs](#2-briefs)
3. [Clients](#3-clients)
4. [Matters](#4-matters)
5. [Invoices](#5-invoices)
6. [Payments](#6-payments)
7. [Calendar](#7-calendar)
8. [Dashboard](#8-dashboard)
9. [Workspace](#9-workspace)
10. [AI Briefing](#10-ai-briefing)
11. [Data Models](#11-data-models)

---

## 1. Authentication

### Generate API Key
```
POST /auth/generate-key
```

**Request:**
```json
{
  "name": "Bica Integration",
  "workspaceId": "clxxxxxx",
  "expiresInDays": 365
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "clxxxxxx",
    "name": "Bica Integration",
    "key": "rf_sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "keyPrefix": "rf_sk_li",
    "expiresAt": "2027-01-01T00:00:00Z"
  }
}
```

> ⚠️ The full `key` is only returned once. Store it securely.

---

### Validate API Key
```
GET /auth/validate
```

**Headers:**
```
Authorization: Bearer rf_sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "clxxxxxx",
    "userName": "Adaeze Okonkwo",
    "userEmail": "adaeze@firm.ng",
    "workspaceId": "clxxxxxx",
    "workspaceName": "ASCO LP",
    "role": "partner"
  }
}
```

---

## 2. Briefs

### List Briefs
```
GET /briefs?status=active&lawyerId=xxx&limit=50&offset=0
```

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| status | string | `active`, `inactive`, `finalized` |
| lawyerId | string | Filter by assigned lawyer |
| clientId | string | Filter by client |
| category | string | Filter by category |
| limit | number | Max results (default: 50) |
| offset | number | Pagination offset |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxxxxx",
      "briefNumber": "LG/2024/001",
      "name": "Dangote vs FIRS",
      "category": "Litigation",
      "status": "active",
      "client": {
        "id": "clxxxxxx",
        "name": "Dangote Industries"
      },
      "lawyer": {
        "id": "clxxxxxx",
        "name": "Adaeze Okonkwo"
      },
      "documentsCount": 12,
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-12-20T14:30:00Z"
    }
  ],
  "meta": {
    "total": 45,
    "limit": 50,
    "offset": 0
  }
}
```

---

### Get Brief by ID
```
GET /briefs/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "clxxxxxx",
    "briefNumber": "LG/2024/001",
    "name": "Dangote vs FIRS",
    "category": "Litigation",
    "status": "active",
    "description": "Tax dispute regarding...",
    "client": {
      "id": "clxxxxxx",
      "name": "Dangote Industries",
      "email": "legal@dangote.com"
    },
    "lawyer": {
      "id": "clxxxxxx",
      "name": "Adaeze Okonkwo",
      "email": "adaeze@firm.ng"
    },
    "documents": [
      {
        "id": "clxxxxxx",
        "name": "Motion for Discovery.pdf",
        "type": "motion",
        "size": 245678,
        "uploadedAt": "2024-06-15T09:00:00Z"
      }
    ],
    "activities": [
      {
        "id": "clxxxxxx",
        "action": "Document uploaded",
        "actor": "Adaeze Okonkwo",
        "timestamp": "2024-06-15T09:00:00Z"
      }
    ],
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-12-20T14:30:00Z"
  }
}
```

---

### Create Brief
```
POST /briefs
```

**Request:**
```json
{
  "briefNumber": "LG/2024/002",
  "name": "GTBank vs ABC Ltd",
  "clientId": "clxxxxxx",
  "lawyerId": "clxxxxxx",
  "category": "Litigation",
  "description": "Loan recovery dispute",
  "status": "active"
}
```

**Required Fields:** `briefNumber`, `name`, `clientId`, `category`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "clxxxxxx",
    "briefNumber": "LG/2024/002",
    "name": "GTBank vs ABC Ltd",
    ...
  }
}
```

---

### Update Brief
```
PATCH /briefs/:id
```

**Request:**
```json
{
  "status": "finalized",
  "lawyerId": "clxxxxxx"
}
```

---

### Delete Brief
```
DELETE /briefs/:id
```

---

### Upload Document to Brief
```
POST /briefs/:id/documents
Content-Type: multipart/form-data
```

**Form Data:**
| Field | Type | Description |
|-------|------|-------------|
| file | File | The document file |
| type | string | `pleading`, `motion`, `affidavit`, `exhibit`, `correspondence`, `other` |
| description | string | Optional description |

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "clxxxxxx",
    "name": "Counter-Affidavit.pdf",
    "type": "affidavit",
    "size": 156789,
    "url": "https://storage.reforma.ng/docs/xxx.pdf",
    "uploadedAt": "2024-12-31T10:00:00Z"
  }
}
```

---

## 3. Clients

### List Clients
```
GET /clients?status=active&limit=50&offset=0
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxxxxx",
      "name": "Dangote Industries",
      "email": "legal@dangote.com",
      "phone": "+234 800 123 4567",
      "company": "Dangote Group",
      "industry": "Manufacturing",
      "status": "active",
      "mattersCount": 5,
      "briefsCount": 12,
      "totalBilled": 15000000,
      "totalPaid": 12500000,
      "createdAt": "2023-06-15T10:00:00Z"
    }
  ]
}
```

---

### Get Client by ID
```
GET /clients/:id
```

**Response includes:** Client details, matters, briefs, invoices, payment history

---

### Create Client
```
POST /clients
```

**Request:**
```json
{
  "name": "First Bank of Nigeria",
  "email": "legal@firstbanknigeria.com",
  "phone": "+234 800 555 1234",
  "company": "First Bank Plc",
  "industry": "Banking",
  "address": "35 Marina, Lagos Island"
}
```

**Required Fields:** `name`

---

### Update Client
```
PATCH /clients/:id
```

---

### Archive Client
```
PATCH /clients/:id
```
```json
{
  "status": "archived"
}
```

---

## 4. Matters

### List Matters
```
GET /matters?status=active&clientId=xxx&lawyerId=xxx
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxxxxx",
      "caseNumber": "FHC/L/CS/2024/123",
      "name": "Dangote vs FIRS",
      "status": "active",
      "court": "Federal High Court, Lagos",
      "nextCourtDate": "2025-01-15T09:00:00Z",
      "client": {
        "id": "clxxxxxx",
        "name": "Dangote Industries"
      },
      "assignedLawyer": {
        "id": "clxxxxxx",
        "name": "Adaeze Okonkwo"
      },
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

---

### Get Matter by ID
```
GET /matters/:id
```

**Response includes:** Full matter details, court dates history, activity log, linked briefs

---

### Create Matter
```
POST /matters
```

**Request:**
```json
{
  "caseNumber": "FHC/L/CS/2024/456",
  "name": "GTBank vs ABC Ltd",
  "clientId": "clxxxxxx",
  "assignedLawyerId": "clxxxxxx",
  "court": "Federal High Court, Lagos",
  "judge": "Hon. Justice Adebayo",
  "description": "Loan recovery dispute",
  "nextCourtDate": "2025-02-10T09:00:00Z"
}
```

**Required Fields:** `caseNumber`, `name`, `clientId`

---

### Add Court Date
```
POST /matters/:id/court-dates
```

**Request:**
```json
{
  "date": "2025-02-10",
  "time": "09:00",
  "court": "Federal High Court, Lagos",
  "judge": "Hon. Justice Adebayo",
  "hearingType": "Motion Hearing",
  "notes": "Motion for discovery"
}
```

---

### Adjourn Matter
```
PATCH /matters/:id/adjourn
```

**Request:**
```json
{
  "newDate": "2025-03-15",
  "newTime": "10:00",
  "reason": "Counsel indisposed"
}
```

---

### Update Matter Status
```
PATCH /matters/:id
```

**Request:**
```json
{
  "status": "settled"
}
```

**Status Options:** `pending`, `active`, `stayed`, `settled`, `struck_out`, `dismissed`, `judgment`

---

## 5. Invoices

### List Invoices
```
GET /invoices?status=pending&clientId=xxx
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxxxxx",
      "invoiceNumber": "INV-2024-0015",
      "clientId": "clxxxxxx",
      "clientName": "Dangote Industries",
      "billToName": "The Managing Director",
      "subtotal": 200000000,
      "vatAmount": 15000000,
      "securityChargeAmount": 2000000,
      "totalAmount": 217000000,
      "paidAmount": 100000000,
      "outstandingAmount": 117000000,
      "status": "pending",
      "dueDate": "2025-01-31T00:00:00Z",
      "createdAt": "2024-12-15T10:00:00Z"
    }
  ]
}
```

> 💡 All amounts are in **kobo** (₦1 = 100 kobo)

---

### Get Invoice by ID
```
GET /invoices/:id
```

**Response includes:** Full invoice with line items, payments, PDF download URL

---

### Create Invoice
```
POST /invoices
```

**Request:**
```json
{
  "clientId": "clxxxxxx",
  "matterId": "clxxxxxx",
  "billToName": "The Managing Director, Dangote Industries",
  "billToAddress": "1 Alfred Rewane Road, Ikoyi",
  "billToCity": "Lagos",
  "billToState": "Lagos",
  "attentionTo": "Mr. Sven Hanson",
  "dueDate": "2025-01-31",
  "vatRate": 7.5,
  "securityChargeRate": 1.0,
  "items": [
    {
      "description": "Legal Retainer - Q1 2025",
      "amount": 100000000,
      "quantity": 1
    },
    {
      "description": "Court Appearance Fees",
      "amount": 50000000,
      "quantity": 2
    }
  ],
  "notes": "Payment due within 30 days"
}
```

**Required Fields:** `clientId`, `billToName`, `items[]`

---

### Download Invoice PDF
```
GET /invoices/:id/pdf
```

**Response:** PDF file stream

---

## 6. Payments

### Record Payment
```
POST /invoices/:id/payments
```

**Request:**
```json
{
  "amount": 50000000,
  "paymentMethod": "bank_transfer",
  "reference": "TRF-123456789",
  "date": "2024-12-20",
  "notes": "Partial payment - 50% of invoice"
}
```

> 💡 Amount in kobo. Supports exact, discounted, or increased amounts.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "clxxxxxx",
    "invoiceId": "clxxxxxx",
    "amount": 50000000,
    "paymentMethod": "bank_transfer",
    "reference": "TRF-123456789",
    "date": "2024-12-20T00:00:00Z",
    "recordedBy": "Adaeze Okonkwo",
    "createdAt": "2024-12-20T14:30:00Z"
  },
  "invoice": {
    "id": "clxxxxxx",
    "totalAmount": 100000000,
    "paidAmount": 50000000,
    "outstandingAmount": 50000000,
    "status": "pending"
  }
}
```

---

### Get Payment History
```
GET /invoices/:id/payments
```

---

## 7. Calendar

### Get Calendar Events
```
GET /calendar?start=2025-01-01&end=2025-01-31&lawyerId=xxx
```

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| start | date | Start date (YYYY-MM-DD) |
| end | date | End date (YYYY-MM-DD) |
| lawyerId | string | Filter by lawyer |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxxxxx",
      "type": "court_date",
      "matterId": "clxxxxxx",
      "caseNumber": "FHC/L/CS/2024/123",
      "caseName": "Dangote vs FIRS",
      "date": "2025-01-15",
      "time": "09:00",
      "court": "Federal High Court, Lagos",
      "judge": "Hon. Justice Adebayo",
      "hearingType": "Motion Hearing",
      "client": {
        "id": "clxxxxxx",
        "name": "Dangote Industries"
      },
      "lawyer": {
        "id": "clxxxxxx",
        "name": "Adaeze Okonkwo"
      }
    }
  ]
}
```

---

## 8. Dashboard

### Get Dashboard Stats
```
GET /dashboard/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "pendingTasks": 12,
    "upcomingCourtDates": 5,
    "activeBriefs": 23,
    "totalClients": 45,
    "totalMatters": 67,
    "thisMonthRevenue": 15000000,
    "outstandingAmount": 45000000,
    "courtDatesThisWeek": [
      {
        "date": "2025-01-15",
        "count": 3
      }
    ]
  }
}
```

---

### Get Firm Pulse (Activity Feed)
```
GET /dashboard/firm-pulse?limit=20
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxxxxx",
      "type": "brief_created",
      "actor": "Adaeze Okonkwo",
      "action": "created brief",
      "target": "LG/2024/002",
      "caseName": "GTBank vs ABC Ltd",
      "timestamp": "2024-12-31T14:30:00Z"
    },
    {
      "id": "clxxxxxx",
      "type": "payment_recorded",
      "actor": "Bayo Gbadebo",
      "action": "recorded payment of ₦500,000",
      "target": "INV-2024-0015",
      "caseName": "Dangote Industries",
      "timestamp": "2024-12-31T12:00:00Z"
    }
  ]
}
```

---

## 9. Workspace

### Get Workspace Members
```
GET /workspace/members
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxxxxx",
      "userId": "clxxxxxx",
      "name": "Adaeze Okonkwo",
      "email": "adaeze@firm.ng",
      "role": "partner",
      "jobTitle": "Senior Partner",
      "status": "active",
      "joinedAt": "2023-01-15T10:00:00Z"
    }
  ]
}
```

---

### Invite Team Member
```
POST /workspace/invite
```

**Request:**
```json
{
  "email": "newlawyer@firm.ng",
  "role": "associate",
  "designation": "Junior Associate"
}
```

**Role Options:** `partner`, `associate`, `paralegal`

---

## 10. AI Briefing

### Get Matter Briefing
```
GET /matters/:id/briefing
```

**Response:**
```json
{
  "success": true,
  "data": {
    "matterId": "clxxxxxx",
    "caseNumber": "FHC/L/CS/2024/123",
    "caseName": "Dangote vs FIRS",
    "generatedAt": "2025-01-14T20:00:00Z",
    
    "summary": "Tax dispute regarding alleged underpayment of VAT for FY 2022. Client (Dangote Industries) is defendant. FIRS claims ₦2.5B in unpaid taxes plus penalties.",
    
    "currentStage": "Discovery Phase",
    
    "keyFacts": [
      "FIRS assessment issued: March 15, 2024",
      "Objection filed: April 10, 2024",
      "Motion for discovery pending since October 2024"
    ],
    
    "timeline": [
      {
        "date": "2024-03-15",
        "event": "FIRS assessment notice received"
      },
      {
        "date": "2024-04-10",
        "event": "Notice of Objection filed"
      },
      {
        "date": "2024-10-15",
        "event": "Motion for Discovery filed"
      }
    ],
    
    "nextSteps": [
      "Prepare reply to defendant's counter-affidavit",
      "Compile documents for discovery",
      "Brief expert witness on valuation dispute"
    ],
    
    "opposingCounselWeakPoints": [
      "Counter-affidavit paragraph 12 contradicts Exhibit D",
      "No evidence of alleged termination notice",
      "Statute of limitations argument may apply to 2020 claims"
    ],
    
    "upcomingDeadlines": [
      {
        "date": "2025-01-15",
        "event": "Court hearing - Motion for Discovery",
        "daysUntil": 1
      }
    ],
    
    "documentsToReview": [
      {
        "name": "Reply Affidavit (Draft)",
        "priority": "high"
      },
      {
        "name": "Defendant's Counter-Affidavit",
        "priority": "high"
      }
    ]
  }
}
```

---

### Get Upcoming Alerts
```
GET /alerts/upcoming?days=7
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxxxxx",
      "type": "court_date",
      "priority": "high",
      "matterId": "clxxxxxx",
      "caseNumber": "FHC/L/CS/2024/123",
      "caseName": "Dangote vs FIRS",
      "date": "2025-01-15T09:00:00Z",
      "daysUntil": 1,
      "message": "Court hearing tomorrow at 9:00 AM - Federal High Court, Lagos"
    },
    {
      "id": "clxxxxxx",
      "type": "invoice_due",
      "priority": "medium",
      "invoiceId": "clxxxxxx",
      "invoiceNumber": "INV-2024-0015",
      "clientName": "GTBank",
      "amount": 50000000,
      "date": "2025-01-20T00:00:00Z",
      "daysUntil": 6,
      "message": "Invoice INV-2024-0015 due in 6 days (₦500,000)"
    }
  ]
}
```

---

## 11. Data Models

### Brief
```typescript
{
  id: string
  briefNumber: string
  name: string
  category: "Litigation" | "ADR" | "Tax advisory" | "Corporate advisory" | "Academic research" | "Real estate" | "Wills and intestate matters"
  status: "active" | "inactive" | "finalized"
  description?: string
  clientId: string
  lawyerId?: string
  workspaceId: string
  createdAt: DateTime
  updatedAt: DateTime
}
```

### Client
```typescript
{
  id: string
  name: string
  email?: string
  phone?: string
  company?: string
  industry?: string
  address?: string
  status: "active" | "archived"
  workspaceId: string
  createdAt: DateTime
}
```

### Matter
```typescript
{
  id: string
  caseNumber: string
  name: string
  status: "pending" | "active" | "stayed" | "settled" | "struck_out" | "dismissed" | "judgment"
  court?: string
  judge?: string
  description?: string
  nextCourtDate?: DateTime
  clientId: string
  assignedLawyerId?: string
  workspaceId: string
  createdAt: DateTime
}
```

### Invoice
```typescript
{
  id: string
  invoiceNumber: string
  clientId: string
  matterId?: string
  billToName: string
  billToAddress?: string
  billToCity?: string
  billToState?: string
  attentionTo?: string
  notes?: string
  dueDate?: DateTime
  subtotal: number       // in kobo
  vatRate: number        // percentage
  vatAmount: number      // in kobo
  securityChargeRate: number
  securityChargeAmount: number
  totalAmount: number    // in kobo
  status: "pending" | "paid" | "overdue"
  createdAt: DateTime
}
```

### Payment
```typescript
{
  id: string
  invoiceId: string
  clientId: string
  amount: number         // in kobo
  paymentMethod?: string
  reference?: string
  date: DateTime
  notes?: string
  createdAt: DateTime
}
```

### User Roles
```typescript
type Role = "owner" | "partner" | "associate" | "paralegal"
```

### Role Permissions Matrix
| Action | Owner | Partner | Associate | Paralegal |
|--------|-------|---------|-----------|-----------|
| Create Brief | ✅ | ✅ | ✅ | ✅ |
| Upload Document | ✅ | ✅ | ✅ | ✅ |
| Create Client | ✅ | ✅ | ✅ | ✅ |
| Create Invoice | ✅ | ✅ | ✅ | ❌ |
| Record Payment | ✅ | ✅ | ✅ | ❌ |
| View Revenue | ✅ (PIN) | ✅ (PIN) | ❌ | ❌ |
| Invite Members | ✅ | ✅ | ❌ | ❌ |
| Manage Settings | ✅ | ⚠️ Limited | ❌ | ❌ |
| Generate API Keys | ✅ | ✅ | ❌ | ❌ |

---

## Error Response Format

All errors return:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Brief number is required",
    "field": "briefNumber"
  }
}
```

### Error Codes
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or missing API key |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `RATE_LIMITED` | 429 | Too many requests |
| `SERVER_ERROR` | 500 | Internal server error |

---

## Rate Limits

| Plan | Requests/minute | Requests/day |
|------|-----------------|--------------|
| Free | 60 | 1,000 |
| Pro | 300 | 10,000 |
| Enterprise | 1,000 | Unlimited |

---

## Webhook Events (Future)

When events occur in Reforma, webhooks can notify Bica:

```json
{
  "event": "matter.court_date_added",
  "timestamp": "2025-01-01T10:00:00Z",
  "data": {
    "matterId": "clxxxxxx",
    "caseNumber": "FHC/L/CS/2024/123",
    "date": "2025-02-15T09:00:00Z"
  }
}
```

**Available Events:**
- `brief.created`, `brief.updated`, `brief.document_uploaded`
- `client.created`, `client.updated`
- `matter.created`, `matter.court_date_added`, `matter.adjourned`
- `invoice.created`, `invoice.paid`, `invoice.overdue`
- `payment.recorded`

---

**Version:** 1.0  
**Last Updated:** January 2026  
**Contact:** bayo@reforma.ng
