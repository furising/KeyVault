import { useState, useEffect } from "react";

/**
 * 搜索防抖 Hook
 * 输入原始关键词，返回防抖后的关键词
 */
export function useSearch(value: string, delay = 300): string {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
