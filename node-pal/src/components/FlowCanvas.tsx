import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyNodeChanges,
  ConnectionMode,
  MarkerType,
  SelectionMode,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  type OnEdgesDelete,
  type OnNodesDelete,
  type ReactFlowInstance,
  ReactFlowProvider,
  Panel,
  useUpdateNodeInternals,
} from "reactflow";
import "reactflow/dist/style.css";
import { Sidebar } from "./Sidebar";
import type { Schema, MetadataValues } from "@/lib/storage";
import { DEFAULT_SCHEMA } from "@/lib/storage";
import { SystemNode, type Field, type SystemNodeData } from "./nodes/SystemNode";
import { TouchpointNode } from "./nodes/TouchpointNode";
import { StickyNoteNode } from "./nodes/StickyNoteNode";
import { TextNode } from "./nodes/TextNode";
import { ShapeNode } from "./nodes/ShapeNode";
import { ContainerNode } from "./nodes/ContainerNode";
import { CustomObjectNode } from "./nodes/CustomObjectNode";
import { MetadataSidebar } from "./MetadataSidebar";
import { EdgeSettingsPanel, applyConnectionSettingsToEdge } from "./EdgeSettingsPanel";
import { SchemaBuilder } from "./SchemaBuilder";
import { GlossaryView } from "./GlossaryView";
import { CustomEdge } from "./edges/CustomEdge";
import { ClearCanvasDialog } from "./ClearCanvasDialog";
import { EncryptionModal, type EncryptionModalMode } from "./EncryptionModal";
import { FileMenu } from "./FileMenu";
import { WorkspaceBar } from "./WorkspaceBar";
import { CloudSnapshotsDialog } from "./CloudSnapshotsDialog";
import { NodeNameDialog } from "./NodeNameDialog";
import { Button } from "@/components/ui/button";
import {
  Trash2,
  X,
  Settings,
  LayoutGrid,
  BookOpen,
  PenTool,
} from "lucide-react";
import { toast } from "sonner";
import { workspaceStorage, type Sheet } from "@/lib/workspaceStorage";
import { useProjectWorkspace } from "@/hooks/useProjectWorkspace";
import { buildFileName } from "@/lib/fileNaming";
import { uploadEncryptedSnapshot, fetchSnapshot, type CloudSnapshotSummary } from "@/lib/cloudStorage";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import { exportCanvasImage, exportCanvasPdf } from "@/lib/canvasExport";
import { decryptData, prepareEncryptedCloudPayload } from "@/utils/encryption";
import { LineageProvider, type LineageContextValue } from "@/contexts/LineageContext";
import { NodeCanvasProvider, type NodeCanvasContextValue } from "@/contexts/NodeCanvasContext";
import { buildMarker } from "@/lib/edgeMarkers";
import { getNodeGroupProperties, getFieldProperties, pickMetadataForProperties, normalizeSchema } from "@/lib/schemaProperties";
import { isDrawingToolPayload, isNodeGroupPayload, type NodeGroupDragPayload } from "@/lib/drawingTools";
import { createDrawingNode } from "@/lib/createDrawingNode";
import { createContainerNode } from "@/lib/createContainerNode";
import { createCustomObjectNode, createConfiguredCustomObjectNode } from "@/lib/createCustomObjectNode";
import { isCustomObjectPayload, isCustomObjectTemplatePayload } from "@/lib/customObjects";
import { CustomObjectDialog, type CustomObjectConfig } from "./CustomObjectDialog";
import {
  assignNodeParent,
  detachChildrenBeforeContainerDelete,
  isContainerNode,
  pickInnermostContainer,
  sortNodesParentFirst,
} from "@/lib/containerUtils";
import { DEFAULT_CONNECTION_SETTINGS, type ConnectionSettings } from "@/lib/connectionSettings";
import { normalizeConnection, type NormalizedConnection } from "@/lib/connectionUtils";
import {
  cloneNodesForClipboard,
  duplicateNodesFromClipboard,
  getSelectedCopyableNodes,
  isEditableKeyboardTarget,
} from "@/lib/clipboardNodes";

let nodeIdCounter = 1;
const nextNodeId = () => `n_${Date.now()}_${nodeIdCounter++}`;

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

const DISPLAY_ONLY_DATA_KEYS = [
  "inLineage",
  "faded",
  "activeFieldIds",
  "hasImpact",
  "fieldLineageActive",
] as const;

function stripDisplayData<T extends Record<string, unknown>>(data: T): T {
  const next = { ...data };
  for (const key of DISPLAY_ONLY_DATA_KEYS) {
    delete next[key];
  }
  return next;
}

