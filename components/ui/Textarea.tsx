import { TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className = "", ...props }: TextareaProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-zinc-900 mb-1.5">
          {label}
        </label>
      )}
      <textarea
        className={`w-full px-3 py-2 text-sm border border-zinc-300 rounded-xl bg-white text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-0 focus:border-zinc-400 disabled:opacity-50 disabled:cursor-not-allowed resize-none ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-zinc-600">{error}</p>
      )}
    </div>
  );
}

