"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { useChatMessages } from "@/hooks/useChatMessages";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useChatSession } from "@/contexts/ChatSessionContext";
import { MessageList } from "@/components/chat/MessageList";
import { ChatInput } from "@/components/chat/ChatInput";
import { aiService } from "@/lib/services/ai.service";
import { chatService } from "@/lib/services/chat.service";
import { APP_CONFIG } from "@/lib/constants/config";
import { Sparkle } from 'lucide-react';

export default function ChatPage() {
    const { id } = useParams();
    const { user } = useUser();
    const { messages, addMessage, setMessages } = useChatMessages(id as string);
    const { status, uploadFile, isUploading } = useFileUpload();
    const { updateSessionTitle } = useChatSession();
    const [aiThinking, setAiThinking] = useState(false);

    const handleSendMessage = async (content: string) => {
        if (!user || !content.trim()) return;

        try {
            setAiThinking(true);

            // Add user message
            await addMessage("user", content);

            // Update chat title if it's a new chat
            const session = await chatService.getChatSession(id as string);
            if (session?.title === APP_CONFIG.DEFAULT_CHAT_TITLE) {
                await updateSessionTitle(id as string, content.slice(0, 40));
            }

            // Get AI response
            const updatedMessages = [...messages, { session_id: id as string, role: "user" as const, content }];
            const aiReply = await aiService.generateResponse({
                messages: updatedMessages,
                userId: user.id,
            });

            // Add AI response
            await addMessage("ai", aiReply);
        } catch (error) {
            console.error("Failed to send message:", error);
        } finally {
            setAiThinking(false);
        }
    };

    const handleFileUpload = async (file: File) => {
        if (!user) return;

        try {
            const result = await uploadFile(file, user.id);

            // Add success messages to chat
            setMessages((prev) => [
                ...prev,
                {
                    session_id: id as string,
                    role: "user",
                    content: `📎 Uploaded file: ${result.fileName}`,
                },
                {
                    session_id: id as string,
                    role: "ai",
                    content: `Document "${result.fileName}" is ready. You can now ask questions about it.`,
                },
            ]);
        } catch (error) {
            console.error("Failed to upload file:", error);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-80px)]">
            <MessageList messages={messages} />
            {
                aiThinking && (
                    <div className="flex items-center gap-2 p-4 text-muted-foreground">
                        <Sparkle className="w-5 h-5 animate-spin-slow" />
                        <p className="text-sm animate-pulse">Thinking...</p>
                    </div>
                )
            }
            <ChatInput
                onSendMessage={handleSendMessage}
                onFileUpload={handleFileUpload}
                isThinking={aiThinking}
                isUploading={isUploading}
                uploadStatus={status.message}
            />
        </div>
    );
}
