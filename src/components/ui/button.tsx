import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "ghost" | "danger";
  size?: "default" | "sm" | "lg";
};

export function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-full font-medium transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:pointer-events-none disabled:opacity-50",
        variant === "default" &&
          "bg-[var(--accent)] px-4 text-[var(--accent-foreground)] shadow-lg shadow-[color:var(--shadow-color)] hover:bg-[var(--accent-strong)]",
        variant === "secondary" &&
          "bg-[var(--panel)] px-4 text-[var(--foreground)] ring-1 ring-[var(--border)] hover:bg-[var(--muted)]",
        variant === "ghost" &&
          "bg-transparent px-3 text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]",
        variant === "danger" &&
          "bg-[#b42318] px-4 text-white hover:bg-[#912018]",
        size === "default" && "h-11 text-sm",
        size === "sm" && "h-9 px-3 text-sm",
        size === "lg" && "h-12 px-5 text-base",
        className,
      )}
      {...props}
    />
  );
}
