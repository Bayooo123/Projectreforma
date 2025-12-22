import NextAuth, { DefaultSession } from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
    interface User {
        workspaceId?: string
    }
    interface Session {
        user: {
            id: string
            workspaceId: string
        } & DefaultSession["user"]
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        workspaceId?: string
    }
}
