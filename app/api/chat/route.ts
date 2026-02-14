export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
    // try {
    const { messages, userId } = await req.json();
    const lastMessage = messages[messages.length - 1].content;

    // 1️⃣ Convert question → embedding
    const embedModel = genAI.getGenerativeModel({
        model: "gemini-embedding-001",
    });

    const embedResult = await embedModel.embedContent(lastMessage);
    const queryEmbedding = embedResult.embedding.values;

    // 2️⃣ Fetch relevant document chunks
    const { data: docs } = await supabase.rpc("match_chunks", {
        query_embedding: queryEmbedding,
        match_count: 5,
        user_id: userId,
    });

    const docContext = docs?.map((d: any) => d.content).join("\n\n") || "";

    // 3️⃣ Build conversation prompt
    const conversation = messages
        .map((m: any) => `${m.role}: ${m.content}`)
        .join("\n");

    const finalPrompt = `
        You are a professional resume analyst and career assistant.

        Using the DOCUMENT CONTEXT and CONVERSATION below, generate a structured response.

        Rules:
        - Do NOT use markdown symbols like ### or **
        - Write clean plain text
        - Replace the template sections with actual content from the resume
        - Do NOT return placeholders like "<short paragraph>" or "skill 1"
        - Fill everything with real information from the documents

        If the user asks for a summary, respond in this exact structure:

        Professional Summary:
        Write a concise 3–4 sentence summary of the candidate based on the resume.

        Key Skills:
        List the main technical skills mentioned in the resume.

        Experience Highlights:
        List 2–4 strong career highlights from the resume.

        DOCUMENT CONTEXT:
        ${docContext}

        CONVERSATION:
        ${conversation}
    `;



    // 4️⃣ Ask Gemini
    const model = genAI.getGenerativeModel({
        model: "gemini-flash-latest",
    });

    const result = await model.generateContent(finalPrompt);
    const reply = result.response.text();

    return NextResponse.json({ reply });
    // } catch (e) {
    //     console.error(e);
    //     return NextResponse.json({ error: "AI failed" }, { status: 500 });
    // }
}
