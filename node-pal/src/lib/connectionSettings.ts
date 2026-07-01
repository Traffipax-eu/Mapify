import type { EdgeLineStyle, EdgePathType, EdgeSyncType } from "@/lib/storage";

export type ConnectionDirection = "source-to-target" | "target-to-source" | "bidirectional" | "none";

export type ConnectionSettings = {
  direction: ConnectionDirection;
  pathType: EdgePathType;
  lineStyle: EdgeLineStyle;
  syncType: EdgeSyncType;
};

export const DEFAULT_CONNECTION_SETTINGS: ConnectionSettings = {
  direction: "source-to-target",
  pathType: "step",
  lineStyle: "solid",
  syncType: "push",
};
