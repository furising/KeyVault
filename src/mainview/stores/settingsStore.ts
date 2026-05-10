/**
 * 设置状态管理
 * 管理快捷键等用户自定义配置
 */
import { create } from "zustand";
import { settingsApi } from "@/lib/api";

/** 设置键名常量 */
const KEYS = {
  TOGGLE_PRIVATE_HOTKEY: "hotkey_toggle_private",
} as const;

/** 默认快捷键 */
export const DEFAULT_TOGGLE_PRIVATE_HOTKEY = "F8";

interface SettingsState {
  /** 切换私密分组的快捷键 */
  togglePrivateHotkey: string;
  /** 从后端加载设置 */
  loadSettings: () => Promise<void>;
  /** 更新切换私密分组的快捷键 */
  setTogglePrivateHotkey: (hotkey: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  togglePrivateHotkey: DEFAULT_TOGGLE_PRIVATE_HOTKEY,

  loadSettings: async () => {
    try {
      const { value } = await settingsApi.get(KEYS.TOGGLE_PRIVATE_HOTKEY);
      if (value) {
        set({ togglePrivateHotkey: value });
      }
    } catch {
      // 首次使用时设置不存在，使用默认值
    }
  },

  setTogglePrivateHotkey: async (hotkey: string) => {
    await settingsApi.set(KEYS.TOGGLE_PRIVATE_HOTKEY, hotkey);
    set({ togglePrivateHotkey: hotkey });
  },
}));