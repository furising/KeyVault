/**
 * 认证状态管理
 */
import { create } from "zustand";
import { authApi } from "@/lib/api";
import { useGroupStore } from "@/stores/groupStore";

interface AuthState {
  /** 是否已检查状态 */
  checked: boolean;
  /** 是否已设置主密码 */
  hasMasterPassword: boolean;
  /** 是否已解锁 */
  unlocked: boolean;
  /** 加载中 */
  loading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 检查认证状态 */
  checkStatus: () => Promise<void>;
  /** 设置主密码 */
  setup: (password: string) => Promise<boolean>;
  /** 验证主密码 */
  verify: (password: string) => Promise<boolean>;
  /** 修改主密码 */
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
  /** 锁定应用 */
  lock: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  checked: false,
  hasMasterPassword: false,
  unlocked: false,
  loading: false,
  error: null,

  checkStatus: async () => {
    set({ loading: true, error: null });
    try {
      const { hasMasterPassword } = await authApi.getStatus();
      set({ hasMasterPassword, checked: true, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false, checked: true });
    }
  },

  setup: async (password) => {
    set({ loading: true, error: null });
    try {
      await authApi.setup(password);
      set({ hasMasterPassword: true, unlocked: true, loading: false });
      return true;
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
      return false;
    }
  },

  verify: async (password) => {
    set({ loading: true, error: null });
    try {
      const success = await authApi.verify(password);
      if (success) set({ unlocked: true, loading: false });
      else set({ error: "密码错误", loading: false });
      return success;
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
      return false;
    }
  },

  changePassword: async (oldPassword, newPassword) => {
    set({ loading: true, error: null });
    try {
      await authApi.changePassword(oldPassword, newPassword);
      set({ loading: false });
      return true;
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
      return false;
    }
  },

  lock: () => {
    useGroupStore.getState().lockAllGroups();
    set({ unlocked: false });
  },
}));
