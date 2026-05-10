/**
 * 密码列表状态管理
 */
import { create } from "zustand";
import { passwordApi, type PasswordEntry, type CreatePasswordInput } from "@/lib/api";
import { type FilterType } from "./groupStore";

interface PasswordState {
  passwords: PasswordEntry[];
  /** 当前选中的密码详情 */
  selected: PasswordEntry | null;
  loading: boolean;
  searchKeyword: string;
  /** 加载密码列表 */
  loadPasswords: (filter: FilterType, search?: string, showPrivate?: boolean) => Promise<void>;
  /** 设置搜索关键词 */
  setSearch: (keyword: string) => void;
  /** 选中密码 */
  selectPassword: (pw: PasswordEntry | null) => void;
  /** 创建密码 */
  createPassword: (input: CreatePasswordInput) => Promise<PasswordEntry>;
  /** 更新密码 */
  updatePassword: (id: number, input: CreatePasswordInput) => Promise<void>;
  /** 删除密码 */
  deletePassword: (id: number) => Promise<void>;
  /** 刷新当前选中的密码详情 */
  refreshSelected: (id: number) => Promise<void>;
}

export const usePasswordStore = create<PasswordState>((set, get) => ({
  passwords: [],
  selected: null,
  loading: false,
  searchKeyword: "",

  loadPasswords: async (filter, search, showPrivate = false) => {
    set({ loading: true });
    try {
      let passwords: PasswordEntry[];
      if (search) {
        passwords = await passwordApi.getAll(undefined, search, showPrivate);
      } else if (filter === "all") {
        passwords = await passwordApi.getAll(undefined, undefined, showPrivate);
      } else if (filter === "ungrouped") {
        passwords = await passwordApi.getAll("ungrouped");
      } else {
        passwords = await passwordApi.getAll(filter);
      }
      set({ passwords, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  setSearch: (keyword) => set({ searchKeyword: keyword }),

  selectPassword: (pw) => set({ selected: pw }),

  createPassword: async (input) => {
    const pw = await passwordApi.create(input);
    return pw;
  },

  updatePassword: async (id, input) => {
    await passwordApi.update(id, input);
  },

  deletePassword: async (id) => {
    await passwordApi.delete(id);
    const { selected } = get();
    if (selected?.id === id) set({ selected: null });
  },

  refreshSelected: async (id) => {
    const pw = await passwordApi.getById(id);
    set({ selected: pw });
  },
}));
