"use client";

import { ChatMessage } from "./ChatMessage";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import type { ChatMessage as ChatMessageType } from "@/lib/types/chat.types";

interface MessageListProps {
    messages: ChatMessageType[];
}

export function MessageList({ messages }: MessageListProps) {
    const bottomRef = useAutoScroll<HTMLDivElement>(messages);

    return (
        <div className="flex-1 overflow-y-auto space-y-3 p-4">
            {messages.map((message, index) => (
                <ChatMessage key={index} message={message} />
            ))}
            <div ref={bottomRef} />
        </div>
    );
}
