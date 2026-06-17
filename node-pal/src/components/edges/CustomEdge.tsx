import { memo, useState } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  useReactFlow,
  type EdgeProps,
} from "reactflow";
import { X, Edit2, Check } from "lucide-react";
import { buildMarker, EDGE_MARKER_OPTIONS, type EdgeMarkerStyle } from "@/lib/edgeMarkers";
import type { EdgeData, EdgePathType } from "@/lib/storage";

export type CustomEdgeData = EdgeData;

const PATH_TYPE_OPTIONS: { id: EdgePathType; label: string }[] = [
  { id: "bezier", label: "Bezier" },
  { id: "straight", label: "Straight" },
  { id: "step", label: "Step" },
];

function getEdgePath(
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
      borderRadius: 0,
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
  const { setEdges } = useReactFlow();
  const [isEditing, setIsEditing] = useState(false);
  const [labelText, setLabelText] = useState(data?.label || "");

  const pathType = data?.pathType ?? "bezier";
  const lineStyle = data?.lineStyle ?? "solid";
  const [edgePath, labelX, labelY] = getEdgePath(pathType, {
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const isLineage = animated || className?.includes("edge-lineage");
  const strokeColor = isLineage
    ? "oklch(0.72 0.22 35)"
    : data?.rerouted
      ? "#f97316"
      : selected
        ? "#2563eb"
        : "#3b82f6";

  const edgeStyle = {
    stroke: strokeColor,
    strokeWidth: isLineage ? 3 : selected ? 2.5 : 2,
    strokeDasharray: isLineage
      ? "8 5"
      : data?.rerouted
        ? "5,5"
        : lineStyle === "dashed"
          ? "8 6"
          : selected
            ? "10,5"
            : undefined,
    animation: isLineage ? "lineage-dash 1s linear infinite" : selected ? "dash 1s linear infinite" : undefined,
  };

  const resolvedMarkerStart =
    markerStart ?? buildMarker(data?.markerStart ?? "none", strokeColor);
  const resolvedMarkerEnd =
    markerEnd ?? buildMarker(data?.markerEnd ?? "arrowclosed", strokeColor);

  const updateEdge = (patch: Partial<CustomEdgeData>, markerPatch?: Partial<Pick<EdgeProps, "markerStart" | "markerEnd">>) => {
    setEdges((edges) =>
      edges.map((e) => {
        if (e.id !== id) return e;
        const nextData = { ...e.data, ...patch };
        const nextStroke = strokeColor;
        const nextMarkers: Partial<EdgeProps> = {};
        if (markerPatch?.markerStart !== undefined) {
          nextMarkers.markerStart = markerPatch.markerStart;
        }
        if (markerPatch?.markerEnd !== undefined) {
          nextMarkers.markerEnd = markerPatch.markerEnd;
        }
        if (patch.markerStart !== undefined) {
          nextMarkers.markerStart = buildMarker(patch.markerStart, nextStroke);
        }
        if (patch.markerEnd !== undefined) {
          nextMarkers.markerEnd = buildMarker(patch.markerEnd, nextStroke);
        }
        return { ...e, ...nextMarkers, data: nextData };
      }),
    );
  };

  const handleDelete = () => {
    setEdges((edges) => edges.filter((e) => e.id !== id));
  };

  const handleLabelSave = () => {
    updateEdge({ label: labelText });
    setIsEditing(false);
  };

  const handleLabelCancel = () => {
    setLabelText(data?.label || "");
    setIsEditing(false);
  };

  const setMarker = (which: "markerStart" | "markerEnd", value: EdgeMarkerStyle) => {
    const built = buildMarker(value, strokeColor);
    setEdges((edges) =>
      edges.map((e) => {
        if (e.id !== id) return e;
        return {
          ...e,
          [which]: built,
          data: { ...e.data, [which]: value },
        };
      }),
    );
  };

  const setPathType = (value: EdgePathType) => {
    updateEdge({ pathType: value });
  };

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={edgeStyle}
        markerStart={resolvedMarkerStart}
        markerEnd={resolvedMarkerEnd}
        interactionWidth={20}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan nowheel"
        >
          <div className="flex flex-col items-center gap-1">
            {selected && (
              <div className="edge-marker-panel nodrag nopan nowheel">
                <div className="edge-marker-panel__row">
                  <span>Path</span>
                  <select
                    value={pathType}
                    onChange={(e) => setPathType(e.target.value as EdgePathType)}
                    className="edge-marker-panel__select"
                  >
                    {PATH_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="edge-marker-panel__row">
                  <span>Start</span>
                  <select
                    value={data?.markerStart ?? "none"}
                    onChange={(e) => setMarker("markerStart", e.target.value as EdgeMarkerStyle)}
                    className="edge-marker-panel__select"
                  >
                    {EDGE_MARKER_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="edge-marker-panel__row">
                  <span>End</span>
                  <select
                    value={data?.markerEnd ?? "arrowclosed"}
                    onChange={(e) => setMarker("markerEnd", e.target.value as EdgeMarkerStyle)}
                    className="edge-marker-panel__select"
                  >
                    {EDGE_MARKER_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <input
                    autoFocus
                    value={labelText}
                    onChange={(e) => setLabelText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleLabelSave();
                      if (e.key === "Escape") handleLabelCancel();
                    }}
                    className="bg-background border border-border rounded px-2 py-1 text-sm w-32"
                    placeholder="Add label..."
                  />
                  <button
                    type="button"
                    onClick={handleLabelSave}
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white hover:bg-green-600"
                    title="Save"
                  >
                    <Check className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={handleLabelCancel}
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-500 text-white hover:bg-gray-600"
                    title="Cancel"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </>
              ) : (
                <>
                  {labelText && (
                    <span
                      className="bg-background border border-border rounded px-2 py-1 text-xs font-medium"
                      onDoubleClick={() => setIsEditing(true)}
                    >
                      {labelText}
                    </span>
                  )}
                  {selected && (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white hover:bg-blue-600"
                        title="Edit label"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={handleDelete}
                        className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                        title="Delete edge"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const CustomEdge = memo(CustomEdgeImpl);
