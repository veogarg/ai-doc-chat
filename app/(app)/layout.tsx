"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = createClient();
    const [email, setEmail] = useState<string | null>(null);

    useEffect(() => {
        const loadUser = async () => {
            const { data } = await supabase.auth.getUser();

            if (!data.user) {
                window.location.href = "/auth";
            } else {
                setEmail(data.user.email ?? null);
            }
        };

        loadUser();
    }, []);

    const logout = async () => {
        await supabase.auth.signOut();
        window.location.href = "/auth";
    };

    return (
        <div className="flex h-screen">
            {/* Sidebar */}
            <div className="w-64 border-r p-4">
                <h2 className="text-xl font-bold mb-6">AI Copilot</h2>

                <div className="space-y-3">
                    <a href="/chat" className="block text-sm font-medium">
                        💬 Chat
                    </a>

                    <a href="/files" className="block text-sm font-medium">
                        📁 Files
                    </a>
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
