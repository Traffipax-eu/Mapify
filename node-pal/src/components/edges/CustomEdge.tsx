import { memo, useCallback, useMemo, useState } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  useReactFlow,
  type EdgeProps,
} from "reactflow";
import { Plus } from "lucide-react";
import { buildMarker } from "@/lib/edgeMarkers";
import {
  buildWaypointPath,
  getPathMidpoint,
  resolveWaypoints,
  type FlowPoint,
} from "@/lib/edgePath";
import type { EdgeData, EdgePathType } from "@/lib/storage";

export type CustomEdgeData = EdgeData;

const SMOOTH_STEP_RADIUS = 16;

function getAutomaticEdgePath(
  pathType: EdgePathType,
  params: {
    sourceX: number;
    sourceY: number;
    targetX: number;
    targetY: number;
    sourcePosition: EdgeProps["sourcePosition"];
    targetPosition: EdgeProps["targetPosition"];
  },
): [string, number, number] {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition } = params;

  if (pathType === "straight") {
    const [path, labelX, labelY] = getStraightPath({ sourceX, sourceY, targetX, targetY });
    return [path, labelX, labelY];
  }

  if (pathType === "step") {
    const [path, labelX, labelY] = getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      borderRadius: SMOOTH_STEP_RADIUS,
    });
    return [path, labelX, labelY];
  }

  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  return [path, labelX, labelY];
}

function CustomEdgeImpl({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  animated,
  className,
  markerStart,
  markerEnd,
}: EdgeProps<CustomEdgeData>) {
  const { setEdges, screenToFlowPosition } = useReactFlow();
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  const pathType = data?.pathType ?? "step";
  const lineStyle = data?.lineStyle ?? "solid";
  const source: FlowPoint = { x: sourceX, y: sourceY };
  const target: FlowPoint = { x: targetX, y: targetY };

  const waypoints = useMemo(
    () => resolveWaypoints(data?.controlPoints),
    [data?.controlPoints],
  );

  const hasCustomBends = waypoints.length > 0;

  const [edgePath, labelX, labelY] = useMemo(() => {
    if (hasCustomBends) {
      const path = buildWaypointPath(source, target, waypoints);
      const midpoint = getPathMidpoint(source, target, waypoints);
      return [path, midpoint.x, midpoint.y] as const;
    }

    const [path, lx, ly] = getAutomaticEdgePath(pathType, {
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
    });
    return [path, lx, ly] as const;
  }, [
    hasCustomBends,
    waypoints,
    source,
    target,
    pathType,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  ]);

  const isLineage = animated || className?.includes("edge-lineage");
  const strokeColor = isLineage
    ? "oklch(0.72 0.22 35)"
    : data?.rerouted
      ? "#f97316"
      : selected
        ? "#2563eb"
        : "#64748b";

  const edgeStyle = {
    stroke: strokeColor,
    strokeWidth: isLineage ? 3 : selected ? 2.5 : 2,
    strokeDasharray: isLineage
      ? "8 5"
      : data?.rerouted
        ? "5,5"
        : lineStyle === "dashed"
          ? "10 8"
          : "7 9",
    animation: isLineage ? "lineage-dash 1s linear infinite" : "edge-flow 1.4s linear infinite",
    transition: draggingIndex !== null ? "none" : "d 0.18s ease",
  };

  const resolvedMarkerStart = markerStart ?? buildMarker(data?.markerStart ?? "none", strokeColor);
  const resolvedMarkerEnd = markerEnd ?? buildMarker(data?.markerEnd ?? "arrowclosed", strokeColor);
  const labelText = data?.label?.trim() ?? "";

  const updateWaypoints = useCallback(
    (nextPoints: FlowPoint[]) => {
      setEdges((edges) =>
        edges.map((edge) =>
          edge.id === id
            ? {
                ...edge,
                data: {
                  ...edge.data,
                  pathType: "custom" as const,
                  controlPoints: nextPoints,
                },
              }
            : edge,
        ),
      );
    },
    [id, setEdges],
  );

  const addMidWaypoint = useCallback(() => {
    const insertPoint = hasCustomBends
      ? getPathMidpoint(source, target, waypoints)
      : { x: labelX, y: labelY };
    updateWaypoints([...waypoints, insertPoint]);
  }, [hasCustomBends, waypoints, source, target, labelX, labelY, updateWaypoints]);

  const onWaypointPointerDown = (index: number, event: React.PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    event.preventDefault();
    setDraggingIndex(index);

    const targetElement = event.currentTarget;
    targetElement.setPointerCapture(event.pointerId);

    const handleMove = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();
      moveEvent.stopPropagation();
      const position = screenToFlowPosition({ x: moveEvent.clientX, y: moveEvent.clientY });
      setEdges((edges) =>
        edges.map((edge) => {
          if (edge.id !== id) return edge;
          const next = [...resolveWaypoints(edge.data?.controlPoints)];
          if (index < 0 || index >= next.length) return edge;
          next[index] = position;
          return {
            ...edge,
            data: { ...edge.data, pathType: "custom", controlPoints: next },
          };
        }),
      );
    };

    const finishDrag = (upEvent: PointerEvent) => {
      setDraggingIndex(null);
      if (targetElement.hasPointerCapture(upEvent.pointerId)) {
        targetElement.releasePointerCapture(upEvent.pointerId);
      }
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", finishDrag);
      window.removeEventListener("pointercancel", finishDrag);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", finishDrag);
    window.addEventListener("pointercancel", finishDrag);
  };

  const showBendControls = selected && !isLineage;

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={edgeStyle}
        markerStart={resolvedMarkerStart}
        markerEnd={resolvedMarkerEnd}
        interactionWidth={40}
        className={selected ? "custom-edge--selected" : undefined}
      />
      {showBendControls && (
        <EdgeLabelRenderer>
          {waypoints.map((point, index) => (
            <button
              key={`${id}-wp-${index}`}
              type="button"
              className={`edge-control-point nodrag nopan ${draggingIndex === index ? "is-dragging" : ""}`}
              style={{
                position: "absolute",
                transform: `translate(-50%, -50%) translate(${point.x}px, ${point.y}px)`,
                pointerEvents: "all",
                zIndex: 1001,
              }}
              onPointerDown={(event) => onWaypointPointerDown(index, event)}
              aria-label={`Adjust connection bend ${index + 1}`}
            />
          ))}
          <button
            type="button"
            className="edge-control-point edge-control-point--add nodrag nopan"
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "all",
              zIndex: 1000,
            }}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              addMidWaypoint();
            }}
            title="Add bend point"
            aria-label="Add bend point"
          >
            <Plus className="h-3 w-3" />
          </button>
        </EdgeLabelRenderer>
      )}
      {labelText && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "none",
            }}
            className="edge-label-chip"
          >
            {labelText}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const CustomEdge = memo(CustomEdgeImpl);
