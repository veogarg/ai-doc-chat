"use client";

import { useUserContext } from "@/contexts/UserContext";

export function useUser() {
    const { user, loading, refreshUser } = useUserContext();

    return {
        user,
        loading,
        reload: refreshUser,
    };
}
