export type DiagramEmbedPayload = {
  projectName: string;
  sheetName: string;
  nodes: unknown[];
  edges: unknown[];
  schema: unknown;
  drawings?: string[];
  viewport?: { x: number; y: number; zoom: number };
  exportedAt: string;
};

export const EMBED_HASH_PREFIX = "d=";
/** Practical limit for URL fragments in Confluence / browsers. */
export const MAX_EMBED_HASH_LENGTH = 14_000;

export function encodeEmbedCiphertext(ciphertext: string): string {
  return encodeURIComponent(ciphertext);
}

export function decodeEmbedCiphertext(encoded: string): string {
  return decodeURIComponent(encoded);
}

export function buildEmbedUrl(ciphertext: string, origin = typeof window !== "undefined" ? window.location.origin : ""): string {
  const encoded = encodeEmbedCiphertext(ciphertext);
  return `${origin}/embed#${EMBED_HASH_PREFIX}${encoded}`;
}

export function readEmbedCiphertextFromHash(hash = typeof window !== "undefined" ? window.location.hash : ""): string | null {
  const prefix = `#${EMBED_HASH_PREFIX}`;
  if (!hash.startsWith(prefix)) return null;
  const encoded = hash.slice(prefix.length);
  if (!encoded) return null;
  try {
    return decodeEmbedCiphertext(encoded);
  } catch {
    return null;
  }
}

export function buildIframeSnippet(
  embedUrl: string,
  options?: { height?: number; title?: string },
): string {
  const height = options?.height ?? 640;
  const title = options?.title ?? "Mapify diagram";
  const safeTitle = title.replace(/"/g, "&quot;");
  const safeUrl = embedUrl.replace(/"/g, "&quot;");
  return `<iframe src="${safeUrl}" width="100%" height="${height}" style="width:100%;min-height:${height}px;border:0;border-radius:8px;" title="${safeTitle}" loading="lazy" allowfullscreen></iframe>`;
}

export function buildConfluenceHint(): string {
  return "In Confluence: Insert → Other macros → HTML, then paste the iframe snippet. Share the embed password separately from the page.";
}
