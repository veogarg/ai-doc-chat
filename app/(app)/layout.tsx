"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { useChatSessions } from "@/hooks/useChatSessions";
import { useDocuments } from "@/hooks/useDocuments";
import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Spinner } from "@/components/ui/spinner";
import { ChatSessionProvider } from "@/contexts/ChatSessionContext";

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { user, loading: userLoading } = useUser();
    const { sessions, updateSessionTitle, createSession } = useChatSessions(user?.id);
    const { documents } = useDocuments(user?.id);
    const { signOut } = useAuth();

    useEffect(() => {
        if (!userLoading && !user) {
            router.push("/auth");
        }
    }, [user, userLoading, router]);

    const handleNewChat = async () => {
        if (!user) return;

        const newSession = await createSession(user.id);
        router.push(`/chat/${newSession.id}`);
    };

    if (userLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Spinner />
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <ChatSessionProvider updateSessionTitle={updateSessionTitle}>
            <div className="flex h-screen">
                <Sidebar
                    sessions={sessions}
                    documents={documents}
                    onNewChat={handleNewChat}
                />

                <div className="flex-1 flex flex-col">
                    <Header email={user.email ?? null} onLogout={signOut} />
                    <div className="flex-1 p-6 overflow-auto">{children}</div>
                </div>
            </div>
        </ChatSessionProvider>
    );
}
