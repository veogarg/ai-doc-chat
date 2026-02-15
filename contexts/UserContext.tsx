"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User } from "@/lib/types/user.types";
import { authService } from "@/lib/services/auth.service";

interface UserContextType {
    user: User | null;
    loading: boolean;
    setUser: (user: User | null) => void;
    refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
    children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshUser = async () => {
        setLoading(true);
        try {
            const currentUser = await authService.getCurrentUser();
            setUser(currentUser);
        } catch (error) {
            console.error("Failed to refresh user:", error);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!user) {
            refreshUser();
        }
    }, [user]);

    const value: UserContextType = {
        user,
        loading,
        setUser,
        refreshUser,
    };

    return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUserContext() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error("useUserContext must be used within a UserProvider");
    }
    return context;
}
