"use client";

import { useState, useEffect, useCallback } from "react";
import { chatService } from "@/lib/services/chat.service";
import type { ChatMessage } from "@/lib/types/chat.types";
import { toast } from "sonner";

export function useChatMessages(sessionId: string) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const loadMessages = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await chatService.getMessages(sessionId);
            setMessages(data);
        } catch (err) {
            setError(err as Error);
            console.error("Failed to load messages:", err);
            toast.error("Failed to load conversation history");
        } finally {
            setLoading(false);
        }
    }, [sessionId]);

    useEffect(() => {
        if (sessionId) {
            void loadMessages();
        }
    }, [sessionId, loadMessages]);

    const addMessage = async (role: "user" | "ai", content: string) => {
        const newMessage: ChatMessage = {
            session_id: sessionId,
            role,
            content,
        };

        // Optimistically add to UI
        setMessages((prev) => [...prev, newMessage]);

        try {
            await chatService.saveMessage(newMessage);
        } catch (err) {
            console.error("Failed to save message:", err);
            // Rollback on error
            setMessages((prev) => prev.slice(0, -1));
            throw err;
        }
    };

    const addOptimisticMessage = (role: "user" | "ai", content: string) => {
        setMessages((prev) => [
            ...prev,
            { session_id: sessionId, role, content },
        ]);
    };

    return {
        messages,
        loading,
        error,
        reload: loadMessages,
        addMessage,
        addOptimisticMessage,
        setMessages,
    };
}
