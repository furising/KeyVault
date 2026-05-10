import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  /** "dropdown" = 默认下拉菜单, "switch" = 简单开关样式 */
  variant?: "dropdown" | "switch";
}

/** 主题切换组件 */
export default function ThemeToggle({ variant = "dropdown" }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  // switch 模式 - 类似图片中的"浅色模式"开关
  if (variant === "switch") {
    const isLight =
      theme === "light" || (theme === "system" && !window.matchMedia("(prefers-color-scheme: dark)").matches);

    return (
      <button
        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent/60"
        onClick={() => setTheme(isLight ? "dark" : "light")}
      >
        <Sun className="h-4 w-4" />
        <span className="flex-1 text-left">浅色模式</span>
        <div
          className={cn(
            "relative h-5 w-9 rounded-full transition-colors duration-200",
            isLight ? "bg-primary" : "bg-muted-foreground/30",
          )}
        >
          <div
            className={cn(
              "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200",
              isLight ? "translate-x-4" : "translate-x-0.5",
            )}
          />
        </div>
      </button>
    );
  }

  // dropdown 模式 - 原始下拉菜单
  const icon =
    theme === "dark" ? (
      <Moon className="h-4 w-4" />
    ) : theme === "light" ? (
      <Sun className="h-4 w-4" />
    ) : (
      <Monitor className="h-4 w-4" />
    );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-0"
          title="切换主题"
        >
          {icon}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" side="top" className="min-w-[120px]">
        <DropdownMenuItem onClick={() => setTheme("light")} className="gap-2">
          <Sun className="h-3.5 w-3.5" /> 亮色
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")} className="gap-2">
          <Moon className="h-3.5 w-3.5" /> 暗色
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")} className="gap-2">
          <Monitor className="h-3.5 w-3.5" /> 系统
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
