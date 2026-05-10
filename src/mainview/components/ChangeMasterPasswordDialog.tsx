import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "@/hooks/use-toast";
import { KeyRound, Loader2 } from "lucide-react";

interface ChangeMasterPasswordDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function ChangeMasterPasswordDialog({ open, onClose }: ChangeMasterPasswordDialogProps) {
  const { changePassword, loading } = useAuthStore();
  const { toast } = useToast();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    setError(null);

    if (!oldPassword) {
      setError("请输入当前密码");
      return;
    }
    if (!newPassword) {
      setError("请输入新密码");
      return;
    }
    if (newPassword.length < 6) {
      setError("新密码长度至少为 6 位");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("两次输入的新密码不一致");
      return;
    }
    if (oldPassword === newPassword) {
      setError("新密码不能与当前密码相同");
      return;
    }

    try {
      const success = await changePassword(oldPassword, newPassword);
      if (success) {
        toast({
          title: "主密码已修改",
          description: "所有密码数据已使用新密钥重新加密",
        });
        handleClose();
      } else {
        setError(useAuthStore.getState().error || "修改失败，请重试");
      }
    } catch {
      setError(useAuthStore.getState().error || "修改失败，请重试");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            修改主密码
          </DialogTitle>
          <DialogDescription>修改主密码将会用新密钥重新加密所有已存储的密码数据。</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="old-password">当前密码</Label>
            <Input
              id="old-password"
              type="password"
              placeholder="请输入当前主密码"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">新密码</Label>
            <Input
              id="new-password"
              type="password"
              placeholder="请输入新主密码（至少 6 位）"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">确认新密码</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="请再次输入新主密码"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="gradient-primary text-white">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            确认修改
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
