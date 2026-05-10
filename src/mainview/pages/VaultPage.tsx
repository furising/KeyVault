import { useEffect, useState, useCallback } from "react";
import { Plus, KeyRound, Menu, ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useGroupStore } from "@/stores/groupStore";
import { usePasswordStore } from "@/stores/passwordStore";
import { useAuthStore } from "@/stores/authStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useSearch } from "@/hooks/useSearch";
import { useResponsive } from "@/hooks/useResponsive";
import { backupApi, type CreatePasswordInput, type PasswordEntry } from "@/lib/api";
import AppSidebar from "@/components/AppSidebar";
import PasswordCard from "@/components/PasswordCard";
import PasswordDetail from "@/components/PasswordDetail";
import PasswordForm from "@/components/PasswordForm";
import GroupPasswordDialog from "@/components/GroupPasswordDialog";
import ImportPasswordDialog from "@/components/ImportPasswordDialog";
import { cn } from "@/lib/utils";
import { getCurrentWindow } from "@tauri-apps/api/window";

/** 预定义的图标颜色 */
const ICON_COLORS = [
  "bg-red-500",
  "bg-blue-500",
  "bg-green-600",
  "bg-purple-500",
  "bg-orange-500",
  "bg-cyan-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-teal-500",
  "bg-amber-500",
];
function getColorByName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return ICON_COLORS[Math.abs(hash) % ICON_COLORS.length];
}

