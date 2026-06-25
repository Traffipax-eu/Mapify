import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  updateEdge,
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
  type OnConnectStartParams,
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
import { LineageToolbar } from "./LineageToolbar";
import { EdgeSettingsPanel, applyConnectionSettingsToEdge } from "./EdgeSettingsPanel";
import { SchemaEditorSidebar } from "./SchemaEditorSidebar";
import { GlossaryView } from "./GlossaryView";
import { GuideView } from "./GuideView";
import { CustomEdge } from "./edges/CustomEdge";
import { ClearCanvasDialog } from "./ClearCanvasDialog";
import { EncryptionModal, type EncryptionModalMode } from "./EncryptionModal";
import { FileMenu } from "./FileMenu";
import { WorkspaceBar } from "./WorkspaceBar";
import { CloudSnapshotsDialog } from "./CloudSnapshotsDialog";
import { EmbedSnippetDialog } from "./EmbedSnippetDialog";
import { NodeNameDialog } from "./NodeNameDialog";
import { Button } from "@/components/ui/button";
import {
  Trash2,
  X,
  LayoutGrid,
  BookOpen,
  CircleHelp,
  PenTool,
  Undo2,
  Redo2,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { workspaceStorage, type Sheet } from "@/lib/workspaceStorage";
import { useProjectWorkspace } from "@/hooks/useProjectWorkspace";
import { buildFileName } from "@/lib/fileNaming";
import { uploadEncryptedSnapshot, fetchSnapshot, type CloudSnapshotSummary } from "@/lib/cloudStorage";
import { isSupabaseConfigured, formatSupabaseError } from "@/lib/supabaseClient";
import { exportCanvasImage, exportCanvasPdf } from "@/lib/canvasExport";
import { decryptData, prepareEncryptedCloudPayload } from "@/utils/encryption";
import { LineageProvider, type LineageContextValue } from "@/contexts/LineageContext";
import { NodeCanvasProvider, type NodeCanvasContextValue } from "@/contexts/NodeCanvasContext";
import { buildMarker } from "@/lib/edgeMarkers";
import { computeLineageTrace, decorateEdgesForDisplay, type LineageTrace } from "@/lib/lineageTraversal";
import { sanitizeFreeformMetadata } from "@/lib/metadataAttributes";
import { buildFieldMetadataUpdate, getBlockAttributeDefinitions, getFieldAttributeDefinitions } from "@/lib/fieldMetadata";
import {
  getCustomObjectBlockProperties,
  getCustomObjectFieldProperties,
  getFieldProperties,
  getGroupBlockProperties,
  normalizeSchema,
} from "@/lib/schemaProperties";
import { resolveSidebarSelection } from "@/lib/sidebarSelection";
import { isDrawingToolPayload, isNodeGroupPayload, type NodeGroupDragPayload } from "@/lib/drawingTools";
import { createDrawingNode, createTextNodeWithContent } from "@/lib/createDrawingNode";
import { createContainerNode } from "@/lib/createContainerNode";
import { ensureCustomObjectSchema } from "@/lib/customObjectSchema";
import { createCustomObjectNode, createConfiguredCustomObjectNode, type CustomObjectNodeData } from "@/lib/createCustomObjectNode";
import { isCustomObjectPayload, isCustomObjectTemplatePayload } from "@/lib/customObjects";
import { CustomObjectDialog, type CustomObjectConfig } from "./CustomObjectDialog";
import {
  assignNodeParent,
  applySafeNodeRemovals,
  resolveSafeNodeRemovals,
  isContainerNode,
  pickInnermostContainer,
  sortNodesParentFirst,
} from "@/lib/containerUtils";
import { DEFAULT_CONNECTION_SETTINGS, type ConnectionSettings } from "@/lib/connectionSettings";
import { BRAND } from "@/lib/brand";
import {
  normalizeConnection,
  parseFieldSourceId,
  parseFieldTargetId,
  fieldSourceHandle,
  fieldTargetHandle,
  parentTargetHandle,
  parentSourceHandle,
  upgradeConnectionWithFieldTarget,
  isFieldConnectionHandle,
  isParentConnectionHandle,
  type NormalizedConnection,
} from "@/lib/connectionUtils";
import {
  finishFieldConnectionDrag,
  tryCommitFieldConnectionDragEnd,
  resolveFieldConnectionTargetFromPoint,
} from "@/lib/fieldConnectionDnD";
import {
  cloneNodesForClipboard,
  duplicateNodesFromClipboard,
  getSelectedCopyableNodes,
  isEditableKeyboardTarget,
  isFieldTablePasteTarget,
  parseClipboardNodes,
  serializeNodesToClipboard,
} from "@/lib/clipboardNodes";
import { cloneCanvasSnapshot, createCanvasHistoryState } from "@/lib/canvasHistory";
import { ensureExplicitSections, insertFieldsAtPlacement } from "@/lib/nodeSections";
import type { TablePastePlan } from "@/lib/tableClipboard";
import { VersionHistoryDrawer } from "@/components/VersionHistoryDrawer";
import { SaveVersionDialog } from "@/components/SaveVersionDialog";
import { ShareProjectDialog } from "@/components/ShareProjectDialog";
import {
  saveProjectVersion,
  type ProjectVersion,
  type ProjectVersionSnapshot,
} from "@/lib/projectCollaboration";
import { getCollaboratorDisplayName } from "@/lib/collaboration/config";
import type { EdgeChange } from "reactflow";

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
  const historyRef = useRef(createCanvasHistoryState());
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
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
  const [lineageTrace, setLineageTrace] = useState<LineageTrace | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [schemaEditorGroupId, setSchemaEditorGroupId] = useState<string | null>(null);
  const [schemaEditorCustomObjectId, setSchemaEditorCustomObjectId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"canvas" | "glossary" | "guide">("canvas");
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isVisualExporting, setIsVisualExporting] = useState(false);
  const pendingViewportRef = useRef<{ x: number; y: number; zoom: number } | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [edgeSettingsOpen, setEdgeSettingsOpen] = useState(false);
  const closeSchemaEditor = useCallback(() => {
    setSchemaEditorGroupId(null);
    setSchemaEditorCustomObjectId(null);
  }, []);

  const schemaEditorOpen = Boolean(schemaEditorGroupId);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  const pushUndo = useCallback(() => {
    historyRef.current.push(cloneCanvasSnapshot(nodesRef.current, edgesRef.current));
  }, []);

  const handleUndo = useCallback(() => {
    const restored = historyRef.current.undo(
      cloneCanvasSnapshot(nodesRef.current, edgesRef.current),
    );
    if (!restored) return;
    setNodes(restored.nodes);
    setEdges(restored.edges);
  }, [setNodes, setEdges]);

  const handleRedo = useCallback(() => {
    const restored = historyRef.current.redo(
      cloneCanvasSnapshot(nodesRef.current, edgesRef.current),
    );
    if (!restored) return;
    setNodes(restored.nodes);
    setEdges(restored.edges);
  }, [setNodes, setEdges]);

  const clearMetadataSelection = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedFieldId(null);
    setSelectedNodeLabel(null);
    setSelectedFieldLabel(null);
    setSelectedNodeMetadata(null);
    setSelectedFieldMetadata(null);
    setSidebarOpen(false);
  }, []);

  const sidebarSelection = useMemo(
    () => resolveSidebarSelection(nodes, schema, selectedNodeId, selectedFieldId),
    [nodes, schema, selectedNodeId, selectedFieldId],
  );

  useEffect(() => {
    if (!selectedNodeId) return;
    if (!sidebarSelection) {
      clearMetadataSelection();
    }
  }, [selectedNodeId, sidebarSelection, clearMetadataSelection]);
  const { getIntersectingNodes } = useReactFlow();
  const connectEndPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pendingConnectRef = useRef<OnConnectStartParams | null>(null);
  const connectCommittedRef = useRef(false);
  const lastPointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [encryptionModalOpen, setEncryptionModalOpen] = useState(false);
  const [encryptionMode, setEncryptionMode] = useState<EncryptionModalMode>("encrypt");
  const [encryptionIntent, setEncryptionIntent] = useState<"export" | "cloud">("export");
  const [pendingEncryptedContent, setPendingEncryptedContent] = useState<string | null>(null);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [cloudSnapshotsOpen, setCloudSnapshotsOpen] = useState(false);
  const [embedSnippetOpen, setEmbedSnippetOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [saveVersionDialogOpen, setSaveVersionDialogOpen] = useState(false);
  const [versionPreview, setVersionPreview] = useState<ProjectVersion | null>(null);
  const [isSavingVersion, setIsSavingVersion] = useState(false);
  const [nodeNameDialogOpen, setNodeNameDialogOpen] = useState(false);
  const [customObjectDialogOpen, setCustomObjectDialogOpen] = useState(false);
  const [pendingCustomObjectPosition, setPendingCustomObjectPosition] = useState<{ x: number; y: number } | null>(
    null,
  );
  const lastSafeRemovalIdsRef = useRef<string[]>([]);
  const [pendingNodeDrop, setPendingNodeDrop] = useState<{
    position: { x: number; y: number };
    item: NodeGroupDragPayload;
  } | null>(null);
  const loadedSheetIdRef = useRef<string | null>(null);
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

  const isVersionPreview = versionPreview !== null;

  const canvasNodes = isVersionPreview ? (versionPreview.snapshot.nodes as Node[]) : nodes;
  const canvasEdges = isVersionPreview ? (versionPreview.snapshot.edges as Edge[]) : edges;
  const canvasReadOnly = isVersionPreview || drawingMode;

  // Find downstream dependencies using BFS
  const findDownstreamDependencies = useCallback((nodeId: string): Set<string> => {
    const downstream = new Set<string>();
    const queue = [nodeId];
    const visited = new Set<string>([nodeId]);

    while (queue.length > 0) {
      const current = queue.shift()!;

      const outgoingEdges = canvasEdges.filter((e) => e.source === current);
      
      for (const edge of outgoingEdges) {
        if (!visited.has(edge.target)) {
          visited.add(edge.target);
          downstream.add(edge.target);
          queue.push(edge.target);
        }
      }
    }

    return downstream;
  }, [canvasEdges]);

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
      historyRef.current.clear();
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
      setLineageTrace(null);
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
      if (isVersionPreview) return;

      const shouldRecord = changes.some(
        (change) =>
          change.type === "remove" ||
          (change.type === "position" && change.dragging === false),
      );
      if (shouldRecord) {
        pushUndo();
      }

      const removals = changes
        .filter((change): change is NodeChange & { type: "remove"; id: string } => change.type === "remove")
        .map((change) => change.id);

      if (removals.length > 0) {
        setNodes((current) => {
          const safeRemovals = resolveSafeNodeRemovals(current, removals);
          lastSafeRemovalIdsRef.current = [...safeRemovals];
          return applySafeNodeRemovals(current, removals);
        });
        return;
      }

      onNodesChangeBase(changes);
    },
    [onNodesChangeBase, pushUndo, setNodes, isVersionPreview],
  );

  const onEdgesChangeWrapped = useCallback(
    (changes: EdgeChange[]) => {
      if (isVersionPreview) return;
      onEdgesChange(changes);
    },
    [onEdgesChange, isVersionPreview],
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

      pushUndo();
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [pushUndo, setEdges],
  );

  const onConnectStart = useCallback((_event: React.MouseEvent | React.TouchEvent, params: OnConnectStartParams) => {
    pendingConnectRef.current = params;
    connectCommittedRef.current = false;
  }, []);

  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      const clientX = "clientX" in event ? event.clientX : event.changedTouches[0]?.clientX ?? 0;
      const clientY = "clientY" in event ? event.clientY : event.changedTouches[0]?.clientY ?? 0;
      connectEndPosRef.current = { x: clientX, y: clientY };
      lastPointerRef.current = { x: clientX, y: clientY };

      if (connectCommittedRef.current) {
        pendingConnectRef.current = null;
        return;
      }

      const pending = pendingConnectRef.current;
      pendingConnectRef.current = null;
      if (!pending?.nodeId || !pending.handleId || pending.handleType !== "source") return;
      if (!isParentConnectionHandle(pending.handleId)) return;

      const fieldTarget = resolveFieldConnectionTargetFromPoint(clientX, clientY);
      if (!fieldTarget || fieldTarget.nodeId === pending.nodeId) return;

      const sourceHandle = pending.handleId.startsWith("parent-source-")
        ? pending.handleId
        : parentSourceHandle(pending.nodeId);

      createEdgeFromConnection({
        sourceNodeId: pending.nodeId,
        targetNodeId: fieldTarget.nodeId,
        sourceHandle,
        targetHandle: fieldTargetHandle(fieldTarget.nodeId, fieldTarget.fieldId),
        sourceFieldId: null,
        targetFieldId: fieldTarget.fieldId,
        isFieldToField: false,
        isParentToParent: false,
      });
    },
    [createEdgeFromConnection],
  );

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
        sourceHandle: fieldSourceHandle(source.nodeId, source.fieldId),
        targetHandle: fieldTargetHandle(target.nodeId, target.fieldId),
        sourceFieldId: source.fieldId,
        targetFieldId: target.fieldId,
        isFieldToField: true,
        isParentToParent: false,
      });
    },
    [createEdgeFromConnection],
  );

  useEffect(() => {
    const onDragEnd = (event: DragEvent) => {
      tryCommitFieldConnectionDragEnd(event.clientX, event.clientY, handleFieldConnectDrop);
      finishFieldConnectionDrag();
    };
    window.addEventListener("dragend", onDragEnd);
    return () => window.removeEventListener("dragend", onDragEnd);
  }, [handleFieldConnectDrop]);

  const handleFieldToNodeConnectDrop = useCallback(
    (source: { nodeId: string; fieldId: string }, targetNodeId: string) => {
      if (source.nodeId === targetNodeId) return;

      createEdgeFromConnection({
        sourceNodeId: source.nodeId,
        targetNodeId,
        sourceHandle: fieldSourceHandle(source.nodeId, source.fieldId),
        targetHandle: parentTargetHandle(targetNodeId),
        sourceFieldId: source.fieldId,
        targetFieldId: null,
        isFieldToField: false,
        isParentToParent: false,
      });
    },
    [createEdgeFromConnection],
  );

  const isValidConnection = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return false;

    const sourceHandle = connection.sourceHandle ?? "";
    const targetHandle = connection.targetHandle ?? "";

    if (connection.source === connection.target) {
      if (!isFieldConnectionHandle(sourceHandle) || !isFieldConnectionHandle(targetHandle)) {
        return false;
      }
      const sourceFieldId =
        parseFieldSourceId(sourceHandle) ?? parseFieldTargetId(sourceHandle);
      const targetFieldId =
        parseFieldTargetId(targetHandle) ?? parseFieldSourceId(targetHandle);
      return Boolean(sourceFieldId && targetFieldId && sourceFieldId !== targetFieldId);
    }

    const sourceIsField = isFieldConnectionHandle(sourceHandle);
    const targetIsField = isFieldConnectionHandle(targetHandle);
    const sourceIsParent = isParentConnectionHandle(sourceHandle);
    const targetIsParent = isParentConnectionHandle(targetHandle);

    if ((sourceIsField && targetIsParent) || (sourceIsParent && targetIsField)) {
      return true;
    }
    if (sourceIsField && targetIsField) {
      return true;
    }
    if (sourceIsParent && targetIsParent) {
      return true;
    }

    return true;
  }, []);

  const onConnect = useCallback(
    (params: Connection) => {
      let conn = normalizeConnection(params);
      if (!conn) return;

      conn = upgradeConnectionWithFieldTarget(
        conn,
        lastPointerRef.current.x,
        lastPointerRef.current.y,
        resolveFieldConnectionTargetFromPoint,
      );

      connectCommittedRef.current = true;
      pendingConnectRef.current = null;
      createEdgeFromConnection(conn);
    },
    [createEdgeFromConnection],
  );

  const onEdgeUpdateStart = useCallback(() => {
    pushUndo();
  }, [pushUndo]);

  const onEdgeUpdate = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      const conn = normalizeConnection(newConnection);
      if (!conn) return;

      setEdges((eds) => {
        const next = updateEdge(
          oldEdge,
          {
            ...newConnection,
            source: conn.sourceNodeId,
            target: conn.targetNodeId,
            sourceHandle: conn.sourceHandle,
            targetHandle: conn.targetHandle,
          },
          eds,
        );

        return next.map((edge) =>
          edge.id === oldEdge.id
            ? {
                ...edge,
                source: conn.sourceNodeId,
                target: conn.targetNodeId,
                sourceHandle: conn.sourceHandle,
                targetHandle: conn.targetHandle,
                data: {
                  ...edge.data,
                  sourceFieldId: conn.sourceFieldId,
                  targetFieldId: conn.targetFieldId,
                  sourceNodeId: conn.sourceNodeId,
                  targetNodeId: conn.targetNodeId,
                },
              }
            : edge,
        );
      });
    },
    [setEdges],
  );

  const onEdgeUpdateEnd = useCallback(() => {
    // React Flow fires this after a reconnect attempt (even when dropped on invalid target).
  }, []);

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
        if (item.tool === "container") {
          setNodes((nds) => {
            const newNode = createContainerNode(position, nextNodeId, nds);
            return sortNodesParentFirst(nds.concat(newNode));
          });
        } else {
          const newNode = createDrawingNode(item.tool, position, nextNodeId);
          setNodes((nds) => sortNodesParentFirst(nds.concat(newNode)));
        }
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
        setSchema((prev) => ensureCustomObjectSchema(prev, item.objectId));
        setNodes((nds) => nds.concat(createCustomObjectNode(item.objectId, position, nextNodeId)));
        return;
      }
    },
    [rfInstance, setNodes],
  );

  const openCustomObjectCreator = useCallback(() => {
    setPendingCustomObjectPosition(null);
    setCustomObjectDialogOpen(true);
  }, []);

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
      setSchema((prev) => ensureCustomObjectSchema(prev, "custom", config.label));
      setPendingCustomObjectPosition(null);
    },
    [pendingCustomObjectPosition, rfInstance, setNodes],
  );

  const createNodeFromDrop = useCallback(
    (name: string) => {
      if (!pendingNodeDrop) return;

      const { position, item } = pendingNodeDrop;
      const fieldSchemaAttributes = getFieldProperties(schema, item.id);
      const newNode: Node = {
        id: nextNodeId(),
        position,
        type: "system",
        data: {
          label: name,
          nodeGroupId: item.id,
          icon: item.icon || "database",
          color: item.color || BRAND.blue,
          fields: [],
          collapsed: false,
          metadata: {},
          ...(fieldSchemaAttributes.length > 0
            ? { fieldAttributeKeys: fieldSchemaAttributes.map((property) => property.id) }
            : {}),
        },
      };
      setNodes((nds) => nds.concat(newNode));
      setPendingNodeDrop(null);
      setNodeNameDialogOpen(false);
    },
    [pendingNodeDrop, schema, setNodes],
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
    
    for (const edge of canvasEdges) {
      const sourceNode = canvasNodes.find((n) => n.id === edge.source);
      const targetNode = canvasNodes.find((n) => n.id === edge.target);
      
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
  }, [canvasEdges, canvasNodes]);

  const lineage = useMemo(
    () => computeLineageTrace(lineageTrace, nodes, edges),
    [lineageTrace, edges, nodes],
  );

  const hasLineage = lineageTrace !== null || selectedEdgeId !== null;

  const edgeHighlightNodeIds = useMemo(() => {
    const ids = new Set<string>();
    if (!selectedEdgeId) return ids;
    const edge = edges.find((item) => item.id === selectedEdgeId);
    if (!edge) return ids;
    ids.add(edge.source);
    ids.add(edge.target);
    return ids;
  }, [selectedEdgeId, edges]);

  const activeLineageNodeIds = useMemo(() => {
    const ids = new Set(lineage.nodeIds);
    for (const nodeId of edgeHighlightNodeIds) ids.add(nodeId);
    return ids;
  }, [lineage.nodeIds, edgeHighlightNodeIds]);

  const lineageHighlightedNodeIds = useMemo(() => {
    const ids = new Set<string>();
    for (const nodeId of activeLineageNodeIds) {
      const node = nodes.find((item) => item.id === nodeId);
      if (node?.type === "system" || node?.type === "customObject") {
        ids.add(nodeId);
      }
    }
    return ids;
  }, [activeLineageNodeIds, nodes]);

  const lineageContextValue = useMemo<LineageContextValue>(
    () => ({
      hasLineage,
      lineageDirection: lineageTrace?.direction ?? null,
      lineageNodeIds: activeLineageNodeIds,
      highlightedFieldsByNode: lineage.fieldIdsByNode,
      impactNodeIds,
      anchorNodeId: lineageTrace?.anchor.nodeId ?? null,
      highlightedNodeIds: lineageHighlightedNodeIds,
    }),
    [
      hasLineage,
      lineageTrace,
      activeLineageNodeIds,
      lineage.fieldIdsByNode,
      impactNodeIds,
      lineageHighlightedNodeIds,
    ],
  );

  const displayedEdges = useMemo(
    () =>
      decorateEdgesForDisplay(reroutedEdges, {
        lineageEdgeIds: lineage.edgeIds,
        hasLineage,
        selectedEdgeId,
        hiddenNodeIds: collapsedSystemIds,
        defaultStrokeColor: "#3b82f6",
      }),
    [reroutedEdges, collapsedSystemIds, lineage, hasLineage, selectedEdgeId],
  );

  const applyFieldSelection = useCallback(
    (nodeId: string, fieldId: string, openSidebar: boolean) => {
      const node = nodes.find((item) => item?.id === nodeId);
      if (!node || (node.type !== "system" && node.type !== "customObject")) return;

      const nodeData = node.data as SystemNodeData | CustomObjectNodeData;
      const fields = Array.isArray(nodeData.fields) ? nodeData.fields : [];
      const field = fields.find((item) => item?.id === fieldId);
      if (!field) return;

      clearEdgeSelection();
      setSelectedNodeId(nodeId);
      setSelectedFieldId(fieldId);
      setSelectedNodeLabel(typeof nodeData.label === "string" ? nodeData.label : null);
      setSelectedFieldLabel(typeof field.label === "string" ? field.label : null);
      setSelectedNodeMetadata(null);
      setSelectedFieldMetadata(
        field.metadata && typeof field.metadata === "object" ? { ...field.metadata } : {},
      );

      closeSchemaEditor();
      if (openSidebar) {
        setSidebarOpen(true);
      }
    },
    [nodes, clearEdgeSelection, closeSchemaEditor],
  );

  const handleFieldSelect = useCallback(
    (nodeId: string, fieldId: string) => {
      applyFieldSelection(nodeId, fieldId, false);
    },
    [applyFieldSelection],
  );

  const handleFieldEdit = useCallback(
    (nodeId: string, fieldId: string) => {
      applyFieldSelection(nodeId, fieldId, true);
    },
    [applyFieldSelection],
  );

  const handleDeleteField = useCallback(
    (nodeId: string, fieldId: string) => {
      pushUndo();
      setEdges((eds) =>
        eds.filter(
          (e) =>
            !(
              (e.source === nodeId &&
                (e.data?.sourceFieldId === fieldId ||
                  e.sourceHandle === `source-${fieldId}` ||
                  e.sourceHandle === fieldSourceHandle(nodeId, fieldId) ||
                  parseFieldSourceId(e.sourceHandle ?? "") === fieldId)) ||
              (e.target === nodeId &&
                (e.data?.targetFieldId === fieldId ||
                  e.targetHandle === `target-${fieldId}` ||
                  e.targetHandle === fieldTargetHandle(nodeId, fieldId) ||
                  parseFieldTargetId(e.targetHandle ?? "") === fieldId))
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
        setSidebarOpen(false);
      }
      if (
        lineageTrace?.anchor.fieldId === fieldId &&
        lineageTrace.anchor.nodeId === nodeId
      ) {
        setLineageTrace(null);
      }
      toast.success("Field deleted");
    },
    [setEdges, setNodes, selectedFieldId, lineageTrace, pushUndo],
  );

  const handleRenameField = useCallback(
    (nodeId: string, fieldId: string, label: string) => {
      const next = label.trim();
      if (!next) return;
      pushUndo();
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
    [setNodes, selectedFieldId, pushUndo],
  );

  const handleRenameNode = useCallback(
    (nodeId: string, label: string) => {
      const next = label.trim();
      if (!next) return;
      pushUndo();
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
    [setNodes, selectedNodeId, pushUndo],
  );

  const cleanupAfterNodeDelete = useCallback(
    (ids: string[]) => {
      const idSet = new Set(ids);
      setEdges((eds) => eds.filter((e) => !idSet.has(e.source) && !idSet.has(e.target)));
      if (selectedNodeId && idSet.has(selectedNodeId)) {
        clearMetadataSelection();
      }
      if (lineageTrace && idSet.has(lineageTrace.anchor.nodeId)) {
        setLineageTrace(null);
      }
      if (activeTouchpointId && idSet.has(activeTouchpointId)) {
        setActiveTouchpointId(null);
      }
    },
    [setEdges, selectedNodeId, lineageTrace, activeTouchpointId, clearMetadataSelection],
  );

  const handleUpdateNodeData = useCallback(
    (nodeId: string, updater: (data: SystemNodeData) => SystemNodeData) => {
      pushUndo();
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== nodeId) return n;
          const clean = stripDisplayData(n.data as SystemNodeData);
          return { ...n, data: updater(clean) };
        }),
      );
    },
    [pushUndo, setNodes],
  );

  const handleUpdateFieldTableCell = useCallback(
    (nodeId: string, fieldId: string, columnId: string, value: string) => {
      pushUndo();
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== nodeId || (n.type !== "system" && n.type !== "customObject")) return n;
          const clean = stripDisplayData(n.data as SystemNodeData & { objectId?: string });
          const isCustomObject = n.type === "customObject";
          const fields = Array.isArray(clean.fields) ? clean.fields : [];
          const attributeDefinitions = getFieldAttributeDefinitions(
            schema,
            isCustomObject
              ? {
                  objectId: clean.objectId,
                  fieldAttributeKeys: clean.fieldAttributeKeys,
                  blockMetadata: clean.metadata,
                }
              : {
                  nodeGroupId: clean.nodeGroupId,
                  fieldAttributeKeys: clean.fieldAttributeKeys,
                  blockMetadata: clean.metadata,
                },
            fields,
            isCustomObject ? "artifact" : "block",
          );

          return {
            ...n,
            data: {
              ...clean,
              fields: fields.map((field) => {
                if (field.id !== fieldId) return field;
                const metadata = { ...(field.metadata ?? {}) };
                if (value) metadata[columnId] = value;
                else delete metadata[columnId];
                return {
                  ...field,
                  metadata: buildFieldMetadataUpdate(metadata, attributeDefinitions),
                };
              }),
            },
          };
        }),
      );
    },
    [pushUndo, schema, setNodes],
  );

  const handleApplyFieldTablePaste = useCallback(
    (nodeId: string, sectionId: string, groupId: string | undefined, plan: TablePastePlan) => {
      pushUndo();
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== nodeId || (n.type !== "system" && n.type !== "customObject")) return n;
          const clean = stripDisplayData(n.data as SystemNodeData & { objectId?: string });
          const isCustomObject = n.type === "customObject";
          let fields = Array.isArray(clean.fields) ? [...clean.fields] : [];
          const attributeDefinitions = getFieldAttributeDefinitions(
            schema,
            isCustomObject
              ? {
                  objectId: clean.objectId,
                  fieldAttributeKeys: clean.fieldAttributeKeys,
                  blockMetadata: clean.metadata,
                }
              : {
                  nodeGroupId: clean.nodeGroupId,
                  fieldAttributeKeys: clean.fieldAttributeKeys,
                  blockMetadata: clean.metadata,
                },
            fields,
            isCustomObject ? "artifact" : "block",
          );

          fields = fields.map((field) => {
            const update = plan.updates.find((item) => item.fieldId === field.id);
            if (!update) return field;
            const metadata = { ...(field.metadata ?? {}), ...update.metadata };
            return {
              ...field,
              label: update.label ?? field.label,
              metadata: buildFieldMetadataUpdate(metadata, attributeDefinitions),
            };
          });

          const created = plan.newFields.map((item, index) => ({
            id: `f_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 6)}`,
            label: item.label,
            sectionId,
            groupId,
            metadata: buildFieldMetadataUpdate(item.metadata, attributeDefinitions),
          }));

          if (created.length > 0) {
            fields = insertFieldsAtPlacement(fields, sectionId, groupId, created);
          }

          return {
            ...n,
            data: ensureExplicitSections({
              ...clean,
              fields,
            }),
          };
        }),
      );

      const added = plan.newFields.length;
      const updated = plan.updates.length;
      if (added > 0 && updated > 0) {
        toast.success(`Pasted ${added} new field${added === 1 ? "" : "s"} and updated ${updated}`);
      } else if (added > 0) {
        toast.success(`Added ${added} field${added === 1 ? "" : "s"} from paste`);
      } else if (updated > 0) {
        toast.success(`Updated ${updated} field${updated === 1 ? "" : "s"}`);
      }
    },
    [pushUndo, schema, setNodes],
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
      pushUndo();
      setNodes((nds) => applySafeNodeRemovals(nds, [nodeId]));
      cleanupAfterNodeDelete([nodeId]);
      toast.success("Block deleted");
    },
    [setNodes, cleanupAfterNodeDelete, pushUndo],
  );

  const onNodesDelete: OnNodesDelete = useCallback(
    (deleted) => {
      const requestedIds = deleted.map((node) => node.id);
      const ids =
        lastSafeRemovalIdsRef.current.length > 0
          ? lastSafeRemovalIdsRef.current
          : requestedIds;
      lastSafeRemovalIdsRef.current = [];

      setNodes((current) => applySafeNodeRemovals(current, ids));
      cleanupAfterNodeDelete(ids);
      if (ids.length > 1) {
        toast.success(`Deleted ${ids.length} items`);
      }
    },
    [cleanupAfterNodeDelete, setNodes],
  );

  const onEdgesDelete: OnEdgesDelete = useCallback(
    (deleted) => {
      if (deleted.length > 0) {
        pushUndo();
      }
      if (selectedEdgeId && deleted.some((edge) => edge.id === selectedEdgeId)) {
        clearEdgeSelection();
      }
      if (deleted.length > 1) {
        toast.success(`Deleted ${deleted.length} connections`);
      }
    },
    [selectedEdgeId, clearEdgeSelection, pushUndo],
  );

  const onNodeClick = useCallback(
    (_e: React.MouseEvent, node: Node) => {
      if (node.type === "touchpoint") {
        setActiveTouchpointId((curr) => (curr === node.id ? null : node.id));
        setLineageTrace(null);
      }

      if (
        node.type === "textNode" ||
        node.type === "shapeNode" ||
        node.type === "stickyNote" ||
        node.type === "container"
      ) {
        clearMetadataSelection();
        clearEdgeSelection();
        closeSchemaEditor();
        return;
      }

      if (node.type === "system" || node.type === "customObject") {
        // Single click: keep canvas selection for lineage toolbar, but close the properties pane.
        setSelectedFieldId(null);
        setSelectedFieldLabel(null);
        setSelectedFieldMetadata(null);
        setSelectedNodeId(node.id);
        setSelectedNodeLabel(
          typeof (node.data as { label?: string } | undefined)?.label === "string"
            ? (node.data as { label: string }).label
            : null,
        );
        setSelectedNodeMetadata(null);
        setSidebarOpen(false);
        clearEdgeSelection();
        closeSchemaEditor();
        return;
      }

      // Single click: React Flow handles selection for drag/copy; do not open the properties pane.
      clearMetadataSelection();
      clearEdgeSelection();
      closeSchemaEditor();
    },
    [clearEdgeSelection, clearMetadataSelection, closeSchemaEditor],
  );

  const onNodeDoubleClick = useCallback(
    (_e: React.MouseEvent, node: Node) => {
      const nodeData = (node.data ?? {}) as SystemNodeData & { label?: string; metadata?: MetadataValues };

      if (node.type !== "system" && node.type !== "customObject") {
        return;
      }

      clearEdgeSelection();

      if (node.type === "customObject") {
        const customData = nodeData as CustomObjectNodeData;
        setSelectedNodeId(node.id);
        setSelectedFieldId(null);
        setSelectedNodeLabel(customData.label ?? null);
        setSelectedFieldLabel(null);
        setSelectedNodeMetadata(
          customData.attributes && typeof customData.attributes === "object"
            ? { ...customData.attributes }
            : customData.metadata && typeof customData.metadata === "object"
              ? { ...customData.metadata }
              : {},
        );
        setSelectedFieldMetadata(null);
        closeSchemaEditor();
        setSidebarOpen(true);
        return;
      }

      setSelectedNodeId(node.id);
      setSelectedFieldId(null);
      setSelectedNodeLabel(nodeData.label ?? null);
      setSelectedFieldLabel(null);
      setSelectedNodeMetadata(
        nodeData.metadata && typeof nodeData.metadata === "object" ? { ...nodeData.metadata } : {},
      );
      setSelectedFieldMetadata(null);
      closeSchemaEditor();
      setSidebarOpen(true);
    },
    [clearEdgeSelection, closeSchemaEditor],
  );

  const sidebarSelectionContext = sidebarSelection?.selectionContext ?? "node";

  const handleDeleteGroup = useCallback(
    (groupId: string) => {
      const group = schema.nodeGroups.find((item) => item.id === groupId);
      if (!confirm(`Delete "${group?.name ?? "this block"}" and remove all instances from the canvas?`)) {
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

      if (schemaEditorGroupId === groupId) {
        setSchemaEditorGroupId(null);
      }

      toast.success("Block deleted");
    },
    [schema.nodeGroups, nodes, cleanupAfterNodeDelete, schemaEditorGroupId],
  );

  const handleUpdateBlockMetadata = useCallback(
    (nodeId: string, metadata: MetadataValues, propertyKeys?: string[]) => {
      pushUndo();
      const sanitizedInput = sanitizeFreeformMetadata(metadata);
      let selectedMetadata = sanitizedInput;

      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== nodeId) return n;
          const clean = stripDisplayData(n.data as Record<string, unknown>) as SystemNodeData & {
            objectId?: string;
          };
          const isCustomObject = n.type === "customObject";
          if (isCustomObject) {
            const attributes = sanitizeFreeformMetadata(sanitizedInput);
            selectedMetadata = attributes;
            return {
              ...n,
              data: {
                ...clean,
                attributes,
              },
            };
          }

          const source = {
            nodeGroupId: clean.nodeGroupId,
            fieldAttributeKeys: clean.fieldAttributeKeys,
            blockMetadata: sanitizedInput,
          };
          const schemaBlockProps = getGroupBlockProperties(schema, clean.nodeGroupId);

          const attributeDefinitions = getBlockAttributeDefinitions(schema, source, "block");

          selectedMetadata = buildFieldMetadataUpdate(sanitizedInput, attributeDefinitions);

          return {
            ...n,
            data: {
              ...clean,
              metadata: selectedMetadata,
            },
          };
        }),
      );
      setSelectedNodeMetadata(selectedMetadata);
    },
    [pushUndo, setNodes, schema],
  );

  const handleUpdateBlockFieldAttributeKeys = useCallback(
    (nodeId: string, propertyKeys: string[]) => {
      pushUndo();
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== nodeId) return n;
          const clean = stripDisplayData(n.data as Record<string, unknown>) as SystemNodeData & {
            objectId?: string;
          };
          const isCustomObject = n.type === "customObject";
          const fields = Array.isArray(clean.fields) ? clean.fields : [];
          const source = isCustomObject
            ? {
                objectId: clean.objectId,
                fieldAttributeKeys: propertyKeys,
                blockMetadata: clean.metadata,
              }
            : {
                nodeGroupId: clean.nodeGroupId,
                fieldAttributeKeys: propertyKeys,
                blockMetadata: clean.metadata,
              };
          const schemaFieldProps = isCustomObject
            ? getCustomObjectFieldProperties(schema, clean.objectId)
            : getFieldProperties(schema, clean.nodeGroupId);

          const attributeDefinitions = getFieldAttributeDefinitions(
            schema,
            source,
            fields,
            isCustomObject ? "artifact" : "block",
          );

          const nextData: SystemNodeData & { objectId?: string } = {
            ...clean,
            fields: fields.map((field) => ({
              ...field,
              metadata: buildFieldMetadataUpdate(field.metadata, attributeDefinitions),
            })),
          };

          if (schemaFieldProps.length === 0 && propertyKeys.length > 0) {
            nextData.fieldAttributeKeys = propertyKeys;
          }

          return {
            ...n,
            data: nextData,
          };
        }),
      );
    },
    [pushUndo, setNodes, schema],
  );

  const handleUpdateFieldMetadata = useCallback(
    (nodeId: string, fieldId: string, metadata: MetadataValues, propertyKeys?: string[]) => {
      pushUndo();
      const sanitizedInput = sanitizeFreeformMetadata(metadata);
      let selectedMetadata = sanitizedInput;

      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== nodeId) return n;
          const clean = stripDisplayData(n.data as Record<string, unknown>) as SystemNodeData & {
            objectId?: string;
          };
          const isCustomObject = n.type === "customObject";
          const fields = Array.isArray(clean.fields) ? clean.fields : [];
          const source = isCustomObject
            ? {
                objectId: clean.objectId,
                fieldAttributeKeys: clean.fieldAttributeKeys,
                blockMetadata: clean.metadata,
              }
            : {
                nodeGroupId: clean.nodeGroupId,
                fieldAttributeKeys: clean.fieldAttributeKeys,
                blockMetadata: clean.metadata,
              };
          const schemaFieldProps = isCustomObject
            ? getCustomObjectFieldProperties(schema, clean.objectId)
            : getFieldProperties(schema, clean.nodeGroupId);

          const attributeDefinitions = getFieldAttributeDefinitions(
            schema,
            source,
            fields,
            isCustomObject ? "artifact" : "block",
          );

          const nextFieldAttributeKeys =
            propertyKeys?.length
              ? propertyKeys
              : attributeDefinitions.map((property) => property.id);

          selectedMetadata = buildFieldMetadataUpdate(sanitizedInput, attributeDefinitions);

          const nextData: SystemNodeData & { objectId?: string } = {
            ...clean,
            fields: fields.map((field) => ({
              ...field,
              metadata:
                field.id === fieldId
                  ? selectedMetadata
                  : buildFieldMetadataUpdate(field.metadata, attributeDefinitions),
            })),
          };

          if (schemaFieldProps.length === 0 && nextFieldAttributeKeys.length > 0) {
            nextData.fieldAttributeKeys = nextFieldAttributeKeys;
          }

          return {
            ...n,
            data: nextData,
          };
        }),
      );
      setSelectedFieldMetadata(selectedMetadata);
    },
    [pushUndo, setNodes, schema],
  );

  const nodeCanvasValue = useMemo<NodeCanvasContextValue>(
    () => ({
      schema,
      edges,
      selectedEdgeId,
      selectedNodeId,
      selectedFieldId,
      lineageEdgeIds: lineage.edgeIds,
      hasLineage,
      onSelectEdge: openEdgeSettings,
      onUpdateNodeData: handleUpdateNodeData,
      onUpdateStickyNoteData: handleUpdateStickyNoteData,
      onDeleteNode: handleDeleteNode,
      onFieldSelect: handleFieldSelect,
      onFieldEdit: handleFieldEdit,
      onDeleteField: handleDeleteField,
      onFieldConnectDrop: handleFieldConnectDrop,
      onFieldToNodeConnectDrop: handleFieldToNodeConnectDrop,
      onUpdateDrawingNodeData: handleUpdateDrawingNodeData,
      onRenameField: handleRenameField,
      onUpdateFieldTableCell: handleUpdateFieldTableCell,
      onApplyFieldTablePaste: handleApplyFieldTablePaste,
    }),
    [
      schema,
      edges,
      selectedEdgeId,
      selectedNodeId,
      selectedFieldId,
      lineage.edgeIds,
      hasLineage,
      openEdgeSettings,
      handleUpdateNodeData,
      handleUpdateStickyNoteData,
      handleDeleteNode,
      handleFieldSelect,
      handleFieldEdit,
      handleDeleteField,
      handleFieldConnectDrop,
      handleFieldToNodeConnectDrop,
      handleUpdateDrawingNodeData,
      handleRenameField,
      handleUpdateFieldTableCell,
      handleApplyFieldTablePaste,
    ],
  );

  const handleClearLineage = useCallback(() => {
    setLineageTrace(null);
  }, []);

  const buildLineageAnchorFromSelection = useCallback(() => {
    if (!sidebarSelection) return null;
    if (sidebarSelection.fieldId) {
      return { nodeId: sidebarSelection.nodeId, fieldId: sidebarSelection.fieldId };
    }
    if (
      sidebarSelection.nodeType === "system" ||
      sidebarSelection.nodeType === "customObject"
    ) {
      return { nodeId: sidebarSelection.nodeId, fieldId: null };
    }
    return null;
  }, [sidebarSelection]);

  const lineageToolbarSelection = useMemo(() => {
    if (sidebarSelection) {
      if (sidebarSelection.fieldId) {
        return {
          label: `${sidebarSelection.nodeLabel ?? "Block"} · ${sidebarSelection.fieldLabel ?? "Field"}`,
          kind: "field" as const,
        };
      }
      if (sidebarSelection.nodeType === "customObject") {
        return {
          label: sidebarSelection.nodeLabel ?? "Object",
          kind: "object" as const,
        };
      }
      if (sidebarSelection.nodeType === "system") {
        return {
          label: sidebarSelection.nodeLabel ?? "Block",
          kind: "block" as const,
        };
      }
    }

    if (!lineageTrace) return null;

    const anchorNode = nodes.find((item) => item.id === lineageTrace.anchor.nodeId);
    const nodeLabel = (anchorNode?.data as { label?: string } | undefined)?.label ?? "Block";
    if (lineageTrace.anchor.fieldId) {
      const fields = (anchorNode?.data as SystemNodeData | undefined)?.fields ?? [];
      const field = fields.find((item) => item.id === lineageTrace.anchor.fieldId);
      return {
        label: `${nodeLabel} · ${field?.label ?? "Field"}`,
        kind: "field" as const,
      };
    }
    if (anchorNode?.type === "customObject") {
      return { label: nodeLabel, kind: "object" as const };
    }
    return { label: nodeLabel, kind: "block" as const };
  }, [sidebarSelection, lineageTrace, nodes]);

  const handleTraceUpstream = useCallback(() => {
    const anchor = buildLineageAnchorFromSelection();
    if (!anchor) return;
    clearEdgeSelection();
    setLineageTrace({ anchor, direction: "upstream" });
  }, [buildLineageAnchorFromSelection, clearEdgeSelection]);

  const handleTraceDownstream = useCallback(() => {
    const anchor = buildLineageAnchorFromSelection();
    if (!anchor) return;
    clearEdgeSelection();
    setLineageTrace({ anchor, direction: "downstream" });
  }, [buildLineageAnchorFromSelection, clearEdgeSelection]);

  const handleTraceFull = useCallback(() => {
    const anchor = buildLineageAnchorFromSelection();
    if (!anchor) return;
    clearEdgeSelection();
    setLineageTrace({ anchor, direction: "full" });
  }, [buildLineageAnchorFromSelection, clearEdgeSelection]);

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
    clearMetadataSelection();
    clearEdgeSelection();
  }, [clearEdgeSelection, clearMetadataSelection]);

  const activeTouchpointLabel = activeTouchpointId
    ? (nodes.find((n) => n.id === activeTouchpointId)?.data as { label?: string } | undefined)?.label
    : null;

  const handleOpenSchemaEditor = useCallback(
    (groupId: string) => {
      clearMetadataSelection();
      setSidebarOpen(false);
      setSchemaEditorCustomObjectId(null);
      setSchemaEditorGroupId(groupId);
    },
    [clearMetadataSelection],
  );

  const buildVersionSnapshot = useCallback((): ProjectVersionSnapshot => {
    const flowObject = rfInstance?.toObject();
    const drawingData = drawingSnapshotRef.current
      ? [drawingSnapshotRef.current]
      : drawings.length
        ? drawings
        : undefined;

    return {
      nodes: (flowObject?.nodes as Node[] | undefined) ?? nodes,
      edges: (flowObject?.edges as Edge[] | undefined) ?? edges,
      viewport: flowObject?.viewport ?? rfInstance?.getViewport(),
      schema,
      drawings: drawingData,
    };
  }, [nodes, edges, schema, drawings, rfInstance]);

  const defaultVersionName = useMemo(
    () => `Version ${new Date().toLocaleString()}`,
    [saveVersionDialogOpen],
  );

  const handleSaveVersionConfirm = useCallback(
    async (versionName: string) => {
      if (!project || !activeSheet) {
        toast.error("No active project sheet to save.");
        return;
      }

      setIsSavingVersion(true);
      try {
        await saveProjectVersion(
          project.id,
          activeSheet.id,
          versionName,
          buildVersionSnapshot(),
          { projectName: project.name, createdBy: getCollaboratorDisplayName() },
        );
        toast.success(`Saved version "${versionName}"`);
        setSaveVersionDialogOpen(false);
      } catch (error) {
        toast.error(formatSupabaseError(error));
      } finally {
        setIsSavingVersion(false);
      }
    },
    [project, activeSheet, buildVersionSnapshot],
  );

  const handlePreviewVersion = useCallback((version: ProjectVersion) => {
    setVersionPreview(version);
    setVersionHistoryOpen(false);
    toast.message(`Previewing "${version.versionName}" (read-only)`);
  }, []);

  const handleRestoreVersion = useCallback(
    (version: ProjectVersion) => {
      if (
        !window.confirm(
          `Restore "${version.versionName}"? This replaces the current sheet contents.`,
        )
      ) {
        return;
      }

      pushUndo();
      setNodes(
        version.snapshot.nodes.map((node) => ({
          ...node,
          data: stripDisplayData((node.data ?? {}) as Record<string, unknown>),
        })),
      );
      setEdges(version.snapshot.edges);
      if (version.snapshot.schema) {
        setSchema(normalizeSchema(version.snapshot.schema));
      }
      if (version.snapshot.viewport && rfInstance) {
        rfInstance.setViewport(version.snapshot.viewport, { duration: 0 });
      }
      setVersionPreview(null);
      setVersionHistoryOpen(false);
      toast.success(`Restored "${version.versionName}"`);
    },
    [pushUndo, setNodes, setEdges, rfInstance],
  );

  const handleExitVersionPreview = useCallback(() => {
    setVersionPreview(null);
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
        toast.error("Add blocks to the canvas before exporting");
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
    pushUndo();
    setNodes([]);
    setEdges([]);
    setActiveTouchpointId(null);
    setLineageTrace(null);
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
  }, [pushUndo, setNodes, setEdges]);

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
      if (isEditableKeyboardTarget(event.target) || isFieldTablePasteTarget(event.target)) return;
      if (!event.metaKey && !event.ctrlKey) return;

      const key = event.key.toLowerCase();

      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        handleUndo();
        return;
      }

      if (key === "y" || (key === "z" && event.shiftKey)) {
        event.preventDefault();
        handleRedo();
        return;
      }

      if (key === "c") {
        const selected = getSelectedCopyableNodes(nodes);
        if (selected.length === 0) return;
        event.preventDefault();
        const cloned = cloneNodesForClipboard(nodes);
        pasteGenerationRef.current = 0;
        void navigator.clipboard.writeText(serializeNodesToClipboard(cloned)).catch(() => {
          toast.error("Could not copy to clipboard");
        });
        toast.success(`Copied ${selected.length} item${selected.length === 1 ? "" : "s"}`);
        return;
      }

      if (key === "v") {
        event.preventDefault();
        void (async () => {
          let clipboardText = "";
          try {
            clipboardText = await navigator.clipboard.readText();
          } catch {
            toast.error("Could not read clipboard");
            return;
          }

          const clipboardNodes = parseClipboardNodes(clipboardText);
          if (clipboardNodes && clipboardNodes.length > 0) {
            pushUndo();
            pasteGenerationRef.current += 1;
            const duplicates = duplicateNodesFromClipboard(
              clipboardNodes,
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
            return;
          }

          const plainText = clipboardText.trim();
          if (!plainText) return;

          pushUndo();
          pasteGenerationRef.current += 1;
          const pastePosition = (() => {
            if (rfInstance && wrapperRef.current) {
              const rect = wrapperRef.current.getBoundingClientRect();
              const center = rfInstance.screenToFlowPosition({
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
              });
              const offset = 30 * pasteGenerationRef.current;
              return { x: center.x + offset, y: center.y + offset };
            }
            const offset = 30 * pasteGenerationRef.current;
            return { x: 120 + offset, y: 120 + offset };
          })();

          const textNode = createTextNodeWithContent(plainText, pastePosition, nextNodeId);
          setNodes((current) =>
            sortNodesParentFirst([
              ...current.map((node) => ({ ...node, selected: false })),
              { ...textNode, selected: true },
            ]),
          );
          clearEdgeSelection();
          setSidebarOpen(false);
          toast.success("Pasted text as textbox");
        })();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [nodes, drawingMode, activeView, setNodes, clearEdgeSelection, handleUndo, handleRedo, pushUndo, rfInstance]);

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
          <div className="mapify-brand flex shrink-0 items-center">
            <span
              className="mapify-brand-wordmark font-black text-2xl tracking-tight bg-gradient-to-r from-blue-600 to-cyan-400 bg-clip-text text-transparent select-none"
              aria-label="Mapify"
            >
              mapify
            </span>
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
            <Button
              variant={activeView === "guide" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={() => setActiveView("guide")}
            >
              <CircleHelp className="mr-1.5 h-3.5 w-3.5" />
              How it works
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {activeView === "canvas" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSaveVersionDialogOpen(true)}
                disabled={isSavingVersion || isVersionPreview}
                title="Save a named version to cloud history"
              >
                <span aria-hidden>💾</span>
                <span className="ml-1.5">Save Version</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setVersionHistoryOpen(true)}
                title="Version history"
              >
                <span aria-hidden>🕒</span>
                <span className="ml-1.5">History</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShareDialogOpen(true)}
                title="Invite collaborators"
              >
                <Share2 className="mr-1.5 h-4 w-4" />
                Share
              </Button>
              <Button variant="outline" size="sm" onClick={handleUndo} title="Undo (Ctrl+Z)">
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleRedo} title="Redo (Ctrl+Y)">
                <Redo2 className="h-4 w-4" />
              </Button>
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
            onGenerateEmbed={() => setEmbedSnippetOpen(true)}
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
          onOpenSchemaBuilder={handleOpenSchemaEditor}
          onOpenCustomObjectCreator={openCustomObjectCreator}
          onDeleteGroup={handleDeleteGroup}
        />
        {activeView === "glossary" ? (
          <GlossaryView nodes={nodes} schema={schema} />
        ) : activeView === "guide" ? (
          <GuideView />
        ) : (
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {lineageToolbarSelection && (
            <LineageToolbar
              selectionLabel={lineageToolbarSelection.label}
              selectionKind={lineageToolbarSelection.kind}
              traceActive={Boolean(lineageTrace)}
              traceDirection={lineageTrace?.direction ?? null}
              blockCount={lineage.nodeIds.size}
              edgeCount={lineage.edgeIds.size}
              onTraceUpstream={handleTraceUpstream}
              onTraceDownstream={handleTraceDownstream}
              onTraceFull={handleTraceFull}
              onClearLineage={handleClearLineage}
            />
          )}
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
              {isVersionPreview && versionPreview && (
                <Panel position="top-center">
                  <div className="version-preview-banner version-preview-banner--floating">
                    <span>
                      Read-only preview: <strong>{versionPreview.versionName}</strong>
                    </span>
                    <Button type="button" size="sm" variant="outline" onClick={handleExitVersionPreview}>
                      Exit preview
                    </Button>
                    <Button type="button" size="sm" onClick={() => handleRestoreVersion(versionPreview)}>
                      Restore
                    </Button>
                  </div>
                </Panel>
              )}
              <ReactFlow
                nodes={canvasNodes}
                edges={displayedEdges}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChangeWrapped}
                onConnect={onConnect}
                onConnectStart={onConnectStart}
                onConnectEnd={onConnectEnd}
                onEdgeUpdate={onEdgeUpdate}
                onEdgeUpdateStart={onEdgeUpdateStart}
                onEdgeUpdateEnd={onEdgeUpdateEnd}
                edgeUpdaterRadius={20}
                edgesUpdatable={!canvasReadOnly}
                isValidConnection={isValidConnection}
                onNodesDelete={onNodesDelete}
                onEdgesDelete={onEdgesDelete}
                onInit={setRfInstance}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onNodeClick={onNodeClick}
                onNodeDoubleClick={onNodeDoubleClick}
                onNodeContextMenu={onNodeContextMenu}
                onNodeDragStop={onNodeDragStop}
                onEdgeClick={onEdgeClick}
                onEdgeDoubleClick={onEdgeDoubleClick}
                onPaneClick={onPaneClick}
                connectionMode={ConnectionMode.Loose}
                connectionRadius={36}
                defaultEdgeOptions={{
                  type: "custom",
                  data: { pathType: "step" },
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
                nodesDraggable={!canvasReadOnly}
                nodesConnectable={!canvasReadOnly}
                elementsSelectable={!drawingMode}
                edgesFocusable={!canvasReadOnly}
                nodesFocusable={!canvasReadOnly}
                multiSelectionKeyCode={["Meta", "Control"]}
                minZoom={0.05}
                maxZoom={4}
                fitView
                proOptions={{ hideAttribution: true }}
                style={{ background: "var(--canvas-bg, #f8fafc)" }}
              >
            <Background gap={18} size={1.5} color="var(--canvas-dot, #cbd5e1)" />
            <Controls />
            <MiniMap pannable zoomable />
            {canvasNodes.length === 0 && (
              <Panel position="top-center">
                <div className="rounded-md border border-dashed border-border bg-card/80 px-4 py-2 text-sm text-muted-foreground backdrop-blur">
                  Drag blocks or touchpoints from the sidebar onto the canvas
                </div>
              </Panel>
            )}
              </ReactFlow>
            </LineageProvider>
          </NodeCanvasProvider>
        </div>
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
        blockName={pendingNodeDrop?.item.name}
        onOpenChange={(open) => {
          if (!open) cancelNodeDrop();
        }}
        onConfirm={createNodeFromDrop}
        onCancel={cancelNodeDrop}
      />

      <CloudSnapshotsDialog
        open={cloudSnapshotsOpen}
        onOpenChange={setCloudSnapshotsOpen}
        onSelect={handleCloudSnapshotSelect}
      />

      <CustomObjectDialog
        open={customObjectDialogOpen}
        onOpenChange={(open) => {
          setCustomObjectDialogOpen(open);
          if (!open) setPendingCustomObjectPosition(null);
        }}
        onConfirm={handleCustomObjectConfirm}
      />

      <SaveVersionDialog
        open={saveVersionDialogOpen}
        defaultName={defaultVersionName}
        isSaving={isSavingVersion}
        onOpenChange={setSaveVersionDialogOpen}
        onConfirm={(versionName) => void handleSaveVersionConfirm(versionName)}
      />

      <ShareProjectDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        projectId={project?.id ?? null}
        projectName={project?.name ?? "Untitled Project"}
        getPayload={buildExportPayload}
      />

      <VersionHistoryDrawer
        open={versionHistoryOpen}
        onOpenChange={setVersionHistoryOpen}
        projectId={project?.id ?? null}
        projectName={project?.name ?? "Untitled Project"}
        sheetId={activeSheet?.id ?? null}
        previewVersionId={versionPreview?.id ?? null}
        onPreviewVersion={handlePreviewVersion}
        onRestoreVersion={handleRestoreVersion}
        onExitPreview={handleExitVersionPreview}
      />

      <EmbedSnippetDialog
        open={embedSnippetOpen}
        onOpenChange={setEmbedSnippetOpen}
        getPayload={buildExportPayload}
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

      {schemaEditorOpen ? (
        <SchemaEditorSidebar
          isOpen
          groupId={schemaEditorGroupId}
          customObjectId={null}
          schema={schema}
          onUpdateSchema={setSchema}
          onClose={closeSchemaEditor}
        />
      ) : (
        <MetadataSidebar
          isOpen={sidebarOpen && Boolean(sidebarSelection)}
          nodeType={sidebarSelection?.nodeType}
          onClose={() => setSidebarOpen(false)}
          nodeId={sidebarSelection?.nodeId ?? null}
          nodeLabel={sidebarSelection?.nodeLabel ?? null}
          fieldId={sidebarSelection?.fieldId ?? null}
          fieldLabel={sidebarSelection?.fieldLabel ?? null}
          metadata={sidebarSelection?.metadata ?? {}}
          blockProperties={sidebarSelection?.blockProperties ?? []}
          fieldProperties={sidebarSelection?.fieldProperties ?? []}
          selectionContext={sidebarSelectionContext}
          lockBlockPropertyKeys={sidebarSelection?.lockBlockPropertyKeys ?? false}
          lockFieldPropertyKeys={sidebarSelection?.lockFieldPropertyKeys ?? false}
          allowAddBlockAttributes={sidebarSelection?.allowAddBlockAttributes ?? false}
          allowAddFieldAttributes={sidebarSelection?.allowAddFieldAttributes ?? false}
          onUpdateBlockMetadata={handleUpdateBlockMetadata}
          onUpdateFieldAttributeKeys={handleUpdateBlockFieldAttributeKeys}
          onUpdateFieldMetadata={handleUpdateFieldMetadata}
          onRenameNode={handleRenameNode}
          onRenameField={handleRenameField}
          onDeleteField={handleDeleteField}
          onDeleteNode={
            sidebarSelection && !sidebarSelection.fieldId
              ? () => handleDeleteNode(sidebarSelection.nodeId)
              : undefined
          }
        />
      )}
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
