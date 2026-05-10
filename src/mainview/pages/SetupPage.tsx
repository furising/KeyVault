import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, ArrowRight, Eye, EyeOff } from "lucide-react";

/** 首次设置主密码页面 - 沉浸式全屏设计 */
export default function SetupPage() {
  const { setup, loading, error } = useAuthStore();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [localError, setLocalError] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");
    if (password.length < 6) {
      setLocalError("密码长度至少 6 位");
      return;
    }
    if (password !== confirm) {
      setLocalError("两次输入的密码不一致");
      return;
    }
    await setup(password);
  };

  const displayError = localError || error;
  const strength = password.length >= 12 ? "强" : password.length >= 8 ? "中" : password.length >= 6 ? "弱" : "";
  const strengthColor =
    password.length >= 12
      ? "bg-emerald-500"
      : password.length >= 8
        ? "bg-amber-500"
        : password.length >= 6
          ? "bg-red-400"
          : "bg-border";
  const strengthWidth =
    password.length >= 12 ? "w-full" : password.length >= 8 ? "w-2/3" : password.length >= 6 ? "w-1/3" : "w-0";

  return (
    <div
      className="relative flex h-screen items-center justify-center overflow-hidden bg-background"
      data-tauri-drag-region
    >
      {/* 装饰性背景 */}
      <div className="pointer-events-none absolute inset-0">
        <div className="bg-primary/8 absolute -left-32 -top-32 h-96 w-96 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md px-4 sm:px-6">
        {/* Logo 区域 */}
        <div className="mb-6 text-center sm:mb-10">
          {/* <div className="gradient-primary shadow-elevated mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl sm:mb-5 sm:h-16 sm:w-16">
            <Shield className="h-7 w-7 text-white sm:h-8 sm:w-8" />
          </div> */}
          <img
            src="/icon.svg"
            alt="KeyVault"
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl sm:mb-5 sm:h-16 sm:w-16"
          />
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">欢迎使用 KeyVault</h1>
          <p className="mt-1.5 text-sm text-muted-foreground sm:mt-2">设置主密码来保护您的所有凭证数据</p>
        </div>

        {/* 表单卡片 */}
        <div className="shadow-soft rounded-2xl border bg-card p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                主密码
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  placeholder="至少 6 位字符"
                  className="h-11 pr-10"
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
              {/* 密码强度指示器 */}
              {password && (
                <div className="flex items-center gap-2">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-border">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${strengthColor} ${strengthWidth}`}
                    />
                  </div>
                  <span className="text-[11px] text-muted-foreground">{strength}</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                确认密码
              </Label>
              <div className="relative">
                <Input
                  id="confirm"
                  type={showConfirm ? "text" : "password"}
                  placeholder="再次输入主密码"
                  className="h-11 pr-10"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value.replace(/\s/g, ""))}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => setShowConfirm(!showConfirm)}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {displayError && (
              <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{displayError}</div>
            )}
            <Button
              type="submit"
              className="gradient-primary h-11 w-full border-0 text-white shadow-md transition-all hover:shadow-lg hover:brightness-110"
              disabled={loading}
            >
              {loading ? (
                "设置中..."
              ) : (
                <>
                  <span>开始使用</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </div>
        <div className="mt-4 space-y-2 rounded-lg bg-amber-500/10 px-4 py-3 text-xs text-amber-600 dark:text-amber-400">
          <p className="flex items-start gap-1.5">
            <span className="shrink-0">⚠</span>
            <span>主密码是数据的唯一密钥，所有数据都将使用主密码进行加密</span>
          </p>
          <p className="flex items-start gap-1.5">
            <span className="shrink-0">⚠</span>
            <span>导入的数据需要输入导出数据时的主密码</span>
          </p>
          <p className="flex items-start gap-1.5">
            <span className="shrink-0">⚠</span>
            <span>主密码不可恢复，请牢记</span>
          </p>
        </div>
      </div>
    </div>
  );
}
