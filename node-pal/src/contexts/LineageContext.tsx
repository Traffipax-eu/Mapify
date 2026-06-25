import { createContext, useContext, type ReactNode } from "react";
import type { LineageDirection } from "@/lib/lineageTraversal";

export type { LineageDirection };

export type LineageContextValue = {
  hasLineage: boolean;
  lineageDirection: LineageDirection | null;
  lineageNodeIds: Set<string>;
  /** Field IDs to highlight per node (only fields on the traced path). */
  highlightedFieldsByNode: Map<string, Set<string>>;
  impactNodeIds: Set<string>;
  anchorNodeId: string | null;
  /** Whole-node glow for custom objects and blocks without per-field highlights. */
  highlightedNodeIds: Set<string>;
};

const defaultValue: LineageContextValue = {
  hasLineage: false,
  lineageDirection: null,
  lineageNodeIds: new Set(),
  highlightedFieldsByNode: new Map(),
  impactNodeIds: new Set(),
  anchorNodeId: null,
  highlightedNodeIds: new Set(),
};

const LineageContext = createContext<LineageContextValue>(defaultValue);

export function LineageProvider({
  value,
  children,
}: {
  value: LineageContextValue;
  children: ReactNode;
}) {
  return <LineageContext.Provider value={value}>{children}</LineageContext.Provider>;
}

export function useLineage() {
  return useContext(LineageContext);
}
