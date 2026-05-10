/**
 * API 客户端 - 通过 Tauri invoke 与 Rust 后端通信
 */
import { invoke } from "@tauri-apps/api/core";

// ========== 认证 API ==========
export const authApi = {
  /** 检查是否已设置主密码 */
  getStatus: () => invoke<{ hasMasterPassword: boolean }>("get_auth_status"),
  /** 首次设置主密码 */
  setup: (password: string) => invoke<boolean>("setup_master_password", { password }),
  /** 验证主密码 */
  verify: (password: string) => invoke<boolean>("verify_master_password", { password }),
  /** 修改主密码 */
  changePassword: (oldPassword: string, newPassword: string) =>
    invoke<boolean>("change_master_password", { oldPassword, newPassword }),
};

// ========== 分组 API ==========
export interface Group {
  id: number;
  name: string;
  is_private: number;
  has_group_password: boolean;
  created_at: string;
  updated_at: string;
}

export interface GroupsResponse {
  groups: Group[];
  counts: Record<number, number>;
  ungroupedCount: number;
  totalCount: number;
}

export const groupApi = {
  getAll: (showPrivate = false) =>
    invoke<GroupsResponse>("get_all_groups", { showPrivate }),
  create: (name: string, isPrivate = false, groupPassword?: string) =>
    invoke<Group>("create_group", { name, isPrivate, groupPassword: groupPassword || null }),
  update: (id: number, data: { name?: string; is_private?: boolean; group_password?: string | null }) =>
    invoke<boolean>("update_group", { id, data }),
  delete: (id: number) => invoke<boolean>("delete_group", { id }),
  getPassword: (id: number) =>
    invoke<string | null>("get_group_password", { id }).then((gp: string | null) => ({ group_password: gp })),
  verifyPassword: (id: number, password: string) =>
    invoke<boolean>("verify_group_password", { id, password }).then((ok: boolean) => {
      if (!ok) throw new Error("密码错误");
      return ok;
    }),
  hasPassword: (id: number) => invoke<boolean>("has_group_password", { id }),
};

// ========== 密码 API ==========
export interface PasswordEntry {
  id: number;
  app_name: string;
  username: string;
  password: string;
  url: string | null;
  email: string | null;
  description: string | null;
  group_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePasswordInput {
  app_name: string;
  username: string;
  password: string;
  url?: string;
  email?: string;
  description?: string;
  group_id?: number | null;
}

export const passwordApi = {
  getAll: (groupId?: number | string | null, search?: string, showPrivate = false) => {
    const params: { groupId?: string; search?: string; showPrivate?: boolean } = {};
    if (search) params.search = search;
    else if (groupId !== undefined && groupId !== null) params.groupId = String(groupId);
    if (showPrivate) params.showPrivate = true;
    return invoke<PasswordEntry[]>("get_all_passwords", {
      groupId: params.groupId || null,
      search: params.search || null,
      showPrivate: params.showPrivate || false,
    });
  },
  getById: (id: number) => invoke<PasswordEntry>("get_password_by_id", { id }),
  create: (input: CreatePasswordInput) => invoke<PasswordEntry>("create_password", { input }),
  update: (id: number, input: CreatePasswordInput) =>
    invoke<PasswordEntry>("update_password", { id, input }),
  delete: (id: number) => invoke<boolean>("delete_password", { id }),
  /** 删除所有未分组的密码 */
  deleteUngrouped: () => invoke<number>("delete_ungrouped_passwords"),
};

// ========== 备份 API ==========
export const backupApi = {
  export: () => invoke<unknown>("export_data"),
  import: (data: unknown, password: string) =>
    invoke<{ imported: number; skipped: number }>("import_data", { data, password }),
};

// ========== 设置 API ==========
export const settingsApi = {
  get: (key: string) => invoke<{ key: string; value: string | null }>("get_setting", { key }),
  set: (key: string, value: string) => invoke<boolean>("set_setting", { key, value }),
};