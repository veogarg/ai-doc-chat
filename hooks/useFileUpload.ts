"use client";

import { useState } from "react";
import { documentService } from "@/lib/services/document.service";
import { aiService } from "@/lib/services/ai.service";
import { useDocuments } from "@/hooks/useDocuments";

export interface UploadStatus {
    uploading: boolean;
    processing: boolean;
    message: string | null;
    error: Error | null;
}

export function useFileUpload() {
    const { addDocument } = useDocuments();
    const [status, setStatus] = useState<UploadStatus>({
        uploading: false,
        processing: false,
        message: null,
        error: null,
    });

    const uploadFile = async (file: File, userId: string) => {
        try {
            setStatus({
                uploading: true,
                processing: false,
                message: `Uploading ${file.name}...`,
                error: null,
            });

            // Upload file to storage
            const filePath = await documentService.uploadFile(file, userId);

            setStatus({
                uploading: false,
                processing: true,
                message: `Processing ${file.name}...`,
                error: null,
            });

            // Save document record
            const documentRecord = await documentService.saveDocumentRecord(userId, file.name, filePath);

            // Add to documents context immediately
            addDocument(documentRecord);

            // Process file for embeddings
            await aiService.processDocument(filePath, file.name, userId);

            setStatus({
                uploading: false,
                processing: false,
                message: null,
                error: null,
            });

            return { fileName: file.name, filePath };
        } catch (error) {
            const err = error as Error;
            setStatus({
                uploading: false,
                processing: false,
                message: null,
                error: err,
            });
            throw err;
        }
    };

    const reset = () => {
        setStatus({
            uploading: false,
            processing: false,
            message: null,
            error: null,
        });
    };

    return {
        status,
        uploadFile,
        reset,
        isUploading: status.uploading || status.processing,
    };
}
