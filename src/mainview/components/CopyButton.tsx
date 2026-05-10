import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClipboard } from "@/hooks/useClipboard";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  value: string;
  className?: string;
}

/** 复制按钮 - 带成功态微交互 */
export default function CopyButton({ value, className }: CopyButtonProps) {
  const { copied, copy } = useClipboard();

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("transition-all", className)}
      onClick={() => copy(value)}
      title={copied ? "已复制" : "复制"}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}
