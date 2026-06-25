import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Direct access — Vite replaces these literals at build/dev time.
const ENV_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ENV_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

type SupabaseErrorLike = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
};

type SupabaseEnv = {
  url: string | undefined;
  rawAnonKey: string | undefined;
  anonKey: string | undefined;
};

function readStringEnv(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readSupabaseEnv(): SupabaseEnv {
  const url = readStringEnv(ENV_SUPABASE_URL);
  const rawAnonKey = readStringEnv(ENV_SUPABASE_ANON_KEY);
  const anonKey = normalizeSupabaseAnonKey(rawAnonKey);
  return { url, rawAnonKey, anonKey };
}

/** JWT anon keys start with `eyJ`. Dashboard copy sometimes adds an extra `sb` prefix. */
export function normalizeSupabaseAnonKey(key: string | undefined): string | undefined {
  if (!key) return undefined;
  const trimmed = key.trim();
  if (!trimmed) return undefined;

  if (trimmed.startsWith("eyJ") || trimmed.startsWith("sb_publishable_")) {
    return trimmed;
  }

  const jwtStart = trimmed.indexOf("eyJ");
  if (jwtStart > 0) {
    return trimmed.slice(jwtStart);
  }

  return trimmed;
}

function isPlaceholderConfig(url: string | undefined, rawAnonKey: string | undefined): boolean {
  if (!url || !rawAnonKey) return true;
  if (url.includes("your-project") || rawAnonKey.includes("your-anon-key")) return true;
  return false;
}

let client: SupabaseClient | null = null;
let clientKey: string | undefined;

export function getSupabaseClient(): SupabaseClient | null {
  const { url, rawAnonKey, anonKey } = readSupabaseEnv();
  if (!url || !anonKey || isPlaceholderConfig(url, rawAnonKey)) return null;

  if (!client || clientKey !== anonKey) {
    client = createClient(url, anonKey);
    clientKey = anonKey;
  }

  return client;
}

/** @deprecated Prefer getSupabaseClient() — kept for older imports. */
export const supabase: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return getSupabaseClient() !== null;
}

function isLocalDevHost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

export function getSupabaseConfigHint(): string | null {
  const { url, rawAnonKey } = readSupabaseEnv();

  if (!url && !rawAnonKey) {
    if (import.meta.env.DEV && isLocalDevHost()) {
      return "Supabase env vars are missing in the browser. Add them to node-pal/.env, then stop and restart: npm run dev";
    }
    return "Supabase env vars are missing. On Lovable/Vercel, add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in project settings, then redeploy.";
  }

  if (!url) {
    return "VITE_SUPABASE_URL is missing. Add it to node-pal/.env and restart npm run dev.";
  }

  if (!rawAnonKey) {
    return "VITE_SUPABASE_ANON_KEY is missing. Add it to node-pal/.env and restart npm run dev.";
  }

  if (isPlaceholderConfig(url, rawAnonKey)) {
    return "Replace the placeholder Supabase values in node-pal/.env with your real project URL and anon key.";
  }

  if (getSupabaseClient() === null) {
    return "Supabase anon key looks invalid. Use the anon public JWT from Supabase (starts with eyJ).";
  }

  return null;
}

/** @deprecated Use getSupabaseConfigHint() */
export function getSupabaseEnvStatus(): { url: boolean; key: boolean } {
  const { url, rawAnonKey } = readSupabaseEnv();
  return { url: Boolean(url), key: Boolean(rawAnonKey) };
}

/** PostgREST errors are plain objects — not `instanceof Error`. */
export function formatSupabaseError(error: unknown): string {
  if (!error) return "Unknown Supabase error";
  if (error instanceof Error) return error.message;

  if (typeof error === "object") {
    const record = error as SupabaseErrorLike;
    const parts = [record.message, record.details, record.hint].filter(
      (part): part is string => Boolean(part?.trim()),
    );
    if (parts.length > 0) return parts.join(" — ");
  }

  return String(error);
}

export function assertNoSupabaseError(error: unknown): void {
  if (error) {
    throw new Error(formatSupabaseError(error));
  }
}

export function requireSupabaseClient(): SupabaseClient {
  const hint = getSupabaseConfigHint();
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(hint ?? "Supabase is not configured.");
  }
  return client;
}
