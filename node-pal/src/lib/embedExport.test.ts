import { describe, expect, it } from "vitest";
import {
  buildEncryptedEmbedUrl,
  buildPlainEmbedUrl,
  decryptEmbedPayload,
  packDiagramEmbedPayload,
  readEmbedDataFromHash,
  unpackDiagramEmbedPayload,
} from "@/lib/embedExport";
import { encryptPlaintext } from "@/utils/encryption";

const samplePayload = {
  projectName: "Demo",
  sheetName: "Main",
  nodes: [{ id: "n1", type: "system", position: { x: 0, y: 0 }, data: { label: "A" } }],
  edges: [],
  schema: { nodeGroups: [], properties: [] },
  exportedAt: "2026-01-01T00:00:00.000Z",
};

describe("embedExport", () => {
  it("round-trips plain compressed payloads", async () => {
    const packed = await packDiagramEmbedPayload(samplePayload);
    const restored = await unpackDiagramEmbedPayload(packed);
    expect(restored.projectName).toBe("Demo");
    expect(restored.nodes).toHaveLength(1);
  });

  it("reads plain and encrypted hash prefixes", async () => {
    const packed = await packDiagramEmbedPayload(samplePayload);
    const plainUrl = buildPlainEmbedUrl(packed, "https://example.com");
    const plainHash = plainUrl.split("#")[1];
    expect(readEmbedDataFromHash(`#${plainHash}`)).toEqual({ kind: "plain", data: packed });

    const encrypted = encryptPlaintext(packed, "secret");
    const encryptedUrl = buildEncryptedEmbedUrl(encrypted, "https://example.com");
    const encryptedHash = encryptedUrl.split("#")[1];
    expect(readEmbedDataFromHash(`#${encryptedHash}`)?.kind).toBe("encrypted");
  });

  it("decrypts compressed encrypted embed payloads", async () => {
    const packed = await packDiagramEmbedPayload(samplePayload);
    const ciphertext = encryptPlaintext(packed, "secret");
    const restored = await decryptEmbedPayload(ciphertext, "secret");
    expect(restored?.projectName).toBe("Demo");
  });
});
