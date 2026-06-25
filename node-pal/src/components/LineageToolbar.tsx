import { ArrowDownRight, ArrowUpLeft, GitBranch, Split, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LineageDirection } from "@/lib/lineageTraversal";

type Props = {
  selectionLabel: string;
  selectionKind: "block" | "field" | "object";
  traceActive: boolean;
  traceDirection: LineageDirection | null;
  blockCount?: number;
  edgeCount?: number;
  onTraceUpstream: () => void;
  onTraceDownstream: () => void;
  onTraceFull: () => void;
  onClearLineage: () => void;
};

function traceDirectionLabel(direction: LineageDirection | null) {
  if (direction === "upstream") return "Upstream";
  if (direction === "downstream") return "Downstream";
  if (direction === "full") return "Full";
  return "Lineage";
}

export function LineageToolbar({
  selectionLabel,
  selectionKind,
  traceActive,
  traceDirection,
  blockCount = 0,
  edgeCount = 0,
  onTraceUpstream,
  onTraceDownstream,
  onTraceFull,
  onClearLineage,
}: Props) {
  const kindLabel =
    selectionKind === "field" ? "Field" : selectionKind === "object" ? "Object" : "Block";

  return (
    <div className="lineage-toolbar" role="toolbar" aria-label="Lineage tracing">
      <div className="lineage-toolbar__start">
        <span className="lineage-toolbar__brand">
          <GitBranch className="lineage-toolbar__brand-icon" aria-hidden />
          Lineage
        </span>
        <span className="lineage-toolbar__divider" aria-hidden />
        <span className="lineage-toolbar__selection">
          <span className="lineage-toolbar__selection-kind">{kindLabel}</span>
          <strong className="lineage-toolbar__selection-label">{selectionLabel}</strong>
        </span>
      </div>

      <div className="lineage-toolbar__actions">
        <Button
          type="button"
          variant={traceActive && traceDirection === "upstream" ? "default" : "outline"}
          size="sm"
          className="lineage-toolbar__btn"
          onClick={onTraceUpstream}
          title="Show upstream sources"
        >
          <ArrowUpLeft className="h-3.5 w-3.5" />
          Upstream
        </Button>
        <Button
          type="button"
          variant={traceActive && traceDirection === "downstream" ? "default" : "outline"}
          size="sm"
          className="lineage-toolbar__btn"
          onClick={onTraceDownstream}
          title="Show downstream impact"
        >
          <ArrowDownRight className="h-3.5 w-3.5" />
          Downstream
        </Button>
        <Button
          type="button"
          variant={traceActive && traceDirection === "full" ? "default" : "outline"}
          size="sm"
          className="lineage-toolbar__btn"
          onClick={onTraceFull}
          title="Show full lineage in both directions"
        >
          <Split className="h-3.5 w-3.5" />
          Full Lineage
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="lineage-toolbar__btn lineage-toolbar__btn--clear"
          onClick={onClearLineage}
          disabled={!traceActive}
          title="Clear lineage highlight"
        >
          <X className="h-3.5 w-3.5" />
          Clear
        </Button>
      </div>

      {traceActive && (
        <p className="lineage-toolbar__status">
          {traceDirectionLabel(traceDirection)} lineage · {blockCount} block
          {blockCount === 1 ? "" : "s"}, {edgeCount} edge{edgeCount === 1 ? "" : "s"}
        </p>
      )}
    </div>
  );
}
