import type { Edge } from "reactflow";
import type { EdgeData, EdgeLineStyle } from "@/lib/storage";
import type { EdgeMarkerStyle } from "@/lib/edgeMarkers";

export type EdgeSyncType = "push" | "pull" | "stream" | "api" | "none";

/** Semantic sync types whose appearance is locked by the system. */
export const SEMANTIC_SYNC_TYPES: EdgeSyncType[] = ["push", "pull", "stream", "api"];

export const DEFAULT_EDGE_SYNC_TYPE: EdgeSyncType = "push";

export function isSemanticSyncType(syncType: EdgeSyncType): boolean {
  return SEMANTIC_SYNC_TYPES.includes(syncType);
}

export const EDGE_SYNC_TYPE_OPTIONS: { id: EdgeSyncType; label: string; hint: string }[] = [
  { id: "push", label: "Push", hint: "Solid line · source sends to target" },
  { id: "pull", label: "Pull", hint: "Dashed line · target pulls from source" },
  { id: "stream", label: "Stream", hint: "Animated · live event flow" },
  { id: "api", label: "API Request", hint: "Bidirectional · request/response" },
  { id: "none", label: "None / Custom", hint: "Generic edge · you control the line style manually" },
];

export type EdgeSyncVisuals = {
  lineStyle: EdgeLineStyle;
  markerStart: EdgeMarkerStyle;
  markerEnd: EdgeMarkerStyle;
  animated: boolean;
  strokeColor: string;
  edgeClassName: string;
};

export function resolveEdgeSyncType(data: EdgeData | undefined): EdgeSyncType {
  const syncType = data?.syncType;
  if (
    syncType === "pull" ||
    syncType === "stream" ||
    syncType === "api" ||
    syncType === "none" ||
    syncType === "push"
  ) {
    return syncType;
  }
  return "push";
}

export function getSyncVisuals(
  syncType: EdgeSyncType,
  options?: { selected?: boolean; inLineage?: boolean; manualLineStyle?: EdgeLineStyle },
): EdgeSyncVisuals {
  if (options?.inLineage) {
    return {
      lineStyle: "solid",
      markerStart: "none",
      markerEnd: "arrowclosed",
      animated: true,
      strokeColor: "oklch(0.72 0.22 35)",
      edgeClassName: "edge-lineage",
    };
  }

  if (options?.selected) {
    return {
      ...getSyncVisuals(syncType, { manualLineStyle: options.manualLineStyle }),
      strokeColor: "#2563eb",
    };
  }

  switch (syncType) {
    case "pull":
      return {
        lineStyle: "dashed",
        markerStart: "none",
        markerEnd: "arrowclosed",
        animated: false,
        strokeColor: "#64748b",
        edgeClassName: "edge-sync-pull",
      };
    case "stream":
      return {
        lineStyle: "solid",
        markerStart: "none",
        markerEnd: "arrowclosed",
        animated: true,
        strokeColor: "#7c3aed",
        edgeClassName: "edge-sync-stream",
      };
    case "api":
      return {
        lineStyle: "solid",
        markerStart: "arrowclosed",
        markerEnd: "arrowclosed",
        animated: false,
        strokeColor: "#0d9488",
        edgeClassName: "edge-sync-api",
      };
    case "none":
      return {
        // Non-semantic edge: honor the user's manual line style choice.
        lineStyle: options?.manualLineStyle ?? "solid",
        markerStart: "none",
        markerEnd: "arrowclosed",
        animated: false,
        strokeColor: "#64748b",
        edgeClassName: "edge-sync-none",
      };
    case "push":
    default:
      return {
        lineStyle: "solid",
        markerStart: "none",
        markerEnd: "arrowclosed",
        animated: false,
        strokeColor: "#64748b",
        edgeClassName: "edge-sync-push",
      };
  }
}

export function applySyncTypeToEdge(edge: Edge, syncType: EdgeSyncType): Edge {
  const visuals = getSyncVisuals(syncType);
  return {
    ...edge,
    animated: visuals.animated,
    data: {
      ...edge.data,
      syncType,
      lineStyle: visuals.lineStyle,
      markerStart: visuals.markerStart,
      markerEnd: visuals.markerEnd,
    },
  };
}
