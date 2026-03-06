import NextAuth, { DefaultSession } from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
    interface User {
        role?: string
        workspaceId?: string
        lawyerToken?: string
        isPlatformAdmin?: boolean
    }
    interface Session {
        user: {
            id: string
            role: string
            workspaceId: string
            lawyerToken: string
            isPlatformAdmin: boolean
        } & DefaultSession["user"]
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        role?: string
        workspaceId?: string
        lawyerToken?: string
        isPlatformAdmin?: boolean
    }
}
