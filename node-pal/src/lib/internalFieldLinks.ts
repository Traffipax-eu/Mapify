import type { Edge } from "reactflow";
import { parseFieldSourceId, parseFieldTargetId } from "@/lib/connectionUtils";
import type { EdgeLineStyle } from "@/lib/storage";

function getEdgeSourceFieldId(edge: Edge): string | null {
  return (
    edge.data?.sourceFieldId ??
    (edge.sourceHandle ? parseFieldSourceId(edge.sourceHandle) : null)
  );
}

function getEdgeTargetFieldId(edge: Edge): string | null {
  return (
    edge.data?.targetFieldId ??
    (edge.targetHandle ? parseFieldTargetId(edge.targetHandle) : null)
  );
}

export type InternalFieldEdgeInfo = {
  edgeId: string;
  sourceFieldId: string;
  targetFieldId: string;
  lineStyle?: EdgeLineStyle;
  label?: string;
};

export function isInternalBlockFieldEdge(edge: Edge): boolean {
  if (edge.source !== edge.target) return false;
  const sourceFieldId = getEdgeSourceFieldId(edge);
  const targetFieldId = getEdgeTargetFieldId(edge);
  return Boolean(sourceFieldId && targetFieldId && sourceFieldId !== targetFieldId);
}

export function getInternalFieldEdgesForNode(
  nodeId: string,
  edges: Edge[],
): InternalFieldEdgeInfo[] {
  return edges
    .filter((edge) => edge.source === nodeId && isInternalBlockFieldEdge(edge))
    .map((edge) => ({
      edgeId: edge.id,
      sourceFieldId: getEdgeSourceFieldId(edge)!,
      targetFieldId: getEdgeTargetFieldId(edge)!,
      lineStyle: edge.data?.lineStyle,
      label: edge.data?.label,
    }));
}

export const INTERNAL_FIELD_LINK_OUTSET = 88;

/** Map screen px (after React Flow zoom) to layout px inside the node. */
export function getElementLayoutZoom(element: HTMLElement): number {
  const layoutWidth = element.offsetWidth;
  if (layoutWidth <= 0) return 1;
  return element.getBoundingClientRect().width / layoutWidth;
}

export function screenOffsetToLayout(
  screenValue: number,
  containerScreenOrigin: number,
  zoom: number,
): number {
  if (zoom <= 0) return screenValue - containerScreenOrigin;
  return (screenValue - containerScreenOrigin) / zoom;
}

export function getFieldRowAnchorY(
  fieldRow: HTMLElement,
  surface: HTMLElement,
  zoom: number,
): number {
  const anchorEl =
    fieldRow.querySelector<HTMLElement>(".system-node__field-handle-col--right") ?? fieldRow;
  const anchorRect = anchorEl.getBoundingClientRect();
  const surfaceRect = surface.getBoundingClientRect();
  return screenOffsetToLayout(anchorRect.top + anchorRect.height / 2, surfaceRect.top, zoom);
}

/**
 * Link between two fields in the same block: exits the right edge, runs outside
 * the block (to the right), then enters the target field — like a hand-drawn arc.
 */
export function buildInternalFieldLinkPath(
  sourceY: number,
  targetY: number,
  anchorX: number,
  laneIndex: number,
): string {
  const span = Math.abs(targetY - sourceY);
  const bow = Math.min(64, Math.max(24, span * 0.35 + 18)) + laneIndex * 10;
  const outX = anchorX + bow;

  return `M ${anchorX} ${sourceY} C ${outX} ${sourceY}, ${outX} ${targetY}, ${anchorX} ${targetY}`;
}

export function internalLinkStrokeColor(options: {
  inLineage: boolean;
  isSelected: boolean;
  defaultColor?: string;
}): string {
  const { inLineage, isSelected, defaultColor = "#475569" } = options;
  if (inLineage) return "oklch(0.72 0.22 35)";
  if (isSelected) return "#2563eb";
  return defaultColor;
}
