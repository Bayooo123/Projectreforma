import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma) as any,
    providers: [
        CredentialsProvider({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Invalid credentials");
                }

                const user = await prisma.user.findUnique({
                    where: {
                        email: credentials.email
                    },
                    include: {
                        workspaces: {
                            include: {
                                workspace: true
                            }
                        }
                    }
                });

                if (!user || !user.password) {
                    throw new Error("Invalid credentials");
                }

                if (!user.isActive) {
                    throw new Error("Account is inactive");
                }

                const isCorrectPassword = await bcrypt.compare(
                    credentials.password,
                    user.password
                );

                if (!isCorrectPassword) {
                    throw new Error("Invalid credentials");
                }

                // Update last login
                await prisma.user.update({
                    where: { id: user.id },
                    data: { lastLoginAt: new Date() }
                });

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    image: user.image,
                };
            }
        })
    ],
    pages: {
        signIn: "/auth/login",
        signOut: "/auth/login",
        error: "/auth/error",
    },
    session: {
        strategy: "jwt",
        maxAge: 7 * 24 * 60 * 60, // 7 days
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;

                // Get user's workspaces and roles
                const userWithWorkspaces = await prisma.user.findUnique({
                    where: { id: user.id },
                    include: {
                        workspaces: {
                            include: {
                                workspace: true
                            }
                        }
                    }
                });

                if (userWithWorkspaces?.workspaces.length) {
                    const primaryWorkspace = userWithWorkspaces.workspaces[0];
                    token.workspaceId = primaryWorkspace.workspaceId;
                    token.role = primaryWorkspace.role;
                    token.workspaceName = primaryWorkspace.workspace.name;
                }
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.workspaceId = token.workspaceId as string;
                session.user.role = token.role as string;
                session.user.workspaceName = token.workspaceName as string;
            }
            return session;
        }
    },
    secret: process.env.NEXTAUTH_SECRET,
    debug: process.env.NODE_ENV === "development",
};
