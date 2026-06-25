import type { CSSProperties } from "react";
import type { CollaboratorPresence } from "@/lib/collaboration/presence";

type Props = {
  peers: CollaboratorPresence[];
};

export function CollaboratorCursors({ peers }: Props) {
  if (peers.length === 0) return null;

  return (
    <div className="collaborator-cursors pointer-events-none absolute inset-0 z-[1200] overflow-hidden">
      {peers.map((peer) => {
        if (!peer.cursor) return null;
        return (
          <div
            key={peer.clientId}
            className="collaborator-cursor"
            style={{
              transform: `translate(${peer.cursor.x}px, ${peer.cursor.y}px)`,
              "--cursor-color": peer.color,
            } as CSSProperties}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill={peer.color}
              aria-hidden
              className="collaborator-cursor__pointer"
            >
              <path d="M5.5 3.21l12.1 7.14c.58.34.58 1.18 0 1.52L5.5 18.99c-.58.34-1.32-.08-1.32-.76V3.97c0-.68.74-1.1 1.32-.76z" />
            </svg>
            <span className="collaborator-cursor__label" style={{ backgroundColor: peer.color }}>
              {peer.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}