/** 密码库主页面 - 三栏布局（响应式） */
export default function VaultPage() {
  const { toast } = useToast();
  const { activeFilter, showPrivate, groups, loadGroups, togglePrivate, isGroupUnlocked, unlockGroup } =
    useGroupStore();
  const { togglePrivateHotkey, loadSettings } = useSettingsStore();
  const {
    passwords,
    selected,
    loading,
    searchKeyword,
    loadPasswords,
    selectPassword,
    setSearch,
    createPassword,
    updatePassword,
    deletePassword,
    refreshSelected,
  } = usePasswordStore();
  const { lock } = useAuthStore();
  const { isMobile, sidebarOpen, showDetail, openSidebar, closeSidebar, openDetail, closeDetail } = useResponsive();

  const debouncedSearch = useSearch(searchKeyword, 300);

  const [formOpen, setFormOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<PasswordEntry | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [importData, setImportData] = useState<unknown>(null);
  const [verifyForPassword, setVerifyForPassword] = useState<{
    groupId: number;
    groupName: string;
    entry: PasswordEntry;
  } | null>(null);

  const getListTitle = () => {
    if (activeFilter === "all") return "全部密码";
    if (activeFilter === "ungrouped") {
      const { ungroupedName } = useGroupStore.getState();
      return ungroupedName;
    }
    const group = groups.find((g) => g.id === activeFilter);
    return group?.name || "密码";
  };

  useEffect(() => {
    loadGroups();
    loadSettings();
  }, [loadGroups, loadSettings]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F5") {
        e.preventDefault();
        lock();
      }
      const parts = togglePrivateHotkey.split("+").map((s) => s.trim().toLowerCase());
      const key = parts[parts.length - 1];
      const needCtrl = parts.includes("ctrl");
      const needShift = parts.includes("shift");
      const needAlt = parts.includes("alt");
      const needMeta = parts.includes("meta") || parts.includes("cmd");

      if (
        e.key.toLowerCase() === key.toLowerCase() &&
        e.ctrlKey === needCtrl &&
        e.shiftKey === needShift &&
        e.altKey === needAlt &&
        e.metaKey === needMeta
      ) {
        e.preventDefault();
        togglePrivate();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lock, togglePrivate, togglePrivateHotkey]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        lock();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [lock]);

  useEffect(() => {
    loadPasswords(activeFilter, debouncedSearch, showPrivate);
    selectPassword(null);
    if (isMobile) {
      closeDetail();
    }
  }, [activeFilter, debouncedSearch, showPrivate, loadPasswords]);

  useEffect(() => {
    setSearch("");
  }, [activeFilter]);

  useEffect(() => {
    loadGroups();
    if (!showPrivate && selected?.group_id) {
      const group = groups.find((g) => g.id === selected.group_id);
      if (group?.is_private) {
        selectPassword(null);
      }
    }
  }, [showPrivate, loadGroups]);

  const handleCreate = useCallback(
    async (input: CreatePasswordInput) => {
      try {
        await createPassword(input);
        await loadPasswords(activeFilter, debouncedSearch, showPrivate);
        await loadGroups();
        toast({ title: "添加成功" });
      } catch (e: any) {
        toast({ title: "添加失败", description: e.message, variant: "destructive" });
      }
    },
    [createPassword, loadPasswords, loadGroups, activeFilter, debouncedSearch, showPrivate, toast],
  );

  const handleUpdate = useCallback(
    async (input: CreatePasswordInput) => {
      if (!editEntry) return;
      try {
        await updatePassword(editEntry.id, input);
        await loadPasswords(activeFilter, debouncedSearch, showPrivate);
        await loadGroups();
        await refreshSelected(editEntry.id);
        toast({ title: "更新成功" });
      } catch (e: any) {
        toast({ title: "更新失败", description: e.message, variant: "destructive" });
      }
      setEditEntry(null);
    },
    [
      editEntry,
      updatePassword,
      loadPasswords,
      loadGroups,
      refreshSelected,
      activeFilter,
      debouncedSearch,
      showPrivate,
      toast,
    ],
  );

  const handleDelete = useCallback((id: number) => {
    setDeleteId(id);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (deleteId === null) return;
    try {
      await deletePassword(deleteId);
      await loadPasswords(activeFilter, debouncedSearch, showPrivate);
      await loadGroups();
      toast({ title: "已删除" });
    } catch (e: any) {
      toast({ title: "删除失败", description: e.message, variant: "destructive" });
    }
    setDeleteId(null);
  }, [deleteId, deletePassword, loadPasswords, loadGroups, activeFilter, debouncedSearch, showPrivate, toast]);

  const handleExport = useCallback(async () => {
    try {
      const data = await backupApi.export();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `keyvault-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "导出成功" });
    } catch (e: any) {
      toast({ title: "导出失败", description: e.message, variant: "destructive" });
    }
  }, [toast]);

  const handleImport = useCallback(async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        setImportData(data);
      } catch (e: any) {
        toast({ title: "导入失败", description: e.message, variant: "destructive" });
      }
    };
    input.click();
  }, [toast]);

  const handleImportConfirm = useCallback(
    async (password: string) => {
      if (!importData) return;
      const result = await backupApi.import(importData, password);
      await loadPasswords(activeFilter, debouncedSearch, showPrivate);
      await loadGroups();
      toast({ title: "导入完成", description: `导入 ${result.imported} 条，跳过 ${result.skipped} 条` });
      setImportData(null);
    },
    [importData, loadPasswords, loadGroups, activeFilter, debouncedSearch, showPrivate, toast],
  );

  const openEdit = useCallback((entry: PasswordEntry) => {
    setEditEntry(entry);
    setFormOpen(true);
  }, []);

  const openCreate = useCallback(() => {
    setEditEntry(null);
    setFormOpen(true);
  }, []);

  const handleSelectPassword = useCallback(
    (pw: PasswordEntry) => {
      if (pw.group_id) {
        const group = groups.find((g) => g.id === pw.group_id);
        if (group?.has_group_password && !isGroupUnlocked(pw.group_id)) {
          setVerifyForPassword({ groupId: pw.group_id, groupName: group.name, entry: pw });
          return;
        }
      }
      selectPassword(pw);
      if (isMobile) {
        openDetail();
      }
    },
    [selectPassword, isMobile, openDetail, groups, isGroupUnlocked],
  );

  const handlePasswordVerified = useCallback(
    (groupId: number) => {
      unlockGroup(groupId);
      if (verifyForPassword) {
        selectPassword(verifyForPassword.entry);
        if (isMobile) {
          openDetail();
        }
      }
      setVerifyForPassword(null);
    },
    [unlockGroup, verifyForPassword, selectPassword, isMobile, openDetail],
  );

  const handleSidebarFilterChange = useCallback(() => {
    if (isMobile) {
      closeSidebar();
    }
  }, [isMobile, closeSidebar]);

  return (
    <div className="flex h-screen flex-col bg-card">
      {/* 标题栏拖拽区域 */}
      <div
        className="h-7 w-full shrink-0 border-b border-border/60"
        data-tauri-drag-region
        onMouseDown={() => getCurrentWindow().startDragging()}
      />
      {/* 统一顶部栏 */}
      <div className="flex shrink-0 items-center border-b border-border/60">
        {/* 侧边栏区域标题 */}
        <div
          className={cn("flex items-center gap-2.5 border-r border-border/60 px-5 py-5", isMobile ? "w-auto" : "w-56")}
        >
          {isMobile && (
            <Button size="sm" variant="ghost" className="h-8 w-8 shrink-0 p-0" onClick={openSidebar}>
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <img src="/icon.svg" alt="KeyVault" className="h-8 w-8 rounded-sm" />
          <span className="text-lg font-bold tracking-tight">KeyVault</span>
        </div>

        {/* 中间列表区域标题 */}
        <div
          className={cn(
            "flex items-center justify-between border-r border-border/60 px-4 py-3",
            isMobile ? "flex-1" : "w-80 lg:w-[340px]",
            isMobile && showDetail && "hidden",
          )}
        >
          <h1 className="text-base font-bold">{getListTitle()}</h1>
          <Button
            size="sm"
            className="h-8 gap-1.5 rounded-lg bg-foreground px-3 text-xs text-background hover:bg-foreground/90 dark:bg-foreground dark:text-background dark:hover:bg-foreground/80"
            onClick={openCreate}
          >
            <Plus className="h-3.5 w-3.5" /> 添加
          </Button>
        </div>

        {/* 右侧详情区域标题 */}
        <div className={cn("flex flex-1 items-center justify-between px-5 py-3", isMobile && !showDetail && "hidden")}>
          {isMobile && showDetail && (
            <Button variant="ghost" size="sm" className="gap-1" onClick={closeDetail}>
              <ArrowLeft className="h-4 w-4" /> 返回
            </Button>
          )}
          {selected ? (
            <>
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white",
                    getColorByName(selected.app_name),
                  )}
                >
                  {selected.app_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-base font-bold leading-tight">{selected.app_name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {groups.find((g) => g.id === selected.group_id)?.name || useGroupStore.getState().ungroupedName}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 rounded-lg text-xs"
                  onClick={() => openEdit(selected)}
                >
                  <Pencil className="h-3 w-3" /> 编辑
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 rounded-lg border-destructive/30 text-xs text-destructive hover:bg-destructive hover:text-white"
                  onClick={() => handleDelete(selected.id)}
                >
                  <Trash2 className="h-3 w-3" /> 删除
                </Button>
              </div>
            </>
          ) : (
            <div />
          )}
        </div>
      </div>

      {/* 主体内容 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 侧边栏 */}
        {isMobile ? (
          <>
            {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={closeSidebar} />}
            <div
              className={cn(
                "fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out",
                sidebarOpen ? "translate-x-0" : "-translate-x-full",
              )}
            >
              <AppSidebar
                searchValue={searchKeyword}
                onSearchChange={setSearch}
                onFilterChange={handleSidebarFilterChange}
                onExport={handleExport}
                onImport={handleImport}
                onLock={lock}
              />
            </div>
          </>
        ) : (
          <AppSidebar
            searchValue={searchKeyword}
            onSearchChange={setSearch}
            onExport={handleExport}
            onImport={handleImport}
            onLock={lock}
          />
        )}

        {/* 中间列表 */}
        <div
          className={cn(
            "flex flex-col border-r border-border/60 bg-card",
            isMobile ? "w-full" : "w-80 lg:w-[340px]",
            isMobile && showDetail && "hidden",
          )}
        >
          <div className="scrollbar-thin flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="mt-3 text-xs text-muted-foreground">加载中</p>
              </div>
            ) : passwords.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                  <KeyRound className="h-5 w-5 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground">暂无密码记录</p>
                <p className="mt-1 text-xs text-muted-foreground/60">点击上方「添加」按钮创建</p>
              </div>
            ) : (
              passwords.map((pw) => (
                <PasswordCard
                  key={pw.id}
                  entry={pw}
                  selected={selected?.id === pw.id}
                  onClick={() => handleSelectPassword(pw)}
                />
              ))
            )}
          </div>
        </div>

        {/* 右侧详情 */}
        <div
          className={cn(
            "flex flex-1 flex-col bg-background",
            isMobile && "fixed inset-0 z-30 bg-background pt-14",
            isMobile && !showDetail && "hidden",
          )}
        >
          {selected ? (
            <PasswordDetail entry={selected} onEdit={openEdit} onDelete={handleDelete} />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/60">
                <KeyRound className="h-7 w-7 text-muted-foreground/30" />
              </div>
              <p className="text-sm text-muted-foreground">选择一个密码查看详情</p>
            </div>
          )}
        </div>
      </div>

      {/* 表单弹窗 */}
      <PasswordForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditEntry(null);
        }}
        onSubmit={editEntry ? handleUpdate : handleCreate}
        initialData={editEntry}
        defaultGroupId={typeof activeFilter === "number" ? activeFilter : null}
      />

      {/* 删除确认 */}
      <Dialog open={deleteId !== null} onOpenChange={(v) => !v && setDeleteId(null)}>
        <DialogContent className="rounded-2xl sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>删除后无法恢复，确定要删除该条密码记录吗？</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteId(null)}>
              取消
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <GroupPasswordDialog
        open={!!verifyForPassword}
        groupId={verifyForPassword?.groupId ?? null}
        groupName={verifyForPassword?.groupName ?? ""}
        onClose={() => setVerifyForPassword(null)}
        onSuccess={handlePasswordVerified}
      />

      <ImportPasswordDialog open={!!importData} onClose={() => setImportData(null)} onConfirm={handleImportConfirm} />
    </div>
  );
}
