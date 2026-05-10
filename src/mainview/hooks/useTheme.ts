import { useState, useEffect, useCallback } from "react";

/** 主题类型 */
export type Theme = "light" | "dark" | "system";

/** 获取系统主题偏好 */
function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** 应用主题到 document */
function applyTheme(theme: Theme) {
  const resolved = theme === "system" ? getSystemTheme() : theme;
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

/**
 * 主题管理 Hook
 * 支持亮色、暗色和跟随系统三种模式
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem("keyvault-theme") as Theme | null;
    return stored ?? "system";
  });

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("keyvault-theme", newTheme);
    applyTheme(newTheme);
  }, []);

  // 初始化和监听系统主题变化
  useEffect(() => {
    applyTheme(theme);
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (theme === "system") applyTheme("system");
    };
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [theme]);

  return { theme, setTheme };
}
