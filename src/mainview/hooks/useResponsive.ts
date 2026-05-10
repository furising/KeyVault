import { useState, useEffect, useCallback } from "react";

/** 响应式布局 hook - 管理移动端视图切换状态 */
export function useResponsive() {
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(e.matches);
      if (!e.matches) {
        setSidebarOpen(false);
        setShowDetail(false);
      }
    };
    handleChange(mq);
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const openDetail = useCallback(() => setShowDetail(true), []);
  const closeDetail = useCallback(() => setShowDetail(false), []);

  return {
    isMobile,
    sidebarOpen,
    showDetail,
    openSidebar,
    closeSidebar,
    openDetail,
    closeDetail,
  };
}