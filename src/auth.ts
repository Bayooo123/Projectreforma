import NextAuth from "next-auth"
import type { User } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import Credentials from "next-auth/providers/credentials"
import { authConfig } from "./auth.config"
import { z } from "zod"
import bcrypt from "bcryptjs"
import Resend from "next-auth/providers/resend"
import { mailService } from "@/lib/services/mail/mail"
import { getVerificationEmail } from "@/lib/services/mail/templates"
import { logSecurityEvent, SecurityEvent } from "@/lib/services/auth/audit"
import { verifyMfaToken } from "@/lib/services/auth/mfa"
import { checkRateLimit, getClientIp } from "@/lib/services/auth/ratelimit"
import { config } from "@/lib/config"

// Valid role types for type safety
import { RoleValue } from "@/lib/roles"
import { getPermissionsForRole } from "@/lib/rbac"

// Valid role types for type safety
type RoleType = "owner" | RoleValue;

// Shared by both authorize() branches (magic-token invite flow and standard
// email/password flow) so a brute-force attempt against either path is
// throttled the same way, keyed by the target account rather than IP alone
// (authorize() doesn't reliably get a client IP on every deployment target).
async function enforceLoginRateLimit(email: string, request?: Request) {
    const ip = request ? getClientIp(request.headers) : 'unknown';
    const rl = await checkRateLimit({ key: `login:${email.toLowerCase()}`, limit: 10, windowSeconds: 15 * 60 });
    if (!rl.success) {
        await logSecurityEvent({ event: SecurityEvent.RATE_LIMIT_EXCEEDED, description: `Login rate limit exceeded for ${email} (ip: ${ip})` });
        throw new Error('Too many login attempts. Please wait a few minutes and try again.');
    }
}

// Called after the password has already been verified. Throwing a distinct,
// recognisable error here (rather than just returning null) is what lets the
// login action (src/app/lib/actions.ts) tell "wrong password" apart from
// "right password, now enter your code" and re-render the form accordingly —
// the client resubmits the same credentials plus mfaCode on the next attempt.
async function verifyMfaIfEnabled(
    user: { id: string; mfaEnabled: boolean | null; mfaSecret: string | null },
    mfaCode: string | undefined,
    email: string,
) {
    if (!user.mfaEnabled) return;
    if (!mfaCode) throw new Error('MFA_REQUIRED');
    if (!user.mfaSecret || !verifyMfaToken(user.mfaSecret, mfaCode)) {
        await logSecurityEvent({ userId: user.id, event: SecurityEvent.MFA_VERIFY_FAILED, description: `Invalid TOTP token at login for ${email}` });
        throw new Error('MFA_INVALID');
    }
}

