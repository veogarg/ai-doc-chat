import { NextRequest, NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import path from "path";
// import { openai } from "@/lib/openai";
import { genAI } from "@/lib/gemini";
import { chunkText } from "@/lib/chunk";
import { supabase } from "@/lib/supabase";

// Set worker source for pdf-parse (uses pdfjs-dist)
// We need to point to the legacy build worker for compatibility
PDFParse.setWorker(
    path.resolve("./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs")
);

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        const parser = new PDFParse({ data: buffer });
        const data = await parser.getText();

        /* open ai embedding code starts */
        // const chunks = chunkText(data.text);

        // console.log("Total chunks:", chunks.length);

        // for (const chunk of chunks) {
        //     const embeddingResponse = await openai.embeddings.create({
        //         model: "text-embedding-3-small",
        //         input: chunk,
        //     });

        //     const embedding = embeddingResponse.data[0].embedding;

        //     console.log("Embedding length:", embedding.length);
        // }
        /* open ai embedding code ends */


        const model = genAI.getGenerativeModel({
            model: "gemini-embedding-001",
        });

        const chunks = chunkText(data.text);

        for (const chunk of chunks) {
            const result = await model.embedContent(chunk);
            const embedding = result.embedding.values;

            await supabase.from("documents").insert({
                content: chunk,
                embedding,
                doc_name: file.name,
            });

        }

        return NextResponse.json({
            message: "Text extracted",
            length: data.text.length,
        });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Failed" }, { status: 500 });
    }
}
