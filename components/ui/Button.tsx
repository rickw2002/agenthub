import { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "default" | "primary" | "ghost";
  size?: "sm" | "md" | "lg";
}

export function Button({
  children,
  variant = "default",
  size = "md",
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses = "rounded-xl font-medium transition-colors focus:outline-none focus:ring-0";
  
  const variantClasses = {
    default: "bg-white border border-zinc-300 text-zinc-900 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed",
    primary: "bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed",
    ghost: "text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed",
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

