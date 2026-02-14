"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ChatPage() {
    const supabase = createClient();

    const [sessionId, setSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState("");
    const [aiThinking, setAiThinking] = useState(false);
    const bottomRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        const initSession = async () => {
            const { data: userData } = await supabase.auth.getUser();

            if (!userData.user) return;

            // create new session
            const { data: session } = await supabase
                .from("chat_sessions")
                .insert({
                    user_id: userData.user.id,
                    title: "New Chat",
                })
                .select()
                .single();

            setSessionId(session.id);
        };

        initSession();
    }, []);

    const sendMessage = async () => {
        try {
            setAiThinking(true);
            if (!input || !sessionId) return;

            const userMsg = input;

            // Save user message
            await supabase.from("messages").insert({
                session_id: sessionId,
                role: "user",
                content: userMsg,
            });

            const updatedMessages = [
                ...messages,
                { role: "user", content: userMsg },
            ];

            setMessages(updatedMessages);
            setInput("");
            const { data: userData } = await supabase.auth.getUser();
            // Call AI
            const res = await fetch("/api/chat", {
                method: "POST",
                body: JSON.stringify({
                    messages: updatedMessages,
                    userId: userData.user?.id,
                }),
                headers: { "Content-Type": "application/json" },
            });

            const data = await res.json();

            const aiReply = data.reply;

            // Save AI message
            await supabase.from("messages").insert({
                session_id: sessionId,
                role: "ai",
                content: aiReply,
            });

            setMessages((prev) => [
                ...prev,
                { role: "ai", content: aiReply },
            ]);
        } catch (error) {
            console.error(error);
        } finally {
            setAiThinking(false);
        }
    };


    return (
        <div>
            <h1 className="text-xl font-bold mb-4">Chat</h1>

            <div className="flex-1 overflow-y-auto space-y-3 p-4">
                {messages.map((m, i) => (
                    <div
                        key={i}
                        className={`p-4 rounded-lg max-w-4xl ${m.role === "user"
                            ? "bg-blue-50 ml-auto"
                            : "bg-gray-100"
                            }`}
                    >
                        <div className="text-xs text-gray-500 mb-1">
                            {m.role === "user" ? "You" : "AI"}
                        </div>

                        <div className="whitespace-pre-line text-sm">
                            {m.content}
                        </div>
                    </div>
                ))}
            </div>
            <div ref={bottomRef} />
            <div className="border-t p-4 bg-white">
                <div className="flex gap-2">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask something..."
                        className="flex-1"
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                sendMessage();
                            }
                        }}
                    />

                    <Button onClick={sendMessage} disabled={aiThinking}> {aiThinking ? "Thinking 🧐" : "Send ⏎"}</Button>
                </div>
            </div>
        </div>
    );
}
