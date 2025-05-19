import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Type-safe setter for Zustand that helps with TypeScript errors
export function typedSetter<T>(value: T): T {
  return value;
}
