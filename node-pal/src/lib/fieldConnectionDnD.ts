export const FIELD_CONNECTION_MIME = "application/x-mapify-field-connection";

export type FieldConnectionDragPayload = {
  kind: "field-connection";
  sourceNodeId: string;
  sourceFieldId: string;
};

type FieldConnectionDragSession = {
  source: FieldConnectionDragPayload;
  committed: boolean;
  hoverTarget: { nodeId: string; fieldId: string } | null;
};

let activeDrag: FieldConnectionDragSession | null = null;

export function serializeFieldConnectionDrag(payload: FieldConnectionDragPayload): string {
  return JSON.stringify(payload);
}

export function parseFieldConnectionDrag(raw: string): FieldConnectionDragPayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as FieldConnectionDragPayload;
    if (
      parsed?.kind === "field-connection" &&
      typeof parsed.sourceNodeId === "string" &&
      typeof parsed.sourceFieldId === "string"
    ) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

export function beginFieldConnectionDrag(source: FieldConnectionDragPayload): void {
  activeDrag = { source, committed: false, hoverTarget: null };
}

export function trackFieldConnectionHoverTarget(target: {
  nodeId: string;
  fieldId: string;
}): void {
  if (!activeDrag) return;
  if (
    activeDrag.source.sourceNodeId === target.nodeId &&
    activeDrag.source.sourceFieldId === target.fieldId
  ) {
    return;
  }
  activeDrag.hoverTarget = target;
}

export function getActiveFieldConnectionSource(): FieldConnectionDragPayload | null {
  return activeDrag?.source ?? null;
}

export function isFieldConnectionDragActive(): boolean {
  return activeDrag !== null && !activeDrag.committed;
}

export function commitFieldConnectionDrag(): void {
  if (activeDrag) activeDrag.committed = true;
}

export function finishFieldConnectionDrag(): void {
  activeDrag = null;
}

export function resolveFieldConnectionTargetFromPoint(
  clientX: number,
  clientY: number,
): { nodeId: string; fieldId: string } | null {
  if (typeof document === "undefined" || !Number.isFinite(clientX) || !Number.isFinite(clientY)) {
    return null;
  }

  const elements =
    typeof document.elementsFromPoint === "function"
      ? document.elementsFromPoint(clientX, clientY)
      : [document.elementFromPoint(clientX, clientY)].filter(Boolean);

  for (const element of elements) {
    if (!(element instanceof HTMLElement)) continue;
    const row = element.closest<HTMLElement>("[data-field-row-id]");
    if (!row) continue;

    const fieldId = row.getAttribute("data-field-row-id");
    if (!fieldId) continue;

    const nodeId = row.closest<HTMLElement>(".react-flow__node")?.getAttribute("data-id");
    if (!nodeId) continue;

    return { nodeId, fieldId };
  }

  return null;
}

export function tryCommitFieldConnectionDragEnd(
  clientX: number,
  clientY: number,
  connect: (
    source: { nodeId: string; fieldId: string },
    target: { nodeId: string; fieldId: string },
  ) => void,
): boolean {
  if (!activeDrag || activeDrag.committed) return false;

  const { source } = activeDrag;
  const target =
    activeDrag.hoverTarget ?? resolveFieldConnectionTargetFromPoint(clientX, clientY);
  if (!target) return false;
  if (source.sourceNodeId === target.nodeId && source.sourceFieldId === target.fieldId) {
    return false;
  }

  commitFieldConnectionDrag();
  connect(
    { nodeId: source.sourceNodeId, fieldId: source.sourceFieldId },
    { nodeId: target.nodeId, fieldId: target.fieldId },
  );
  return true;
}
