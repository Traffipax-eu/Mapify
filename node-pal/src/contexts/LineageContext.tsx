import { createContext, useContext, type ReactNode } from "react";

export type LineageContextValue = {
  hasLineage: boolean;
  lineageNodeIds: Set<string>;
  activeFieldIdsByNode: Map<string, Set<string>>;
  impactNodeIds: Set<string>;
  anchorNodeId: string | null;
  highlightedNodeIds: Set<string>;
};

const defaultValue: LineageContextValue = {
  hasLineage: false,
  lineageNodeIds: new Set(),
  activeFieldIdsByNode: new Map(),
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
