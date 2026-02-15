"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/lib/services/auth.service";
import { useUserContext } from "@/contexts/UserContext";

export function useAuth() {
    const router = useRouter();
    const { user, loading: contextLoading, setUser } = useUserContext();
    const [loading, setLoading] = useState(false);

    const signIn = async (email: string, password: string) => {
        setLoading(true);
        try {
            const { data, error } = await authService.signIn(email, password);
            if (error) throw error;

            if (data.user) {
                setUser(data.user);
                router.push("/");
            } else {
                setUser(null);
                router.push("/auth");
            }
        } catch (error: any) {
            throw new Error(error.message || "Sign in failed");
        } finally {
            setLoading(false);
        }
    };

    const signUp = async (email: string, password: string) => {
        setLoading(true);
        try {
            const { data, error } = await authService.signUp(email, password);
            if (error) throw error;
            if (data.user) {
                setUser(data.user);
                router.push("/");
            } else {
                setUser(null);
                router.push("/auth");
            }
        } finally {
            setLoading(false);
        }
    };

    const signOut = async () => {
        setLoading(true);
        try {
            await authService.signOut();
            setUser(null);
            router.push("/auth");
        } catch (error: any) {
            throw new Error(error.message || "Sign out failed");
        } finally {
            setLoading(false);
        }
    };

    return {
        user,
        loading: loading || contextLoading,
        signIn,
        signUp,
        signOut,
        isAuthenticated: !!user,
    };
}
