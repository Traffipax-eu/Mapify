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

export const parseFieldSourceId = (handle: string) =>
  handle.startsWith("source-") && !handle.startsWith("parent-source") ? handle.replace("source-", "") : null;

export const parseFieldTargetId = (handle: string) =>
  handle.startsWith("target-") && !handle.startsWith("parent-target") ? handle.replace("target-", "") : null;

function parseFieldId(handle: string): string | null {
  return parseFieldSourceId(handle) ?? parseFieldTargetId(handle);
}

function isParentHandle(handle: string): boolean {
  return handle === "parent-source" || handle === "parent-target";
}

export function normalizeConnection(params: Connection): NormalizedConnection | null {
  if (!params.source || !params.target) return null;

  let sourceNodeId = params.source;
  let targetNodeId = params.target;
  let sourceHandle = params.sourceHandle || "";
  let targetHandle = params.targetHandle || "";

  const sourceAsTarget = parseFieldTargetId(sourceHandle);
  const targetAsSource = parseFieldSourceId(targetHandle);
  if (sourceAsTarget && targetAsSource) {
    sourceNodeId = params.target;
    targetNodeId = params.source;
    sourceHandle = targetHandle;
    targetHandle = params.sourceHandle || "";
  }

  if (sourceHandle === "parent-target" && targetHandle === "parent-source") {
    sourceNodeId = params.target;
    targetNodeId = params.source;
    sourceHandle = "parent-source";
    targetHandle = "parent-target";
  }

  const sourceFieldId = parseFieldId(sourceHandle);
  const targetFieldId = parseFieldId(targetHandle);
  const sourceParent = isParentHandle(sourceHandle);
  const targetParent = isParentHandle(targetHandle);

  const isFieldToField = Boolean(sourceFieldId && targetFieldId);
  const isParentToParent = Boolean(sourceParent && targetParent && !sourceFieldId && !targetFieldId);
  const isFieldToParent = Boolean(sourceFieldId && targetParent);
  const isParentToField = Boolean(sourceParent && targetFieldId);

  if (!isFieldToField && !isParentToParent && !isFieldToParent && !isParentToField) {
    return null;
  }

  if (sourceParent && !sourceFieldId) {
    sourceHandle = "parent-source";
  }
  if (targetParent && !targetFieldId) {
    targetHandle = "parent-target";
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
