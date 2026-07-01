import type { Connection } from "reactflow";

export type NormalizedConnection = {
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle: string;
  targetHandle: string;
  sourceFieldId: string | null;
  targetFieldId: string | null;
  sourceContainerId: string | null;
  targetContainerId: string | null;
  isFieldToField: boolean;
  isParentToParent: boolean;
};

export function containerSourceHandle(containerId: string) {
  return `container-src-${containerId}`;
}

export function containerTargetHandle(containerId: string) {
  return `container-tgt-${containerId}`;
}

export function parseContainerSourceId(handle: string): string | null {
  if (handle.startsWith("container-src-")) {
    return handle.slice("container-src-".length);
  }
  return null;
}

export function parseContainerTargetId(handle: string): string | null {
  if (handle.startsWith("container-tgt-")) {
    return handle.slice("container-tgt-".length);
  }
  return null;
}

export function parseContainerId(handle: string): string | null {
  return parseContainerSourceId(handle) ?? parseContainerTargetId(handle);
}

export function parentSourceHandle(nodeId: string) {
  return `parent-source-${nodeId}`;
}

export function parentTargetHandle(nodeId: string) {
  return `parent-target-${nodeId}`;
}

export function fieldSourceHandle(nodeId: string, fieldId: string) {
  return `field-src-${nodeId}-${fieldId}`;
}

export function fieldTargetHandle(nodeId: string, fieldId: string) {
  return `field-tgt-${nodeId}-${fieldId}`;
}

function extractFieldIdFromHandle(rest: string): string {
  const fieldIndex = rest.indexOf("f_");
  if (fieldIndex >= 0) return rest.slice(fieldIndex);
  return rest;
}

export const parseFieldSourceId = (handle: string): string | null => {
  if (handle.startsWith("field-src-")) {
    return extractFieldIdFromHandle(handle.slice("field-src-".length));
  }
  if (handle.startsWith("source-") && !handle.startsWith("parent-source")) {
    return extractFieldIdFromHandle(handle.slice("source-".length));
  }
  return null;
};

export const parseFieldTargetId = (handle: string): string | null => {
  if (handle.startsWith("field-tgt-")) {
    return extractFieldIdFromHandle(handle.slice("field-tgt-".length));
  }
  if (handle.startsWith("target-") && !handle.startsWith("parent-target")) {
    return extractFieldIdFromHandle(handle.slice("target-".length));
  }
  return null;
};

function parseFieldId(handle: string): string | null {
  return parseFieldSourceId(handle) ?? parseFieldTargetId(handle);
}

function isParentHandle(handle: string): boolean {
  return (
    handle === "parent-source" ||
    handle === "parent-target" ||
    handle.startsWith("parent-source-") ||
    handle.startsWith("parent-target-")
  );
}

function isTargetParentHandle(handle: string): boolean {
  return handle === "parent-target" || handle.startsWith("parent-target-");
}

function isSourceParentHandle(handle: string): boolean {
  return handle === "parent-source" || handle.startsWith("parent-source-");
}

function isFieldSourceHandle(handle: string): boolean {
  return handle.startsWith("field-src-") || (handle.startsWith("source-") && !handle.startsWith("parent-source"));
}

function isFieldTargetHandle(handle: string): boolean {
  return handle.startsWith("field-tgt-") || (handle.startsWith("target-") && !handle.startsWith("parent-target"));
}

export function isParentConnectionHandle(handle: string | null | undefined): boolean {
  if (!handle) return false;
  return (
    handle === "parent-source" ||
    handle === "parent-target" ||
    handle.startsWith("parent-source-") ||
    handle.startsWith("parent-target-")
  );
}

export function isFieldConnectionHandle(handle: string | null | undefined): boolean {
  if (!handle) return false;
  return handle.includes("field-src-") || handle.includes("field-tgt-") || isFieldSourceHandle(handle) || isFieldTargetHandle(handle);
}

export function isContainerConnectionHandle(handle: string | null | undefined): boolean {
  if (!handle) return false;
  return handle.startsWith("container-src-") || handle.startsWith("container-tgt-");
}

function isContainerSourceHandle(handle: string): boolean {
  return handle.startsWith("container-src-");
}

function isContainerTargetHandle(handle: string): boolean {
  return handle.startsWith("container-tgt-");
}

