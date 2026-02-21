import { APP_CONFIG } from "@/lib/constants/config";

/**
 * Advanced chunk metadata for section-aware chunking.
 */
export interface ChunkedSegment {
    index: number;
    heading: string;
    content: string;
}

export interface ChunkOptions {
    maxChars?: number;
    minChars?: number;
    overlapChars?: number;
}

interface Section {
    heading: string;
    body: string;
}

function normalizeText(input: string): string {
    return input
        .replace(/\r\n/g, "\n")
        .replace(/\t/g, " ")
        .replace(/[ ]{2,}/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

function isHeadingLine(line: string): boolean {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length > 90) {
        return false;
    }

    return (
        /^#{1,6}\s+/.test(trimmed) ||
        /^[A-Z][A-Z0-9\s&/(),.-]{2,}$/.test(trimmed) ||
        /^[A-Z][\w\s&/(),.-]{2,}:$/.test(trimmed)
    );
}

function splitIntoSections(text: string): Section[] {
    const lines = text.split("\n");
    const sections: Section[] = [];
    let currentHeading = "General";
    let buffer: string[] = [];

    const flush = () => {
        const body = buffer.join("\n").trim();
        if (!body) {
            buffer = [];
            return;
        }

        sections.push({
            heading: currentHeading,
            body,
        });
        buffer = [];
    };

    for (const line of lines) {
        if (isHeadingLine(line)) {
            flush();
            currentHeading = line.trim().replace(/^#{1,6}\s+/, "");
            continue;
        }
        buffer.push(line);
    }

    flush();

    return sections.length ? sections : [{ heading: "General", body: text }];
}

function splitIntoSentences(text: string): string[] {
    const byPunctuation = text
        .split(/(?<=[.!?])\s+/)
        .map((sentence) => sentence.trim())
        .filter(Boolean);

    if (byPunctuation.length > 0) {
        return byPunctuation;
    }

    return text
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean);
}

function overlapSuffix(text: string, overlapChars: number): string {
    if (!overlapChars || text.length <= overlapChars) {
        return text;
    }

    const suffix = text.slice(text.length - overlapChars);
    const firstSpace = suffix.indexOf(" ");
    return firstSpace === -1 ? suffix : suffix.slice(firstSpace + 1);
}

function chunkSection(
    section: Section,
    indexOffset: number,
    options: Required<ChunkOptions>
): ChunkedSegment[] {
    const sentences = splitIntoSentences(section.body);
    const segments: ChunkedSegment[] = [];
    let windowText = "";

    for (const sentence of sentences) {
        const candidate = windowText ? `${windowText} ${sentence}` : sentence;

        if (candidate.length <= options.maxChars) {
            windowText = candidate;
            continue;
        }

        if (windowText.length >= options.minChars) {
            segments.push({
                index: indexOffset + segments.length,
                heading: section.heading,
                content: windowText,
            });

            const overlap = overlapSuffix(windowText, options.overlapChars);
            windowText = overlap ? `${overlap} ${sentence}` : sentence;
            continue;
        }

        const splitAt = Math.max(options.minChars, options.maxChars);
        segments.push({
            index: indexOffset + segments.length,
            heading: section.heading,
            content: candidate.slice(0, splitAt),
        });
        windowText = candidate.slice(splitAt).trim();
    }

    if (windowText.trim()) {
        segments.push({
            index: indexOffset + segments.length,
            heading: section.heading,
            content: windowText.trim(),
        });
    }

    return segments;
}

export function chunkDocument(
    text: string,
    options: ChunkOptions = {}
): ChunkedSegment[] {
    const normalized = normalizeText(text);
    if (!normalized) {
        return [];
    }

    const resolved: Required<ChunkOptions> = {
        maxChars: options.maxChars ?? APP_CONFIG.CHUNK_SIZE,
        minChars: options.minChars ?? APP_CONFIG.MIN_CHUNK_SIZE,
        overlapChars: options.overlapChars ?? APP_CONFIG.CHUNK_OVERLAP,
    };

    const sections = splitIntoSections(normalized);
    const segments: ChunkedSegment[] = [];

    for (const section of sections) {
        const sectionChunks = chunkSection(section, segments.length, resolved);
        segments.push(...sectionChunks);
    }

    return segments;
}

/**
 * Backward-compatible chunking helper.
 */
export function chunkText(text: string, size = APP_CONFIG.CHUNK_SIZE): string[] {
    return chunkDocument(text, { maxChars: size }).map((segment) => segment.content);
}
