import { memo, useCallback, useState } from "react";
import { NodeResizer, NodeToolbar, Position, useReactFlow, type NodeProps } from "reactflow";
import { Trash2, Ungroup } from "lucide-react";
import { toast } from "sonner";
import { useNodeCanvas } from "@/contexts/NodeCanvasContext";
import type { ContainerNodeData } from "@/lib/containerUtils";
import { ungroupContainer } from "@/lib/containerUtils";

function ContainerNodeImpl({ id, data, selected }: NodeProps<ContainerNodeData>) {
  const { onDeleteNode } = useNodeCanvas();
  const { setNodes } = useReactFlow();
  const [editing, setEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(data.label);

  const stopPointer = (event: React.PointerEvent | React.MouseEvent) => {
    event.stopPropagation();
  };

  const commitTitle = (nextTitle: string) => {
    const label = nextTitle.trim() || "Container 1";
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id ? { ...node, data: { ...(node.data as ContainerNodeData), label } } : node,
      ),
    );
  };

  const handleUngroup = useCallback(() => {
    setNodes((nodes) => {
      const childCount = nodes.filter((node) => node.parentNode === id).length;
      const next = ungroupContainer(nodes, id);
      if (childCount > 0) {
        toast.success(`Ungrouped ${childCount} item${childCount === 1 ? "" : "s"}`);
      } else {
        toast.success("Container removed");
      }
      return next;
    });
  }, [id, setNodes]);

  const handleDeleteContainer = useCallback(() => {
    onDeleteNode(id);
  }, [id, onDeleteNode]);

  return (
    <>
      <NodeToolbar
        isVisible={selected}
        position={Position.Top}
        offset={12}
        className="container-node__toolbar-wrap nodrag nopan"
      >
        <div className="container-node__toolbar">
          <button
            type="button"
            className="container-node__toolbar-btn"
            onPointerDown={stopPointer}
            onClick={(event) => {
              event.stopPropagation();
              handleUngroup();
            }}
            title="Ungroup — release child nodes onto the canvas"
          >
            <Ungroup className="h-3.5 w-3.5" />
            <span>Ungroup</span>
          </button>
          <button
            type="button"
            className="container-node__toolbar-btn container-node__toolbar-btn--danger"
            onPointerDown={stopPointer}
            onClick={(event) => {
              event.stopPropagation();
              handleDeleteContainer();
            }}
            title="Delete container only"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </NodeToolbar>

      <NodeResizer
        isVisible={selected}
        minWidth={280}
        minHeight={180}
        lineClassName="container-node__resizer-line"
        handleClassName="container-node__resizer-handle"
      />
      <div className={`container-node ${selected ? "container-node--selected" : ""}`}>
        <div className="container-node__header">
          {editing ? (
            <input
              autoFocus
              value={titleDraft}
              onChange={(event) => setTitleDraft(event.target.value)}
              onBlur={() => {
                setEditing(false);
                commitTitle(titleDraft);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.currentTarget.blur();
                }
                if (event.key === "Escape") {
                  setTitleDraft(data.label);
                  setEditing(false);
                }
              }}
              className="container-node__title-input nodrag nopan"
              aria-label="Container title"
            />
          ) : (
            <button
              type="button"
              className="container-node__title nodrag nopan"
              onDoubleClick={() => {
                setTitleDraft(data.label);
                setEditing(true);
              }}
              title="Double-click to rename"
            >
              {data.label}
            </button>
          )}
        </div>
        <span className="container-node__hint">Drop blocks inside to organize</span>
      </div>
    </>
  );
}

export const ContainerNode = memo(ContainerNodeImpl);
