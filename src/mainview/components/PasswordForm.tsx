import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGroupStore } from "@/stores/groupStore";
import type { CreatePasswordInput, PasswordEntry } from "@/lib/api";
import { Eye, EyeOff } from "lucide-react";
import GroupPasswordDialog from "./GroupPasswordDialog";

interface PasswordFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: CreatePasswordInput) => void;
  initialData?: PasswordEntry | null;
  defaultGroupId?: number | null;
}

/** 密码表单弹窗 - 精致浮层设计 */
export default function PasswordForm({ open, onClose, onSubmit, initialData, defaultGroupId }: PasswordFormProps) {
  const { groups, ungroupedName, isGroupUnlocked, unlockGroup } = useGroupStore();
  const [showPwd, setShowPwd] = useState(false);
  const [verifyGroupInfo, setVerifyGroupInfo] = useState<{ id: number; name: string } | null>(null);
  const [form, setForm] = useState<CreatePasswordInput>({
    app_name: initialData?.app_name ?? "",
    username: initialData?.username ?? "",
    password: initialData?.password ?? "",
    url: initialData?.url ?? "",
    email: initialData?.email ?? "",
    description: initialData?.description ?? "",
    group_id: initialData?.group_id ?? defaultGroupId ?? null,
  });

  useEffect(() => {
    if (open) {
      setForm({
        app_name: initialData?.app_name ?? "",
        username: initialData?.username ?? "",
        password: initialData?.password ?? "",
        url: initialData?.url ?? "",
        email: initialData?.email ?? "",
        description: initialData?.description ?? "",
        group_id: initialData?.group_id ?? defaultGroupId ?? null,
      });
      setShowPwd(false);
    } else {
      setForm({ app_name: "", username: "", password: "", url: "", email: "", description: "", group_id: null });
    }
  }, [open, initialData, defaultGroupId]);

  const update = (field: string, value: string | number | null) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.app_name || !form.username || !form.password) return;
    // 如果目标分组有独立密码且未解锁，需要先验证
    if (form.group_id) {
      const targetGroup = groups.find((g) => g.id === form.group_id);
      if (targetGroup?.has_group_password && !isGroupUnlocked(form.group_id)) {
        setVerifyGroupInfo({ id: form.group_id, name: targetGroup.name });
        return;
      }
    }
    onSubmit(form);
    onClose();
  };

  const handleGroupVerified = (groupId: number) => {
    unlockGroup(groupId);
    setVerifyGroupInfo(null);
    // 验证通过后直接提交
    onSubmit(form);
    onClose();
  };

  const isEdit = !!initialData;

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-lg">{isEdit ? "编辑密码" : "添加密码"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {/* 应用名 + 分组 并排 */}
            <div className="grid grid-cols-2 gap-3">
              <FormField label="应用名" required>
                <Input
                  placeholder="如：GitHub"
                  className="h-10"
                  value={form.app_name}
                  onChange={(e) => update("app_name", e.target.value)}
                />
              </FormField>
              <FormField label="分组">
                <Select
                  value={form.group_id != null ? String(form.group_id) : "none"}
                  onValueChange={(v) => update("group_id", v === "none" ? null : Number(v))}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="选择分组" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{ungroupedName}</SelectItem>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={String(g.id)}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="账号" required>
                <Input
                  placeholder="用户名 / 邮箱"
                  className="h-10"
                  value={form.username}
                  onChange={(e) => update("username", e.target.value)}
                />
              </FormField>

              <FormField label="密码" required>
                <div className="relative">
                  <Input
                    type={showPwd ? "text" : "password"}
                    placeholder="登录密码"
                    className="h-10 pr-10"
                    value={form.password}
                    onChange={(e) => update("password", e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    onClick={() => setShowPwd(!showPwd)}
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="地址">
                <Input
                  placeholder="https://..."
                  className="h-10"
                  value={form.url ?? ""}
                  onChange={(e) => update("url", e.target.value)}
                />
              </FormField>
              <FormField label="邮箱">
                <Input
                  placeholder="关联邮箱"
                  className="h-10"
                  value={form.email ?? ""}
                  onChange={(e) => update("email", e.target.value)}
                />
              </FormField>
            </div>

            <FormField label="描述">
              <Textarea
                placeholder="备注信息"
                value={form.description ?? ""}
                onChange={(e) => update("description", e.target.value)}
                rows={2}
                className="resize-none"
              />
            </FormField>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={onClose} className="h-10">
                取消
              </Button>
              <Button
                type="submit"
                className="gradient-primary h-10 border-0 px-6 text-white shadow-md hover:brightness-110"
                disabled={!form.app_name || !form.username || !form.password}
              >
                {isEdit ? "保存更改" : "添加"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <GroupPasswordDialog
        open={!!verifyGroupInfo}
        groupId={verifyGroupInfo?.id ?? null}
        groupName={verifyGroupInfo?.name ?? ""}
        onClose={() => setVerifyGroupInfo(null)}
        onSuccess={handleGroupVerified}
      />
    </>
  );
}

/** 表单字段包装器 */
function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}
