import type { Node } from "reactflow";
import type { SheetCanvasState } from "@/lib/workspaceStorage";
import type { SystemNodeData } from "@/components/nodes/SystemNode";

export const STARTER_BLOCK_IDS = {
  marketing: "ng_starter_marketing",
  powerBi: "ng_starter_powerbi",
} as const;

export function createStarterCanvasState(): SheetCanvasState {
  const now = Date.now();

  const nodes: Node<SystemNodeData>[] = [
    {
      id: "n_starter_marketing",
      type: "system",
      position: { x: 100, y: 160 },
      data: {
        label: "Marketing Data Hub",
        nodeGroupId: STARTER_BLOCK_IDS.marketing,
        icon: "database",
        color: "#2EC4B6",
        fields: [
          { id: "f_starter_campaign", label: "Campaign Name" },
          { id: "f_starter_region", label: "Region" },
        ],
        collapsed: false,
        metadata: {},
      },
    },
    {
      id: "n_starter_powerbi",
      type: "system",
      position: { x: 460, y: 160 },
      data: {
        label: "Power BI Dashboard",
        nodeGroupId: STARTER_BLOCK_IDS.powerBi,
        icon: "bar-chart",
        color: "#0DC5E7",
        fields: [{ id: "f_starter_report", label: "Report URL" }],
        collapsed: false,
        metadata: {},
      },
    },
  ];

  return {
    nodes,
    edges: [],
    viewport: { x: 0, y: 0, zoom: 0.85 },
    schema: {
      nodeGroups: [
        {
          id: STARTER_BLOCK_IDS.marketing,
          name: "Marketing Data Hub",
          color: "#2EC4B6",
          properties: [],
        },
        {
          id: STARTER_BLOCK_IDS.powerBi,
          name: "Power BI Dashboard",
          color: "#0DC5E7",
          properties: [],
        },
      ],
      globalProperties: [],
      fieldTypes: [],
      timestamp: now,
    },
  };
}

export function isEmptyCanvasState(nodes: unknown[] | undefined): boolean {
  return !nodes || nodes.length === 0;
}
