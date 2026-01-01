import "@auth/core/adapters";

declare module "@auth/core/adapters" {
    interface AdapterUser {
        role?: "owner" | "partner" | "associate" | "admin" | "member";
        workspaceId?: string;
    }
}
