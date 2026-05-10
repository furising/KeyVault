import { ChevronRight } from "lucide-react";
import type { PasswordEntry } from "@/lib/api";
import { cn } from "@/lib/utils";

interface PasswordCardProps {
  entry: PasswordEntry;
  selected?: boolean;
  onClick: () => void;
}

/** 预定义的图标颜色 - 匹配图片设计风格 */
const ICON_COLORS = [
  { bg: "bg-red-500", text: "text-white" },
  { bg: "bg-blue-500", text: "text-white" },
  { bg: "bg-green-600", text: "text-white" },
  { bg: "bg-purple-500", text: "text-white" },
  { bg: "bg-orange-500", text: "text-white" },
  { bg: "bg-cyan-500", text: "text-white" },
  { bg: "bg-pink-500", text: "text-white" },
  { bg: "bg-indigo-500", text: "text-white" },
  { bg: "bg-teal-500", text: "text-white" },
  { bg: "bg-amber-500", text: "text-white" },
];

function getColorByName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return ICON_COLORS[Math.abs(hash) % ICON_COLORS.length];
}

/** 密码卡片 - 图片参考设计：圆形头像 + 名称/邮箱 + 右箭头 */
export default function PasswordCard({ entry, selected, onClick }: PasswordCardProps) {
  const initial = entry.app_name.charAt(0).toUpperCase();
  const color = getColorByName(entry.app_name);

  return (
    <div
      onClick={onClick}
      className={cn(
        "group flex cursor-pointer items-center gap-3 border-b border-border/40 px-4 py-3.5 transition-all duration-150",
        selected ? "bg-accent dark:bg-accent" : "hover:bg-muted/50",
      )}
    >
      {/* 方形圆角彩色图标 */}
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold",
          color.bg,
          color.text,
        )}
      >
        {initial}
      </div>

      {/* 信息 */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-tight">{entry.app_name}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">{entry.username || entry.email || ""}</p>
      </div>

      {/* 右箭头 */}
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
    </div>
  );
}
