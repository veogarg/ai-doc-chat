import { createClient } from "@/lib/supabase/client";
import type { UserDocument } from "@/lib/types/document.types";
import { DATABASE_TABLES, STORAGE_BUCKETS } from "@/lib/constants/config";

export class DocumentService {
    private supabase = createClient();

    async getDocuments(userId: string): Promise<UserDocument[]> {
        const { data } = await this.supabase
            .from(DATABASE_TABLES.USER_DOCUMENTS)
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false });

        return data || [];
    }

    async uploadFile(file: File, userId: string): Promise<string> {
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const filePath = `${userId}/${Date.now()}_${safeName}`;

        const { error } = await this.supabase.storage
            .from(STORAGE_BUCKETS.USER_FILES)
            .upload(filePath, file);

        if (error) throw error;

        return filePath;
    }

    async saveDocumentRecord(
        userId: string,
        fileName: string,
        filePath: string
    ): Promise<UserDocument> {
        const { data } = await this.supabase
            .from(DATABASE_TABLES.USER_DOCUMENTS)
            .insert({
                user_id: userId,
                file_name: fileName,
                file_path: filePath,
            })
            .select()
            .single();

        return data;
    }

    async downloadFile(filePath: string): Promise<Blob> {
        const { data, error } = await this.supabase.storage
            .from(STORAGE_BUCKETS.USER_FILES)
            .download(filePath);

        if (error || !data) {
            throw new Error(error?.message || "Failed to download file");
        }

        return data;
    }

    async deleteDocumentAndRelated(
        userId: string,
        documentId: string | null,
        fileName: string,
        filePath: string
    ): Promise<void> {
        // Delete from storage
        await this.supabase.storage
            .from(STORAGE_BUCKETS.USER_FILES)
            .remove([filePath]);

        // Delete chunks if any
        await this.supabase
            .from(DATABASE_TABLES.DOCUMENT_CHUNKS)
            .delete()
            .eq("user_id", userId)
            .eq("file_name", fileName);

        // Delete document record if it was created
        if (documentId) {
            await this.supabase
                .from(DATABASE_TABLES.USER_DOCUMENTS)
                .delete()
                .eq("id", documentId);
        }
    }
}

// Singleton instance
export const documentService = new DocumentService();
