import NextAuth from "next-auth"
import type { User } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import Credentials from "next-auth/providers/credentials"
import { authConfig } from "./auth.config"
import { z } from "zod"
import bcrypt from "bcryptjs"

// Valid role types for type safety
const ALLOWED_ROLES = ["owner", "partner", "associate", "admin", "member"] as const;
type RoleType = typeof ALLOWED_ROLES[number];

export const { auth, signIn, signOut, handlers } = NextAuth({
    ...authConfig,
    adapter: PrismaAdapter(prisma),
    session: { strategy: "jwt" },
    providers: [
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
                        include: { workspaces: true }
                    });

                    if (user) {
                        const passwordMatch = await bcrypt.compare(password, user.password || '');
                        if (!passwordMatch) return null;

                        const membership = user.workspaces.find(ws => ws.workspaceId === workspace.id);
                        const role = membership?.role || 'associate';

                        // Return typed User object
                        const authUser: User = {
                            id: user.id,
                            email: user.email,
                            name: user.name,
                            role: (role as RoleType),
                            workspaceId: workspace.id,
                            lawyerToken: user.lawyerToken || '',
                        };
                        return authUser;
                    }
                    return null;
                }

                // Standard Flow
                const parsedCredentials = z
                    .object({
                        email: z.string().email(),
                        password: z.string().min(6),
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
                        include: { workspaces: true }
                    });

                    if (!user || !user.password) return null;
                    if (!await bcrypt.compare(password, user.password)) return null;

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
                        };
                        return authUser;
                    }

                    // Login without firmCode - use first workspace
                    const firstMembership = user.workspaces[0];
                    const authUser: User = {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        role: ((firstMembership?.role || 'member') as RoleType),
                        workspaceId: firstMembership?.workspaceId || '',
                        lawyerToken: user.lawyerToken || '',
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
                token.role = user.role;
                token.workspaceId = user.workspaceId;
                token.lawyerToken = user.lawyerToken;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user && token.sub) {
                session.user.id = token.sub;
                session.user.role = token.role as RoleType;
                session.user.workspaceId = token.workspaceId as string;
                session.user.lawyerToken = token.lawyerToken as string;
            }
            return session;
        },
    }
});
