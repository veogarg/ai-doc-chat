export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { genAI } from "@/lib/gemini";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
    try {
        const { question } = await req.json();

        const embeddingModel = genAI.getGenerativeModel({
            model: "gemini-embedding-001",
        });

        // 1. Convert question → embedding
        const embedResult = await embeddingModel.embedContent(question);
        const queryEmbedding = embedResult.embedding.values;

        // 2. Find similar chunks from Supabase
        const { data: docs } = await supabase.rpc("match_documents", {
            query_embedding: queryEmbedding,
            match_count: 5,
        });

        const context = docs
            ?.map((d: { doc_name: any; content: any; }) => `[Source: ${d.doc_name}]\n${d.content}`)
            .join("\n\n");



        // 3. Send context + question to Gemini
        const chatModel = genAI.getGenerativeModel({
            model: "gemini-flash-latest",
        });

        const prompt = `
You are an expert resume analyst.

Answer using ONLY the resume context below.

If the question requires summarizing, analyzing, or rewriting,
generate the answer from the given information.

Do not make up skills, companies, or achievements.

Resume Context:
${context}

Question:
${question}
`;




        const result = await chatModel.generateContent(prompt);
        const response = result.response.text();

        return NextResponse.json({ answer: response });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Chat failed" }, { status: 500 });
    }
}
