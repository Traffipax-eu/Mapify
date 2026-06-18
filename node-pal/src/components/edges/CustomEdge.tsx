import { memo, useCallback, useMemo, useState } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getStraightPath,
  Position,
  useReactFlow,
  type EdgeProps,
} from "reactflow";
import { Plus } from "lucide-react";
import { buildMarker } from "@/lib/edgeMarkers";
import {
  buildAutoStepPath,
  buildWaypointPath,
  getPathMidpoint,
  resolveWaypoints,
  type FlowPoint,
} from "@/lib/edgePath";
import type { EdgeData, EdgePathType } from "@/lib/storage";

export type CustomEdgeData = EdgeData;

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
  const source = { x: sourceX, y: sourceY };
  const target = { x: targetX, y: targetY };

  if (pathType === "straight") {
    const [path, labelX, labelY] = getStraightPath({ sourceX, sourceY, targetX, targetY });
    return [path, labelX, labelY];
  }

  if (pathType === "step" || pathType === "custom") {
    return buildAutoStepPath(
      source,
      target,
      sourcePosition ?? Position.Bottom,
      targetPosition ?? Position.Top,
    );
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
      const path = buildWaypointPath(
        source,
        target,
        waypoints,
        sourcePosition ?? Position.Bottom,
        targetPosition ?? Position.Top,
      );
      const midpoint = getPathMidpoint(
        source,
        target,
        waypoints,
        sourcePosition ?? Position.Bottom,
        targetPosition ?? Position.Top,
      );
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

  const isLineage = animated && (className?.includes("edge-lineage") ?? false);
  const strokeColor = isLineage
    ? "oklch(0.72 0.22 35)"
    : data?.rerouted
      ? "#f97316"
      : selected
        ? "#2563eb"
        : "#64748b";

  const isDashed = !isLineage && !data?.rerouted && lineStyle === "dashed";
  const isDragging = draggingIndex !== null;

  const edgeStyle = {
    stroke: strokeColor,
    strokeWidth: isLineage ? 3 : selected ? 2.5 : 2,
    strokeDasharray: isLineage ? "8 5" : data?.rerouted ? "5 5" : isDashed ? "8 6" : undefined,
    animation: isLineage ? "lineage-dash 1s linear infinite" : undefined,
    transition: isDragging ? "none" : "d 0.18s ease",
  };

  const labelAnchorY = labelY - 18;
  const resolvedMarkerStart = markerStart ?? buildMarker(data?.markerStart ?? "none", strokeColor);
  const resolvedMarkerEnd = markerEnd ?? buildMarker(data?.markerEnd ?? "arrowclosed", strokeColor);
  const labelText = data?.label?.trim() ?? "";

  const updateWaypoints = useCallback(
    (nextPoints: FlowPoint[] | ((current: FlowPoint[]) => FlowPoint[])) => {
      setEdges((edges) =>
        edges.map((edge) => {
          if (edge.id !== id) return edge;
          const current = resolveWaypoints(edge.data?.controlPoints);
          const resolved = typeof nextPoints === "function" ? nextPoints(current) : nextPoints;
          return {
            ...edge,
            selected: true,
            data: {
              ...edge.data,
              pathType: "custom" as const,
              controlPoints: resolved,
            },
          };
        }),
      );
    },
    [id, setEdges],
  );

  const addWaypointAt = useCallback(
    (point: FlowPoint) => {
      updateWaypoints((current) => [...current, point]);
    },
    [updateWaypoints],
  );

  const addMidWaypoint = useCallback(() => {
    const insertPoint = hasCustomBends
      ? getPathMidpoint(source, target, waypoints)
      : { x: labelX, y: labelY };
    addWaypointAt(insertPoint);
  }, [hasCustomBends, waypoints, source, target, labelX, labelY, addWaypointAt]);

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

  const onEdgeDoubleClick = (event: React.MouseEvent<SVGPathElement>) => {
    if (isLineage) return;
    event.stopPropagation();
    event.preventDefault();
    const point = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    addWaypointAt(point);
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
        onDoubleClick={onEdgeDoubleClick}
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
              onDoubleClick={(event) => {
                event.stopPropagation();
                event.preventDefault();
                updateWaypoints((current) =>
                  current.filter((_, waypointIndex) => waypointIndex !== index),
                );
              }}
              title="Drag bend point · Double-click to remove"
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
              transform: `translate(-50%, -100%) translate(${labelX}px, ${labelAnchorY}px)`,
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
