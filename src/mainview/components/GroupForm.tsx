import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useSettingsStore } from "@/stores/settingsStore";
import { Eye, EyeOff, KeyRound } from "lucide-react";

interface GroupFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string, isPrivate: boolean, groupPassword?: string) => void;
  initialName?: string;
  initialPrivate?: boolean;
  initialGroupPassword?: string;
  hidePrivateToggle?: boolean;
  hidePasswordField?: boolean;
  title?: string;
}

/** 分组表单弹窗 */
export default function GroupForm({
  open,
  onClose,
  onSubmit,
  initialName = "",
  initialPrivate = false,
  initialGroupPassword = "",
  hidePrivateToggle = false,
  hidePasswordField = false,
  title = "新建分组",
}: GroupFormProps) {
  const [name, setName] = useState(initialName);
  const [isPrivate, setIsPrivate] = useState(initialPrivate);
  const [groupPassword, setGroupPassword] = useState(initialGroupPassword);
  const [showPwd, setShowPwd] = useState(false);
  const { togglePrivateHotkey } = useSettingsStore();

  useEffect(() => {
    if (open) {
      setName(initialName);
      setIsPrivate(initialPrivate);
      setGroupPassword(initialGroupPassword);
      setShowPwd(false);
    }
  }, [open, initialName, initialPrivate, initialGroupPassword]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    // 直接以当前密码值提交：有值则设置/更新，空则清除
    onSubmit(name.trim(), isPrivate, groupPassword || "");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="rounded-2xl sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="请输入分组名称"
            className="h-10"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          {!hidePasswordField && (
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                &nbsp; 独立密码（选填）
              </Label>
              <div className="relative">
                <Input
                  type={showPwd ? "text" : "password"}
                  placeholder="设置后查看该分组需验证密码"
                  className="h-10 pr-10"
                  value={groupPassword}
                  onChange={(e) => setGroupPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => setShowPwd(!showPwd)}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}
          {!hidePrivateToggle && (
            <label className="flex cursor-pointer select-none items-center gap-2.5 rounded-lg bg-muted/50 px-3 py-2.5">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              <div className="flex-1">
                <Label className="cursor-pointer text-sm">设为私密分组</Label>
                <p className="text-[11px] text-muted-foreground">按 {togglePrivateHotkey} 切换显示</p>
              </div>
            </label>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              取消
            </Button>
            <Button
              type="submit"
              className="gradient-primary border-0 text-white hover:brightness-110"
              disabled={!name.trim()}
            >
              确定
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
