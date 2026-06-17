import { memo, useState } from "react";
import { NodeResizer, useReactFlow, type NodeProps } from "reactflow";
import type { ContainerNodeData } from "@/lib/containerUtils";

function ContainerNodeImpl({ id, data, selected }: NodeProps<ContainerNodeData>) {
  const { setNodes } = useReactFlow();
  const [editing, setEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(data.label);

  const commitTitle = (nextTitle: string) => {
    const label = nextTitle.trim() || "CONTAINER";
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id ? { ...node, data: { ...(node.data as ContainerNodeData), label } } : node,
      ),
    );
  };

  return (
    <>
      <NodeResizer
        isVisible={selected}
        minWidth={280}
        minHeight={180}
        lineClassName="container-node__resizer-line"
        handleClassName="container-node__resizer-handle"
      />
      <div className={`container-node ${selected ? "container-node--selected" : ""}`}>
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
        <span className="container-node__hint">Drop nodes inside to group</span>
      </div>
    </>
  );
}

export const ContainerNode = memo(ContainerNodeImpl);
