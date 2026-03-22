import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logSecurityEvent, SecurityEvent } from '@/lib/services/auth/audit';

export async function GET(request: Request) {
    // Basic auth check for cron jobs if CRON_SECRET is provided
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // 1. Basic database health check
        await prisma.$queryRaw`SELECT 1`;
        
        // 2. Tabulate row counts for critical tables to monitor backup completeness over time
        const [users, workspaces, clients, matters, briefs, documents] = await Promise.all([
            prisma.user.count(),
            prisma.workspace.count(),
            prisma.client.count(),
            prisma.matter.count(),
            prisma.brief.count(),
            prisma.document.count()
        ]);
        
        const summary = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            metrics: { users, workspaces, clients, matters, briefs, documents }
        };

        // 3. Log event
        await prisma.securityAuditLog.create({
            data: {
                event: 'DB_HEALTH_CHECK',
                description: 'Automated database health check and metrics collection.',
                metadata: summary,
                ipAddress: 'cron',
                userAgent: 'Vercel-Cron'
            }
        });

        return NextResponse.json(summary);
    } catch (error: any) {
        console.error('[Backup/Health Check] Failed:', error);
        
        // Try logging failure if DB isn't totally down
        try {
            await prisma.securityAuditLog.create({
                data: {
                    event: 'DB_HEALTH_CHECK_FAILED',
                    description: `Health check failed: ${error.message}`,
                    ipAddress: 'cron',
                    userAgent: 'Vercel-Cron'
                }
            });
        } catch { /* ignore secondary fail */ }
        
        return NextResponse.json({ error: 'Database health check failed', details: error.message }, { status: 500 });
    }
}
