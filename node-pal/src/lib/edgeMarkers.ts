import { MarkerType, type EdgeMarker } from "reactflow";

export type EdgeMarkerStyle = "none" | "arrow" | "arrowclosed" | "circle" | "circleclosed";

export const EDGE_MARKER_OPTIONS: { id: EdgeMarkerStyle; label: string }[] = [
  { id: "arrowclosed", label: "Filled arrow" },
  { id: "arrow", label: "Open arrow" },
  { id: "circle", label: "Circle" },
  { id: "circleclosed", label: "Filled circle" },
  { id: "none", label: "None" },
];

export function buildMarker(
  style: EdgeMarkerStyle | undefined,
  color: string,
): EdgeMarker | undefined {
  if (!style || style === "none") return undefined;

  const typeMap: Record<Exclude<EdgeMarkerStyle, "none">, MarkerType> = {
    arrow: MarkerType.Arrow,
    arrowclosed: MarkerType.ArrowClosed,
    circle: MarkerType.Circle,
    circleclosed: MarkerType.CircleClosed,
  };

  return {
    type: typeMap[style],
    width: 24,
    height: 24,
    color,
  };
}