export function normalizeConnection(params: Connection): NormalizedConnection | null {
  if (!params.source || !params.target) return null;

  let sourceNodeId = params.source;
  let targetNodeId = params.target;
  let sourceHandle = params.sourceHandle ?? "";
  let targetHandle = params.targetHandle ?? "";

  const sourceFieldFromTarget = parseFieldTargetId(sourceHandle);
  const targetFieldFromSource = parseFieldSourceId(targetHandle);
  if (sourceFieldFromTarget && targetFieldFromSource) {
    sourceNodeId = params.target;
    targetNodeId = params.source;
    sourceHandle = targetHandle;
    targetHandle = params.sourceHandle ?? "";
  } else if (isFieldTargetHandle(sourceHandle) && isFieldSourceHandle(targetHandle)) {
    sourceNodeId = params.target;
    targetNodeId = params.source;
    sourceHandle = targetHandle;
    targetHandle = params.sourceHandle ?? "";
  } else if (isContainerTargetHandle(sourceHandle) && isContainerSourceHandle(targetHandle)) {
    sourceNodeId = params.target;
    targetNodeId = params.source;
    sourceHandle = targetHandle;
    targetHandle = params.sourceHandle ?? "";
  }

  if (isTargetParentHandle(sourceHandle) && isSourceParentHandle(targetHandle)) {
    sourceNodeId = params.target;
    targetNodeId = params.source;
    sourceHandle = parentSourceHandle(sourceNodeId);
    targetHandle = parentTargetHandle(targetNodeId);
  }

  let sourceFieldId = parseFieldId(sourceHandle);
  let targetFieldId = parseFieldId(targetHandle);
  let sourceContainerId = parseContainerId(sourceHandle);
  let targetContainerId = parseContainerId(targetHandle);
  const sourceParent = isParentHandle(sourceHandle);
  const targetParent = isParentHandle(targetHandle);

  if (!sourceHandle || (!sourceParent && !sourceFieldId && !sourceContainerId)) {
    sourceHandle = sourceFieldId
      ? fieldSourceHandle(sourceNodeId, sourceFieldId)
      : sourceContainerId
        ? containerSourceHandle(sourceContainerId)
        : parentSourceHandle(sourceNodeId);
    sourceFieldId = parseFieldId(sourceHandle);
    sourceContainerId = parseContainerId(sourceHandle);
  }

  if (!targetHandle || (!targetParent && !targetFieldId && !targetContainerId)) {
    targetHandle = targetFieldId
      ? fieldTargetHandle(targetNodeId, targetFieldId)
      : targetContainerId
        ? containerTargetHandle(targetContainerId)
        : parentTargetHandle(targetNodeId);
    targetFieldId = parseFieldId(targetHandle);
    targetContainerId = parseContainerId(targetHandle);
  }

  if (isParentHandle(sourceHandle) && !sourceFieldId && !sourceContainerId) {
    sourceHandle = parentSourceHandle(sourceNodeId);
  }
  if (isParentHandle(targetHandle) && !targetFieldId && !targetContainerId) {
    targetHandle = parentTargetHandle(targetNodeId);
  }

  if (sourceFieldId && !sourceHandle.startsWith("field-src-")) {
    sourceHandle = fieldSourceHandle(sourceNodeId, sourceFieldId);
    sourceContainerId = null;
  }
  if (targetFieldId && !targetHandle.startsWith("field-tgt-")) {
    targetHandle = fieldTargetHandle(targetNodeId, targetFieldId);
    targetContainerId = null;
  }

  if (sourceContainerId && !sourceHandle.startsWith("container-src-")) {
    sourceHandle = containerSourceHandle(sourceContainerId);
    sourceFieldId = null;
  }
  if (targetContainerId && !targetHandle.startsWith("container-tgt-")) {
    targetHandle = containerTargetHandle(targetContainerId);
    targetFieldId = null;
  }

  sourceFieldId = parseFieldId(sourceHandle);
  targetFieldId = parseFieldId(targetHandle);
  sourceContainerId = parseContainerId(sourceHandle);
  targetContainerId = parseContainerId(targetHandle);

  const isFieldToField = Boolean(sourceFieldId && targetFieldId);
  const isParentToParent = Boolean(!sourceFieldId && !targetFieldId && !sourceContainerId && !targetContainerId);
  const isFieldToParent = Boolean(sourceFieldId && !targetFieldId && !targetContainerId);
  const isParentToField = Boolean(!sourceFieldId && !sourceContainerId && targetFieldId);
  const isContainerToContainer = Boolean(sourceContainerId && targetContainerId);
  const isFieldToContainer = Boolean(sourceFieldId && targetContainerId);
  const isContainerToField = Boolean(sourceContainerId && targetFieldId);
  const isParentToContainer = Boolean(!sourceFieldId && !sourceContainerId && targetContainerId && sourceParent);
  const isContainerToParent = Boolean(sourceContainerId && !targetFieldId && !targetContainerId && targetParent);

  const rejectInvalidSameNode = (conn: NormalizedConnection): NormalizedConnection | null => {
    if (conn.sourceNodeId !== conn.targetNodeId) return conn;
    if (conn.isFieldToField) {
      if (conn.sourceFieldId === conn.targetFieldId) return null;
      return conn;
    }
    if (conn.sourceContainerId && conn.targetContainerId && conn.sourceContainerId === conn.targetContainerId) {
      return null;
    }
    return conn;
  };

  if (
    !isFieldToField &&
    !isParentToParent &&
    !isFieldToParent &&
    !isParentToField &&
    !isContainerToContainer &&
    !isFieldToContainer &&
    !isContainerToField &&
    !isParentToContainer &&
    !isContainerToParent
  ) {
    return rejectInvalidSameNode({
      sourceNodeId,
      targetNodeId,
      sourceHandle: parentSourceHandle(sourceNodeId),
      targetHandle: parentTargetHandle(targetNodeId),
      sourceFieldId: null,
      targetFieldId: null,
      sourceContainerId: null,
      targetContainerId: null,
      isFieldToField: false,
      isParentToParent: true,
    });
  }

  return rejectInvalidSameNode({
    sourceNodeId,
    targetNodeId,
    sourceHandle,
    targetHandle,
    sourceFieldId,
    targetFieldId,
    sourceContainerId,
    targetContainerId,
    isFieldToField,
    isParentToParent,
  });
}

