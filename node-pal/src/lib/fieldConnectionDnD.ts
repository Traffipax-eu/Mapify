export const FIELD_CONNECTION_MIME = "application/x-mapify-field-connection";

export type FieldConnectionDragPayload = {
  kind: "field-connection";
  sourceNodeId: string;
  sourceFieldId: string;
};

export type ContainerConnectionDragPayload = {
  kind: "container-connection";
  sourceNodeId: string;
  sourceContainerId: string;
};

export type ConnectionDragPayload = FieldConnectionDragPayload | ContainerConnectionDragPayload;

export type ConnectionHoverTarget =
  | { kind: "field"; nodeId: string; fieldId: string }
  | { kind: "container"; nodeId: string; containerId: string }
  | { kind: "node"; nodeId: string };

type ConnectionDragSession = {
  source: ConnectionDragPayload;
  committed: boolean;
  hoverTarget: ConnectionHoverTarget | null;
};

let activeDrag: ConnectionDragSession | null = null;

export function isConnectionDragMime(types: DOMStringList | readonly string[]): boolean {
  return types.includes(FIELD_CONNECTION_MIME);
}

export function serializeFieldConnectionDrag(payload: FieldConnectionDragPayload): string {
  return JSON.stringify(payload);
}

export function serializeContainerConnectionDrag(payload: ContainerConnectionDragPayload): string {
  return JSON.stringify(payload);
}

export function serializeConnectionDrag(payload: ConnectionDragPayload): string {
  return JSON.stringify(payload);
}

export function parseConnectionDrag(raw: string): ConnectionDragPayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ConnectionDragPayload;
    if (
      parsed?.kind === "field-connection" &&
      typeof parsed.sourceNodeId === "string" &&
      typeof parsed.sourceFieldId === "string"
    ) {
      return parsed;
    }
    if (
      parsed?.kind === "container-connection" &&
      typeof parsed.sourceNodeId === "string" &&
      typeof parsed.sourceContainerId === "string"
    ) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

export function parseFieldConnectionDrag(raw: string): FieldConnectionDragPayload | null {
  const parsed = parseConnectionDrag(raw);
  return parsed?.kind === "field-connection" ? parsed : null;
}

export function parseContainerConnectionDrag(raw: string): ContainerConnectionDragPayload | null {
  const parsed = parseConnectionDrag(raw);
  return parsed?.kind === "container-connection" ? parsed : null;
}

export function beginConnectionDrag(source: ConnectionDragPayload): void {
  activeDrag = { source, committed: false, hoverTarget: null };
}

export function beginFieldConnectionDrag(source: FieldConnectionDragPayload): void {
  beginConnectionDrag(source);
}

export function beginContainerConnectionDrag(source: ContainerConnectionDragPayload): void {
  beginConnectionDrag(source);
}

export function trackConnectionHoverTarget(target: ConnectionHoverTarget): void {
  if (!activeDrag) return;

  const { source } = activeDrag;
  if (source.kind === "field-connection") {
    if (target.kind === "field" && source.sourceNodeId === target.nodeId && source.sourceFieldId === target.fieldId) {
      return;
    }
    if (
      target.kind === "container" &&
      source.sourceNodeId === target.nodeId &&
      source.sourceFieldId === target.containerId
    ) {
      return;
    }
  } else if (source.kind === "container-connection") {
    if (
      target.kind === "container" &&
      source.sourceNodeId === target.nodeId &&
      source.sourceContainerId === target.containerId
    ) {
      return;
    }
    if (
      target.kind === "field" &&
      source.sourceNodeId === target.nodeId &&
      source.sourceContainerId === target.fieldId
    ) {
      return;
    }
  }

  activeDrag.hoverTarget = target;
}

export function trackFieldConnectionHoverTarget(target: {
  nodeId: string;
  fieldId: string;
}): void {
  trackConnectionHoverTarget({ kind: "field", ...target });
}

export function trackContainerConnectionHoverTarget(target: {
  nodeId: string;
  containerId: string;
}): void {
  trackConnectionHoverTarget({ kind: "container", ...target });
}

export function getActiveConnectionSource(): ConnectionDragPayload | null {
  return activeDrag?.source ?? null;
}

export function getActiveFieldConnectionSource(): FieldConnectionDragPayload | null {
  const source = getActiveConnectionSource();
  return source?.kind === "field-connection" ? source : null;
}

export function getActiveContainerConnectionSource(): ContainerConnectionDragPayload | null {
  const source = getActiveConnectionSource();
  return source?.kind === "container-connection" ? source : null;
}

export function isConnectionDragActive(): boolean {
  return activeDrag !== null && !activeDrag.committed;
}

