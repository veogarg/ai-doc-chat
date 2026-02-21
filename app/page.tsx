"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { chatService } from "@/lib/services/chat.service";

export default function Home() {
  const router = useRouter();
  const { user, loading } = useUser();
  const initializedRef = useRef(false);

  const initializeChat = useCallback(async () => {
    if (!user) return;

    try {
      const latestSession = await chatService.getLatestChatSession(user.id);

      if (latestSession) {
        router.push(`/chat/${latestSession.id}`);
      } else {
        const newSession = await chatService.createChatSession(user.id);
        router.push(`/chat/${newSession.id}`);
      }
    } catch (error) {
      console.error("Failed to initialize chat:", error);
    }
  }, [router, user]);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push("/auth");
      return;
    }

    // Prevent duplicate initialization in React Strict Mode
    if (initializedRef.current) return;
    initializedRef.current = true;

    initializeChat();
  }, [user, loading, router, initializeChat]);

  return null;
}
