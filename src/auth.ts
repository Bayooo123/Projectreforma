import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import Credentials from "next-auth/providers/credentials"
import { authConfig } from "./auth.config"
import { z } from "zod"
import bcrypt from "bcryptjs"

async function getUser(email: string) {
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            console.log(`User not found for email: ${email}`);
        }
        return user;
    } catch (error) {
        console.error('Failed to fetch user:', error);
        throw new Error('Failed to fetch user.');
    }
}

export const { auth, signIn, signOut, handlers } = NextAuth({
    ...authConfig,
    adapter: PrismaAdapter(prisma),
    session: { strategy: "jwt" }, // Use JWT for credentials provider compatibility
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

                    const { email, password } = credentials as any;

                    // Verify User Logic (check if exists, etc)
                    const user = await prisma.user.findUnique({
                        where: { email },
                        include: { workspaces: true }
                    });

                    if (user) {
                        // User exists, verify password
                        const passwordMatch = await bcrypt.compare(password, user.password || '');
                        if (!passwordMatch) return null;

                        // Check membership
                        const membership = user.workspaces.find(ws => ws.workspaceId === workspace.id);
                        if (!membership) {
                            // Auto-join logic could go here, or throw error saying "User exists but not member"
                            // Ideally, we auto-join them here or return user and let middleware handle it?
                            // Simple: Just return user with new workspaceId context
                            return { ...user, workspaceId: workspace.id };
                        }
                        return { ...user, workspaceId: workspace.id };
                    } else {
                        // New User via Token? 
                        // Usually authorize() is for LOGIN. For SIGNUP, we use a separate Server Action which creates user then logs in.
                        // But if using Credentials provider for "Sign In", we need user to exist.

                        // If this is strictly "Sign In with Token", user must exist.
                        // But for "Join", we usually "Register".
                        // The Register Form calculates creates the user via Action, THEN calls signIn().
                        // So signIn() just needs to verify user password.
                        // Wait, if I register via Action, the Action should add user to workspace.
                        // Then signIn just logs them in.

                        // So:
                        // 1. User visits /join/[token]
                        // 2. Enters Name/Email/Password
                        // 3. Submit -> Server Action `registerWithToken`
                        // 4. Action: Creates User, Adds to Workspace, Then calls `signIn('credentials', { email, password })`.
                        // 5. `signIn` calls this `authorize`.

                        // Standard `signIn` works if user is ALREADY added.
                        // So I might NOT need to change `auth.ts` extensively if the registration action handles the heavy lifting.
                        // BUT, existing `auth.ts` requires `firmCode/firmPassword` to enforce structure?
                        // Line 33: `firmCode: z.string().min(1)`
                        // Line 34: `firmPassword: z.string().min(1)`

                        // I MUST relax this Zod schema.
                        return null;
                    }
                }

                // Standard Flow (Legacy)
                const parsedCredentials = z
                    .object({
                        email: z.string().email(),
                        password: z.string().min(6),
                        firmCode: z.string().optional(),
                        firmPassword: z.string().optional()
                    })
                    .safeParse(credentials);

                if (parsedCredentials.success) {
                    const { email, password, firmCode, firmPassword } = parsedCredentials.data;

                    // If firmCode provided, Validate Firm
                    let workspaceId = null;
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
                        return { ...user, workspaceId };
                    }

                    // Allow login without firmCode (dashboard selection)
                    return { ...user, workspaceId: user.workspaces[0]?.workspaceId };
                }

                console.log('Invalid credentials format');
                return null;
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.workspaceId = user.workspaceId;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user && token.sub) {
                session.user.id = token.sub;
                session.user.workspaceId = token.workspaceId as string;
            }
            return session;
        },
    }
});
