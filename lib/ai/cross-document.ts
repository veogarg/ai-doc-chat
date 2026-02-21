import type { RankedChunk } from "@/lib/ai/rerank";

interface GroupedDocument {
    fileName: string;
    chunks: RankedChunk[];
    keywords: string[];
}

function tokenize(text: string): string[] {
    return text
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((token) => token.length >= 4);
}

function extractTopKeywords(text: string, limit = 8): string[] {
    const frequencies = new Map<string, number>();

    for (const token of tokenize(text)) {
        frequencies.set(token, (frequencies.get(token) ?? 0) + 1);
    }

    return [...frequencies.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([token]) => token);
}

function groupByDocument(chunks: RankedChunk[]): GroupedDocument[] {
    const grouped = new Map<string, RankedChunk[]>();

    for (const chunk of chunks) {
        const fileName = chunk.file_name ?? "Unknown document";
        const list = grouped.get(fileName) ?? [];
        list.push(chunk);
        grouped.set(fileName, list);
    }

    return [...grouped.entries()].map(([fileName, docChunks]) => {
        const mergedText = docChunks.map((chunk) => chunk.content).join(" ");
        return {
            fileName,
            chunks: docChunks,
            keywords: extractTopKeywords(mergedText),
        };
    });
}

function synthesisSummary(documents: GroupedDocument[]): string {
    if (documents.length <= 1) {
        return "Single-document context detected.";
    }

    const appearances = new Map<string, number>();

    for (const doc of documents) {
        for (const keyword of new Set(doc.keywords)) {
            appearances.set(keyword, (appearances.get(keyword) ?? 0) + 1);
        }
    }

    const sharedKeywords = [...appearances.entries()]
        .filter(([, count]) => count >= 2)
        .map(([keyword]) => keyword)
        .slice(0, 10);

    if (!sharedKeywords.length) {
        return "Documents provide complementary evidence with low keyword overlap.";
    }

    return `Shared themes across documents: ${sharedKeywords.join(", ")}.`;
}

export function buildCrossDocumentContext(chunks: RankedChunk[]) {
    const documents = groupByDocument(chunks);

    const sections = documents.map((doc) => {
        const topChunks = doc.chunks.slice(0, 2);
        const chunkLines = topChunks.map((chunk, index) => `(${index + 1}) ${chunk.content}`);

        return [
            `Document: ${doc.fileName}`,
            `Keywords: ${doc.keywords.join(", ") || "n/a"}`,
            ...chunkLines,
        ].join("\n");
    });

    return {
        contextText: sections.join("\n\n---\n\n"),
        synthesisNotes: synthesisSummary(documents),
        sources: documents.map((doc) => doc.fileName),
        documentCount: documents.length,
    };
}
