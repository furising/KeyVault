import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSettingsStore, DEFAULT_TOGGLE_PRIVATE_HOTKEY } from "@/stores/settingsStore";
import { useToast } from "@/hooks/use-toast";
import { Keyboard } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

function eventToHotkey(e: React.KeyboardEvent): string | null {
  const ignoreKeys = ["Control", "Shift", "Alt", "Meta"];
  if (ignoreKeys.includes(e.key)) return null;
  const parts: string[] = [];
  if (e.ctrlKey) parts.push("Ctrl");
  if (e.shiftKey) parts.push("Shift");
  if (e.altKey) parts.push("Alt");
  if (e.metaKey) parts.push("Cmd");
  const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
  parts.push(key);
  return parts.join("+");
}

/** 快捷键设置弹窗 */
export default function HotkeySettings({ open, onClose }: Props) {
  const { togglePrivateHotkey, setTogglePrivateHotkey } = useSettingsStore();
  const { toast } = useToast();
  const [recording, setRecording] = useState(false);
  const [pendingHotkey, setPendingHotkey] = useState<string | null>(null);

  const displayHotkey = pendingHotkey ?? togglePrivateHotkey;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!recording) return;
      e.preventDefault();
      e.stopPropagation();
      const hotkey = eventToHotkey(e);
      if (hotkey) {
        setPendingHotkey(hotkey);
        setRecording(false);
      }
    },
    [recording],
  );

  const handleSave = useCallback(async () => {
    if (!pendingHotkey) {
      onClose();
      return;
    }
    try {
      await setTogglePrivateHotkey(pendingHotkey);
      toast({ title: "快捷键已更新", description: `私密分组切换快捷键设为 ${pendingHotkey}` });
      setPendingHotkey(null);
      onClose();
    } catch {
      toast({ title: "保存失败", variant: "destructive" });
    }
  }, [pendingHotkey, setTogglePrivateHotkey, onClose, toast]);

  const handleReset = useCallback(async () => {
    await setTogglePrivateHotkey(DEFAULT_TOGGLE_PRIVATE_HOTKEY);
    setPendingHotkey(null);
    toast({ title: "已恢复默认", description: `快捷键已重置为 ${DEFAULT_TOGGLE_PRIVATE_HOTKEY}` });
  }, [setTogglePrivateHotkey, toast]);

  const handleClose = useCallback(() => {
    setPendingHotkey(null);
    setRecording(false);
    onClose();
  }, [onClose]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="rounded-2xl sm:max-w-[380px]" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-4 w-4" /> 快捷键设置
          </DialogTitle>
          <DialogDescription>自定义私密分组显示/隐藏的快捷键</DialogDescription>
        </DialogHeader>

        <div className="py-3">
          <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
            <span className="text-sm">切换私密分组</span>
            <Button
              variant={recording ? "default" : "outline"}
              size="sm"
              className={`min-w-[120px] font-mono text-xs ${recording ? "gradient-primary animate-pulse border-0 text-white" : ""}`}
              onClick={() => setRecording(!recording)}
            >
              {recording ? "按下快捷键..." : displayHotkey}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" className="mr-auto text-xs text-muted-foreground" onClick={handleReset}>
            恢复默认
          </Button>
          <Button variant="ghost" onClick={handleClose}>
            取消
          </Button>
          <Button
            className="gradient-primary border-0 text-white hover:brightness-110"
            onClick={handleSave}
            disabled={!pendingHotkey}
          >
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
