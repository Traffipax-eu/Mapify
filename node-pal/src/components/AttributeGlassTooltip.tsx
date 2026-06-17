import { createPortal } from "react-dom";
import type { AttributeDisplayItem } from "@/lib/metadataAttributes";

type Props = {
  visible: boolean;
  position: { x: number; y: number };
  title?: string;
  items: AttributeDisplayItem[];
};

export function AttributeGlassTooltip({ visible, position, title, items }: Props) {
  if (!visible || typeof document === "undefined") return null;

  const safeItems = items ?? [];
  const hasItems = safeItems.length > 0;

  return createPortal(
    <div
      className="attribute-glass-tooltip"
      style={{
        left: Math.min(position.x + 18, window.innerWidth - 280),
        top: Math.min(position.y + 14, window.innerHeight - 220),
      }}
      role="tooltip"
    >
      {title && <p className="attribute-glass-tooltip__title">{title}</p>}
      {hasItems ? (
        <dl className="attribute-glass-tooltip__list">
          {safeItems.map((item) => (
            <div key={`${item.key}-${item.value}`} className="attribute-glass-tooltip__row">
              <dt>{item.key}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="attribute-glass-tooltip__empty">No attributes yet</p>
      )}
    </div>,
    document.body,
  );
}
