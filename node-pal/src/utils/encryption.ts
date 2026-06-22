import CryptoJS from "crypto-js";

/**
 * Encrypts a JSON-serializable object with AES-256 (via CryptoJS passphrase mode).
 * The resulting ciphertext is safe to store on any server — raw JSON never leaves the client.
 */
export function encryptData(dataObject: unknown, password: string): string {
  if (!password) {
    throw new Error("Encryption password is required");
  }
  const json = JSON.stringify(dataObject);
  return CryptoJS.AES.encrypt(json, password).toString();
}

/**
 * Decrypts an AES ciphertext string and parses JSON.
 * Returns null when the password is wrong or the payload is corrupted.
 */
/** Encrypts a raw string (e.g. compressed embed payload) without wrapping JSON. */
export function encryptPlaintext(plaintext: string, password: string): string {
  if (!password) {
    throw new Error("Encryption password is required");
  }
  return CryptoJS.AES.encrypt(plaintext, password).toString();
}

/** Decrypts to a raw string. Returns null when the password is wrong. */
export function decryptPlaintext(encryptedString: string, password: string): string | null {
  if (!password || !encryptedString?.trim()) {
    return null;
  }

  try {
    const bytes = CryptoJS.AES.decrypt(encryptedString.trim(), password);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || null;
  } catch {
    return null;
  }
}

export function decryptData<T = unknown>(encryptedString: string, password: string): T | null {
  if (!password || !encryptedString?.trim()) {
    return null;
  }

  try {
    const bytes = CryptoJS.AES.decrypt(encryptedString.trim(), password);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if (!decrypted) {
      return null;
    }
    return JSON.parse(decrypted) as T;
  } catch {
    return null;
  }
}

/** Returns AES ciphertext for cloud upload (zero-knowledge — server stores this string only). */
export function prepareEncryptedCloudPayload(dataObject: unknown, password: string): string {
  return encryptData(dataObject, password);
}
