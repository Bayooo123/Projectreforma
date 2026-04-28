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
import { config } from "@/lib/config"

// Valid role types for type safety
import { RoleValue } from "@/lib/roles"
import { getPermissionsForRole } from "@/lib/rbac"

// Valid role types for type safety
type RoleType = "owner" | RoleValue;

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
            async authorize(credentials) {
                // 1. Check for Magic Token Flow
                if (credentials.inviteToken) {
                    const token = credentials.inviteToken as string;
                    const workspace = await prisma.workspace.findUnique({
                        where: { inviteLinkToken: token }
                    });

                    if (!workspace) {
                        throw new Error('Invalid Invite Link');
                    }

                    const password = (credentials as any).password;
                    const email = ((credentials as any).email as string).toLowerCase();

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
                        firmPassword: z.string().optional()
                    })
                    .safeParse(credentials);

                if (parsedCredentials.success) {
                    const { password, firmPassword } = parsedCredentials.data;
                    const email = parsedCredentials.data.email.toLowerCase();
                    const firmCode = parsedCredentials.data.firmCode?.toLowerCase();

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
                // Subsequent request — check if session was force-revoked
                const dbUser = await prisma.user.findUnique({
                    where: { id: token.sub },
                    select: { sessionVersion: true },
                });

                if (!dbUser || (dbUser.sessionVersion as number) > (token.sessionVersion as number ?? 0)) {
                    // sessionVersion was incremented (force-logout) — invalidate this JWT
                    return null;
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
