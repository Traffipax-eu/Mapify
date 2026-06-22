import { decryptData, decryptPlaintext } from "@/utils/encryption";

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

export const EMBED_PLAIN_HASH_PREFIX = "p=";
export const EMBED_ENCRYPTED_HASH_PREFIX = "d=";

export type EmbedHashData =
  | { kind: "plain"; data: string }
  | { kind: "encrypted"; data: string };

function supportsCompression(): boolean {
  return typeof CompressionStream !== "undefined" && typeof DecompressionStream !== "undefined";
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToBytes(encoded: string): Uint8Array {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function compressUtf8(text: string): Promise<string> {
  if (!supportsCompression()) {
    return bytesToBase64(new TextEncoder().encode(text));
  }

  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("deflate"));
  const buffer = await new Response(stream).arrayBuffer();
  return bytesToBase64(new Uint8Array(buffer));
}

async function decompressUtf8(encoded: string): Promise<string> {
  const bytes = base64ToBytes(encoded);

  if (!supportsCompression()) {
    return new TextDecoder().decode(bytes);
  }

  try {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate"));
    return await new Response(stream).text();
  } catch {
    return new TextDecoder().decode(bytes);
  }
}

export function isDiagramEmbedPayload(value: unknown): value is DiagramEmbedPayload {
  if (!value || typeof value !== "object") return false;
  const candidate = value as DiagramEmbedPayload;
  return Array.isArray(candidate.nodes) && Array.isArray(candidate.edges);
}

export async function packDiagramEmbedPayload(payload: DiagramEmbedPayload): Promise<string> {
  return compressUtf8(JSON.stringify(payload));
}

export async function unpackDiagramEmbedPayload(packed: string): Promise<DiagramEmbedPayload> {
  const json = await decompressUtf8(packed);
  const parsed = JSON.parse(json) as unknown;
  if (!isDiagramEmbedPayload(parsed)) {
    throw new Error("Invalid embed payload");
  }
  return parsed;
}

export async function decryptEmbedPayload(
  ciphertext: string,
  password: string,
): Promise<DiagramEmbedPayload | null> {
  const packed = decryptPlaintext(ciphertext, password);
  if (packed) {
    try {
      return await unpackDiagramEmbedPayload(packed);
    } catch {
      try {
        const legacy = JSON.parse(packed) as unknown;
        if (isDiagramEmbedPayload(legacy)) return legacy;
      } catch {
        // fall through
      }
    }
  }

  const legacy = decryptData<DiagramEmbedPayload>(ciphertext, password);
  return legacy && isDiagramEmbedPayload(legacy) ? legacy : null;
}

export function encodeEmbedPayload(encoded: string): string {
  return encodeURIComponent(encoded);
}

export function decodeEmbedPayload(encoded: string): string {
  return decodeURIComponent(encoded);
}

export function buildPlainEmbedUrl(
  packed: string,
  origin = typeof window !== "undefined" ? window.location.origin : "",
): string {
  return `${origin}/embed#${EMBED_PLAIN_HASH_PREFIX}${encodeEmbedPayload(packed)}`;
}

export function buildEncryptedEmbedUrl(
  ciphertext: string,
  origin = typeof window !== "undefined" ? window.location.origin : "",
): string {
  return `${origin}/embed#${EMBED_ENCRYPTED_HASH_PREFIX}${encodeEmbedPayload(ciphertext)}`;
}

/** @deprecated Use buildPlainEmbedUrl or buildEncryptedEmbedUrl */
export function buildEmbedUrl(ciphertext: string, origin = typeof window !== "undefined" ? window.location.origin : ""): string {
  return buildEncryptedEmbedUrl(ciphertext, origin);
}

export function readEmbedDataFromHash(
  hash = typeof window !== "undefined" ? window.location.hash : "",
): EmbedHashData | null {
  const plainPrefix = `#${EMBED_PLAIN_HASH_PREFIX}`;
  const encryptedPrefix = `#${EMBED_ENCRYPTED_HASH_PREFIX}`;

  if (hash.startsWith(plainPrefix)) {
    const encoded = hash.slice(plainPrefix.length);
    if (!encoded) return null;
    try {
      return { kind: "plain", data: decodeEmbedPayload(encoded) };
    } catch {
      return null;
    }
  }

  if (hash.startsWith(encryptedPrefix)) {
    const encoded = hash.slice(encryptedPrefix.length);
    if (!encoded) return null;
    try {
      return { kind: "encrypted", data: decodeEmbedPayload(encoded) };
    } catch {
      return null;
    }
  }

  return null;
}

/** @deprecated Use readEmbedDataFromHash */
export function readEmbedCiphertextFromHash(hash?: string): string | null {
  const data = readEmbedDataFromHash(hash);
  return data?.kind === "encrypted" ? data.data : null;
}

export function buildIframeSnippet(embedUrl: string, options?: { title?: string; iframeId?: string }): string {
  const iframeId = options?.iframeId ?? `mapify-embed-${Math.random().toString(36).slice(2, 9)}`;
  const title = options?.title ?? "Mapify diagram";
  const safeTitle = title.replace(/"/g, "&quot;");
  const safeUrl = embedUrl.replace(/"/g, "&quot;");
  const safeId = iframeId.replace(/"/g, "");

  return `<iframe id="${safeId}" src="${safeUrl}" width="100%" height="480" style="width:100%;border:0;border-radius:8px;display:block;" title="${safeTitle}" loading="lazy" allowfullscreen></iframe>
<script>
(function(){var id="${safeId}";window.addEventListener("message",function(e){if(!e.data||e.data.type!=="mapify-embed-resize")return;var f=document.getElementById(id);if(f)f.style.height=Math.max(320,e.data.height)+"px";});})();
</script>`;
}

export function buildConfluenceHint(passwordOptional = true): string {
  if (passwordOptional) {
    return "In Confluence: Insert → Other macros → HTML, then paste the iframe snippet. The iframe height adjusts automatically. Add a password only if you want encryption.";
  }
  return "In Confluence: Insert → Other macros → HTML, then paste the iframe snippet. Share the embed password separately from the page.";
}

export const EMBED_RESIZE_MESSAGE_TYPE = "mapify-embed-resize";

export function postEmbedHeight(height: number) {
  if (typeof window === "undefined" || window.parent === window) return;
  window.parent.postMessage({ type: EMBED_RESIZE_MESSAGE_TYPE, height: Math.ceil(height) }, "*");
}
