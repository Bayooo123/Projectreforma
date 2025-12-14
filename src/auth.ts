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
                    .object({ email: z.string().email(), password: z.string().min(6) })
                    .safeParse(credentials);

                if (parsedCredentials.success) {
                    const { email, password } = parsedCredentials.data;

                    // Fetch user with workspace memberships
                    const user = await prisma.user.findUnique({
                        where: { email },
                        include: { workspaces: true }
                    });

                    if (!user) return null;

                    // Handle users created via OAuth who might not have a password
                    if (!user.password) return null;

                    const passwordsMatch = await bcrypt.compare(password, user.password);
                    if (passwordsMatch) {
                        // Check for pending status
                        // We check the most recent workspace or all of them
                        // For MVP/Firm Login, usually they join one.
                        const pendingWorkspace = user.workspaces.find(ws => ws.status === 'pending');

                        if (pendingWorkspace) {
                            // We return null here, but ideally we'd pass a specific error.
                            // For now, logging it and the UI will show generic error, 
                            // but we can improve this by throwing an Error that NextAuth catches.
                            console.log('User is pending approval');
                            throw new Error('Pending Approval');
                        }

                        return user;
                    }
                }

                console.log('Invalid credentials');
                return null;
            },
        }),
    ],
});
