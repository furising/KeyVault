import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Fingerprint, Unlock, Eye, EyeOff } from "lucide-react";

/** 解锁页面 - 极简安全风格 */
export default function UnlockPage() {
  const { verify, loading, error } = useAuthStore();
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    await verify(password);
  };

  return (
    <div
      className="relative flex h-screen items-center justify-center overflow-hidden bg-background"
      data-tauri-drag-region
    >
      {/* 装饰性背景 */}
      <div className="pointer-events-none absolute inset-0">
        <div className="bg-primary/4 absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm px-4 sm:px-6">
        {/* 锁定图标 */}
        <div className="mb-8 text-center sm:mb-10">
          <img src="/icon.svg" alt="KeyVault" className="mx-auto mb-4 h-16 w-16 rounded-2xl sm:mb-5 sm:h-20 sm:w-20" />
          <h1 className="text-lg font-bold tracking-tight sm:text-xl">密码库已锁定</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">输入主密码以解锁</p>
        </div>

        {/* 解锁表单 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Input
              type={showPwd ? "text" : "password"}
              placeholder="主密码"
              className="shadow-soft h-12 bg-card pr-10 text-center text-lg tracking-widest"
              value={password}
              onChange={(e) => setPassword(e.target.value.replace(/\s/g, ""))}
              autoFocus
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setShowPwd(!showPwd)}
            >
              {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">{error}</div>
          )}

          <Button
            type="submit"
            className="gradient-primary h-14 w-full border-0 text-white shadow-md transition-all hover:shadow-lg hover:brightness-110"
            disabled={loading || !password}
          >
            {loading ? (
              "验证中..."
            ) : (
              <>
                <Unlock className="mr-2 h-4 w-4" /> 解锁
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
