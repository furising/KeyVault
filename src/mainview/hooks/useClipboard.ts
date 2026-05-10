import { useState, useCallback, useRef } from "react";

/**
 * 复制到剪贴板 Hook
 * 支持复制后自动清除（默认 30 秒）
 */
export function useClipboard(timeout = 3000) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);

        // 清除上一次定时器
        if (timerRef.current) clearTimeout(timerRef.current);

        // 指定时间后恢复图标状态，并尝试清除剪贴板
        timerRef.current = setTimeout(() => {
          setCopied(false);
          navigator.clipboard.writeText("").catch(() => { });
        }, timeout);
      } catch {
        setCopied(false);
      }
    },
    [timeout],
  );

  return { copied, copy };
}
