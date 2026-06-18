import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNodeCanvas } from "@/contexts/NodeCanvasContext";
import {
  buildInternalFieldLinkPath,
  getFieldRowAnchorY,
  getElementLayoutZoom,
  getInternalFieldEdgesForNode,
  INTERNAL_FIELD_LINK_OUTSET,
  internalLinkStrokeColor,
  type InternalFieldEdgeInfo,
} from "@/lib/internalFieldLinks";

type LinkLayout = {
  edge: InternalFieldEdgeInfo;
  path: string;
};

type SvgFrame = {
  width: number;
  height: number;
};

type BlockInternalFieldLinksProps = {
  nodeId: string;
  children: ReactNode;
};

export function BlockInternalFieldLinks({ nodeId, children }: BlockInternalFieldLinksProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { edges, selectedEdgeId, onSelectEdge, lineageEdgeIds, hasLineage } = useNodeCanvas();
  const [layouts, setLayouts] = useState<LinkLayout[]>([]);
  const [svgFrame, setSvgFrame] = useState<SvgFrame | null>(null);

  const internalEdges = useMemo(
    () => getInternalFieldEdgesForNode(nodeId, edges),
    [nodeId, edges],
  );

  const updateLayouts = useCallback(() => {
    const root = containerRef.current;
    if (!root || internalEdges.length === 0) {
      setLayouts([]);
      setSvgFrame(null);
      return;
    }

    const surfaceEl = root.querySelector<HTMLElement>(".system-node__surface");
    if (!surfaceEl) {
      setLayouts([]);
      setSvgFrame(null);
      return;
    }

    const surfaceWidth = surfaceEl.offsetWidth;
    const surfaceHeight = surfaceEl.offsetHeight;
    if (surfaceWidth <= 0 || surfaceHeight <= 0) {
      setLayouts([]);
      setSvgFrame(null);
      return;
    }

    const zoom = getElementLayoutZoom(surfaceEl);
    const anchorX = surfaceWidth;
    const next: LinkLayout[] = [];

    internalEdges.forEach((edge, laneIndex) => {
      const sourceEl = root.querySelector<HTMLElement>(
        `[data-field-row-id="${CSS.escape(edge.sourceFieldId)}"]`,
      );
      const targetEl = root.querySelector<HTMLElement>(
        `[data-field-row-id="${CSS.escape(edge.targetFieldId)}"]`,
      );
      if (!sourceEl || !targetEl) return;

      const sourceY = getFieldRowAnchorY(sourceEl, surfaceEl, zoom);
      const targetY = getFieldRowAnchorY(targetEl, surfaceEl, zoom);
      const path = buildInternalFieldLinkPath(sourceY, targetY, anchorX, laneIndex);
      next.push({ edge, path });
    });

    setLayouts(next);
    setSvgFrame({
      width: surfaceWidth + INTERNAL_FIELD_LINK_OUTSET,
      height: surfaceHeight,
    });
  }, [internalEdges]);

  useLayoutEffect(() => {
    updateLayouts();
    const root = containerRef.current;
    if (!root) return;

    const surfaceEl = root.querySelector<HTMLElement>(".system-node__surface");
    const observer = new ResizeObserver(() => updateLayouts());
    observer.observe(root);
    if (surfaceEl) observer.observe(surfaceEl);

    const mutationObserver = new MutationObserver(() => updateLayouts());
    mutationObserver.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style"],
    });

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, [updateLayouts]);

  const markerId = `internal-field-arrow-${nodeId}`;

  return (
    <div ref={containerRef} className="system-node__internal-links-host">
      {children}
      {svgFrame && layouts.length > 0 && (
        <svg
          className="system-node__internal-links-svg nodrag nopan"
          width={svgFrame.width}
          height={svgFrame.height}
          viewBox={`0 0 ${svgFrame.width} ${svgFrame.height}`}
          aria-hidden
        >
          <defs>
            <marker
              id={markerId}
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
            </marker>
          </defs>
          {layouts.map(({ edge, path }) => {
            const inLineage = lineageEdgeIds.has(edge.edgeId);
            const isSelected = edge.edgeId === selectedEdgeId;
            const faded = hasLineage && !inLineage && !isSelected;
            const stroke = internalLinkStrokeColor({
              inLineage,
              isSelected,
              defaultColor: "#3b82f6",
            });
            const isDashed = edge.lineStyle === "dashed" && !inLineage;

            return (
              <g
                key={edge.edgeId}
                className={[
                  "system-node__internal-link",
                  inLineage ? "system-node__internal-link--lineage" : "",
                  isSelected ? "system-node__internal-link--selected" : "",
                  faded ? "system-node__internal-link--faded" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <path
                  d={path}
                  className="system-node__internal-link-hit system-node__internal-link-hit--wide"
                  stroke="transparent"
                  fill="none"
                  onClick={(clickEvent) => {
                    clickEvent.stopPropagation();
                    onSelectEdge(edge.edgeId);
                  }}
                />
                <path
                  d={path}
                  className="system-node__internal-link-hit"
                  markerEnd={`url(#${markerId})`}
                  stroke={stroke}
                  strokeDasharray={isDashed ? "6 4" : inLineage ? "8 5" : undefined}
                  pointerEvents="none"
                />
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
