import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { Toaster } from "@/components/ui/toaster";
import SetupPage from "@/pages/SetupPage";
import UnlockPage from "@/pages/UnlockPage";
import VaultPage from "@/pages/VaultPage";
import { Shield } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

/** 根组件 - 精致加载态 + 页面流转 */
export default function App() {
  const { checked, hasMasterPassword, unlocked, checkStatus } = useAuthStore();
  // 在根组件初始化主题，确保所有页面都应用主题
  useTheme();

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // 加载中 - 品牌 splash
  if (!checked) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background">
        <div className="gradient-primary shadow-elevated mb-4 flex h-14 w-14 items-center justify-center rounded-2xl">
          <Shield className="h-7 w-7 text-white" />
        </div>
        <div className="h-1 w-24 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-primary/50" />
        </div>
      </div>
    );
  }

  // 首次启动
  if (!hasMasterPassword) {
    return (
      <>
        <SetupPage />
        <Toaster />
      </>
    );
  }

  // 需要解锁
  if (!unlocked) {
    return (
      <>
        <UnlockPage />
        <Toaster />
      </>
    );
  }

  return (
    <>
      <VaultPage />
      <Toaster />
    </>
  );
}
