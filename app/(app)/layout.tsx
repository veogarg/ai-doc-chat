"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface ChatSession {
    id: string;
    title: string | null;
    created_at: string;
}

export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = createClient();
    const [email, setEmail] = useState<string | null>(null);
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [documents, setDocuments] = useState<any[]>([]);

    useEffect(() => {
        const loadUser = async () => {
            const { data } = await supabase.auth.getUser();

            if (!data.user) {
                window.location.href = "/auth";
            } else {
                setEmail(data.user.email ?? null);
            }

            const { data: chats } = await supabase
                .from("chat_sessions")
                .select("*")
                .order("created_at", { ascending: false });

            setSessions(chats || []);

            const { data: docs } = await supabase
                .from("user_documents")
                .select("*")
                .order("created_at", { ascending: false });

            setDocuments(docs || []);


        };

        loadUser();
    }, []);

    const logout = async () => {
        await supabase.auth.signOut();
        window.location.href = "/auth";
    };

    const createNewChat = async () => {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;

        const { data } = await supabase
            .from("chat_sessions")
            .insert({
                user_id: user?.id,
                title: "New Chat",
            })
            .select()
            .single();

        window.location.href = `/chat/${data.id}`;
    };

    return (
        <div className="flex h-screen">
            {/* Sidebar */}
            <div className="w-64 border-r p-4 flex flex-col">
                <Link href="/" className="text-xl font-bold mb-4">DocuMind</Link>

                <Button className="mb-4" onClick={createNewChat}>
                    + New Chat
                </Button>

                <div className="mb-4">
                    <div className="text-xs font-semibold text-gray-500 mb-2">
                        DOCUMENTS
                    </div>

                    <div className="space-y-1">
                        {documents.map((doc) => (
                            <div
                                key={doc.id}
                                className="text-sm p-2 rounded bg-gray-50"
                            >
                                📄 {doc.file_name}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-2 overflow-y-auto">
                    <div className="text-xs font-semibold text-gray-500 mb-2">
                        Chats
                    </div>
                    {sessions.map((s) => (
                        <a
                            key={s.id}
                            href={`/chat/${s.id}`}
                            className="block text-sm p-2 rounded hover:bg-gray-100"
                        >
                            {s.title || "Untitled Chat"}
                        </a>
                    ))}
                </div>
            </div>



            {/* Main Area */}
            <div className="flex-1 flex flex-col">
                {/* Header */}
                <div className="border-b p-4 flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                        {email}
                    </div>

                    <Button variant="destructive" onClick={logout}>
                        Logout
                    </Button>
                </div>

                {/* Content */}
                <div className="flex-1 p-6 overflow-auto">{children}</div>
            </div>
        </div>
    );
}
