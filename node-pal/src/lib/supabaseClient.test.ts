import { describe, expect, it } from "vitest";
import { formatSupabaseError, normalizeSupabaseAnonKey } from "./supabaseClient";

describe("normalizeSupabaseAnonKey", () => {
  const jwt =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0dGl2dnJucm9lem1pZXRsc3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MDA3MjAsImV4cCI6MjA5Nzk3NjcyMH0.3wvsP1nA-Awh91pTgZYZerfRRNcctr65cfIIOEuBm3A";

  it("strips accidental sb prefix before JWT", () => {
    expect(normalizeSupabaseAnonKey(`sb${jwt}`)).toBe(jwt);
  });

  it("keeps publishable keys unchanged", () => {
    const key = "sb_publishable_abc123";
    expect(normalizeSupabaseAnonKey(key)).toBe(key);
  });

  it("keeps a valid JWT unchanged", () => {
    expect(normalizeSupabaseAnonKey(jwt)).toBe(jwt);
  });
});

describe("formatSupabaseError", () => {
  it("reads message from PostgREST plain-object errors", () => {
    const message = formatSupabaseError({
      message: "Invalid API key",
      hint: "Double check your Supabase `anon` or `service_role` API key.",
    });

    expect(message).toContain("Invalid API key");
    expect(message).toContain("Double check your Supabase");
  });

  it("falls back to Error.message", () => {
    expect(formatSupabaseError(new Error("Network down"))).toBe("Network down");
  });
});