export const { auth, signIn, signOut, handlers } = NextAuth({
    ...authConfig,
    adapter: PrismaAdapter(prisma),
    session: { strategy: "jwt" },
    // Secure session cookies
    cookies: {
        sessionToken: {
            options: {
                httpOnly: true,
                sameSite: 'lax' as const,
                path: '/',
                secure: config.NODE_ENV === 'production',
            },
        },
    },
    trustHost: true,
    providers: [
        Resend({
            from: config.MAIL_FROM,
            async sendVerificationRequest({ identifier: email, url, provider, theme }) {
                const user = await prisma.user.findUnique({
                    where: { email },
                    select: { name: true }
                });
                const name = user?.name || "there";
                await mailService.send({
                    to: email,
                    subject: `Sign in to Reforma`,
                    html: getVerificationEmail(name, url),
                });
            },
        }),
        Credentials({
            async authorize(credentials, request) {
                // 1. Check for Magic Token Flow
                if (credentials.inviteToken) {
                    const token = credentials.inviteToken as string;
                    const workspace = await prisma.workspace.findUnique({
                        where: { inviteLinkToken: token }
                    });

                    if (!workspace) {
                        throw new Error('Invalid Invite Link');
                    }

                    const rawCredentials = credentials as Record<string, unknown>;
                    const password = rawCredentials.password as string;
                    const email = (rawCredentials.email as string).toLowerCase();
                    const mfaCode = rawCredentials.mfaCode as string | undefined;

                    await enforceLoginRateLimit(email, request);

                    const user = await prisma.user.findUnique({
                        where: { email },
                        include: {
                            workspaces: true,
                            ownedWorkspaces: { select: { id: true } }
                        }
                    });

                    if (user) {
                        const passwordMatch = await bcrypt.compare(password, user.password || '');
                        if (!passwordMatch) return null;

                        await verifyMfaIfEnabled(user, mfaCode, email);

                        const membership = user.workspaces.find(ws => ws.workspaceId === workspace.id);
                        const role = membership?.role || 'associate';

                        const authUser: User = {
                            id: user.id,
                            email: user.email,
                            name: user.name,
                            role: (role as RoleType),
                            workspaceId: workspace.id,
                            lawyerToken: user.lawyerToken || '',
                            isPlatformAdmin: user.isPlatformAdmin,
                            isWorkspaceOwner: user.ownedWorkspaces.some(w => w.id === workspace.id),
                            permissions: getPermissionsForRole(role),
                        };
                        return authUser;
                    }
                    return null;
                }

                // Standard Flow
                const parsedCredentials = z
                    .object({
                        email: z.string().email(),
                        password: z.string().min(8, 'Password must be at least 8 characters'),
                        firmCode: z.string().optional(),
                        firmPassword: z.string().optional(),
                        mfaCode: z.string().optional(),
                    })
                    .safeParse(credentials);

                if (parsedCredentials.success) {
                    const { password, firmPassword, mfaCode } = parsedCredentials.data;
                    const email = parsedCredentials.data.email.toLowerCase();
                    const firmCode = parsedCredentials.data.firmCode?.toLowerCase();

                    await enforceLoginRateLimit(email, request);

                    // If firmCode provided, Validate Firm
                    let workspaceId: string | null = null;
                    if (firmCode && firmPassword) {
                        const workspace = await prisma.workspace.findUnique({ where: { firmCode } });
                        if (!workspace || !workspace.joinPassword) throw new Error('Invalid Firm Code');
                        if (!await bcrypt.compare(firmPassword, workspace.joinPassword)) throw new Error('Invalid Firm Password');
                        workspaceId = workspace.id;
                    }

                    // Verify User
                    const user = await prisma.user.findUnique({
                        where: { email },
                        include: {
                            workspaces: true,
                            ownedWorkspaces: { select: { id: true } }
                        }
                    });

                    if (!user || !user.password) {
                        await logSecurityEvent({ event: SecurityEvent.LOGIN_FAILURE, description: `Login attempt for non-existent/password-less account: ${email}`, req: null as any });
                        return null;
                    }
                    if (!await bcrypt.compare(password, user.password)) {
                        await logSecurityEvent({ userId: user.id, event: SecurityEvent.LOGIN_FAILURE, description: `Incorrect password for ${email}`, req: null as any });
                        return null;
                    }

                    await verifyMfaIfEnabled(user, mfaCode, email);

                    // Email verification: warn if unverified but allow login (grace period)
                    // To enforce hard block, change to: throw new Error('Email not verified.')
                    if (!user.emailVerified) {
                        console.warn(`[Auth] Unverified email login allowed (grace period): ${email}`);
                    }

                    // If checking firm context, verify membership
                    if (workspaceId) {
                        const membership = user.workspaces.find(ws => ws.workspaceId === workspaceId);
                        if (!membership) throw new Error('You are not a member of this firm.');

                        // Return typed User object
                        const authUser: User = {
                            id: user.id,
                            email: user.email,
                            name: user.name,
                            role: (membership.role as RoleType),
                            workspaceId: workspaceId,
                            lawyerToken: user.lawyerToken || '',
                            isPlatformAdmin: user.isPlatformAdmin,
                            isWorkspaceOwner: user.ownedWorkspaces.some(w => w.id === workspaceId),
                            permissions: getPermissionsForRole(membership.role),
                        };
                        return authUser;
                    }

                    // Login without firmCode - prefer owned workspace, fall back to first membership
                    const ownedWorkspaceId = user.ownedWorkspaces[0]?.id;
                    const preferredMembership = ownedWorkspaceId
                        ? (user.workspaces.find(ws => ws.workspaceId === ownedWorkspaceId) ?? user.workspaces[0])
                        : user.workspaces[0];
                    const resolvedWorkspaceId = preferredMembership?.workspaceId || ownedWorkspaceId || '';
                    const authUser: User = {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        role: ((preferredMembership?.role || 'Associate') as RoleType),
                        workspaceId: resolvedWorkspaceId,
                        lawyerToken: user.lawyerToken || '',
                        isPlatformAdmin: user.isPlatformAdmin,
                        isWorkspaceOwner: !!ownedWorkspaceId && resolvedWorkspaceId === ownedWorkspaceId,
                        permissions: getPermissionsForRole(preferredMembership?.role || 'Associate'),
                    };
                    return authUser;
                }

                console.log('Invalid credentials format');
                return null;
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                // Fresh login — assign a JTI, snapshot sessionVersion, record the session
                const { randomUUID } = await import('crypto');
                const jti = randomUUID();

                const dbUser = await prisma.user.findUnique({
                    where: { id: user.id },
                    select: { sessionVersion: true },
                });
                const sessionVersion = dbUser?.sessionVersion ?? 0;

                token.jti = jti;
                token.sessionVersion = sessionVersion;
                token.lastVersionCheck = Date.now();
                token.role = user.role;
                token.workspaceId = user.workspaceId;
                token.lawyerToken = user.lawyerToken;
                token.isPlatformAdmin = user.isPlatformAdmin;
                token.isWorkspaceOwner = user.isWorkspaceOwner;
                token.permissions = user.permissions;

                // Fire-and-forget: record session + log success
                const userId = user.id!;
                Promise.all([
                    prisma.userSession.create({
                        data: {
                            userId,
                            jti,
                            sessionVersion,
                            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                        },
                    }),
                    prisma.securityAuditLog.create({
                        data: {
                            userId,
                            event: 'LOGIN_SUCCESS',
                            description: `${user.email} signed in`,
                        },
                    }),
                ]).catch(e => console.error('[Auth] Session record error:', e));

            } else if (token.sub) {
                // Subsequent request — only check DB every 60 s to avoid per-request queries
                const now = Date.now();
                const lastCheck = (token.lastVersionCheck as number) ?? 0;
                if (now - lastCheck > 60_000) {
                    const dbUser = await prisma.user.findUnique({
                        where: { id: token.sub },
                        select: { sessionVersion: true, name: true },
                    });

                    if (!dbUser || (dbUser.sessionVersion as number) > (token.sessionVersion as number ?? 0)) {
                        return null;
                    }
                    if (dbUser.name) token.name = dbUser.name;
                    token.lastVersionCheck = now;
                }
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user && token.sub) {
                session.user.id = token.sub;
                session.user.role = token.role as RoleType;
                session.user.workspaceId = token.workspaceId as string;
                session.user.lawyerToken = token.lawyerToken as string;
                session.user.isPlatformAdmin = !!token.isPlatformAdmin;
                session.user.isWorkspaceOwner = !!token.isWorkspaceOwner;
                session.user.permissions = (token.permissions as string[]) || [];
            }
            return session;
        },
    },
    events: {
        async signOut(message) {
            const token = (message as any).token;
            if (token?.sub) {
                Promise.all([
                    prisma.securityAuditLog.create({
                        data: { userId: token.sub, event: 'LOGOUT', description: 'User signed out' },
                    }),
                    token.jti
                        ? prisma.userSession.updateMany({
                              where: { jti: token.jti, revokedAt: null },
                              data: { revokedAt: new Date() },
                          })
                        : Promise.resolve(),
                ]).catch(() => {});
            }
        },
    }
});
