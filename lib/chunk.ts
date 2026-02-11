export function chunkText(text: string, size = 800) {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
        chunks.push(text.slice(start, start + size));
        start += size;
    }

    return chunks;
}
