import { useMemo } from "react";
import type { Node } from "reactflow";
import type { Schema, MetadataValues } from "@/lib/storage";
import type { SystemNodeData } from "@/components/nodes/SystemNode";
import { formatFieldCellValue, getFieldTableColumns } from "@/lib/fieldMetadata";
import { getFieldProperties } from "@/lib/schemaProperties";
import { SCHEMA_SCOPE_LABELS } from "@/lib/schemaLabels";
import { BookOpen } from "lucide-react";

interface GlossaryViewProps {
  nodes: Node[];
  schema: Schema;
}

type GlossaryRow = {
  fieldId: string;
  fieldName: string;
  nodeId: string;
  nodeName: string;
  nodeGroupId: string;
  metadata?: MetadataValues;
};

export function GlossaryView({ nodes, schema }: GlossaryViewProps) {
  const grouped = useMemo(() => {
    const systemNodes = nodes.filter((node) => node.type === "system");
    const byGroup = new Map<
      string,
      {
        groupId: string;
        groupName: string;
        nodes: Map<string, { nodeId: string; nodeName: string; fields: GlossaryRow[] }>;
      }
    >();

    for (const node of systemNodes) {
      const data = node.data as SystemNodeData;
      const groupId = data.nodeGroupId ?? "ungrouped";
      const groupName =
        schema.nodeGroups.find((group) => group.id === groupId)?.name ?? "Ungrouped";
      const fields = data.fields ?? [];

      if (!byGroup.has(groupId)) {
        byGroup.set(groupId, { groupId, groupName, nodes: new Map() });
      }
      const groupEntry = byGroup.get(groupId)!;

      if (!groupEntry.nodes.has(node.id)) {
        groupEntry.nodes.set(node.id, { nodeId: node.id, nodeName: data.label, fields: [] });
      }
      const nodeEntry = groupEntry.nodes.get(node.id)!;

      for (const field of fields) {
        nodeEntry.fields.push({
          fieldId: field.id,
          fieldName: field.label,
          nodeId: node.id,
          nodeName: data.label,
          nodeGroupId: groupId,
          metadata: field.metadata,
        });
      }
    }

    return Array.from(byGroup.values()).sort((a, b) => a.groupName.localeCompare(b.groupName));
  }, [nodes, schema]);

  const totalFields = grouped.reduce(
    (sum, group) =>
      sum + Array.from(group.nodes.values()).reduce((nodeSum, node) => nodeSum + node.fields.length, 0),
    0,
  );

  if (totalFields === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
        <BookOpen className="h-10 w-10 opacity-40" />
        <p className="text-sm">No fields on the canvas yet.</p>
        <p className="text-xs">Add system nodes and fields in Canvas View to populate the glossary.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-background">
      <div className="shrink-0 border-b border-border px-6 py-4">
        <h2 className="text-lg font-semibold">Data Dictionary Glossary</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {totalFields} field{totalFields === 1 ? "" : "s"} across {grouped.length} node group
          {grouped.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-8">
        {grouped.map((group) => {
          const columns = getFieldTableColumns(schema, group.groupId);
          const fieldProperties = getFieldProperties(schema, group.groupId);
          const gridTemplate = `minmax(140px, 1.2fr) minmax(120px, 1fr) ${columns
            .map(() => "minmax(100px, 1fr)")
            .join(" ")}`;

          return (
            <section key={group.groupId} className="glossary-section">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <h3 className="text-base font-semibold">{group.groupName}</h3>
                <span className="text-xs text-muted-foreground">
                  ({Array.from(group.nodes.values()).reduce((s, n) => s + n.fields.length, 0)} fields)
                </span>
              </div>

              <div className="glossary-table rounded-xl border border-border overflow-hidden shadow-sm">
                <div className="glossary-table__header" style={{ gridTemplateColumns: gridTemplate }}>
                  <div className="glossary-table__cell glossary-table__cell--header">Node</div>
                  <div className="glossary-table__cell glossary-table__cell--header">Field</div>
                  {columns.map((column) => (
                    <div
                      key={column.id}
                      className="glossary-table__cell glossary-table__cell--header glossary-table__cell--group"
                      title={SCHEMA_SCOPE_LABELS.group.columnTooltip}
                    >
                      {column.name}
                    </div>
                  ))}
                </div>

                {Array.from(group.nodes.values())
                  .sort((a, b) => a.nodeName.localeCompare(b.nodeName))
                  .map((nodeEntry) =>
                    nodeEntry.fields.map((field, index) => (
                      <div
                        key={`${field.nodeId}-${field.fieldId}`}
                        className="glossary-table__row"
                        style={{ gridTemplateColumns: gridTemplate }}
                      >
                        <div className="glossary-table__cell glossary-table__cell--node">
                          {index === 0 ? (
                            <span className="font-medium text-foreground">{nodeEntry.nodeName}</span>
                          ) : (
                            <span className="text-muted-foreground/40 text-xs pl-2">↳</span>
                          )}
                        </div>
                        <div className="glossary-table__cell font-medium">{field.fieldName}</div>
                        {columns.map((column) => (
                          <div key={column.id} className="glossary-table__cell text-muted-foreground">
                            {formatFieldCellValue(field.metadata, column.id, fieldProperties)}
                          </div>
                        ))}
                      </div>
                    )),
                  )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
