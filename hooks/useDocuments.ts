"use client";

import { useDocumentsContext } from "@/contexts/DocumentsContext";

export function useDocuments() {
    const { documents, loading, error, refreshDocuments, addDocument, removeDocument } = useDocumentsContext();

    return {
        documents,
        loading,
        error,
        reload: refreshDocuments,
        addDocument,
        removeDocument,
    };
}
