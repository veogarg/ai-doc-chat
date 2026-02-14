"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Paperclip } from "lucide-react";

export default function ChatPage() {
    const supabase = createClient();
    const { id } = useParams();

    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState("");
    const [aiThinking, setAiThinking] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<string | null>(null);
    const bottomRef = useRef<HTMLDivElement | null>(null);

    // 🔹 Load existing messages for this session
    useEffect(() => {
        const loadMessages = async () => {
            const { data } = await supabase
                .from("messages")
                .select("*")
                .eq("session_id", id)
                .order("created_at");

            setMessages(data || []);
        };

        loadMessages();
    }, [id]);

    // 🔹 Auto-scroll
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // 🔹 Send Message (Merged from old logic)
    const sendMessage = async () => {
        try {
            if (!input.trim()) return;

            setAiThinking(true);

            const userMsg = input;
            setInput("");

            // Save user message
            await supabase.from("messages").insert({
                session_id: id,
                role: "user",
                content: userMsg,
            });

            const updatedMessages = [
                ...messages,
                { role: "user", content: userMsg },
            ];

            setMessages(updatedMessages);

            const { data: userData } = await supabase.auth.getUser();

            // 🔹 Update title ONLY once
            const { data: session } = await supabase
                .from("chat_sessions")
                .select("title")
                .eq("id", id)
                .single();

            if (session?.title === "New Chat") {
                await supabase
                    .from("chat_sessions")
                    .update({
                        title: userMsg.slice(0, 40),
                    })
                    .eq("id", id);
            }

            // 🔹 Call AI (RAG endpoint)
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

            // Save AI reply
            await supabase.from("messages").insert({
                session_id: id,
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

    const handleUpload = async (e: any) => {
        const file = e.target.files[0];
        if (!file) return;

        const fileName = file.name;

        setUploading(true);
        setUploadStatus(`Uploading ${fileName}...`);

        try {
            const { data: userData } = await supabase.auth.getUser();
            const user = userData.user;

            const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
            const filePath = `${user?.id}/${Date.now()}_${safeName}`;

            // 1️⃣ Upload to storage
            await supabase.storage
                .from("user-files")
                .upload(filePath, file);

            setUploadStatus(`Processing ${fileName}...`);

            // 2️⃣ Save record
            await supabase.from("user_documents").insert({
                user_id: user?.id,
                file_name: file.name,
                file_path: filePath,
            });

            // 3️⃣ Trigger processing
            await fetch("/api/process-file", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    filePath,
                    fileName: file.name,
                    userId: user?.id,
                }),
            });

            // 4️⃣ Show success message inside chat
            setMessages((prev) => [
                ...prev,
                {
                    role: "user",
                    content: `📎 Uploaded file: ${fileName}`,
                },
                {
                    role: "ai",
                    content: `Document "${fileName}" is ready. You can now ask questions about it.`,
                },
            ]);

            setUploadStatus(null);
        } catch (err) {
            console.error(err);
            setUploadStatus("Upload failed");
        } finally {
            setUploading(false);
        }

        window.location.reload();
    };


    return (
        <div className="flex flex-col h-[calc(100vh-80px)]">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-3 p-4">
                {messages.map((m, i) => (
                    <div
                        key={i}
                        className={`p-4 rounded-lg max-w-3xl ${m.role === "user"
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
                <div ref={bottomRef} />
            </div>

            {/* Input Bar */}
            <div className="border-t p-4 bg-white">
                {uploadStatus && (
                    <div className="text-xs text-gray-500 mb-2">
                        {uploadStatus}
                    </div>
                )}
                <div className="flex gap-2 items-center">
                    {/* File Upload */}
                    <Input
                        type="file"
                        className="text-sm"
                        onChange={handleUpload}
                        hidden
                        id="file-upload"
                    />

                    <Button
                        onClick={() =>
                            document.getElementById("file-upload")?.click()
                        }
                        disabled={uploading}
                    >
                        {uploading ? <Loader2 className="animate-spin" /> : <Paperclip />}
                    </Button>

                    {/* Message Input */}
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask something..."
                        className="flex-1"
                        onKeyDown={(e) => {
                            if (e.key === "Enter") sendMessage();
                        }}
                    />

                    <Button onClick={sendMessage} disabled={aiThinking}>
                        {aiThinking ? "Thinking 🧐" : "Send ⏎"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
