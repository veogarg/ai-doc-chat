"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { UserDocument } from "@/lib/types/document.types";
import { documentService } from "@/lib/services/document.service";

interface DocumentsContextType {
    documents: UserDocument[];
    loading: boolean;
    error: Error | null;
    refreshDocuments: () => Promise<void>;
    addDocument: (document: UserDocument) => void;
    removeDocument: (documentId: string) => void;
}

const DocumentsContext = createContext<DocumentsContextType | undefined>(undefined);

interface DocumentsProviderProps {
    children: ReactNode;
    userId?: string;
}

export function DocumentsProvider({ children, userId }: DocumentsProviderProps) {
    const [documents, setDocuments] = useState<UserDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const refreshDocuments = useCallback(async () => {
        if (!userId) {
            setDocuments([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const data = await documentService.getDocuments(userId);
            setDocuments(data);
            setError(null);
        } catch (err) {
            console.error("Failed to load documents:", err);
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        refreshDocuments();
    }, [refreshDocuments]);

    const addDocument = useCallback((document: UserDocument) => {
        setDocuments((prev) => [document, ...prev]);
    }, []);

    const removeDocument = useCallback((documentId: string) => {
        setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
    }, []);

    const value: DocumentsContextType = {
        documents,
        loading,
        error,
        refreshDocuments,
        addDocument,
        removeDocument,
    };

    return <DocumentsContext.Provider value={value}>{children}</DocumentsContext.Provider>;
}

export function useDocumentsContext() {
    const context = useContext(DocumentsContext);
    if (context === undefined) {
        throw new Error("useDocumentsContext must be used within a DocumentsProvider");
    }
    return context;
}
