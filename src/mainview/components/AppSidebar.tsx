import { useState } from "react";
import { useGroupStore } from "@/stores/groupStore";
import { groupApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import {
  Group,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Settings,
  Download,
  Upload,
  EyeOff,
  Eye,
  Lock,
  KeyRound,
  Star,
  Share2,
  Briefcase,
  Landmark,
  Layers,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import GroupForm from "./GroupForm";
import GroupPasswordDialog from "./GroupPasswordDialog";
import ThemeToggle from "./ThemeToggle";
import HotkeySettings from "./HotkeySettings";
import ChangeMasterPasswordDialog from "./ChangeMasterPasswordDialog";
import { useSettingsStore } from "@/stores/settingsStore";
import { cn } from "@/lib/utils";
import SearchBar from "./SearchBar";

interface AppSidebarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onFilterChange?: () => void;
  onExport?: () => void;
  onImport?: () => void;
  onLock?: () => void;
}

/** 侧边栏组件 - 图片参考设计 */
export default function AppSidebar({
  searchValue = "",
  onSearchChange,
  onFilterChange,
  onExport,
  onImport,
  onLock,
}: AppSidebarProps) {
  const {
    groups,
    counts,
    ungroupedCount,
    totalCount,
    activeFilter,
    showPrivate,
    ungroupedName,
    setFilter,
    createGroup,
    updateGroup,
    deleteGroup,
    renameUngrouped,
    togglePrivate,
    unlockGroup,
    isGroupUnlocked,
  } = useGroupStore();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editGroup, setEditGroup] = useState<{ id: number; name: string; groupPassword?: string } | null>(null);
  const [editUngrouped, setEditUngrouped] = useState(false);
  const [showHotkeySettings, setShowHotkeySettings] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [verifyGroup, setVerifyGroup] = useState<{
    id: number;
    name: string;
    action: "enter" | "edit" | "delete";
  } | null>(null);
  const { togglePrivateHotkey } = useSettingsStore();

  const visibleGroups = showPrivate ? groups : groups.filter((g) => !g.is_private);

  const requireGroupPassword = (groupId: number, action: "enter" | "edit" | "delete"): boolean => {
    const group = groups.find((g) => g.id === groupId);
    if (group?.has_group_password && !isGroupUnlocked(groupId)) {
      setVerifyGroup({ id: groupId, name: group.name, action });
      return true;
    }
    return false;
  };

  const commitFilter = (filter: "all" | "ungrouped" | number) => {
    setFilter(filter);
    onFilterChange?.();
  };

  const handleSetFilter = (filter: "all" | "ungrouped" | number) => {
    if (typeof filter === "number" && requireGroupPassword(filter, "enter")) {
      return;
    }
    commitFilter(filter);
  };

  const handleEditGroup = async (g: { id: number; name: string }) => {
    const group = groups.find((gr) => gr.id === g.id);
    if (group?.has_group_password && !isGroupUnlocked(g.id)) {
      setVerifyGroup({ id: g.id, name: g.name, action: "edit" });
      return;
    }
    try {
      const { group_password } = await groupApi.getPassword(g.id);
      setEditGroup({ ...g, groupPassword: group_password || "" });
    } catch {
      setEditGroup({ ...g, groupPassword: "" });
    }
  };

  const handleDeleteGroup = (id: number) => {
    const group = groups.find((g) => g.id === id);
    if (group?.has_group_password) {
      setVerifyGroup({ id, name: group.name, action: "delete" });
      return;
    }
    deleteGroup(id);
  };

  const handleGroupVerified = async (groupId: number) => {
    unlockGroup(groupId);
    const action = verifyGroup?.action;
    const group = groups.find((g) => g.id === groupId);
    setVerifyGroup(null);

    if (action === "enter") {
      commitFilter(groupId);
    } else if (action === "edit" && group) {
      try {
        const { group_password } = await groupApi.getPassword(group.id);
        setEditGroup({ id: group.id, name: group.name, groupPassword: group_password || "" });
      } catch {
        setEditGroup({ id: group.id, name: group.name, groupPassword: "" });
      }
    } else if (action === "delete") {
      deleteGroup(groupId);
    }
  };

  // 根据分组名返回对应图标
  const getGroupIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("常用") || n.includes("收藏")) return <Star className="h-4 w-4" />;
    if (n.includes("社交") || n.includes("媒体")) return <Share2 className="h-4 w-4" />;
    if (n.includes("工作") || n.includes("办公")) return <Briefcase className="h-4 w-4" />;
    if (n.includes("银行") || n.includes("金融") || n.includes("支付")) return <Landmark className="h-4 w-4" />;
    return <Group className="h-4 w-4" />;
  };

  return (
    <div className="flex h-full w-56 flex-col border-r border-sidebar-border bg-sidebar md:w-56">
      {/* 搜索框 */}
      <div className="px-4 pb-3 pt-4">
        <SearchBar value={searchValue} onChange={onSearchChange || (() => {})} />
      </div>

      {/* 分组标题 */}
      <div className="flex items-center justify-between px-5 pb-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">分组</span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setShowCreateForm(true)}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={4}>
              新建分组
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* 导航列表 */}
      <div className="scrollbar-thin flex-1 space-y-0.5 overflow-y-auto px-3">
        {/* 全部密码 */}
        <NavItem
          active={activeFilter === "all"}
          icon={<Layers className="h-4 w-4" />}
          label="全部密码"
          count={totalCount}
          onClick={() => handleSetFilter("all")}
        />

        {/* 默认分组（未分组） */}
        <GroupNavItem
          active={activeFilter === "ungrouped"}
          icon={getGroupIcon(ungroupedName)}
          label={ungroupedName}
          count={ungroupedCount}
          onClick={() => handleSetFilter("ungrouped")}
          onEdit={() => setEditUngrouped(true)}
        />

        {/* 自定义分组 */}
        {visibleGroups.map((g) => (
          <GroupNavItem
            key={g.id}
            active={activeFilter === g.id}
            icon={getGroupIcon(g.name)}
            label={g.name}
            count={counts[g.id] || 0}
            isPrivate={!!g.is_private}
            hasPassword={!!g.has_group_password}
            onClick={() => handleSetFilter(g.id)}
            onEdit={() => handleEditGroup({ id: g.id, name: g.name })}
            onDelete={() => handleDeleteGroup(g.id)}
          />
        ))}
      </div>

      {/* 底部区域 */}
      <div className="space-y-2 border-t border-sidebar-border px-4 py-4">
        {showPrivate && (
          <button
            className="w-full cursor-pointer rounded-md px-2 py-1.5 text-left text-[11px] font-medium text-amber-500 transition-colors hover:bg-amber-500/10"
            onClick={() => setShowHotkeySettings(true)}
          >
            私密模式 · {togglePrivateHotkey}
          </button>
        )}

        {/* 设置、主题切换和锁定 */}
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-0"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="min-w-[140px]">
              <DropdownMenuItem onClick={onImport}>
                <Download className="mr-2 h-3.5 w-3.5" /> 导入数据
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExport}>
                <Upload className="mr-2 h-3.5 w-3.5" /> 导出数据
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={togglePrivate}>
                {showPrivate ? <EyeOff className="mr-2 h-3.5 w-3.5" /> : <Eye className="mr-2 h-3.5 w-3.5" />}
                {showPrivate ? "关闭私密模式" : "开启私密模式"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowHotkeySettings(true)}>
                <Settings className="mr-2 h-3.5 w-3.5" /> 快捷键设置
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowChangePassword(true)}>
                <KeyRound className="mr-2 h-3.5 w-3.5" /> 修改主密码
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <ThemeToggle variant="dropdown" />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-0"
            onClick={onLock}
            title="锁定 (F5)"
          >
            <Lock className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 弹窗 */}
      <GroupForm
        open={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        onSubmit={(name, isPrivate, groupPassword) => createGroup(name, isPrivate, groupPassword || undefined)}
      />
      {editGroup && (
        <GroupForm
          open={true}
          onClose={() => setEditGroup(null)}
          onSubmit={async (name, isPrivate, groupPassword) => {
            await updateGroup(editGroup.id, {
              name,
              is_private: isPrivate,
              group_password: groupPassword === undefined ? undefined : groupPassword || null,
            });
            setEditGroup(null);
          }}
          initialName={editGroup.name}
          initialPrivate={!!groups.find((g) => g.id === editGroup.id)?.is_private}
          initialGroupPassword={editGroup.groupPassword || ""}
          title="编辑分组"
        />
      )}
      <GroupForm
        open={editUngrouped}
        onClose={() => setEditUngrouped(false)}
        onSubmit={(name) => {
          renameUngrouped(name);
          setEditUngrouped(false);
        }}
        initialName={ungroupedName}
        hidePrivateToggle
        hidePasswordField
        title="编辑分组名称"
      />
      <HotkeySettings open={showHotkeySettings} onClose={() => setShowHotkeySettings(false)} />
      <ChangeMasterPasswordDialog open={showChangePassword} onClose={() => setShowChangePassword(false)} />
      <GroupPasswordDialog
        open={!!verifyGroup}
        groupId={verifyGroup?.id ?? null}
        groupName={verifyGroup?.name ?? ""}
        onClose={() => setVerifyGroup(null)}
        onSuccess={handleGroupVerified}
      />
    </div>
  );
}

