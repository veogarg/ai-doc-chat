"use client";

import { createContext, useContext, ReactNode } from "react";

interface ChatSessionContextType {
    updateSessionTitle: (sessionId: string, title: string) => Promise<void>;
}

const ChatSessionContext = createContext<ChatSessionContextType | undefined>(undefined);

interface ChatSessionProviderProps {
    children: ReactNode;
    updateSessionTitle: (sessionId: string, title: string) => Promise<void>;
}

export function ChatSessionProvider({ children, updateSessionTitle }: ChatSessionProviderProps) {
    const value: ChatSessionContextType = {
        updateSessionTitle,
    };

    return <ChatSessionContext.Provider value={value}>{children}</ChatSessionContext.Provider>;
}

export function useChatSession() {
    const context = useContext(ChatSessionContext);
    if (context === undefined) {
        throw new Error("useChatSession must be used within a ChatSessionProvider");
    }
    return context;
}
