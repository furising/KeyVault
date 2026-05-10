/**
 * 分组状态管理
 */
import { create } from "zustand";
import { groupApi, passwordApi, settingsApi, type Group } from "@/lib/api";

/** 未分组名称的设置 key */
const UNGROUPED_NAME_KEY = "ungrouped_name";
const DEFAULT_UNGROUPED_NAME = "默认分组";

/** 筛选类型：全部 | 未分组 | 指定分组ID */
export type FilterType = "all" | "ungrouped" | number;

interface GroupState {
  groups: Group[];
  counts: Record<number, number>;
  ungroupedCount: number;
  totalCount: number;
  /** 当前筛选条件 */
  activeFilter: FilterType;
  /** 是否显示私密分组 */
  showPrivate: boolean;
  /** 未分组的自定义名称 */
  ungroupedName: string;
  loading: boolean;
  /** 已验证密码的分组ID集合（仅当前会话有效，切换即失效） */
  unlockedGroups: Set<number>;
  /** 加载分组列表 */
  loadGroups: () => Promise<void>;
  /** 设置筛选条件 */
  setFilter: (filter: FilterType) => void;
  /** 切换私密分组的显示/隐藏 */
  togglePrivate: () => void;
  /** 创建分组 */
  createGroup: (name: string, isPrivate?: boolean, groupPassword?: string) => Promise<void>;
  /** 更新分组 */
  updateGroup: (id: number, data: { name?: string; is_private?: boolean; group_password?: string | null }) => Promise<void>;
  /** 删除分组 */
  deleteGroup: (id: number) => Promise<void>;
  /** 重命名"未分组" */
  renameUngrouped: (name: string) => Promise<void>;
  /** 删除所有未分组密码 */
  deleteUngrouped: () => Promise<number>;
  /** 临时解锁分组（仅用于当前操作） */
  unlockGroup: (id: number) => void;
  /** 检查分组是否已解锁 */
  isGroupUnlocked: (id: number) => boolean;
  /** 锁定指定分组 */
  lockGroup: (id: number) => void;
  /** 锁定所有分组（清除验证状态） */
  lockAllGroups: () => void;
}

export const useGroupStore = create<GroupState>((set, get) => ({
  groups: [],
  counts: {},
  ungroupedCount: 0,
  totalCount: 0,
  activeFilter: "all",
  showPrivate: false,
  ungroupedName: DEFAULT_UNGROUPED_NAME,
  loading: false,
  unlockedGroups: new Set(),

  loadGroups: async () => {
    set({ loading: true });
    try {
      const { showPrivate } = get();
      const data = await groupApi.getAll(showPrivate);
      // 同时加载未分组名称
      try {
        const { value } = await settingsApi.get(UNGROUPED_NAME_KEY);
        if (value) set({ ungroupedName: value });
      } catch {
        // 首次使用默认名称
      }
      set({ ...data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  setFilter: (filter) => set({ activeFilter: filter }),

  togglePrivate: () => {
    const { showPrivate, activeFilter, groups } = get();
    const next = !showPrivate;
    if (!next && typeof activeFilter === "number") {
      const group = groups.find((g) => g.id === activeFilter);
      if (group?.is_private) {
        set({ showPrivate: next, activeFilter: "all" });
        return;
      }
    }
    set({ showPrivate: next });
  },

  createGroup: async (name, isPrivate = false, groupPassword?: string) => {
    await groupApi.create(name, isPrivate, groupPassword);
    await get().loadGroups();
  },

  updateGroup: async (id, data) => {
    await groupApi.update(id, data);
    await get().loadGroups();
  },

  deleteGroup: async (id) => {
    await groupApi.delete(id);
    const { activeFilter } = get();
    if (activeFilter === id) set({ activeFilter: "all" });
    await get().loadGroups();
  },

  renameUngrouped: async (name) => {
    await settingsApi.set(UNGROUPED_NAME_KEY, name);
    set({ ungroupedName: name });
  },

  deleteUngrouped: async () => {
    const result = await passwordApi.deleteUngrouped();
    const { activeFilter } = get();
    if (activeFilter === "ungrouped") set({ activeFilter: "all" });
    await get().loadGroups();
    return result;
  },

  unlockGroup: (id) => {
    const { unlockedGroups } = get();
    const next = new Set(unlockedGroups);
    next.add(id);
    set({ unlockedGroups: next });
  },

  isGroupUnlocked: (id) => {
    return get().unlockedGroups.has(id);
  },

  lockGroup: (id) => {
    const { unlockedGroups } = get();
    const next = new Set(unlockedGroups);
    next.delete(id);
    set({ unlockedGroups: next });
  },

  lockAllGroups: () => {
    set({ unlockedGroups: new Set() });
  },
}));
