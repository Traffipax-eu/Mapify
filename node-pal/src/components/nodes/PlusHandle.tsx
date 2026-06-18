import { Handle, type HandleProps } from "reactflow";

type PlusHandleProps = Omit<HandleProps, "className"> & {
  variant?: "parent" | "field" | "ghost";
  className?: string;
};

export function PlusHandle({ className = "", variant = "parent", ...props }: PlusHandleProps) {
  return (
    <Handle
      {...props}
      className={`flow-handle flow-handle--${variant} ${className}`.trim()}
    />
  );
}
