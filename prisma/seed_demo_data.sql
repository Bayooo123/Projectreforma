-- REFORMA OS DEMO DATA SEEDING SCRIPT
-- Workspace: Gbadebo, Usman and Okoro (cmlteuiz40003ym902kk2jhfv)
-- User: Adebayo Gbadebo (cm8821zlt0000u67j387m670z)

BEGIN;

-- 0. Clean up existing demo data for this workspace (Optional, to ensure it's re-runnable)
-- We target IDs with 'demo' prefix or specific identifiable patterns
DELETE FROM "InvoiceItem" WHERE "invoiceId" IN (SELECT "id" FROM "Invoice" WHERE "clientId" = 'cm_demo_client_101');
DELETE FROM "Invoice" WHERE "clientId" = 'cm_demo_client_101';
DELETE FROM "CalendarEntry" WHERE "matterId" LIKE 'demo-matter-%';
DELETE FROM "Brief" WHERE "workspaceId" = 'cmlteuiz40003ym902kk2jhfv' AND "briefNumber" LIKE 'B-2024-%';
DELETE FROM "Matter" WHERE "clientId" = 'cm_demo_client_101';
DELETE FROM "Expense" WHERE "workspaceId" = 'cmlteuiz40003ym902kk2jhfv' AND "description" LIKE 'Demo: %';
DELETE FROM "Client" WHERE "id" = 'cm_demo_client_101';

-- 1. Insert Demo Client
INSERT INTO "Client" ("id", "name", "email", "company", "industry", "status", "workspaceId", "createdAt", "updatedAt")
VALUES ('cm_demo_client_101', 'Global Ventures Ltd', 'demo-investor@example.com', 'Global Ventures', 'Technology', 'active', 'cmlteuiz40003ym902kk2jhfv', NOW(), NOW());

-- 2. Insert 10 Matters
INSERT INTO "Matter" ("id", "name", "caseNumber", "clientId", "workspaceId", "lawyerInChargeId", "court", "judge", "status", "createdAt", "updatedAt")
SELECT 
    'demo-matter-' || i,
    'High-Stakes ' || (ARRAY['Confidential', 'Urgent', 'Strategic', 'High-Risk', 'International', 'Complex'])[floor(random() * 6) + 1] || ' Litigation vs ' || (ARRAY['Zylog Group', 'NexTech Solutions', 'Global Logistics Co.', 'Mega Corp', 'Vortex Industries'])[floor(random() * 5) + 1],
    'FHC/L/CS/2024/' || (floor(random() * 900) + 100),
    'cm_demo_client_101',
    'cmlteuiz40003ym902kk2jhfv',
    'cm8821zlt0000u67j387m670z',
    'Federal High Court, Lagos',
    'Hon. Justice ' || (ARRAY['Adeyemis', 'Okoro', 'Williams', 'Bello', 'Sanni', 'Gbadebo'])[floor(random() * 6) + 1],
    'active',
    NOW(),
    NOW()
FROM generate_series(1, 10) s(i);

-- 3. Insert 10 Briefs
-- IMPORTANT: We include "briefId" (same as "id") and "inboundEmailId"
INSERT INTO "Brief" ("id", "briefNumber", "name", "clientId", "matterId", "lawyerId", "workspaceId", "category", "status", "inboundEmailId", "briefId", "createdAt", "updatedAt", "description")
SELECT 
    'demo-brief-' || i,
    'B-2024-' || (1000 + i),
    'Legal Opinion on ' || (ARRAY['Confidential', 'Urgent', 'Strategic', 'High-Risk', 'International', 'Complex'])[floor(random() * 6) + 1] || ' Compliance',
    'cm_demo_client_101',
    'demo-matter-' || i,
    'cm8821zlt0000u67j387m670z',
    'cmlteuiz40003ym902kk2jhfv',
    'Litigation',
    'active',
    'brief-email-' || md5(random()::text),
    'demo-brief-' || i,
    NOW(),
    NOW(),
    'Detailed analysis of regulatory requirements and litigation risks.'
FROM generate_series(1, 10) s(i);

-- 4. Insert 50 Calendar Entries
INSERT INTO "CalendarEntry" ("id", "matterId", "date", "title", "type", "location", "description", "createdAt", "updatedAt")
SELECT 
    'demo-cal-' || i,
    'demo-matter-' || (floor(random() * 10) + 1),
    NOW() + (floor(random() * 90) - 30 || ' days')::interval,
    (ARRAY['Mentioning for Directions', 'Hearing of Interlocutory Application', 'Cross-Examination of PW1', 'Adoption of Written Addresses', 'Judgment Delivery', 'Meeting with Senior Counsel'])[floor(random() * 6) + 1],
    (ARRAY['COURT_DATE', 'FILING_DEADLINE', 'CLIENT_MEETING', 'INTERNAL_MEETING', 'OTHER'])[floor(random() * 5) + 1],
    'Court 4, 3rd Floor',
    'Pre-trial conference and filing of additional witnesses.',
    NOW(),
    NOW()
FROM generate_series(1, 50) s(i);

-- 5. Insert Daily Expenses for 2024 so far
INSERT INTO "Expense" ("id", "workspaceId", "amount", "description", "date", "category", "createdAt", "updatedAt")
SELECT 
    'demo-exp-' || i,
    'cmlteuiz40003ym902kk2jhfv',
    (floor(random() * 45000) + 5000),
    'Demo: ' || (ARRAY['Filing fees for new motion', 'Transport and Logistics to Court', 'Stationery and Printing', 'Refreshments for client meeting', 'Internet Subscription'])[floor(random() * 5) + 1],
    '2024-01-01'::date + (i || ' days')::interval,
    (ARRAY['OFFICE_UTILITIES', 'COURT_LITIGATION', 'OFFICE_EQUIPMENT_MAINTENANCE', 'MISCELLANEOUS', 'STAFF_COSTS'])[floor(random() * 5) + 1]::"ExpenseCategory",
    NOW(),
    NOW()
FROM generate_series(0, CURRENT_DATE - '2024-01-01'::date) s(i);

-- 6. Insert 10 Invoices
INSERT INTO "Invoice" ("id", "invoiceNumber", "clientId", "matterId", "date", "dueDate", "status", "billToName", "billToAddress", "subtotal", "vatAmount", "totalAmount", "createdAt", "updatedAt")
SELECT 
    'demo-inv-' || i,
    'INV-2024-' || (2000 + i),
    'cm_demo_client_101',
    'demo-matter-' || i,
    NOW(),
    NOW() + interval '14 days',
    (ARRAY['pending', 'paid', 'overdue'])[floor(random() * 3) + 1],
    'Global Ventures Ltd',
    '123 Victoria Island, Lagos',
    1000000,
    75000,
    1075000,
    NOW(),
    NOW()
FROM generate_series(1, 10) s(i);

-- 7. Insert Invoice Items
INSERT INTO "InvoiceItem" ("id", "invoiceId", "description", "amount", "quantity", "createdAt")
SELECT 
    'demo-inv-item-' || i,
    'demo-inv-' || i,
    'Professional Legal Services',
    1000000,
    1,
    NOW()
FROM generate_series(1, 10) s(i);

COMMIT;
