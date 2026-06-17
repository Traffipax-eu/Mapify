import { useMemo } from "react";
import { AttributeGlassTooltip } from "@/components/AttributeGlassTooltip";
import { useSmartHover } from "@/hooks/useSmartHover";
import { getAttributeDisplayItems } from "@/lib/metadataAttributes";
import type { MetadataValues } from "@/lib/storage";
import type { ScopedProperty } from "@/lib/schemaProperties";

type Props = {
  title?: string;
  metadata?: MetadataValues | null;
  properties?: ScopedProperty[];
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

export function SmartHoverAttributes({
  title,
  metadata,
  properties = [],
  children,
  className,
  style,
}: Props) {
  const { visible, position, hoverHandlers } = useSmartHover(500);

  const items = useMemo(
    () => getAttributeDisplayItems(metadata, properties),
    [metadata, properties],
  );

  return (
    <>
      <div className={className} style={style} {...hoverHandlers}>
        {children}
      </div>
      <AttributeGlassTooltip visible={visible} position={position} title={title} items={items} />
    </>
  );
}
