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

  const parentReversed =
    sourceHandle.startsWith("parent-target") && targetHandle.startsWith("parent-source");
  if (parentReversed) {
    sourceNodeId = params.target;
    targetNodeId = params.source;
    sourceHandle = "parent-source";
    targetHandle = "parent-target";
  }

  const sourceFieldId = parseFieldSourceId(sourceHandle);
  const targetFieldId = parseFieldTargetId(targetHandle);
  const isFieldToField = Boolean(sourceFieldId && targetFieldId);
  const isParentToParent =
    sourceHandle.startsWith("parent-source") && targetHandle.startsWith("parent-target");

  if (!isFieldToField && !isParentToParent) return null;

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
