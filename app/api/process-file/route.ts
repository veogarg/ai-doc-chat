export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import { chunkText } from "@/lib/chunk";
import path from "path";
import { PDFParse } from "pdf-parse";

// Set worker source for pdf-parse (uses pdfjs-dist)
// We need to point to the legacy build worker for compatibility
PDFParse.setWorker(
    path.resolve("./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs")
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
    try {
        const { filePath, fileName, userId } = await req.json();
        console.log("Downloading file:", filePath);

        // 1️⃣ Download file from storage
        const { data, error } = await supabase.storage
            .from("user-files")
            .download(filePath);

        console.log("Download response - data:", data, "error:", error);

        if (error) {
            console.error("DOWNLOAD ERROR:", error);
            console.error("Error details:", JSON.stringify(error, null, 2));
            return NextResponse.json({
                error: error.message || "Failed to download file",
                details: error
            }, { status: 500 });
        }

        if (!data) {
            console.error("No data returned from download");
            return NextResponse.json({
                error: "No data returned from storage"
            }, { status: 500 });
        }

        const buffer = Buffer.from(await data.arrayBuffer());

        // Use require for CommonJS module with type assertion
        // @ts-ignore - pdf-parse is a CommonJS module
        const parser = new PDFParse({ data: buffer });
        const docData = await parser.getText();
        const text = docData.text;

        const chunks = chunkText(text);

        const embedModel = genAI.getGenerativeModel({
            model: "gemini-embedding-001",
        });

        // 3️⃣ Store embeddings
        for (const chunk of chunks) {
            const result = await embedModel.embedContent(chunk);
            const embedding = result.embedding.values;

            await supabase.from("document_chunks").insert({
                user_id: userId,
                file_name: fileName,
                content: chunk,
                embedding,
            });
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("Processing error:", e);
        return NextResponse.json({
            error: "Processing failed",
            details: e instanceof Error ? e.message : String(e)
        }, { status: 500 });
    }
}
