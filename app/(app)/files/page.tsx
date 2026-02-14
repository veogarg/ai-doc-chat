"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function FilesPage() {
    const supabase = createClient();
    const [file, setFile] = useState<File | null>(null);
    const [isUploaded, setIsUploaded] = useState(false);

    const upload = async () => {
        if (!file) return;

        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;

        if (!user) {
            alert("User not logged in");
            return;
        }

        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const filePath = `${user.id}/${Date.now()}_${safeName}`;

        // Upload to storage
        const { data, error } = await supabase.storage
            .from("user-files")
            .upload(filePath, file);

        if (error) {
            alert(error.message);
            return;
        }

        // Save record in DB
        await supabase.from("user_documents").insert({
            user_id: user.id,
            file_name: file.name,
            file_path: filePath,
        });

        setIsUploaded(true);

        await fetch("/api/process-file", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                filePath: filePath,
                fileName: file.name,
                userId: user.id,
            }),
        });
    };

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">Upload Files</h1>

            <Input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
            />

            <Button onClick={upload} className="mt-4" disabled={isUploaded}>
                {isUploaded ? "Uploaded" : "Upload"}
            </Button>
        </div>
    );
}
