"use client";

import { useState } from "react";

export default function ChatPage() {
    const [question, setQuestion] = useState("");
    const [answer, setAnswer] = useState("");
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState<
        { role: "user" | "ai"; text: string; }[]
    >([]);

    const ask = async () => {
        if (!question.trim()) return;
        setLoading(true);
        const userMessage = question;

        // Add user message immediately
        setMessages((prev) => [
            ...prev,
            { role: "user", text: userMessage }
        ]);

        setQuestion("");

        const res = await fetch("/api/chat", {
            method: "POST",
            body: JSON.stringify({ question: userMessage }),
            headers: { "Content-Type": "application/json" },
        });

        const data = await res.json();

        // Add AI response
        setMessages((prev) => [
            ...prev,
            { role: "ai", text: data.answer }
        ]);
        setLoading(false);
    };


    return (
        <div className="p-10 min-h-screen bg-zinc-50 dark:bg-black">
            <h1 className="text-2xl font-bold mb-8 text-black dark:text-zinc-50">Chat with Resume</h1>

            <div className="mt-8 space-y-4">
                {messages.map((m, i) => (
                    <div
                        key={i}
                        className={`mb-3 p-3 rounded-lg ${m.role === "user"
                            ? "bg-slate-200 text-[#5c2727]"
                            : "bg-neutral-100 text-[#480808]"
                            }`}
                    >
                        <strong>{m.role === "user" ? "You" : "AI"}:</strong>
                        <div>{m.text}</div>
                    </div>
                ))}
            </div>

            <div className="mt-8 flex gap-3 w-full">
                <input
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Ask something..."
                    className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-zinc-800 dark:text-white"
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            ask();
                        }
                    }}
                />

                <button
                    onClick={ask}
                    className="p-3 rounded-lg bg-[#480808] text-white hover:opacity-90 transition-opacity"
                >
                    {loading ? "Thinking..." : "Ask"}
                </button>
            </div>
        </div>
    );
}
