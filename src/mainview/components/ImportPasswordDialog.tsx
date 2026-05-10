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
import { Loader2 } from "lucide-react";

interface ImportPasswordDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (password: string) => Promise<void>;
}

export default function ImportPasswordDialog({ open, onClose, onConfirm }: ImportPasswordDialogProps) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setPassword("");
    setError(null);
    setLoading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!password) {
      setError("请输入密码");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onConfirm(password);
      handleClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle>导入数据</DialogTitle>
          <DialogDescription>请输入导出该备份文件时使用的主密码，用于解密数据。</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-2">
            <Label htmlFor="import-password">主密码</Label>
            <Input
              id="import-password"
              type="password"
              placeholder="请输入导出时的主密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              autoFocus
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
            确认导入
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
