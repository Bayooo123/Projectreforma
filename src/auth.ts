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
                const parsedCredentials = z
                    .object({
                        email: z.string().email(),
                        password: z.string().min(6),
                        firmCode: z.string().min(1),
                        firmPassword: z.string().min(1)
                    })
                    .safeParse(credentials);

                if (parsedCredentials.success) {
                    const { email, password, firmCode, firmPassword } = parsedCredentials.data;

                    // 1. Verify Firm Credentials
                    const workspace = await prisma.workspace.findUnique({
                        where: { firmCode }
                    });

                    if (!workspace || !workspace.joinPassword) {
                        console.log('Invalid Firm Code');
                        throw new Error('Invalid Firm Code');
                    }

                    const firmPasswordMatch = await bcrypt.compare(firmPassword, workspace.joinPassword);
                    if (!firmPasswordMatch) {
                        console.log('Invalid Firm Password');
                        throw new Error('Invalid Firm Password');
                    }

                    // 2. Verify User Credentials
                    const user = await prisma.user.findUnique({
                        where: { email },
                        include: { workspaces: true }
                    });

                    if (!user || !user.password) {
                        console.log('User not found or missing password');
                        return null;
                    }

                    const userPasswordMatch = await bcrypt.compare(password, user.password);
                    if (!userPasswordMatch) {
                        console.log('Invalid User Password');
                        return null;
                    }

                    // 3. Verify User Belongs to Firm
                    const membership = user.workspaces.find(ws => ws.workspaceId === workspace.id);
                    if (!membership) {
                        console.log('User is not a member of this firm');
                        throw new Error('You are not a member of this firm.');
                    }

                    // Check for pending status
                    if (membership.status === 'pending') {
                        console.log('User is pending approval');
                        throw new Error('Pending Approval');
                    }

                    // Return user with workspaceId
                    return {
                        ...user,
                        workspaceId: workspace.id
                    };
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
