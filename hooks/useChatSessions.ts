"use client";

import { useState, useEffect, useCallback } from "react";
import { chatService } from "@/lib/services/chat.service";
import type { ChatSession } from "@/lib/types/chat.types";

export function useChatSessions(userId?: string) {
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const loadSessions = useCallback(async () => {
        if (!userId) return;

        try {
            setLoading(true);
            setError(null);
            const data = await chatService.getChatSessions(userId);
            setSessions(data);
        } catch (err) {
            setError(err as Error);
            console.error("Failed to load sessions:", err);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        loadSessions();
    }, [loadSessions]);

    const createSession = async (userId: string, title?: string) => {
        try {
            const newSession = await chatService.createChatSession(userId, title);
            setSessions((prev) => [newSession, ...prev]);
            return newSession;
        } catch (err) {
            console.error("Failed to create session:", err);
            throw err;
        }
    };

    const updateSessionTitle = async (sessionId: string, title: string) => {
        try {
            await chatService.updateChatTitle(sessionId, title);
            setSessions((prev) =>
                prev.map((s) => (s.id === sessionId ? { ...s, title } : s))
            );
        } catch (err) {
            console.error("Failed to update session title:", err);
            throw err;
        }
    };

    return {
        sessions,
        loading,
        error,
        reload: loadSessions,
        createSession,
        updateSessionTitle,
    };
}
