import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function absoluteUrl(pathname: string) {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return new URL(pathname, base).toString();
}

export function notNullish<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

export function formatMaybe(
  value: string | number | null | undefined,
  fallback = "Unknown",
) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string" && value.trim().length === 0) return fallback;
  return String(value);
}

export function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "Unknown";
  }

  return new Intl.NumberFormat("en-US").format(value);
}

export function formatCoordinate(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "Unknown";
  }

  return value.toFixed(4);
}

export function chunk<T>(items: T[], size: number) {
  const output: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    output.push(items.slice(index, index + size));
  }

  return output;
}