function InnerCanvas() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const updateNodeInternals = useUpdateNodeInternals();
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [nodes, setNodes, onNodesChangeBase] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [schema, setSchema] = useState<Schema>(DEFAULT_SCHEMA);
  const [hydrated, setHydrated] = useState(false);
  const [activeTouchpointId, setActiveTouchpointId] = useState<string | null>(null);
  const [impactNodeIds, setImpactNodeIds] = useState<Set<string>>(new Set());
  const [drawingMode, setDrawingMode] = useState(false);
  const [drawings, setDrawings] = useState<string[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const drawingSnapshotRef = useRef<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [selectedNodeLabel, setSelectedNodeLabel] = useState<string | null>(null);
  const [selectedFieldLabel, setSelectedFieldLabel] = useState<string | null>(null);
  const [selectedNodeMetadata, setSelectedNodeMetadata] = useState<MetadataValues | null>(null);
  const [selectedFieldMetadata, setSelectedFieldMetadata] = useState<MetadataValues | null>(null);
  const [lineageAnchor, setLineageAnchor] = useState<{ nodeId: string; fieldId?: string | null } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSchemaBuilderOpen, setIsSchemaBuilderOpen] = useState(false);
  const [schemaBuilderFocusGroupId, setSchemaBuilderFocusGroupId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"canvas" | "glossary">("canvas");
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isVisualExporting, setIsVisualExporting] = useState(false);
  const pendingViewportRef = useRef<{ x: number; y: number; zoom: number } | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [edgeSettingsOpen, setEdgeSettingsOpen] = useState(false);
  const { getIntersectingNodes } = useReactFlow();
  const connectEndPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastPointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [encryptionModalOpen, setEncryptionModalOpen] = useState(false);
  const [encryptionMode, setEncryptionMode] = useState<EncryptionModalMode>("encrypt");
  const [encryptionIntent, setEncryptionIntent] = useState<"export" | "cloud">("export");
  const [pendingEncryptedContent, setPendingEncryptedContent] = useState<string | null>(null);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [cloudSnapshotsOpen, setCloudSnapshotsOpen] = useState(false);
  const [nodeNameDialogOpen, setNodeNameDialogOpen] = useState(false);
  const [customObjectDialogOpen, setCustomObjectDialogOpen] = useState(false);
  const [pendingCustomObjectPosition, setPendingCustomObjectPosition] = useState<{ x: number; y: number } | null>(null);
  const [pendingNodeDrop, setPendingNodeDrop] = useState<{
    position: { x: number; y: number };
    item: NodeGroupDragPayload;
  } | null>(null);
  const loadedSheetIdRef = useRef<string | null>(null);
  const clipboardNodesRef = useRef<Node[]>([]);
  const pasteGenerationRef = useRef(0);

  const {
    hydrated: workspaceHydrated,
    project,
    sheets,
    activeSheet,
    setProjectName,
    switchSheet,
    createSheet,
    renameSheet,
    deleteSheet,
  } = useProjectWorkspace();

  // Find downstream dependencies using BFS
  const findDownstreamDependencies = useCallback((nodeId: string): Set<string> => {
    const downstream = new Set<string>();
    const queue = [nodeId];
    const visited = new Set<string>([nodeId]);

    while (queue.length > 0) {
      const current = queue.shift()!;
      
      // Find all edges where current is the source
      const outgoingEdges = edges.filter((e) => e.source === current);
      
      for (const edge of outgoingEdges) {
        if (!visited.has(edge.target)) {
          visited.add(edge.target);
          downstream.add(edge.target);
          queue.push(edge.target);
        }
      }
    }

    return downstream;
  }, [edges]);

  // Trigger impact analysis
  const triggerImpactAnalysis = useCallback((nodeId: string) => {
    const downstream = findDownstreamDependencies(nodeId);
    setImpactNodeIds(downstream);
    
    // Clear impact after 3 seconds
    setTimeout(() => {
      setImpactNodeIds(new Set());
    }, 3000);
  }, [findDownstreamDependencies]);

  const collectCanvasState = useCallback(() => {
    const viewport = rfInstance?.getViewport();
    const drawingData = drawingSnapshotRef.current
      ? [drawingSnapshotRef.current]
      : drawings.length
        ? drawings
        : undefined;
    return {
      nodes,
      edges,
      drawings: drawingData,
      viewport,
      schema,
    };
  }, [nodes, edges, drawings, schema, rfInstance]);

  const applySheetToCanvas = useCallback(
    (sheet: Sheet) => {
      setNodes(
        (sheet.nodes as Node[]).map((n) => ({
          ...n,
          data: stripDisplayData(n.data as Record<string, unknown>),
        })),
      );
      setEdges(sheet.edges as Edge[]);
      setSchema(normalizeSchema(sheet.schema));
      if (sheet.drawings?.length) {
        const snapshot = sheet.drawings[sheet.drawings.length - 1];
        drawingSnapshotRef.current = snapshot;
        setDrawings(sheet.drawings);
      } else {
        drawingSnapshotRef.current = null;
        setDrawings([]);
      }
      if (sheet.viewport && rfInstance) {
        rfInstance.setViewport(sheet.viewport, { duration: 0 });
      } else if (sheet.viewport) {
        pendingViewportRef.current = sheet.viewport;
      }
      setActiveTouchpointId(null);
      setLineageAnchor(null);
      requestAnimationFrame(() => {
        (sheet.nodes as Node[]).forEach((n) => updateNodeInternals(n.id));
      });
    },
    [rfInstance, setNodes, setEdges, updateNodeInternals],
  );

  // Load active sheet when workspace or sheet changes
  useEffect(() => {
    if (!workspaceHydrated || !activeSheet) return;
    if (loadedSheetIdRef.current === activeSheet.id) return;
    loadedSheetIdRef.current = activeSheet.id;
    applySheetToCanvas(activeSheet);
    setHydrated(true);
  }, [workspaceHydrated, activeSheet?.id, activeSheet, applySheetToCanvas]);

  useEffect(() => {
    if (!hydrated || !activeSheet) return;
    workspaceStorage.saveSheetState(activeSheet.id, collectCanvasState());
  }, [nodes, edges, drawings, schema, hydrated, activeSheet, collectCanvasState]);

  useEffect(() => {
    if (!rfInstance || !pendingViewportRef.current) return;
    rfInstance.setViewport(pendingViewportRef.current, { duration: 0 });
    pendingViewportRef.current = null;
  }, [rfInstance]);

  const restoreCanvasSnapshot = useCallback(() => {
    const canvas = canvasRef.current;
    const snapshot = drawingSnapshotRef.current;
    if (!canvas || !snapshot) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = snapshot;
  }, []);

  const drawLine = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !drawingRef.current) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  }, []);

  const endDrawing = useCallback(() => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const snapshot = canvas.toDataURL();
      drawingSnapshotRef.current = snapshot;
      setDrawings([snapshot]);
    }
  }, []);

  // Resize canvas when wrapper size changes (preserve drawing snapshot)
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    const resizeCanvas = () => {
      const snapshot = drawingSnapshotRef.current;
      canvas.width = wrapper.clientWidth;
      canvas.height = wrapper.clientHeight;
      if (snapshot && drawingMode) {
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0);
        img.src = snapshot;
      }
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [drawingMode]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const removals = changes
        .filter((change): change is NodeChange & { type: "remove"; id: string } => change.type === "remove")
        .map((change) => change.id);

      if (removals.length > 0) {
        setNodes((current) => {
          const detached = detachChildrenBeforeContainerDelete(current, new Set(removals));
          const next = applyNodeChanges(changes, detached);
          return sortNodesParentFirst(next);
        });
        return;
      }

      onNodesChangeBase(changes);
    },
    [onNodesChangeBase, setNodes],
  );

  const createEdgeFromConnection = useCallback(
    (conn: NormalizedConnection, settings: ConnectionSettings = DEFAULT_CONNECTION_SETTINGS) => {
      const strokeColor = "#3b82f6";
      let markerStartStyle: "none" | "arrowclosed" = "none";
      let markerEndStyle: "none" | "arrowclosed" = "none";

      if (settings.direction === "source-to-target") {
        markerEndStyle = "arrowclosed";
      } else if (settings.direction === "target-to-source") {
        markerStartStyle = "arrowclosed";
      } else if (settings.direction === "bidirectional") {
        markerStartStyle = "arrowclosed";
        markerEndStyle = "arrowclosed";
      }

      const newEdge: Edge = {
        id: `e_${Date.now()}`,
        source: conn.sourceNodeId,
        target: conn.targetNodeId,
        sourceHandle: conn.sourceHandle,
        targetHandle: conn.targetHandle,
        type: "custom",
        markerStart: buildMarker(markerStartStyle, strokeColor),
        markerEnd: buildMarker(markerEndStyle, strokeColor),
        data: {
          sourceFieldId: conn.sourceFieldId,
          targetFieldId: conn.targetFieldId,
          sourceNodeId: conn.sourceNodeId,
          targetNodeId: conn.targetNodeId,
          label: "",
          description: "",
          pathType: settings.pathType,
          lineStyle: settings.lineStyle,
          markerStart: markerStartStyle,
          markerEnd: markerEndStyle,
        },
      };

      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges],
  );

  const onConnectEnd = useCallback((event: MouseEvent | TouchEvent) => {
    const clientX = "clientX" in event ? event.clientX : event.changedTouches[0]?.clientX ?? 0;
    const clientY = "clientY" in event ? event.clientY : event.changedTouches[0]?.clientY ?? 0;
    connectEndPosRef.current = { x: clientX, y: clientY };
    lastPointerRef.current = { x: clientX, y: clientY };
  }, []);

  useEffect(() => {
    const trackPointer = (event: MouseEvent) => {
      lastPointerRef.current = { x: event.clientX, y: event.clientY };
    };
    window.addEventListener("mousemove", trackPointer);
    window.addEventListener("mouseup", trackPointer);
    return () => {
      window.removeEventListener("mousemove", trackPointer);
      window.removeEventListener("mouseup", trackPointer);
    };
  }, []);

  const handleFieldConnectDrop = useCallback(
    (
      source: { nodeId: string; fieldId: string },
      target: { nodeId: string; fieldId: string },
    ) => {
      if (source.nodeId === target.nodeId && source.fieldId === target.fieldId) {
        return;
      }

      createEdgeFromConnection({
        sourceNodeId: source.nodeId,
        targetNodeId: target.nodeId,
        sourceHandle: `source-${source.fieldId}`,
        targetHandle: `target-${target.fieldId}`,
        sourceFieldId: source.fieldId,
        targetFieldId: target.fieldId,
        isFieldToField: true,
        isParentToParent: false,
      });
    },
    [createEdgeFromConnection],
  );

  const onConnect = useCallback(
    (params: Connection) => {
      const conn = normalizeConnection(params);
      if (!conn) {
        toast.error("Connect parent containers only — use drag-and-drop for field rows");
        return;
      }

      if (conn.isFieldToField) {
        return;
      }

      createEdgeFromConnection(conn);
    },
    [createEdgeFromConnection],
  );

  const clearEdgeSelection = useCallback(() => {
    setSelectedEdgeId(null);
    setEdgeSettingsOpen(false);
    setEdges((current) => current.map((edge) => ({ ...edge, selected: false })));
  }, [setEdges]);

  const openEdgeSettings = useCallback(
    (edgeId: string) => {
      setSelectedEdgeId(edgeId);
      setEdgeSettingsOpen(true);
      setSidebarOpen(false);
      setSelectedNodeId(null);
      setSelectedFieldId(null);
      setSelectedFieldLabel(null);
      setSelectedFieldMetadata(null);
      setSelectedNodeLabel(null);
      setSelectedNodeMetadata(null);
      setEdges((current) =>
        current.map((edge) => ({
          ...edge,
          selected: edge.id === edgeId,
        })),
      );
    },
    [setEdges],
  );

  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      openEdgeSettings(edge.id);
    },
    [openEdgeSettings],
  );

  const onEdgeDoubleClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      openEdgeSettings(edge.id);
    },
    [openEdgeSettings],
  );

  const handleEdgeUpdate = useCallback(
    (edgeId: string, settings: ConnectionSettings, label: string, description: string) => {
      setEdges((current) =>
        current.map((edge) =>
          edge.id === edgeId ? applyConnectionSettingsToEdge(edge, settings, label, description) : edge,
        ),
      );
    },
    [setEdges],
  );

  const handleEdgeDelete = useCallback(
    (edgeId: string) => {
      setEdges((current) => current.filter((edge) => edge.id !== edgeId));
      clearEdgeSelection();
      toast.success("Connection deleted");
    },
    [setEdges, clearEdgeSelection],
  );

  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (isContainerNode(node)) return;

      setNodes((current) => {
        const snapshot = current.map((entry) => (entry.id === node.id ? node : entry));
        const intersections = getIntersectingNodes(node, true, snapshot).filter((entry) => isContainerNode(entry));
        const container = pickInnermostContainer(intersections);
        const updated = assignNodeParent(node, container, snapshot);
        const next = snapshot.map((entry) => (entry.id === node.id ? updated : entry));
        return sortNodesParentFirst(next);
      });
    },
    [getIntersectingNodes, setNodes],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const raw = event.dataTransfer.getData("application/reactflow");
      if (!raw || !rfInstance) return;

      let item: unknown;
      try {
        item = JSON.parse(raw);
      } catch {
        return;
      }

      const position = rfInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      if (isDrawingToolPayload(item)) {
        const newNode =
          item.tool === "container"
            ? createContainerNode(position, nextNodeId)
            : createDrawingNode(item.tool, position, nextNodeId);
        setNodes((nds) => sortNodesParentFirst(nds.concat(newNode)));
        return;
      }

      if (isNodeGroupPayload(item)) {
        setPendingNodeDrop({ position, item });
        setNodeNameDialogOpen(true);
        return;
      }

      if (isCustomObjectTemplatePayload(item)) {
        setPendingCustomObjectPosition(position);
        setCustomObjectDialogOpen(true);
        return;
      }

      if (isCustomObjectPayload(item)) {
        if (item.objectId === "custom") {
          setPendingCustomObjectPosition(position);
          setCustomObjectDialogOpen(true);
          return;
        }
        setNodes((nds) => nds.concat(createCustomObjectNode(item.objectId, position, nextNodeId)));
      }
    },
    [rfInstance, setNodes],
  );

  const handleCustomObjectConfirm = useCallback(
    (config: CustomObjectConfig) => {
      const position =
        pendingCustomObjectPosition ??
        (rfInstance
          ? rfInstance.screenToFlowPosition({
              x: window.innerWidth / 2,
              y: window.innerHeight / 2,
            })
          : { x: 0, y: 0 });

      setNodes((nds) =>
        nds.concat(
          createConfiguredCustomObjectNode(position, nextNodeId, {
            label: config.label,
            accent: config.accent,
            iconId: config.iconId,
          }),
        ),
      );
      setPendingCustomObjectPosition(null);
    },
    [pendingCustomObjectPosition, rfInstance, setNodes],
  );

  const createNodeFromDrop = useCallback(
    (name: string) => {
      if (!pendingNodeDrop) return;

      const { position, item } = pendingNodeDrop;
      const newNode: Node = {
        id: nextNodeId(),
        position,
        type: "system",
        data: {
          label: name,
          nodeGroupId: item.id,
          icon: item.icon || "database",
          color: item.color,
          sections: [{ id: `sec_${Date.now()}`, name: "General" }],
          fields: [],
          collapsed: false,
          metadata: {},
        },
      };
      setNodes((nds) => nds.concat(newNode));
      setPendingNodeDrop(null);
      setNodeNameDialogOpen(false);
    },
    [pendingNodeDrop, setNodes],
  );

  const cancelNodeDrop = useCallback(() => {
    setPendingNodeDrop(null);
    setNodeNameDialogOpen(false);
  }, []);

  // Hide edges that touch a collapsed system to keep the view clean.
  const collapsedSystemIds = useMemo(
    () =>
      new Set(
        nodes
          .filter((n) => n.type === "system" && (n.data as SystemNodeData)?.collapsed)
          .map((n) => n.id),
      ),
    [nodes],
  );

  // Reroute edges when systems are collapsed (Field-to-Field routing)
  const reroutedEdges = useMemo(() => {
    const rerouted: Edge[] = [];
    
    for (const edge of edges) {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      const targetNode = nodes.find((n) => n.id === edge.target);
      
      if (!sourceNode || !targetNode) {
        rerouted.push(edge);
        continue;
      }
      
      const sourceCollapsed = (sourceNode.data as SystemNodeData)?.collapsed;
      const targetCollapsed = (targetNode.data as SystemNodeData)?.collapsed;
      const isFieldToField = edge.data?.sourceFieldId && edge.data?.targetFieldId;
      const isParentToParent = !edge.data?.sourceFieldId && !edge.data?.targetFieldId;
      
      // If it's a field-to-field connection and either parent is collapsed, mark as rerouted
      if (isFieldToField && (sourceCollapsed || targetCollapsed)) {
        rerouted.push({
          ...edge,
          data: {
            ...edge.data,
            rerouted: true,
          },
        });
      }
      // If it's a parent-to-parent connection and either parent is collapsed, keep it connected to parent
      else if (isParentToParent) {
        rerouted.push(edge);
      }
      // Normal field-to-field connection with both parents expanded
      else {
        rerouted.push(edge);
      }
    }
    
    return rerouted;
  }, [edges, nodes]);

  const getEdgeSourceFieldId = (edge: Edge) =>
    edge.data?.sourceFieldId ??
    (edge.sourceHandle ? parseFieldSourceId(edge.sourceHandle) : null);

  const getEdgeTargetFieldId = (edge: Edge) =>
    edge.data?.targetFieldId ??
    (edge.targetHandle ? parseFieldTargetId(edge.targetHandle) : null);

  // Lineage traversal from single-click selection on a system node or field row
  const lineage = useMemo(() => {
    const empty = {
      nodeIds: new Set<string>(),
      edgeIds: new Set<string>(),
      fieldIdsByNode: new Map<string, Set<string>>(),
    };

    if (!lineageAnchor) return empty;

    const { nodeId: anchorNodeId, fieldId: anchorFieldId } = lineageAnchor;

    const runFieldLineage = (seeds: { nodeId: string; fieldId: string }[]) => {
      const nodeIds = new Set<string>();
      const edgeIds = new Set<string>();
      const fieldIdsByNode = new Map<string, Set<string>>();
      const queue = [...seeds];
      const visited = new Set(seeds.map(({ nodeId, fieldId }) => `${nodeId}:${fieldId}`));

      const addField = (nodeId: string, fieldId: string) => {
        if (!fieldIdsByNode.has(nodeId)) fieldIdsByNode.set(nodeId, new Set());
        fieldIdsByNode.get(nodeId)!.add(fieldId);
        nodeIds.add(nodeId);
      };

      for (const seed of seeds) {
        addField(seed.nodeId, seed.fieldId);
      }

      while (queue.length) {
        const { nodeId, fieldId } = queue.shift()!;

        for (const edge of edges) {
          const edgeTargetFieldId = getEdgeTargetFieldId(edge);
          if (edge.target === nodeId && edgeTargetFieldId === fieldId) {
            edgeIds.add(edge.id);
            const upstreamFieldId = getEdgeSourceFieldId(edge);
            if (upstreamFieldId && edge.source) {
              const key = `${edge.source}:${upstreamFieldId}`;
              if (!visited.has(key)) {
                visited.add(key);
                addField(edge.source, upstreamFieldId);
                queue.push({ nodeId: edge.source, fieldId: upstreamFieldId });
              }
            }
          }
        }

        for (const edge of edges) {
          const edgeSourceFieldId = getEdgeSourceFieldId(edge);
          if (edge.source === nodeId && edgeSourceFieldId === fieldId) {
            edgeIds.add(edge.id);
            const downstreamFieldId = getEdgeTargetFieldId(edge);
            if (downstreamFieldId && edge.target) {
              const key = `${edge.target}:${downstreamFieldId}`;
              if (!visited.has(key)) {
                visited.add(key);
                addField(edge.target, downstreamFieldId);
                queue.push({ nodeId: edge.target, fieldId: downstreamFieldId });
              }
            }
          }
        }
      }

      return { nodeIds, edgeIds, fieldIdsByNode };
    };

    if (anchorFieldId) {
      return runFieldLineage([{ nodeId: anchorNodeId, fieldId: anchorFieldId }]);
    }

    const anchorNode = nodes.find((item) => item.id === anchorNodeId);
    const nodeFields = (anchorNode?.data as SystemNodeData | undefined)?.fields ?? [];
    const connectedSeeds = nodeFields
      .filter((field) =>
        edges.some(
          (edge) =>
            (edge.source === anchorNodeId && getEdgeSourceFieldId(edge) === field.id) ||
            (edge.target === anchorNodeId && getEdgeTargetFieldId(edge) === field.id),
        ),
      )
      .map((field) => ({ nodeId: anchorNodeId, fieldId: field.id }));

    if (connectedSeeds.length > 0) {
      return runFieldLineage(connectedSeeds);
    }

    const nodeIds = new Set<string>([anchorNodeId]);
    const edgeIds = new Set<string>();
    const queue = [anchorNodeId];
    const visited = new Set<string>([anchorNodeId]);

    while (queue.length) {
      const current = queue.shift()!;

      for (const edge of edges) {
        const isParentEdge =
          !getEdgeSourceFieldId(edge) &&
          !getEdgeTargetFieldId(edge) &&
          edge.sourceHandle?.startsWith("parent-") &&
          edge.targetHandle?.startsWith("parent-");

        if (!isParentEdge) continue;

        if (edge.target === current) {
          edgeIds.add(edge.id);
          if (!visited.has(edge.source)) {
            visited.add(edge.source);
            nodeIds.add(edge.source);
            queue.push(edge.source);
          }
        }
        if (edge.source === current) {
          edgeIds.add(edge.id);
          if (!visited.has(edge.target)) {
            visited.add(edge.target);
            nodeIds.add(edge.target);
            queue.push(edge.target);
          }
        }
      }
    }

    return { nodeIds, edgeIds, fieldIdsByNode: new Map<string, Set<string>>() };
  }, [lineageAnchor, edges, nodes]);

  const hasLineage = lineageAnchor !== null;

  const systemLineageNodeIds = useMemo(() => {
    const systemIds = new Set<string>();
    for (const nodeId of lineage.nodeIds) {
      const node = nodes.find((item) => item.id === nodeId);
      if (node?.type === "system") {
        systemIds.add(nodeId);
      }
    }
    return systemIds;
  }, [lineage.nodeIds, nodes]);

  const lineageContextValue = useMemo<LineageContextValue>(
    () => ({
      hasLineage,
      lineageNodeIds: lineage.nodeIds,
      activeFieldIdsByNode: lineage.fieldIdsByNode,
      impactNodeIds,
      anchorNodeId: lineageAnchor?.nodeId ?? null,
      highlightedNodeIds: systemLineageNodeIds,
    }),
    [hasLineage, lineage, impactNodeIds, lineageAnchor, systemLineageNodeIds],
  );

  const displayedEdges = useMemo(
    () =>
      reroutedEdges.map((e) => {
        const inLineage = lineage.edgeIds.has(e.id);
        const faded = hasLineage && !inLineage;
        const strokeColor = inLineage ? "oklch(0.72 0.22 35)" : "#3b82f6";
        const markerStartStyle = e.data?.markerStart ?? "none";
        const markerEndStyle = e.data?.markerEnd ?? "arrowclosed";

        return {
          ...e,
          hidden: collapsedSystemIds.has(e.source) || collapsedSystemIds.has(e.target),
          animated: inLineage,
          zIndex: inLineage ? 2 : 0,
          markerStart: e.markerStart ?? buildMarker(markerStartStyle, strokeColor),
          markerEnd: e.markerEnd ?? buildMarker(markerEndStyle, strokeColor),
          className: `${inLineage ? "edge-lineage" : ""} ${faded ? "edge-faded" : ""}`.trim(),
        };
      }),
    [reroutedEdges, collapsedSystemIds, lineage, hasLineage],
  );

  const handleFieldSelect = useCallback(
    (nodeId: string, fieldId: string) => {
      const node = nodes.find((item) => item.id === nodeId);
      const nodeData = (node?.data ?? {}) as SystemNodeData;
      const field = nodeData.fields?.find((item) => item.id === fieldId);

      clearEdgeSelection();
      setLineageAnchor({ nodeId, fieldId });
      setSelectedNodeId(nodeId);
      setSelectedFieldId(fieldId);
      setSelectedNodeLabel(nodeData.label ?? null);
      setSelectedFieldLabel(field?.label ?? null);
      setSelectedNodeMetadata(null);
      setSelectedFieldMetadata(
        field?.metadata && typeof field.metadata === "object" ? { ...field.metadata } : {},
      );
      setSidebarOpen(true);
    },
    [nodes, clearEdgeSelection],
  );

  const handleDeleteField = useCallback(
    (nodeId: string, fieldId: string) => {
      setEdges((eds) =>
        eds.filter(
          (e) =>
            !(
              (e.source === nodeId && (e.data?.sourceFieldId === fieldId || e.sourceHandle === `source-${fieldId}`)) ||
              (e.target === nodeId && (e.data?.targetFieldId === fieldId || e.targetHandle === `target-${fieldId}`))
            ),
        ),
      );
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== nodeId) return n;
          const clean = stripDisplayData(n.data as SystemNodeData);
          return {
            ...n,
            data: {
              ...clean,
              fields: (clean.fields ?? []).filter((field) => field.id !== fieldId),
            },
          };
        }),
      );
      if (selectedFieldId === fieldId) {
        setSelectedFieldId(null);
        setSelectedFieldLabel(null);
        setSelectedFieldMetadata(null);
      }
      if (lineageAnchor?.fieldId === fieldId && lineageAnchor.nodeId === nodeId) {
        setLineageAnchor(null);
      }
      toast.success("Field deleted");
    },
    [setEdges, setNodes, selectedFieldId, lineageAnchor],
  );

  const handleRenameField = useCallback(
    (nodeId: string, fieldId: string, label: string) => {
      const next = label.trim();
      if (!next) return;
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== nodeId) return n;
          const clean = stripDisplayData(n.data as SystemNodeData);
          return {
            ...n,
            data: {
              ...clean,
              fields: (clean.fields ?? []).map((field) =>
                field.id === fieldId ? { ...field, label: next } : field,
              ),
            },
          };
        }),
      );
      if (selectedFieldId === fieldId) {
        setSelectedFieldLabel(next);
      }
    },
    [setNodes, selectedFieldId],
  );

  const handleRenameNode = useCallback(
    (nodeId: string, label: string) => {
      const next = label.trim();
      if (!next) return;
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...stripDisplayData(n.data as SystemNodeData), label: next } }
            : n,
        ),
      );
      if (selectedNodeId === nodeId) {
        setSelectedNodeLabel(next);
      }
    },
    [setNodes, selectedNodeId],
  );

  const cleanupAfterNodeDelete = useCallback(
    (ids: string[]) => {
      const idSet = new Set(ids);
      setEdges((eds) => eds.filter((e) => !idSet.has(e.source) && !idSet.has(e.target)));
      if (selectedNodeId && idSet.has(selectedNodeId)) {
        setSelectedNodeId(null);
        setSelectedFieldId(null);
        setSelectedNodeLabel(null);
        setSelectedFieldLabel(null);
        setSelectedNodeMetadata(null);
        setSelectedFieldMetadata(null);
        setSidebarOpen(false);
      }
      if (lineageAnchor && idSet.has(lineageAnchor.nodeId)) {
        setLineageAnchor(null);
      }
      if (activeTouchpointId && idSet.has(activeTouchpointId)) {
        setActiveTouchpointId(null);
      }
    },
    [setEdges, selectedNodeId, lineageAnchor, activeTouchpointId],
  );

  const handleUpdateNodeData = useCallback(
    (nodeId: string, updater: (data: SystemNodeData) => SystemNodeData) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== nodeId) return n;
          const clean = stripDisplayData(n.data as SystemNodeData);
          return { ...n, data: updater(clean) };
        }),
      );
    },
    [setNodes],
  );

  const handleUpdateDrawingNodeData = useCallback(
    (nodeId: string, updater: (data: Record<string, unknown>) => Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== nodeId) return n;
          return { ...n, data: updater(n.data as Record<string, unknown>) };
        }),
      );
    },
    [setNodes],
  );

  const handleUpdateStickyNoteData = useCallback(
    (nodeId: string, updater: (data: { content: string; color?: string }) => { content: string; color?: string }) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== nodeId) return n;
          return { ...n, data: updater(n.data as { content: string; color?: string }) };
        }),
      );
    },
    [setNodes],
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      cleanupAfterNodeDelete([nodeId]);
      toast.success("Node deleted");
    },
    [setNodes, cleanupAfterNodeDelete],
  );

  const onNodesDelete: OnNodesDelete = useCallback(
    (deleted) => {
      cleanupAfterNodeDelete(deleted.map((n) => n.id));
      if (deleted.length > 1) {
        toast.success(`Deleted ${deleted.length} items`);
      }
    },
    [cleanupAfterNodeDelete],
  );

  const onEdgesDelete: OnEdgesDelete = useCallback(
    (deleted) => {
      if (selectedEdgeId && deleted.some((edge) => edge.id === selectedEdgeId)) {
        clearEdgeSelection();
      }
      if (deleted.length > 1) {
        toast.success(`Deleted ${deleted.length} connections`);
      }
    },
    [selectedEdgeId, clearEdgeSelection],
  );

  const onNodeClick = useCallback(
    (_e: React.MouseEvent, node: Node) => {
      const nodeData = (node.data ?? {}) as SystemNodeData & { label?: string; metadata?: MetadataValues };

      if (node.type === "touchpoint") {
        setActiveTouchpointId((curr) => (curr === node.id ? null : node.id));
        setLineageAnchor(null);
      }

      if (node.type === "system") {
        setLineageAnchor({ nodeId: node.id, fieldId: null });
      } else if (node.type !== "touchpoint") {
        setLineageAnchor(null);
      }

      if (
        node.type === "textNode" ||
        node.type === "shapeNode" ||
        node.type === "stickyNote" ||
        node.type === "container" ||
        node.type === "customObject"
      ) {
        setSidebarOpen(false);
        clearEdgeSelection();
        return;
      }

      clearEdgeSelection();

      setSelectedNodeId(node.id);
      setSelectedFieldId(null);
      setSelectedNodeLabel(nodeData.label ?? null);
      setSelectedFieldLabel(null);
      setSelectedNodeMetadata(
        nodeData.metadata && typeof nodeData.metadata === "object" ? { ...nodeData.metadata } : {},
      );
      setSelectedFieldMetadata(null);
      setSidebarOpen(node.type === "system");
    },
    [clearEdgeSelection],
  );

  const sidebarSelectionContext = selectedFieldId ? ("field" as const) : ("node" as const);

  const selectedSidebarProperties = useMemo(() => {
    if (!selectedNodeId) return [];
    const node = nodes.find((n) => n.id === selectedNodeId);
    if (!node) return [];

    const nodeGroupId = (node.data as SystemNodeData)?.nodeGroupId;
    if (selectedFieldId) {
      return getFieldProperties(schema, nodeGroupId);
    }
    return getNodeGroupProperties(schema);
  }, [selectedNodeId, selectedFieldId, nodes, schema]);

  const handleDeleteGroup = useCallback(
    (groupId: string) => {
      const group = schema.nodeGroups.find((item) => item.id === groupId);
      if (!confirm(`Delete "${group?.name ?? "this group"}" and remove all instances from the canvas?`)) {
        return;
      }

      setSchema((prev) => ({
        ...prev,
        nodeGroups: prev.nodeGroups.filter((item) => item.id !== groupId),
      }));

      const removedNodeIds = nodes
        .filter(
          (node) =>
            node.type === "system" && (node.data as SystemNodeData)?.nodeGroupId === groupId,
        )
        .map((node) => node.id);

      if (removedNodeIds.length > 0) {
        setNodes((nds) =>
          nds.filter(
            (node) =>
              !(node.type === "system" && (node.data as SystemNodeData)?.nodeGroupId === groupId),
          ),
        );
        cleanupAfterNodeDelete(removedNodeIds);
      }

      if (schemaBuilderFocusGroupId === groupId) {
        setSchemaBuilderFocusGroupId(null);
        setIsSchemaBuilderOpen(false);
      }

      toast.success("Node group deleted");
    },
    [schema.nodeGroups, nodes, cleanupAfterNodeDelete, schemaBuilderFocusGroupId],
  );

  const handleUpdateMetadata = useCallback(
    (nodeId: string, metadata: MetadataValues) => {
      const nodeGroupProps = getNodeGroupProperties(schema);
      const sanitized = pickMetadataForProperties(metadata, nodeGroupProps);

      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...stripDisplayData(n.data as Record<string, unknown>), metadata: sanitized } }
            : n,
        ),
      );
      setSelectedNodeMetadata(sanitized);
    },
    [schema, setNodes],
  );

  const handleUpdateFieldMetadata = useCallback(
    (nodeId: string, fieldId: string, metadata: MetadataValues) => {
      const node = nodes.find((n) => n.id === nodeId);
      const nodeGroupId = (node?.data as SystemNodeData | undefined)?.nodeGroupId;
      const fieldProps = getFieldProperties(schema, nodeGroupId);
      const sanitized = pickMetadataForProperties(metadata, fieldProps);

      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== nodeId) return n;
          const clean = stripDisplayData(n.data as SystemNodeData);
          return {
            ...n,
            data: {
              ...clean,
              fields: (clean.fields ?? []).map((field) =>
                field.id === fieldId ? { ...field, metadata: sanitized } : field,
              ),
            },
          };
        }),
      );
      setSelectedFieldMetadata(sanitized);
    },
    [nodes, schema, setNodes],
  );

  const nodeCanvasValue = useMemo<NodeCanvasContextValue>(
    () => ({
      schema,
      onUpdateNodeData: handleUpdateNodeData,
      onUpdateStickyNoteData: handleUpdateStickyNoteData,
      onDeleteNode: handleDeleteNode,
      onFieldSelect: handleFieldSelect,
      onDeleteField: handleDeleteField,
      onFieldConnectDrop: handleFieldConnectDrop,
      onUpdateDrawingNodeData: handleUpdateDrawingNodeData,
    }),
    [
      schema,
      handleUpdateNodeData,
      handleUpdateStickyNoteData,
      handleDeleteNode,
      handleFieldSelect,
      handleDeleteField,
      handleFieldConnectDrop,
      handleUpdateDrawingNodeData,
    ],
  );

  const onNodeContextMenu = useCallback(
    (e: React.MouseEvent, node: Node) => {
      e.preventDefault();
      if (node.type === "system") {
        triggerImpactAnalysis(node.id);
        toast.success(`Analyzing impact for ${node.data.label}`);
      }
    },
    [triggerImpactAnalysis],
  );

  const onPaneClick = useCallback(() => {
    setActiveTouchpointId(null);
    setLineageAnchor(null);
    setSelectedNodeId(null);
    setSelectedFieldId(null);
    setSelectedFieldLabel(null);
    setSelectedFieldMetadata(null);
    setSelectedNodeLabel(null);
    setSelectedNodeMetadata(null);
    setSidebarOpen(false);
    clearEdgeSelection();
  }, [clearEdgeSelection]);

  const activeTouchpointLabel = activeTouchpointId
    ? (nodes.find((n) => n.id === activeTouchpointId)?.data as { label?: string } | undefined)?.label
    : null;

  const handleOpenSchemaBuilder = useCallback((groupId?: string) => {
    if (groupId) {
      setSchemaBuilderFocusGroupId(groupId);
    }
    setIsSchemaBuilderOpen(true);
  }, []);

  const buildExportPayload = useCallback(() => {
    const drawingData = drawingSnapshotRef.current
      ? [drawingSnapshotRef.current]
      : drawings.length
        ? drawings
        : [];
    return {
      projectName: project?.name ?? "Untitled Project",
      sheetName: activeSheet?.name ?? "Sheet 1",
      nodes,
      edges,
      schema,
      drawings: drawingData,
      viewport: rfInstance?.getViewport(),
      exportedAt: new Date().toISOString(),
    };
  }, [nodes, edges, schema, drawings, rfInstance, project?.name, activeSheet?.name]);

  const getExportFileName = useCallback(
    (ext: string) =>
      buildFileName(
        project?.name ?? "Untitled Project",
        activeSheet?.name ?? "Sheet 1",
        ext,
      ),
    [project?.name, activeSheet?.name],
  );

  const downloadProjectJson = useCallback(() => {
    const data = JSON.stringify(buildExportPayload(), null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = getExportFileName("json");
    a.click();
    URL.revokeObjectURL(url);
  }, [buildExportPayload, getExportFileName]);

  const handleExport = useCallback(() => {
    downloadProjectJson();
    toast.success("Graph exported");
  }, [downloadProjectJson]);

  const handleSaveProject = useCallback(async () => {
    if (isSaving || !activeSheet) return;
    setIsSaving(true);
    try {
      await workspaceStorage.saveSheetState(activeSheet.id, collectCanvasState());
      setSaveSuccess(true);
      toast.success("Project saved successfully!");
      window.setTimeout(() => setSaveSuccess(false), 2200);
    } catch {
      toast.error("Failed to save project");
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, activeSheet, collectCanvasState]);

  const handleVisualExport = useCallback(
    async (format: "png" | "jpeg" | "pdf") => {
      if (!rfInstance || !wrapperRef.current) {
        toast.error("Canvas is not ready for export");
        return;
      }
      if (rfInstance.getNodes().length === 0) {
        toast.error("Add nodes to the canvas before exporting");
        return;
      }

      setIsVisualExporting(true);
      try {
        if (format === "pdf") {
          await exportCanvasPdf(wrapperRef.current, rfInstance, getExportFileName("pdf"));
          toast.success("PDF exported");
        } else {
          await exportCanvasImage(
            wrapperRef.current,
            rfInstance,
            format,
            getExportFileName(format === "jpeg" ? "jpg" : "png"),
          );
          toast.success(`${format.toUpperCase()} exported`);
        }
      } catch (error) {
        console.error(error);
        toast.error(`Failed to export ${format.toUpperCase()}`);
      } finally {
        setIsVisualExporting(false);
      }
    },
    [rfInstance, getExportFileName],
  );

  const downloadEncryptedCiphertext = useCallback(
    (ciphertext: string) => {
      const blob = new Blob([ciphertext], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = getExportFileName("encrypted");
      a.click();
      URL.revokeObjectURL(url);
    },
    [getExportFileName],
  );

  const applyProjectPayload = useCallback(
    (parsed: {
      nodes?: Node[];
      edges?: Edge[];
      schema?: Schema;
      drawings?: string[];
      viewport?: { x: number; y: number; zoom: number };
    }) => {
      if (parsed.nodes) {
        setNodes(
          parsed.nodes.map((n) => ({
            ...n,
            data: stripDisplayData(n.data as Record<string, unknown>),
          })),
        );
      }
      if (parsed.edges) setEdges(parsed.edges);
      if (parsed.schema) setSchema(normalizeSchema(parsed.schema));
      if (parsed.drawings?.length) {
        const snapshot = parsed.drawings[parsed.drawings.length - 1];
        drawingSnapshotRef.current = snapshot;
        setDrawings(parsed.drawings);
      }
      if (parsed.viewport && rfInstance) {
        rfInstance.setViewport(parsed.viewport, { duration: 0 });
      } else if (parsed.viewport) {
        pendingViewportRef.current = parsed.viewport;
      }
    },
    [rfInstance, setNodes, setEdges],
  );

  const openEncryptModal = useCallback((intent: "export" | "cloud") => {
    setEncryptionIntent(intent);
    setEncryptionMode("encrypt");
    setPendingEncryptedContent(null);
    setEncryptionModalOpen(true);
  }, []);

  const handleEncryptionConfirm = useCallback(
    async (password: string) => {
      if (encryptionMode === "encrypt") {
        setIsEncrypting(true);
        try {
          const payload = buildExportPayload();
          const ciphertext = prepareEncryptedCloudPayload(payload, password);

          if (encryptionIntent === "cloud") {
            await uploadEncryptedSnapshot({
              projectName: project?.name ?? "Untitled Project",
              sheetName: activeSheet?.name ?? "Sheet 1",
              ciphertext,
            });
            toast.success("Saved to cloud");
          } else {
            downloadEncryptedCiphertext(ciphertext);
            toast.success("Encrypted JSON exported");
          }
          setEncryptionModalOpen(false);
        } catch {
          toast.error("Encryption failed");
        } finally {
          setIsEncrypting(false);
        }
        return;
      }

      if (!pendingEncryptedContent) return;

      setIsEncrypting(true);
      try {
        const parsed = decryptData<ReturnType<typeof buildExportPayload>>(pendingEncryptedContent, password);
        if (!parsed) {
          toast.error("Invalid password or corrupted data.");
          return;
        }
        applyProjectPayload(parsed);
        setPendingEncryptedContent(null);
        setEncryptionModalOpen(false);
        toast.success("Encrypted workspace imported");
      } finally {
        setIsEncrypting(false);
      }
    },
    [
      encryptionMode,
      encryptionIntent,
      pendingEncryptedContent,
      buildExportPayload,
      downloadEncryptedCiphertext,
      applyProjectPayload,
      project?.name,
      activeSheet?.name,
    ],
  );

  const handleImportEncryptedFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = String(ev.target?.result ?? "").trim();
      if (!text) {
        toast.error("Encrypted file is empty");
        return;
      }
      setPendingEncryptedContent(text);
      setEncryptionMode("decrypt");
      setEncryptionModalOpen(true);
    };
    reader.readAsText(file);
  }, []);

  const handleImportJsonFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(String(ev.target?.result));
          applyProjectPayload(parsed);
          toast.success("Graph imported");
        } catch {
          toast.error("Invalid JSON file");
        }
      };
      reader.readAsText(file);
    },
    [applyProjectPayload],
  );

  const handleCloudSnapshotSelect = useCallback(async (snapshot: CloudSnapshotSummary) => {
    try {
      const ciphertext = await fetchSnapshot(snapshot.id);
      setPendingEncryptedContent(ciphertext);
      setEncryptionMode("decrypt");
      setEncryptionModalOpen(true);
    } catch {
      toast.error("Failed to load cloud snapshot");
    }
  }, []);

  const collectCanvasStateAsync = useCallback(
    async () => collectCanvasState(),
    [collectCanvasState],
  );

  const handleSheetSelect = useCallback(
    async (sheetId: string) => {
      const next = await switchSheet(sheetId, collectCanvasStateAsync);
      if (next) {
        loadedSheetIdRef.current = next.id;
        applySheetToCanvas(next);
      }
    },
    [switchSheet, collectCanvasStateAsync, applySheetToCanvas],
  );

  const handleSheetCreate = useCallback(async () => {
    const next = await createSheet(collectCanvasStateAsync);
    if (next) {
      loadedSheetIdRef.current = next.id;
      applySheetToCanvas(next);
    }
  }, [createSheet, collectCanvasStateAsync, applySheetToCanvas]);

  const handleSheetDelete = useCallback(
    async (sheetId: string) => {
      const wasActive = activeSheet?.id === sheetId;
      await deleteSheet(sheetId, collectCanvasStateAsync);
      if (wasActive) {
        loadedSheetIdRef.current = null;
      }
    },
    [deleteSheet, collectCanvasStateAsync, activeSheet?.id],
  );

  const performClearCanvas = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setActiveTouchpointId(null);
    setLineageAnchor(null);
    setSelectedNodeId(null);
    setSelectedFieldId(null);
    setSidebarOpen(false);
    drawingRef.current = false;
    drawingSnapshotRef.current = null;
    setDrawings([]);
    setIsDrawing(false);
    setDrawingMode(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setClearDialogOpen(false);
    toast.success("Canvas cleared");
  }, [setNodes, setEdges]);

  const handleClearRequest = () => {
    setClearDialogOpen(true);
  };

  const handleClearExportFirst = () => {
    downloadProjectJson();
    toast.success("Backup exported — you can now clear safely or cancel");
  };

  const exitDrawingMode = useCallback(() => {
    drawingRef.current = false;
    setIsDrawing(false);
    setDrawingMode(false);
  }, []);

  const toggleDrawingMode = () => {
    setDrawingMode((prev) => {
      const next = !prev;
      if (next) setIsDrawing(false);
      toast.success(next ? "Freehand mode on — drag on canvas to annotate" : "Freehand mode off");
      return next;
    });
  };

  const clearDrawings = () => {
    drawingRef.current = false;
    drawingSnapshotRef.current = null;
    setDrawings([]);
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    toast.success("Drawings cleared");
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawingMode) return;
    e.preventDefault();
    e.stopPropagation();
    drawingRef.current = true;
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  };

  useEffect(() => {
    if (!drawingMode) return;
    requestAnimationFrame(() => restoreCanvasSnapshot());
  }, [drawingMode, restoreCanvasSnapshot]);

  useEffect(() => {
    if (!isDrawing) return;

    const onMouseMove = (e: MouseEvent) => drawLine(e.clientX, e.clientY);
    const onMouseUp = () => endDrawing();

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isDrawing, drawLine, endDrawing]);

  useEffect(() => {
    if (drawingMode || activeView !== "canvas") return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableKeyboardTarget(event.target)) return;
      if (!event.metaKey && !event.ctrlKey) return;

      const key = event.key.toLowerCase();

      if (key === "c") {
        const selected = getSelectedCopyableNodes(nodes);
        if (selected.length === 0) return;
        event.preventDefault();
        clipboardNodesRef.current = cloneNodesForClipboard(nodes);
        pasteGenerationRef.current = 0;
        toast.success(`Copied ${selected.length} item${selected.length === 1 ? "" : "s"}`);
        return;
      }

      if (key === "v") {
        if (clipboardNodesRef.current.length === 0) return;
        event.preventDefault();
        pasteGenerationRef.current += 1;
        const duplicates = duplicateNodesFromClipboard(
          clipboardNodesRef.current,
          nextNodeId,
          pasteGenerationRef.current,
        );
        setNodes((current) =>
          sortNodesParentFirst([
            ...current.map((node) => ({ ...node, selected: false })),
            ...duplicates,
          ]),
        );
        clearEdgeSelection();
        setSidebarOpen(false);
        toast.success(`Pasted ${duplicates.length} item${duplicates.length === 1 ? "" : "s"}`);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [nodes, drawingMode, activeView, setNodes, clearEdgeSelection]);

  useEffect(() => {
    if (!drawingMode) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") exitDrawingMode();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawingMode, exitDrawingMode]);

  return (
    <div className="mapify-app flex h-screen w-full flex-col bg-background">
      <header className="mapify-header flex h-14 shrink-0 items-center justify-between border-b border-border px-4 gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="mapify-brand flex items-center gap-2.5 shrink-0">
            <img src="/Mapify-logo-new.png" alt="" className="h-8 w-8 object-contain" aria-hidden />
            <h1 className="text-base font-semibold tracking-tight">Mapify</h1>
          </div>
          <div className="flex items-center rounded-lg border border-border p-0.5 bg-muted/40">
            <Button
              variant={activeView === "canvas" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={() => setActiveView("canvas")}
            >
              <LayoutGrid className="mr-1.5 h-3.5 w-3.5" />
              Canvas
            </Button>
            <Button
              variant={activeView === "glossary" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={() => setActiveView("glossary")}
            >
              <BookOpen className="mr-1.5 h-3.5 w-3.5" />
              Glossary
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <SchemaBuilder
            schema={schema}
            onUpdateSchema={setSchema}
            isOpen={isSchemaBuilderOpen}
            onOpenChange={setIsSchemaBuilderOpen}
            focusGroupId={schemaBuilderFocusGroupId}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSchemaBuilderFocusGroupId(null);
              setIsSchemaBuilderOpen(true);
            }}
          >
            <Settings className="mr-1.5 h-4 w-4" /> Schema
          </Button>
          {activeView === "canvas" && (
            <>
              <Button variant={drawingMode ? "default" : "outline"} size="sm" onClick={toggleDrawingMode}>
                <PenTool className="mr-1.5 h-4 w-4" /> {drawingMode ? "Drawing" : "Draw"}
              </Button>
              {drawingMode && (
                <Button variant="outline" size="sm" onClick={clearDrawings}>
                  <Trash2 className="mr-1.5 h-4 w-4" /> Clear Drawings
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleClearRequest}>
                <Trash2 className="mr-1.5 h-4 w-4" /> Clear
              </Button>
            </>
          )}
          <FileMenu
            isSaving={isSaving}
            saveSuccess={saveSuccess}
            isVisualExporting={isVisualExporting}
            cloudConfigured={isSupabaseConfigured()}
            onLocalSave={handleSaveProject}
            onSaveToCloud={() => openEncryptModal("cloud")}
            onLoadFromCloud={() => {
              if (!isSupabaseConfigured()) {
                toast.error("Cloud storage is not configured");
                return;
              }
              setCloudSnapshotsOpen(true);
            }}
            onImportJson={handleImportJsonFile}
            onImportEncrypted={handleImportEncryptedFile}
            onExportJson={handleExport}
            onExportEncrypted={() => openEncryptModal("export")}
            onVisualExport={handleVisualExport}
          />
        </div>
      </header>

      <WorkspaceBar
        project={project}
        sheets={sheets}
        activeSheetId={activeSheet?.id ?? null}
        onProjectNameChange={setProjectName}
        onSheetSelect={handleSheetSelect}
        onSheetRename={renameSheet}
        onSheetCreate={handleSheetCreate}
        onSheetDelete={handleSheetDelete}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          schema={schema}
          onUpdateSchema={setSchema}
          onOpenSchemaBuilder={handleOpenSchemaBuilder}
          onDeleteGroup={handleDeleteGroup}
        />
        {activeView === "glossary" ? (
          <GlossaryView nodes={nodes} schema={schema} />
        ) : (
        <div
          ref={wrapperRef}
          className={`flex-1 relative flow-export-host ${edgeSettingsOpen ? "canvas-edge-focus" : ""}`}
        >
          {drawingMode && (
            <canvas
              ref={canvasRef}
              className="absolute inset-0 z-20 cursor-crosshair"
              style={{ pointerEvents: "auto" }}
              onMouseDown={handleMouseDown}
            />
          )}
          <NodeCanvasProvider value={nodeCanvasValue}>
            <LineageProvider value={lineageContextValue}>
              <ReactFlow
                nodes={nodes}
                edges={displayedEdges}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onConnectEnd={onConnectEnd}
                onNodesDelete={onNodesDelete}
                onEdgesDelete={onEdgesDelete}
                onInit={setRfInstance}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onNodeClick={onNodeClick}
                onNodeContextMenu={onNodeContextMenu}
                onNodeDragStop={onNodeDragStop}
                onEdgeClick={onEdgeClick}
                onEdgeDoubleClick={onEdgeDoubleClick}
                onPaneClick={onPaneClick}
                connectionMode={ConnectionMode.Loose}
                connectionRadius={28}
                defaultEdgeOptions={{
                  type: "custom",
                  markerEnd: {
                    type: MarkerType.ArrowClosed,
                    width: 24,
                    height: 24,
                    color: "#3b82f6",
                  },
                }}
                deleteKeyCode={["Backspace", "Delete"]}
                connectOnClick={false}
                selectionOnDrag={!drawingMode}
                selectionMode={SelectionMode.Partial}
                panOnDrag={drawingMode ? [1, 2] : [1, 2]}
                panOnScroll
                nodesDraggable={!drawingMode}
                nodesConnectable={!drawingMode}
                elementsSelectable={!drawingMode}
                edgesFocusable={!drawingMode}
                nodesFocusable={!drawingMode}
                multiSelectionKeyCode={["Meta", "Control"]}
                fitView
                proOptions={{ hideAttribution: true }}
                style={{ background: "#f0f4f8" }}
              >
            <Background gap={20} color="#cbd5e1" />
            <Controls />
            <MiniMap pannable zoomable />
            {nodes.length === 0 && (
              <Panel position="top-center">
                <div className="rounded-md border border-dashed border-border bg-card/80 px-4 py-2 text-sm text-muted-foreground backdrop-blur">
                  Drag systems or touchpoints from the sidebar onto the canvas
                </div>
              </Panel>
            )}
            {hasLineage && lineageAnchor && (
              <Panel position="top-center">
                <div className="lineage-banner animate-fade-in">
                  <span className="lineage-banner__dot" />
                  <span>
                    Lineage for{" "}
                    <strong>
                      {selectedNodeLabel}
                      {selectedFieldLabel ? `.${selectedFieldLabel}` : ""}
                    </strong>{" "}
                    · {lineage.nodeIds.size} node(s), {lineage.edgeIds.size} edge(s)
                  </span>
                  <button
                    onClick={() => setLineageAnchor(null)}
                    className="lineage-banner__close"
                    aria-label="Clear lineage"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </Panel>
            )}
              </ReactFlow>
            </LineageProvider>
          </NodeCanvasProvider>
        </div>
        )}
      </div>

      <EdgeSettingsPanel
        edge={edges.find((edge) => edge.id === selectedEdgeId) ?? null}
        isOpen={edgeSettingsOpen}
        onClose={clearEdgeSelection}
        onUpdate={handleEdgeUpdate}
        onDelete={handleEdgeDelete}
      />

      <ClearCanvasDialog
        open={clearDialogOpen}
        onOpenChange={setClearDialogOpen}
        onCancel={() => setClearDialogOpen(false)}
        onExportFirst={handleClearExportFirst}
        onConfirmClear={performClearCanvas}
      />

      <NodeNameDialog
        open={nodeNameDialogOpen}
        defaultName={pendingNodeDrop?.item.name ?? ""}
        groupName={pendingNodeDrop?.item.name}
        onOpenChange={(open) => {
          if (!open) cancelNodeDrop();
        }}
        onConfirm={createNodeFromDrop}
        onCancel={cancelNodeDrop}
      />

      <CustomObjectDialog
        open={customObjectDialogOpen}
        onOpenChange={(open) => {
          setCustomObjectDialogOpen(open);
          if (!open) setPendingCustomObjectPosition(null);
        }}
        onConfirm={handleCustomObjectConfirm}
      />

      <CloudSnapshotsDialog
        open={cloudSnapshotsOpen}
        onOpenChange={setCloudSnapshotsOpen}
        onSelect={handleCloudSnapshotSelect}
      />

      <EncryptionModal
        open={encryptionModalOpen}
        onOpenChange={setEncryptionModalOpen}
        mode={encryptionMode}
        isLoading={isEncrypting}
        title={encryptionMode === "encrypt" ? "Workspace Encryption" : "Unlock Encrypted Workspace"}
        description={
          encryptionMode === "encrypt"
            ? encryptionIntent === "cloud"
              ? "Encrypt your workspace before uploading to the cloud. Only ciphertext leaves this device."
              : "Encrypt your full workspace into a password-protected file."
            : "Enter the password that was used to encrypt this workspace."
        }
        confirmLabel={
          encryptionMode === "encrypt"
            ? encryptionIntent === "cloud"
              ? "Encrypt & Upload"
              : "Encrypt & Export"
            : "Decrypt & Import"
        }
        onConfirm={handleEncryptionConfirm}
      />

      <MetadataSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        nodeId={selectedNodeId}
        nodeLabel={selectedNodeLabel}
        fieldId={selectedFieldId}
        fieldLabel={selectedFieldLabel}
        metadata={(selectedFieldId ? selectedFieldMetadata : selectedNodeMetadata) ?? {}}
        properties={selectedSidebarProperties}
        selectionContext={sidebarSelectionContext}
        onUpdateMetadata={
          selectedFieldId
            ? (nodeId, metadata) => handleUpdateFieldMetadata(nodeId, selectedFieldId, metadata)
            : handleUpdateMetadata
        }
        onRenameNode={handleRenameNode}
        onRenameField={handleRenameField}
        onDeleteField={handleDeleteField}
        onDeleteNode={selectedNodeId && !selectedFieldId ? () => handleDeleteNode(selectedNodeId) : undefined}
      />
    </div>
  );
}

export function FlowCanvas() {
  return (
    <ReactFlowProvider>
      <InnerCanvas />
    </ReactFlowProvider>
  );
}