/** When a connection lands on a block but the pointer is over a field row, snap to that field. */
export function upgradeConnectionWithFieldTarget(
  conn: NormalizedConnection,
  clientX: number,
  clientY: number,
  resolveField: (x: number, y: number) => { nodeId: string; fieldId: string } | null,
): NormalizedConnection {
  if (conn.targetFieldId) return conn;

  const fieldTarget = resolveField(clientX, clientY);
  if (!fieldTarget || fieldTarget.nodeId !== conn.targetNodeId) return conn;

  const sourceFieldId = conn.sourceFieldId;
  const targetFieldId = fieldTarget.fieldId;

  return {
    ...conn,
    targetHandle: fieldTargetHandle(fieldTarget.nodeId, targetFieldId),
    targetFieldId,
    isFieldToField: Boolean(sourceFieldId && targetFieldId),
    isParentToParent: !sourceFieldId && !targetFieldId,
  };
}

type DragDropSource =
  | { kind: "field-connection"; sourceNodeId: string; sourceFieldId: string }
  | { kind: "container-connection"; sourceNodeId: string; sourceContainerId: string };

type DragDropTarget =
  | { kind: "field"; nodeId: string; fieldId: string }
  | { kind: "container"; nodeId: string; containerId: string }
  | { kind: "node"; nodeId: string };

export function connectionFromDragDrop(
  source: DragDropSource,
  target: DragDropTarget,
): NormalizedConnection | null {
  const sourceNodeId = source.sourceNodeId;
  const targetNodeId = target.nodeId;

  const sourceHandle =
    source.kind === "field-connection"
      ? fieldSourceHandle(sourceNodeId, source.sourceFieldId)
      : containerSourceHandle(source.sourceContainerId);

  const targetHandle =
    target.kind === "field"
      ? fieldTargetHandle(target.nodeId, target.fieldId)
      : target.kind === "container"
        ? containerTargetHandle(target.containerId)
        : parentTargetHandle(target.nodeId);

  return normalizeConnection({
    source: sourceNodeId,
    target: targetNodeId,
    sourceHandle,
    targetHandle,
  });
}
