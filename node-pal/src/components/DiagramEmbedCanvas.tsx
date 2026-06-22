import { useCallback, useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  MarkerType,
  Panel,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
} from "reactflow";
import { X } from "lucide-react";
import "reactflow/dist/style.css";
import { SystemNode } from "./nodes/SystemNode";
import { TouchpointNode } from "./nodes/TouchpointNode";
import { StickyNoteNode } from "./nodes/StickyNoteNode";
import { TextNode } from "./nodes/TextNode";
import { ShapeNode } from "./nodes/ShapeNode";
import { ContainerNode } from "./nodes/ContainerNode";
import { CustomObjectNode } from "./nodes/CustomObjectNode";
import { CustomEdge } from "./edges/CustomEdge";
import { NodeCanvasProvider } from "@/contexts/NodeCanvasContext";
import { LineageProvider, type LineageContextValue } from "@/contexts/LineageContext";
import type { Schema } from "@/lib/storage";
import { DEFAULT_SCHEMA } from "@/lib/storage";
import { normalizeSchema } from "@/lib/schemaProperties";
import type { DiagramEmbedPayload } from "@/lib/embedExport";
import { postEmbedHeight } from "@/lib/embedExport";
import { computeLineage, decorateEdgesForDisplay } from "@/lib/lineageTraversal";
import type { SystemNodeData } from "./nodes/SystemNode";

const nodeTypes = {
  system: SystemNode,
  touchpoint: TouchpointNode,
  stickyNote: StickyNoteNode,
  textNode: TextNode,
  shapeNode: ShapeNode,
  container: ContainerNode,
  customObject: CustomObjectNode,
};

const edgeTypes = {
  custom: CustomEdge,
};

type Props = {
  payload: DiagramEmbedPayload;
  className?: string;
};

function DiagramEmbedCanvasInner({ payload, className }: Props) {
  const { fitView } = useReactFlow();
  const [lineageAnchor, setLineageAnchor] = useState<{
    nodeId: string;
    fieldId?: string | null;
  } | null>(null);

  const nodes = useMemo(() => (payload.nodes ?? []) as Node[], [payload.nodes]);
  const edges = useMemo(() => (payload.edges ?? []) as Edge[], [payload.edges]);
  const schema = useMemo(
    () => normalizeSchema((payload.schema as Schema | undefined) ?? DEFAULT_SCHEMA),
    [payload.schema],
  );
  const defaultViewport = payload.viewport;

  const lineage = useMemo(
    () => computeLineage(lineageAnchor, nodes, edges),
    [lineageAnchor, nodes, edges],
  );

  const hasLineage = lineageAnchor !== null;

  const systemLineageNodeIds = useMemo(() => {
    const ids = new Set<string>();
    for (const nodeId of lineage.nodeIds) {
      const node = nodes.find((item) => item.id === nodeId);
      if (node?.type === "system" || node?.type === "customObject") {
        ids.add(nodeId);
      }
    }
    return ids;
  }, [lineage.nodeIds, nodes]);

  const lineageContextValue = useMemo<LineageContextValue>(
    () => ({
      hasLineage,
      lineageNodeIds: lineage.nodeIds,
      activeFieldIdsByNode: lineage.fieldIdsByNode,
      impactNodeIds: new Set(),
      anchorNodeId: lineageAnchor?.nodeId ?? null,
      highlightedNodeIds: systemLineageNodeIds,
    }),
    [hasLineage, lineage, lineageAnchor, systemLineageNodeIds],
  );

  const displayedEdges = useMemo(
    () =>
      decorateEdgesForDisplay(edges, {
        lineageEdgeIds: lineage.edgeIds,
        hasLineage,
        defaultStrokeColor: "#334155",
      }),
    [edges, lineage.edgeIds, hasLineage],
  );

  const handleFieldSelect = useCallback((nodeId: string, fieldId: string) => {
    const node = nodes.find((item) => item.id === nodeId);
    if (!node || (node.type !== "system" && node.type !== "customObject")) return;
    const nodeData = node.data as SystemNodeData;
    const field = (nodeData.fields ?? []).find((item) => item.id === fieldId);
    if (!field) return;
    setLineageAnchor({ nodeId, fieldId });
  }, [nodes]);

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (node.type === "system" || node.type === "customObject") {
      setLineageAnchor({ nodeId: node.id, fieldId: null });
      return;
    }
    if (node.type === "touchpoint") {
      setLineageAnchor(null);
    }
  }, []);

  const onPaneClick = useCallback(() => {
    setLineageAnchor(null);
  }, []);

  const nodeCanvasValue = useMemo(
    () => ({
      schema,
      edges,
      selectedEdgeId: null,
      lineageEdgeIds: lineage.edgeIds,
      hasLineage: lineageAnchor !== null,
      onSelectEdge: () => undefined,
      onUpdateNodeData: () => undefined,
      onUpdateStickyNoteData: () => undefined,
      onDeleteNode: () => undefined,
      onFieldSelect: handleFieldSelect,
      onDeleteField: () => undefined,
      onFieldConnectDrop: () => undefined,
      onFieldToNodeConnectDrop: () => undefined,
      onUpdateDrawingNodeData: () => undefined,
    }),
    [schema, edges, lineage.edgeIds, lineageAnchor, handleFieldSelect],
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      void fitView({ padding: 0.12, duration: 0 });
      window.setTimeout(() => {
        postEmbedHeight(
          Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, 480),
        );
      }, 50);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [fitView, nodes.length, edges.length]);

  return (
    <NodeCanvasProvider value={nodeCanvasValue}>
      <LineageProvider value={lineageContextValue}>
        <div className={`diagram-embed-canvas flow-export-host ${className ?? ""}`.trim()}>
          <ReactFlow
            nodes={nodes}
            edges={displayedEdges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            defaultViewport={defaultViewport}
            fitView={!defaultViewport}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
            panOnDrag
            panOnScroll
            zoomOnScroll
            zoomOnPinch
            minZoom={0.15}
            maxZoom={2}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            proOptions={{ hideAttribution: true }}
            defaultEdgeOptions={{
              type: "custom",
              markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 26,
                height: 26,
                color: "#334155",
              },
            }}
            style={{ background: "var(--canvas-bg, #f8fafc)" }}
          >
            <Background gap={18} size={1.5} color="var(--canvas-dot, #cbd5e1)" />
            <Controls showInteractive={false} />
            <MiniMap pannable zoomable />
            {hasLineage && lineageAnchor && (
              <Panel position="top-center">
                <div className="lineage-banner animate-fade-in">
                  <span className="lineage-banner__dot" />
                  <span>
                    Upstream lineage
                    {lineageAnchor.fieldId ? " (field)" : ""}
                    {" · "}
                    {lineage.nodeIds.size} node(s), {lineage.edgeIds.size} edge(s)
                  </span>
                  <button
                    type="button"
                    className="lineage-banner__close"
                    aria-label="Clear lineage"
                    onClick={() => setLineageAnchor(null)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </Panel>
            )}
          </ReactFlow>
          {payload.drawings?.length ? (
            <img
              src={payload.drawings[payload.drawings.length - 1]}
              alt=""
              className="diagram-embed-canvas__drawing"
            />
          ) : null}
          <div className="diagram-embed-canvas__badge" aria-hidden>
            {payload.projectName}
            {payload.sheetName ? ` · ${payload.sheetName}` : ""}
          </div>
        </div>
      </LineageProvider>
    </NodeCanvasProvider>
  );
}

export function DiagramEmbedCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <DiagramEmbedCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
