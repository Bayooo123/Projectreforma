import "@auth/core/adapters";

declare module "@auth/core/adapters" {
    interface AdapterUser {
        role?: string;
        workspaceId?: string;
    }
}
