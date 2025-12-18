import { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "subtle";
  className?: string;
}

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  const variantClasses = {
    default: "bg-zinc-100 text-zinc-700",
    subtle: "bg-zinc-50 text-zinc-600",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

