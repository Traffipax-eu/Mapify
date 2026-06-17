import { Handle, type HandleProps } from "reactflow";

type PlusHandleProps = Omit<HandleProps, "className"> & {
  variant?: "parent" | "field";
  className?: string;
};

export function PlusHandle({ className = "", variant = "parent", ...props }: PlusHandleProps) {
  return (
    <Handle
      {...props}
      className={`plus-handle plus-handle--${variant} ${className}`.trim()}
    >
      <span className="plus-handle__icon" aria-hidden />
    </Handle>
  );
}
