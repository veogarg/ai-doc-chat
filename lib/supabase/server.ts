import { createClient, type SupabaseClient } from "@supabase/supabase-js";

declare global {
    var __docuMindServiceRoleClient: SupabaseClient | undefined;
}

export function createServiceRoleClient(): SupabaseClient {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
    }

    return (
        globalThis.__docuMindServiceRoleClient ??
        (globalThis.__docuMindServiceRoleClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        ))
    );
}
