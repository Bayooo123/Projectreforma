import { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            workspaceId: string;
            lawyerToken: string;
            role: "owner" | "partner" | "associate" | "admin" | "member";
            isPlatformAdmin: boolean;
            isWorkspaceOwner: boolean;
            permissions: string[];
        } & DefaultSession["user"];
    }

    interface User {
        role?: "owner" | "partner" | "associate" | "admin" | "member";
        workspaceId?: string;
        lawyerToken?: string;
        isPlatformAdmin?: boolean;
        isWorkspaceOwner?: boolean;
        permissions?: string[];
    }
}

declare module "@auth/core/adapters" {
    interface AdapterUser {
        isPlatformAdmin?: boolean;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        workspaceId?: string;
        role?: string;
        isPlatformAdmin?: boolean;
        isWorkspaceOwner?: boolean;
        permissions?: string[];
    }
}