export function isFieldConnectionDragActive(): boolean {
  return isConnectionDragActive() && activeDrag?.source.kind === "field-connection";
}

export function isContainerConnectionDragActive(): boolean {
  return isConnectionDragActive() && activeDrag?.source.kind === "container-connection";
}

export function commitConnectionDrag(): void {
  if (activeDrag) activeDrag.committed = true;
}

export function commitFieldConnectionDrag(): void {
  commitConnectionDrag();
}

export function finishConnectionDrag(): void {
  activeDrag = null;
}

export function finishFieldConnectionDrag(): void {
  finishConnectionDrag();
}

function readConnectionDragSource(dataTransfer: DataTransfer): ConnectionDragPayload | null {
  const parsed = parseConnectionDrag(dataTransfer.getData(FIELD_CONNECTION_MIME));
  return parsed ?? getActiveConnectionSource();
}

export function resolveConnectionTargetFromPoint(
  clientX: number,
  clientY: number,
): ConnectionHoverTarget | null {
  if (typeof document === "undefined" || !Number.isFinite(clientX) || !Number.isFinite(clientY)) {
    return null;
  }

  const elements =
    typeof document.elementsFromPoint === "function"
      ? document.elementsFromPoint(clientX, clientY)
      : [document.elementFromPoint(clientX, clientY)].filter(Boolean);

  for (const element of elements) {
    if (!(element instanceof HTMLElement)) continue;

    const fieldRow = element.closest<HTMLElement>("[data-field-row-id]");
    if (fieldRow) {
      const fieldId = fieldRow.getAttribute("data-field-row-id");
      if (!fieldId) continue;
      const nodeId = fieldRow.closest<HTMLElement>(".react-flow__node")?.getAttribute("data-id");
      if (!nodeId) continue;
      return { kind: "field", nodeId, fieldId };
    }

    const containerRow = element.closest<HTMLElement>("[data-container-row-id]");
    if (containerRow) {
      const containerId = containerRow.getAttribute("data-container-row-id");
      if (!containerId) continue;
      const nodeId = containerRow.closest<HTMLElement>(".react-flow__node")?.getAttribute("data-id");
      if (!nodeId) continue;
      return { kind: "container", nodeId, containerId };
    }

    const nodeEl = element.closest<HTMLElement>(".react-flow__node");
    if (nodeEl) {
      const nodeId = nodeEl.getAttribute("data-id");
      if (nodeId) return { kind: "node", nodeId };
    }
  }

  return null;
}

export function resolveFieldConnectionTargetFromPoint(
  clientX: number,
  clientY: number,
): { nodeId: string; fieldId: string } | null {
  const target = resolveConnectionTargetFromPoint(clientX, clientY);
  return target?.kind === "field" ? { nodeId: target.nodeId, fieldId: target.fieldId } : null;
}

function isSameConnectionTarget(
  source: ConnectionDragPayload,
  target: ConnectionHoverTarget,
): boolean {
  if (source.kind === "field-connection") {
    if (target.kind === "field") {
      return source.sourceNodeId === target.nodeId && source.sourceFieldId === target.fieldId;
    }
    return false;
  }

  if (target.kind === "container") {
    return source.sourceNodeId === target.nodeId && source.sourceContainerId === target.containerId;
  }

  return false;
}

export function tryCommitConnectionDragEnd(
  clientX: number,
  clientY: number,
  connect: (source: ConnectionDragPayload, target: ConnectionHoverTarget) => void,
): boolean {
  if (!activeDrag || activeDrag.committed) return false;

  const { source } = activeDrag;
  const target = activeDrag.hoverTarget ?? resolveConnectionTargetFromPoint(clientX, clientY);
  if (!target) return false;
  if (isSameConnectionTarget(source, target)) return false;

  commitConnectionDrag();
  connect(source, target);
  return true;
}

export function tryCommitFieldConnectionDragEnd(
  clientX: number,
  clientY: number,
  connect: (
    source: { nodeId: string; fieldId: string },
    target: { nodeId: string; fieldId: string },
  ) => void,
): boolean {
  return tryCommitConnectionDragEnd(clientX, clientY, (source, target) => {
    if (source.kind !== "field-connection" || target.kind !== "field") return;
    connect(
      { nodeId: source.sourceNodeId, fieldId: source.sourceFieldId },
      { nodeId: target.nodeId, fieldId: target.fieldId },
    );
  });
}

export function readConnectionDragSourceFromEvent(
  dataTransfer: DataTransfer,
): ConnectionDragPayload | null {
  return readConnectionDragSource(dataTransfer);
}
