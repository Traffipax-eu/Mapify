import type { Connection } from "reactflow";

export type NormalizedConnection = {
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle: string;
  targetHandle: string;
  sourceFieldId: string | null;
  targetFieldId: string | null;
  isFieldToField: boolean;
  isParentToParent: boolean;
};

export function parentSourceHandle(nodeId: string) {
  return `parent-source-${nodeId}`;
}

export function parentTargetHandle(nodeId: string) {
  return `parent-target-${nodeId}`;
}

export function fieldSourceHandle(nodeId: string, fieldId: string) {
  return `source-${nodeId}-${fieldId}`;
}

export function fieldTargetHandle(nodeId: string, fieldId: string) {
  return `target-${nodeId}-${fieldId}`;
}

export const parseFieldSourceId = (handle: string): string | null => {
  if (!handle.startsWith("source-") || handle.startsWith("parent-source")) return null;
  const rest = handle.slice("source-".length);
  const fieldIndex = rest.indexOf("f_");
  if (fieldIndex >= 0) return rest.slice(fieldIndex);
  return rest;
};

export const parseFieldTargetId = (handle: string): string | null => {
  if (!handle.startsWith("target-") || handle.startsWith("parent-target")) return null;
  const rest = handle.slice("target-".length);
  const fieldIndex = rest.indexOf("f_");
  if (fieldIndex >= 0) return rest.slice(fieldIndex);
  return rest;
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

export function normalizeConnection(params: Connection): NormalizedConnection | null {
  if (!params.source || !params.target || params.source === params.target) return null;

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
  }

  if (isTargetParentHandle(sourceHandle) && isSourceParentHandle(targetHandle)) {
    sourceNodeId = params.target;
    targetNodeId = params.source;
    sourceHandle = parentSourceHandle(sourceNodeId);
    targetHandle = parentTargetHandle(targetNodeId);
  }

  let sourceFieldId = parseFieldId(sourceHandle);
  let targetFieldId = parseFieldId(targetHandle);
  const sourceParent = isParentHandle(sourceHandle);
  const targetParent = isParentHandle(targetHandle);

  if (!sourceHandle || (!sourceParent && !sourceFieldId)) {
    sourceHandle = sourceFieldId
      ? fieldSourceHandle(sourceNodeId, sourceFieldId)
      : parentSourceHandle(sourceNodeId);
    sourceFieldId = parseFieldId(sourceHandle);
  }

  if (!targetHandle || (!targetParent && !targetFieldId)) {
    targetHandle = targetFieldId
      ? fieldTargetHandle(targetNodeId, targetFieldId)
      : parentTargetHandle(targetNodeId);
    targetFieldId = parseFieldId(targetHandle);
  }

  if (isParentHandle(sourceHandle) && !sourceFieldId) {
    sourceHandle = parentSourceHandle(sourceNodeId);
  }
  if (isParentHandle(targetHandle) && !targetFieldId) {
    targetHandle = parentTargetHandle(targetNodeId);
  }

  sourceFieldId = parseFieldId(sourceHandle);
  targetFieldId = parseFieldId(targetHandle);

  const isFieldToField = Boolean(sourceFieldId && targetFieldId);
  const isParentToParent = Boolean(!sourceFieldId && !targetFieldId);
  const isFieldToParent = Boolean(sourceFieldId && !targetFieldId);
  const isParentToField = Boolean(!sourceFieldId && targetFieldId);

  if (!isFieldToField && !isParentToParent && !isFieldToParent && !isParentToField) {
    return {
      sourceNodeId,
      targetNodeId,
      sourceHandle: parentSourceHandle(sourceNodeId),
      targetHandle: parentTargetHandle(targetNodeId),
      sourceFieldId: null,
      targetFieldId: null,
      isFieldToField: false,
      isParentToParent: true,
    };
  }

  return {
    sourceNodeId,
    targetNodeId,
    sourceHandle,
    targetHandle,
    sourceFieldId,
    targetFieldId,
    isFieldToField,
    isParentToParent,
  };
}
