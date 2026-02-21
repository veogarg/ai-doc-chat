export interface ChatSession {
    id: string;
    title: string | null;
    created_at: string;
    user_id: string;
}

export interface ChatMessage {
    id?: string;
    session_id: string;
    role: "user" | "ai";
    content: string;
    created_at?: string;
    streaming?: boolean;
}

export interface ChatMessageInput {
    session_id: string;
    role: "user" | "ai";
    content: string;
}
