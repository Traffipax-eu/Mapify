import type { EdgeLineStyle, EdgePathType } from "@/lib/storage";

export type ConnectionDirection = "source-to-target" | "target-to-source" | "bidirectional" | "none";

export type ConnectionSettings = {
  direction: ConnectionDirection;
  pathType: EdgePathType;
  lineStyle: EdgeLineStyle;
};

export const DEFAULT_CONNECTION_SETTINGS: ConnectionSettings = {
  direction: "source-to-target",
  pathType: "step",
  lineStyle: "solid",
};
