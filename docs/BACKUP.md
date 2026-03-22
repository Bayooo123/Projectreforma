# Database Backup & Recovery Strategy

This document outlines the backup and recovery procedures for Reforma OS using Supabase (PostgreSQL).

## Backup Strategy

By default, Supabase provides automated daily backups on the Pro plan and above.
- **RPO (Recovery Point Objective):** 24 hours (for Point-in-Time Recovery, upgrade to PITR add-on for 1-minute RPO)
- **RTO (Recovery Time Objective):** ~15-30 minutes for a full restore depending on data size.

### Automated Health Monitoring
A cron job runs on Vercel at `/api/cron/backup` to verify database health and record row counts of critical tables (`User`, `Workspace`, `Client`, `Matter`, `Brief`, `Document`). These metrics are saved in `SecurityAuditLog` for historical completeness checks.

## Recovery Procedures

### 1. Point-in-Time Recovery (PITR)
If PITR is enabled on the Supabase project:
1. Navigate to the Supabase Dashboard -> Database -> Backups -> PITR.
2. Select the exact date and time right before the catastrophic event.
3. Click "Restore". The database will pause momentarily during the rollback.

### 2. Daily Automatic Backups
If you only have daily backups enabled:
1. Navigate to Supabase Dashboard -> Database -> Backups.
2. Choose the latest healthy daily snapshot.
3. Click "Restore".

### 3. Manual Logical Backups
For off-site redundancy, you should periodically export the schema and data using `pg_dump`:
```bash
pg_dump --clean --if-exists --quote-all-identifiers \
 -h aws-0-eu-central-1.pooler.supabase.com \
 -p 6543 -U postgres \
 -d postgres > reforma_db_backup_$(date +%F).sql
```
*(You must provide the actual database password when prompted)*

### 4. Vercel Blob (Documents) Backups
Currently, `Document` records in the DB point to Vercel/Supabase storage URLs. You should periodically sync objects from the storage bucket to a cold-storage S3 bucket or a local NAS using the provided vendor CLI tools.
