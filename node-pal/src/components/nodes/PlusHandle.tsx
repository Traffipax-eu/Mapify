import { Handle, type HandleProps } from "reactflow";

type PlusHandleProps = Omit<HandleProps, "className"> & {
  variant?: "parent" | "field" | "ghost";
  className?: string;
};

export function PlusHandle({ className = "", variant = "parent", isConnectable = true, ...props }: PlusHandleProps) {
  return (
    <Handle
      {...props}
      isConnectable={isConnectable}
      className={`flow-handle flow-handle--${variant} pointer-events-auto ${className}`.trim()}
    />
  );
}
