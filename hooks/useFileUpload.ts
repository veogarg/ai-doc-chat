"use client";

import { useState } from "react";
import { documentService } from "@/lib/services/document.service";
import { aiService } from "@/lib/services/ai.service";
import { useDocuments } from "@/hooks/useDocuments";
import type { UserDocument } from "@/lib/types/document.types";
import { toast } from "sonner";

export interface UploadStatus {
    uploading: boolean;
    processing: boolean;
    message: string | null;
    error: Error | null;
}

export function useFileUpload() {
    const { addDocument, removeDocument } = useDocuments();
    const [status, setStatus] = useState<UploadStatus>({
        uploading: false,
        processing: false,
        message: null,
        error: null,
    });

    const uploadFile = async (file: File, userId: string) => {
        let filePath: string | null = null;
        let documentRecord: UserDocument | null = null;

        try {
            setStatus({
                uploading: true,
                processing: false,
                message: `Uploading ${file.name}...`,
                error: null,
            });

            // Upload file to storage
            filePath = await documentService.uploadFile(file, userId);

            setStatus({
                uploading: false,
                processing: true,
                message: `Processing ${file.name}...`,
                error: null,
            });

            // Save document record
            documentRecord = await documentService.saveDocumentRecord(userId, file.name, filePath);

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

            toast.success(`Successfully uploaded and processed ${file.name}`);

            return { fileName: file.name, filePath };
        } catch (error) {
            if (filePath) {
                try {
                    await documentService.deleteDocumentAndRelated(
                        userId,
                        documentRecord?.id || null,
                        file.name,
                        filePath
                    );
                    if (documentRecord?.id) {
                        removeDocument(documentRecord.id);
                    }
                } catch (cleanupError) {
                    console.error("Failed to cleanup after process error:", cleanupError);
                }
            }

            const err = error as Error;
            setStatus({
                uploading: false,
                processing: false,
                message: null,
                error: err,
            });

            toast.error(err.message || `Failed to process ${file.name}`);
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
