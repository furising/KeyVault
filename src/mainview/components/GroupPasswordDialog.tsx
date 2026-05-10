import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { KeyRound, Eye, EyeOff } from "lucide-react";
import { groupApi } from "@/lib/api";

interface GroupPasswordDialogProps {
  open: boolean;
  groupId: number | null;
  groupName: string;
  onClose: () => void;
  onSuccess: (groupId: number) => void;
}

/** 分组独立密码验证弹窗 */
export default function GroupPasswordDialog({
  open,
  groupId,
  groupName,
  onClose,
  onSuccess,
}: GroupPasswordDialogProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !groupId) return;
    setError("");
    setLoading(true);
    try {
      await groupApi.verifyPassword(groupId, password);
      setPassword("");
      onSuccess(groupId);
    } catch {
      setError("密码错误，请重试");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPassword("");
    setError("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="rounded-2xl sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" />
            输入分组密码
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-muted-foreground">分组「{groupName}」设置了独立密码，请验证后查看。</p>
          <div className="relative">
            <Input
              type={showPwd ? "text" : "password"}
              placeholder="请输入分组密码"
              className="h-10 pr-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
          {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={handleClose}>
              取消
            </Button>
            <Button
              type="submit"
              className="gradient-primary border-0 text-white hover:brightness-110"
              disabled={loading || !password}
            >
              {loading ? "验证中..." : "确认"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