/** 顶级导航项 */
function NavItem({
  active,
  icon,
  label,
  count,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-all",
        active
          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent/50",
      )}
      onClick={onClick}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      <span
        className={cn(
          "min-w-[20px] rounded-full bg-muted px-1.5 py-0.5 text-center text-[11px] tabular-nums",
          active ? "bg-primary/15 text-primary" : "text-muted-foreground",
        )}
      >
        {count}
      </span>
    </button>
  );
}

/** 分组导航项（带操作菜单） */
function GroupNavItem({
  active,
  icon,
  label,
  count,
  isPrivate,
  hasPassword,
  onClick,
  onEdit,
  onDelete,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  count: number;
  isPrivate?: boolean;
  hasPassword?: boolean;
  onClick: () => void;
  onEdit: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="group flex items-center">
      <button
        className={cn(
          "flex flex-1 items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-all",
          active
            ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
            : "text-sidebar-foreground hover:bg-sidebar-accent/50",
          isPrivate && !active && "text-amber-600 dark:text-amber-400",
        )}
        onClick={onClick}
      >
        {icon}
        <span className="flex-1 truncate text-left">{label}</span>
        {hasPassword && <Lock className="h-3 w-3 text-muted-foreground/60" />}
        <span
          className={cn(
            "min-w-[20px] rounded-full bg-muted px-1.5 py-0.5 text-center text-[11px] tabular-nums",
            active ? "bg-primary/15 text-primary" : "text-muted-foreground",
          )}
        >
          {count}
        </span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
          >
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[120px]">
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="mr-2 h-3.5 w-3.5" /> 编辑
          </DropdownMenuItem>
          {onDelete && (
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}>
              <Trash2 className="mr-2 h-3.5 w-3.5" /> 删除
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
