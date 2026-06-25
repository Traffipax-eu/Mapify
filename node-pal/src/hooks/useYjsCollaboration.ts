import { useCallback, useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import type { Edge, Node, NodeChange, EdgeChange } from "reactflow";
import {
  applyEdgeChangesToYMap,
  applyNodeChangesToYMap,
  readEdgesFromYMap,
  readNodesFromYMap,
  seedYjsFromReactState,
  upsertEdgeInYMap,
  upsertNodeInYMap,
  YJS_EDGES_KEY,
  YJS_NODES_KEY,
} from "@/lib/collaboration/yjsBindings";
import { getCollaboratorDisplayName, getYjsWebSocketUrl } from "@/lib/collaboration/config";
import {
  parseAwarenessStates,
  pickCollaboratorColor,
  type CollaboratorPresence,
  type CollaboratorCursor,
} from "@/lib/collaboration/presence";

type UseYjsCollaborationOptions = {
  roomId: string | null;
  /** True only when VITE_YJS_WS_URL is set — Supabase alone must not enable CRDT sync. */
  enabled: boolean;
  /** Wait until the sheet has been loaded from local storage before seeding Yjs. */
  canvasReady: boolean;
  nodes: Node[];
  edges: Edge[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
};

export type YjsCollaborationState = {
  connected: boolean;
  peers: CollaboratorPresence[];
  updateCursor: (cursor: CollaboratorCursor | null) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  pushNode: (node: Node) => void;
  pushEdge: (edge: Edge) => void;
  removeEdges: (edgeIds: string[]) => void;
  isRemoteUpdate: () => boolean;
};

const noopCollaboration: YjsCollaborationState = {
  connected: false,
  peers: [],
  updateCursor: () => undefined,
  onNodesChange: () => undefined,
  onEdgesChange: () => undefined,
  pushNode: () => undefined,
  pushEdge: () => undefined,
  removeEdges: () => undefined,
  isRemoteUpdate: () => false,
};

export function useYjsCollaboration({
  roomId,
  enabled,
  canvasReady,
  nodes,
  edges,
  setNodes,
  setEdges,
}: UseYjsCollaborationOptions): YjsCollaborationState {
  const docRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const isRemoteRef = useRef(false);
  const seededRoomRef = useRef<string | null>(null);
  const canApplyYjsToReactRef = useRef(false);
  const localNodesRef = useRef(nodes);
  const localEdgesRef = useRef(edges);

  const [connected, setConnected] = useState(false);
  const [peers, setPeers] = useState<CollaboratorPresence[]>([]);

  const displayName = getCollaboratorDisplayName();

  useEffect(() => {
    localNodesRef.current = nodes;
    localEdgesRef.current = edges;
  }, [nodes, edges]);

  const applyYjsToReactRef = useRef<(doc: Y.Doc) => void>(() => undefined);

  const applyYjsToReact = useCallback(
    (doc: Y.Doc) => {
      if (!canApplyYjsToReactRef.current) return;

      const nodesMap = doc.getMap(YJS_NODES_KEY);
      const edgesMap = doc.getMap(YJS_EDGES_KEY);
      const nextNodes = readNodesFromYMap(nodesMap);
      const nextEdges = readEdgesFromYMap(edgesMap);

      const localHasContent =
        localNodesRef.current.length > 0 || localEdgesRef.current.length > 0;
      const remoteEmpty = nextNodes.length === 0 && nextEdges.length === 0;

      if (remoteEmpty && localHasContent) {
        return;
      }

      isRemoteRef.current = true;
      setNodes(nextNodes);
      setEdges(nextEdges);
      requestAnimationFrame(() => {
        isRemoteRef.current = false;
      });
    },
    [setNodes, setEdges],
  );

  useEffect(() => {
    applyYjsToReactRef.current = applyYjsToReact;
  }, [applyYjsToReact]);

  useEffect(() => {
    if (!enabled || !roomId) {
      docRef.current = null;
      providerRef.current?.destroy();
      providerRef.current = null;
      seededRoomRef.current = null;
      canApplyYjsToReactRef.current = false;
      setConnected(false);
      setPeers([]);
      return;
    }

    const wsUrl = getYjsWebSocketUrl();
    if (!wsUrl) return;

    const doc = new Y.Doc();
    docRef.current = doc;
    canApplyYjsToReactRef.current = false;

    const provider = new WebsocketProvider(wsUrl, roomId, doc, { connect: true });
    providerRef.current = provider;

    const onStatus = (event: { status: string }) => {
      setConnected(event.status === "connected");
    };
    provider.on("status", onStatus);
    setConnected(provider.wsconnected);

    const clientId = provider.awareness.clientID;
    const color = pickCollaboratorColor(clientId);
    provider.awareness.setLocalStateField("user", {
      name: displayName,
      color,
      cursor: null,
    });

    const onAwarenessChange = () => {
      setPeers(parseAwarenessStates(provider.awareness.getStates(), clientId));
    };
    provider.awareness.on("change", onAwarenessChange);
    onAwarenessChange();

    const onSync = (isSynced: boolean) => {
      if (!isSynced) return;

      const nodesMap = doc.getMap(YJS_NODES_KEY);
      const edgesMap = doc.getMap(YJS_EDGES_KEY);
      const remoteHasContent = nodesMap.size > 0 || edgesMap.size > 0;
      const localHasContent =
        localNodesRef.current.length > 0 || localEdgesRef.current.length > 0;

      if (!remoteHasContent && localHasContent && canvasReady) {
        seedYjsFromReactState(doc, localNodesRef.current, localEdgesRef.current);
      }

      canApplyYjsToReactRef.current = true;
      applyYjsToReactRef.current(doc);
    };
    provider.on("sync", onSync);

    return () => {
      provider.off("status", onStatus);
      provider.off("sync", onSync);
      provider.awareness.off("change", onAwarenessChange);
      provider.destroy();
      providerRef.current = null;
      doc.destroy();
      docRef.current = null;
      seededRoomRef.current = null;
      canApplyYjsToReactRef.current = false;
      setConnected(false);
      setPeers([]);
    };
  }, [enabled, roomId, displayName, canvasReady]);

  useEffect(() => {
    seededRoomRef.current = null;
    canApplyYjsToReactRef.current = false;
  }, [roomId]);

  useEffect(() => {
    const doc = docRef.current;
    if (!doc || !enabled || !roomId || !canvasReady) return;
    if (seededRoomRef.current === roomId) return;

    const nodesMap = doc.getMap(YJS_NODES_KEY);
    const edgesMap = doc.getMap(YJS_EDGES_KEY);

    if (nodesMap.size === 0 && edgesMap.size === 0) {
      seedYjsFromReactState(doc, localNodesRef.current, localEdgesRef.current);
    }

    seededRoomRef.current = roomId;

    if (canApplyYjsToReactRef.current) {
      applyYjsToReact(doc);
    }
  }, [enabled, roomId, canvasReady, applyYjsToReact]);

  useEffect(() => {
    const doc = docRef.current;
    if (!doc || !enabled) return;

    const nodesMap = doc.getMap(YJS_NODES_KEY);
    const edgesMap = doc.getMap(YJS_EDGES_KEY);

    const syncFromYjs = () => {
      applyYjsToReact(doc);
    };

    nodesMap.observe(syncFromYjs);
    edgesMap.observe(syncFromYjs);

    return () => {
      nodesMap.unobserve(syncFromYjs);
      edgesMap.unobserve(syncFromYjs);
    };
  }, [enabled, roomId, applyYjsToReact]);

  const runLocalYjsTransaction = useCallback((fn: (doc: Y.Doc) => void) => {
    const doc = docRef.current;
    if (!doc || isRemoteRef.current || !canApplyYjsToReactRef.current) return;
    doc.transact(() => fn(doc));
  }, []);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      runLocalYjsTransaction((doc) => {
        applyNodeChangesToYMap(doc.getMap(YJS_NODES_KEY), changes);
      });
    },
    [runLocalYjsTransaction],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      runLocalYjsTransaction((doc) => {
        applyEdgeChangesToYMap(doc.getMap(YJS_EDGES_KEY), changes);
      });
    },
    [runLocalYjsTransaction],
  );

  const pushNode = useCallback(
    (node: Node) => {
      runLocalYjsTransaction((doc) => {
        upsertNodeInYMap(doc.getMap(YJS_NODES_KEY), node);
      });
    },
    [runLocalYjsTransaction],
  );

  const pushEdge = useCallback(
    (edge: Edge) => {
      runLocalYjsTransaction((doc) => {
        upsertEdgeInYMap(doc.getMap(YJS_EDGES_KEY), edge);
      });
    },
    [runLocalYjsTransaction],
  );

  const removeEdges = useCallback(
    (edgeIds: string[]) => {
      runLocalYjsTransaction((doc) => {
        const edgesMap = doc.getMap(YJS_EDGES_KEY);
        for (const id of edgeIds) edgesMap.delete(id);
      });
    },
    [runLocalYjsTransaction],
  );

  const updateCursor = useCallback((cursor: CollaboratorCursor | null) => {
    const provider = providerRef.current;
    if (!provider) return;
    const current = provider.awareness.getLocalState()?.user ?? {};
    provider.awareness.setLocalStateField("user", { ...current, cursor });
  }, []);

  if (!enabled) {
    return noopCollaboration;
  }

  return {
    connected,
    peers,
    updateCursor,
    onNodesChange,
    onEdgesChange,
    pushNode,
    pushEdge,
    removeEdges,
    isRemoteUpdate: () => isRemoteRef.current,
  };
}
