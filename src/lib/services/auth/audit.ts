
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';

export enum SecurityEvent {
    LOGIN_SUCCESS = 'LOGIN_SUCCESS',
    LOGIN_FAILURE = 'LOGIN_FAILURE',
    LOGOUT = 'LOGOUT',
    PASSWORD_RESET_REQUEST = 'PASSWORD_RESET_REQUEST',
    PASSWORD_RESET_SUCCESS = 'PASSWORD_RESET_SUCCESS',
    EMAIL_VERIFICATION_REQUEST = 'EMAIL_VERIFICATION_REQUEST',
    EMAIL_VERIFICATION_SUCCESS = 'EMAIL_VERIFICATION_SUCCESS',
    INVITATION_CREATED = 'INVITATION_CREATED',
    INVITATION_ACCEPTED = 'INVITATION_ACCEPTED',
    UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
    RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
    MFA_SETUP_INITIATED = 'MFA_SETUP_INITIATED',
    MFA_ENABLED = 'MFA_ENABLED',
    MFA_DISABLED = 'MFA_DISABLED',
    MFA_VERIFY_FAILED = 'MFA_VERIFY_FAILED',
}

interface AuditConfig {
    userId?: string;
    event: SecurityEvent;
    description?: string;
    req?: NextRequest;
    metadata?: any;
}

/**
 * Centrally logs security-sensitive events with IP and User Agent metadata.
 */
export const logSecurityEvent = async (config: AuditConfig) => {
    const { userId, event, description, req, metadata } = config;

    let ipAddress = 'unknown';
    let userAgent = 'unknown';

    if (req) {
        // Get IP address (handling proxies)
        const forwarded = req.headers.get('x-forwarded-for');
        ipAddress = forwarded ? forwarded.split(',')[0] : 'unknown';

        // Get User Agent
        userAgent = req.headers.get('user-agent') || 'unknown';
    }

    try {
        const log = await prisma.securityAuditLog.create({
            data: {
                userId,
                event,
                description,
                ipAddress,
                userAgent,
                metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
            }
        });
        return log;
    } catch (error) {
        // We don't want audit logging to crash the main request flow if DB write fails,
        // but we should log the failure to standard error.
        console.error('[AuditService] Failed to log security event:', error);
        return null;
    }
};
