export interface RetrievedChunk {
    id?: string;
    content: string;
    similarity: number;
    file_name?: string | null;
}

export interface RankedChunk extends RetrievedChunk {
    lexicalScore: number;
    rankScore: number;
}

const STOP_WORDS = new Set([
    "a", "an", "the", "and", "or", "but", "if", "of", "to", "in", "on", "for",
    "with", "at", "by", "from", "is", "are", "was", "were", "be", "been", "this",
    "that", "it", "as", "about", "into", "over",
]);

function tokenize(text: string): string[] {
    return text
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function lexicalMatchScore(query: string, content: string): number {
    const queryTokens = tokenize(query);
    if (!queryTokens.length) {
        return 0;
    }

    const contentTokens = new Set(tokenize(content));
    let hits = 0;

    for (const token of queryTokens) {
        if (contentTokens.has(token)) {
            hits += 1;
        }
    }

    const coverage = hits / queryTokens.length;
    const phraseBonus = content.toLowerCase().includes(query.toLowerCase()) ? 0.15 : 0;
    return Math.min(1, coverage + phraseBonus);
}

export function rerankChunks(
    query: string,
    chunks: RetrievedChunk[],
    options?: {
        topK?: number;
        maxPerDocument?: number;
    }
): RankedChunk[] {
    const topK = options?.topK ?? 8;
    const maxPerDocument = options?.maxPerDocument ?? 3;

    const scored = chunks
        .map((chunk) => {
            const lexical = lexicalMatchScore(query, chunk.content);
            const semantic = Math.max(0, Math.min(1, chunk.similarity));
            const rank = semantic * 0.7 + lexical * 0.3;

            return {
                ...chunk,
                lexicalScore: Number(lexical.toFixed(4)),
                rankScore: Number(rank.toFixed(4)),
            };
        })
        .sort((a, b) => b.rankScore - a.rankScore);

    const selected: RankedChunk[] = [];
    const byDocument = new Map<string, number>();

    for (const chunk of scored) {
        const fileName = chunk.file_name ?? "Unknown document";
        const current = byDocument.get(fileName) ?? 0;

        if (current >= maxPerDocument) {
            continue;
        }

        byDocument.set(fileName, current + 1);
        selected.push(chunk);

        if (selected.length >= topK) {
            break;
        }
    }

    return selected;
}
