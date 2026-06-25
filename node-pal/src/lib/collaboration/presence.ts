export type CollaboratorCursor = {
  x: number;
  y: number;
};

export type CollaboratorPresence = {
  clientId: number;
  name: string;
  color: string;
  cursor: CollaboratorCursor | null;
};

const CURSOR_COLORS = [
  "#3b82f6",
  "#ef4444",
  "#22c55e",
  "#a855f7",
  "#f97316",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
] as const;

export function pickCollaboratorColor(clientId: number): string {
  return CURSOR_COLORS[Math.abs(clientId) % CURSOR_COLORS.length];
}

export function parseAwarenessStates(
  states: Map<number, Record<string, unknown>>,
  localClientId: number,
): CollaboratorPresence[] {
  const peers: CollaboratorPresence[] = [];

  states.forEach((state, clientId) => {
    if (clientId === localClientId) return;
    const user = state.user as { name?: string; color?: string; cursor?: CollaboratorCursor } | undefined;
    if (!user?.name) return;

    peers.push({
      clientId,
      name: user.name,
      color: user.color ?? pickCollaboratorColor(clientId),
      cursor: user.cursor ?? null,
    });
  });

  return peers;
}
