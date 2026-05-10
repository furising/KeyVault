import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** 合并 Tailwind CSS 类名工具函数 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
