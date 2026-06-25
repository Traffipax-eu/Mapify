/** Collaboration / realtime configuration (Yjs WebSocket provider). */
export function getYjsWebSocketUrl(): string | null {
  const url = import.meta.env.VITE_YJS_WS_URL?.trim();
  return url || null;
}

export function isCollaborationConfigured(): boolean {
  return Boolean(getYjsWebSocketUrl());
}

export function buildCollaborationRoomId(projectId: string, sheetId: string): string {
  return `mapify:${projectId}:${sheetId}`;
}

export function getCollaboratorDisplayName(): string {
  const stored = localStorage.getItem("mapify-collaborator-name")?.trim();
  if (stored) return stored;

  const generated = `Guest ${Math.floor(Math.random() * 900 + 100)}`;
  localStorage.setItem("mapify-collaborator-name", generated);
  return generated;
}

export function setCollaboratorDisplayName(name: string): void {
  localStorage.setItem("mapify-collaborator-name", name.trim() || "Guest");
}
