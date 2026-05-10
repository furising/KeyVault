import { useState, useMemo } from "react";
import { Eye, EyeOff, User, KeyRound, Globe, Mail, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import CopyButton from "./CopyButton";
import type { PasswordEntry } from "@/lib/api";
import { cn } from "@/lib/utils";

interface PasswordDetailProps {
  entry: PasswordEntry;
  onEdit: (entry: PasswordEntry) => void;
  onDelete: (id: number) => void;
}

/** 计算密码强度 */
function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  if (score <= 2) return { score: Math.max(score * 20, 15), label: "弱", color: "bg-red-500" };
  if (score <= 3) return { score: 60, label: "中", color: "bg-yellow-500" };
  if (score <= 4) return { score: 80, label: "强", color: "bg-green-500" };
  return { score: 100, label: "强", color: "bg-green-500" };
}

/** 密码详情面板 - 纯内容区域（标题栏已移至顶部统一栏） */
export default function PasswordDetail({ entry }: PasswordDetailProps) {
  const [showPassword, setShowPassword] = useState(false);

  const strength = useMemo(() => getPasswordStrength(entry.password), [entry.password]);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* 字段区域 */}
      <div className="scrollbar-thin flex-1 overflow-y-auto p-6 sm:p-8">
        <div className="rounded-xl border border-border/60 bg-card">
          {/* 账号 */}
          <FieldRow icon={<User className="h-4 w-4" />} label="账号" value={entry.username} copyable />

          {/* 密码 */}
          <div className="flex items-center border-b border-border/40 px-5 py-4">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <KeyRound className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="w-12 shrink-0 text-sm text-muted-foreground">密码</span>
              <span className="flex-1 font-mono text-sm tracking-wider">
                {showPassword ? entry.password : "••••••••••"}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <CopyButton value={entry.password} className="h-8 w-8" />
            </div>
          </div>

          {/* 邮箱 */}
          {entry.email && <FieldRow icon={<Mail className="h-4 w-4" />} label="邮箱" value={entry.email} copyable />}

          {/* 网址 */}
          {entry.url && (
            <div className="flex items-center border-b border-border/40 px-5 py-4">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="w-12 shrink-0 text-sm text-muted-foreground">网址</span>
                <a
                  href={entry.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 truncate text-sm text-primary hover:underline"
                >
                  {entry.url}
                </a>
              </div>
              <CopyButton value={entry.url} className="h-8 w-8 shrink-0" />
            </div>
          )}

          {/* 描述 */}
          {entry.description && (
            <FieldRow icon={<FileText className="h-4 w-4" />} label="描述" value={entry.description} isLast={true} />
          )}
        </div>

        {/* 密码强度 */}
        <div className="mt-5 rounded-xl border border-border/60 bg-card px-5 py-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">密码强度</span>
            <span className={cn("rounded px-2 py-0.5 text-xs font-medium text-white", strength.color)}>
              {strength.label}
            </span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn("strength-bar h-full rounded-full", strength.color)}
              style={{ width: `${strength.score}%` }}
            />
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <span>最后修改：{formatDate(entry.updated_at)}</span>
            <span>·</span>
            <span>创建时间：{formatDate(entry.created_at)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 通用字段行 */
function FieldRow({
  icon,
  label,
  value,
  copyable,
  isLast,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  copyable?: boolean;
  isLast?: boolean;
}) {
  return (
    <div className={cn("flex items-center px-5 py-4", !isLast && "border-b border-border/40")}>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="shrink-0 text-muted-foreground">{icon}</span>
        <span className="w-12 shrink-0 text-sm text-muted-foreground">{label}</span>
        <span className="flex-1 truncate text-sm">{value}</span>
      </div>
      {copyable && <CopyButton value={value} className="h-8 w-8 shrink-0" />}
    </div>
  );
}
