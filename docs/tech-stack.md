# KeyVault 密码管理器 — 技术选型文档

## 1. 项目概述

| 项           | 说明                                                                            |
| ------------ | ------------------------------------------------------------------------------- |
| **应用名称** | KeyVault                                                                        |
| **应用类型** | 跨平台桌面应用                                                                  |
| **核心功能** | 主密码保护、分组管理（含私密分组）、密码增删改查、模糊搜索、一键复制、导入导出、亮色/暗色主题 |
| **目标平台** | macOS 10.15+、Windows 10+、Linux、iOS、Android                                  |

---

## 2. 技术栈总览

```
┌─────────────────────────────────────────────────────────────┐
│                      Tauri v2 桌面容器                        │
│                                                             │
│  ┌─────────────────────┐    ┌────────────────────────────┐  │
│  │   Webview 渲染层     │    │   Rust 主进程               │  │
│  │                     │    │                            │  │
│  │  React 19           │    │  rusqlite (SQLite)         │  │
│  │  Vite 6             │◄──►│  aes-gcm + ring (加密)     │  │
│  │  Tailwind CSS 3     │IPC │  PBKDF2-SHA256 (密钥派生)  │  │
│  │  TypeScript 5.x     │    │  tauri-plugin-shell        │  │
│  │                     │    │                            │  │
│  └─────────────────────┘    └────────────────────────────┘  │
│                                                             │
│  http://localhost:5173          本地数据库 ~/.kv/data.sqlite  │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 各层技术选型详解

### 3.1 桌面框架 — Tauri v2

| 项               | 说明                                                     |
| ---------------- | -------------------------------------------------------- |
| **版本**         | Tauri v2 (Rust crate: `tauri = "2"`)                     |
| **GitHub Stars** | 90k+                                                     |
| **后端语言**     | Rust（零成本抽象、内存安全、高性能）                     |
| **渲染引擎**     | 系统原生 Webview（macOS WKWebView / Windows WebView2 / Linux WebKitGTK） |
| **打包体积**     | ~5-10MB（远小于 Electron 方案）                          |
| **IPC 机制**     | 通过 `tauri::generate_handler!` 注册命令，前端使用 `invoke()` 调用 |
| **插件生态**     | tauri-plugin-shell、tauri-plugin-updater 等官方插件      |
| **跨平台**       | macOS / Windows / Linux / iOS / Android                  |

**选择理由：**

- Rust 提供内存安全和零成本抽象，加密等关键操作无 GC 开销
- 系统原生 Webview 渲染，内存占用极低
- `tauri::command` 宏提供类型安全的 IPC，前端调用后端函数如同本地函数调用
- 活跃的社区和插件生态，长期维护有保障
- 支持移动端（iOS/Android），未来可扩展

---

### 3.2 前端框架 — React + TypeScript

| 项             | 说明                                          |
| -------------- | --------------------------------------------- |
| **React**      | v19                                           |
| **TypeScript** | v5.7                                          |
| **状态管理**   | Zustand v5（轻量、基于 hook、无 Provider）    |
| **类型校验**   | TypeScript strict 模式 + `noUnusedLocals`/`noUnusedParameters` |

**选择理由：**

- React 19 生态成熟，社区资源丰富
- Zustand 相较于 Redux 更轻量，API 简洁，与 React hooks 深度集成
- TypeScript 严格模式在编译期捕获类型错误，减少运行时问题

---

### 3.3 构建工具 — Vite 6

| 项       | 说明                                                              |
| -------- | ----------------------------------------------------------------- |
| **版本** | v6.x                                                              |
| **角色** | 前端开发服务器 + 生产构建                                         |
| **HMR**  | 开发时通过 `localhost:5173` 提供热模块替换                        |
| **产物** | 构建后输出到 `dist/`，Tauri 从中加载前端资源                      |

**开发模式工作流：**

1. `bun run vite:dev` 启动 Vite 开发服务器（固定端口 5173）
2. Tauri 配置 `devUrl` 指向 `http://localhost:5173`
3. Tauri 启动时检测到开发服务器，自动从该地址加载页面
4. 修改组件即热更新，无需整页刷新

**生产模式：**

- `bun run vite:build` 将前端资源打包输出到 `dist/`
- Tauri 配置 `frontendDist` 指向 `../dist`，打包时嵌入静态资源

---

### 3.4 样式方案 — Tailwind CSS 3

| 项           | 说明                    |
| ------------ | ----------------------- |
| **版本**     | v3.4                    |
| **集成方式** | PostCSS 插件集成到 Vite |
| **配置文件** | `tailwind.config.js`    |
| **额外插件** | `tailwindcss-animate`（动画工具类） |

**选择理由：**

- 原子化 CSS，开发效率高
- 打包时自动 Tree-shaking，产物体积极小
- `tailwindcss-animate` 提供声明式动画，与 shadcn/ui 组件动画配合良好

---

### 3.5 UI 组件库 — shadcn/ui

| 项           | 说明                                         |
| ------------ | -------------------------------------------- |
| **类型**     | 可复制的组件源码（非传统 npm 黑盒依赖）      |
| **底层依赖** | Radix UI（无障碍原语）+ Tailwind CSS（样式） |
| **主题切换** | 支持亮色（Light）和暗色（Dark）两种模式      |
| **CSS 变量** | 通过 CSS 自定义属性实现主题变量              |

**选择理由：**

- 组件代码直接存在于项目中，可完全自定义
- 基于 Radix UI 原语，原生支持无障碍访问（WAI-ARIA）
- CSS 变量主题系统，亮色/暗色切换开箱即用

**实际使用的组件：**

| 组件           | 用途                   |
| -------------- | ---------------------- |
| `Button`       | 操作按钮               |
| `Input`        | 文本输入框             |
| `Textarea`     | 多行文本（描述字段）   |
| `Select`       | 下拉选择（分组选择）   |
| `Dialog`       | 弹窗（表单、确认等）   |
| `DropdownMenu` | 下拉菜单（更多操作）   |
| `Tooltip`      | 提示信息               |
| `Toast`        | 轻提示（操作反馈）     |
| `Label`        | 表单标签               |

---

### 3.6 数据库 — SQLite (rusqlite)

| 项           | 说明                                              |
| ------------ | ------------------------------------------------- |
| **Rust 驱动**| `rusqlite = "0.31"`（bundled 模式，自带 SQLite）  |
| **存储位置** | `~/.kv/data.sqlite`                               |
| **WAL 模式** | 启用（`PRAGMA journal_mode = WAL`）               |
| **外键约束** | 启用（`PRAGMA foreign_keys = ON`）                |
| **特点**     | 同步 API、事务支持、预编译语句                    |

**选择理由：**

- `rusqlite` bundled 模式自带 SQLite 源码编译，无需系统安装
- 数据文件单一，便于备份和迁移
- WAL 模式提升并发读写性能
- 经 Tauri 生态广泛验证，稳定性高

---

### 3.7 安全方案

| 组件             | 方案                                                            |
| ---------------- | --------------------------------------------------------------- |
| **主密码**       | 首次启动设置主密码，后续每次启动需验证                          |
| **密钥派生**     | PBKDF2-SHA256（600,000 次迭代，使用 `ring` crate）              |
| **密码加密**     | AES-256-GCM（使用 `aes-gcm` crate）                             |
| **随机数生成**   | `aes-gcm::OsRng`（操作系统级安全随机数）                        |
| **加密存储范围** | passwords 表的 `encrypted_password` 字段始终密文存储            |
| **存储安全**     | 每条密码使用独立随机 12 字节 IV                                 |
| **导出加密**     | 导出文件中密码以密文形式存在，导入时需提供原主密码解密          |
| **运行时安全**   | 解密密钥仅缓存于 Rust 内存中（`static Lazy<Mutex<Option<Vec<u8>>>>`），锁定/关闭时清除 |

**加密流程：**

```
保存密码时：
  1. 生成随机 12 字节 IV（OsRng）
  2. 使用主密码派生的 AES-256 密钥 + IV 加密明文密码
  3. 密文（encrypted_password）和 IV 分别存入数据库

读取密码时：
  1. 从数据库读取密文和 IV
  2. 使用内存中缓存的 AES-256 密钥 + IV 解密
  3. 返回明文（仅存在于前端内存中，不落盘）

修改主密码时：
  1. 验证旧密码
  2. 用旧密钥解密所有密码 → 用新密钥重新加密
  3. 更新哈希和盐值
```

---

## 4. 功能架构

### 4.1 主密码认证

```
应用启动 → 是否存在主密码？
            ├─ 否 → 设置主密码页（输入 + 确认） → 保存哈希 + 盐值 → 进入密码库
            └─ 是 → 解锁页（输入主密码） → 验证 → 进入密码库
```

**实现细节：**

- 设置主密码时：PBKDF2-SHA256 派生 256 位密钥，Base64 编码后作为哈希存入 `settings` 表
- 验证时：使用相同盐值和 PBKDF2 派生密钥，比对 Base64 编码结果
- 验证通过后：派生密钥缓存在 Rust 后端的全局 `Mutex` 中

### 4.2 分组管理

| 功能           | 说明                                                     |
| -------------- | -------------------------------------------------------- |
| **创建分组**   | 填写组名，可选设为私密分组并设置独立密码                 |
| **私密分组**   | 需额外密码验证才能查看内容，快捷键（默认 F8）切换显示    |
| **编辑分组**   | 修改组名、私密属性、分组密码                             |
| **删除分组**   | 删除分组时该组下密码条目自动变为"未分组"（ON DELETE SET NULL） |
| **未分组管理** | 可重命名"未分组"标签，支持一键清除未分组密码             |

### 4.3 密码条目管理

| 字段       | 类型     | 必填 | 说明         |
| ---------- | -------- | ---- | ------------ |
| 应用名     | text     | 是   | 密码所属应用 |
| 账号       | text     | 是   | 登录用户名   |
| 密码       | password | 是   | 登录密码（加密存储） |
| 地址       | text     | 否   | 网站 URL     |
| 邮箱       | text     | 否   | 关联邮箱     |
| 描述       | textarea | 否   | 备注信息     |
| 分组       | select   | 否   | 可选分组归属 |

### 4.4 搜索

- 基于应用名的 SQLite `LIKE '%keyword%'` 模糊匹配
- 前端 300ms 防抖，实时过滤显示

### 4.5 导入/导出

- **导出格式**：JSON（版本号、导出时间、盐值、分组、密码条目）
- **导出安全**：密码字段保持 AES-256-GCM 密文 + Base64 编码，不含明文
- **导入校验**：导入前用提供的密码解密首条记录验证密钥匹配
- **冲突策略**：相同应用名 + 账号视为重复，自动跳过并统计

### 4.6 页面流转

```
┌─────────────┐     ┌─────────────┐     ┌──────────────────────────────────┐
│ 设置主密码页 │ ──► │  解锁页      │ ──► │          密码库主页               │
│ (首次启动)   │     │ (后续启动)   │     │                                  │
└─────────────┘     └─────────────┘     │  ┌──────────┐  ┌──────────────┐  │
                                        │  │ 侧边栏    │  │  密码列表     │  │
                                        │  │          │  │              │  │
                                        │  │ · 搜索   │  │  [搜索栏]    │  │
                                        │  │ · 全部   │  │  密码详情卡片 │  │
                                        │  │ · 未分组  │  │              │  │
                                        │  │ · 分组A  │  │              │  │
                                        │  │ · 分组B  │  │              │  │
                                        │  │          │  │              │  │
                                        │  │ [+新分组] │  │ [+添加密码] │  │
                                        │  └──────────┘  └──────────────┘  │
                                        └──────────────────────────────────┘
```

---

## 5. 项目结构

```
omp/
├── package.json                   # 前端依赖与脚本
├── vite.config.ts                 # Vite 构建配置
├── tsconfig.json                  # TypeScript 配置
├── tailwind.config.js             # Tailwind CSS 配置
├── postcss.config.js              # PostCSS 配置
├── components.json                # shadcn/ui 配置
├── public/
│   └── icon.svg                   # 应用图标源文件（SVG）
├── scripts/
│   └── generate-icons.ts          # 图标生成脚本（SVG → PNG/ICNS/ICO）
├── src/
│   └── mainview/                  # 前端渲染进程
│       ├── index.html             # HTML 入口
│       ├── main.tsx               # React 入口
│       ├── App.tsx                # 根组件（页面流转控制）
│       ├── pages/
│       │   ├── SetupPage.tsx      # 首次设置主密码页
│       │   ├── UnlockPage.tsx     # 解锁验证页
│       │   └── VaultPage.tsx      # 密码库主页
│       ├── components/
│       │   ├── ui/                # shadcn/ui 组件（button/dialog/input 等）
│       │   ├── AppSidebar.tsx     # 侧边栏（分组列表 + 搜索 + 操作入口）
│       │   ├── PasswordCard.tsx   # 密码卡片（列表项）
│       │   ├── PasswordDetail.tsx # 密码详情（只读 + 字段复制）
│       │   ├── PasswordForm.tsx   # 密码表单（添加/编辑）
│       │   ├── GroupForm.tsx      # 分组创建/编辑表单
│       │   ├── GroupPasswordDialog.tsx  # 分组密码验证弹窗
│       │   ├── ImportPasswordDialog.tsx # 导入密码弹窗
│       │   ├── ChangeMasterPasswordDialog.tsx # 修改主密码弹窗
│       │   ├── SearchBar.tsx      # 模糊搜索栏
│       │   ├── CopyButton.tsx     # 通用复制按钮
│       │   ├── ThemeToggle.tsx    # 主题切换按钮
│       │   └── HotkeySettings.tsx # 快捷键设置
│       ├── stores/
│       │   ├── authStore.ts       # 认证状态
│       │   ├── groupStore.ts      # 分组状态
│       │   ├── passwordStore.ts   # 密码列表状态
│       │   └── settingsStore.ts   # 设置状态
│       ├── hooks/
│       │   ├── useClipboard.ts    # 剪贴板操作
│       │   ├── useSearch.ts       # 搜索 + 防抖
│       │   ├── useTheme.ts        # 主题管理
│       │   ├── useToast.ts        # Toast 通知
│       │   └── useResponsive.ts   # 响应式布局
│       ├── lib/
│       │   ├── api.ts             # Tauri IPC 客户端（invoke 封装）
│       │   └── utils.ts           # 工具函数（cn 类名合并）
│       └── styles/
│           └── global.css         # Tailwind 入口 + 主题 CSS 变量
├── src-tauri/                     # Rust 后端
│   ├── Cargo.toml                 # Rust 依赖配置
│   ├── tauri.conf.json            # Tauri 应用配置
│   ├── build.rs                   # Tauri 构建脚本
│   ├── capabilities/
│   │   └── default.json           # 权限配置
│   ├── icons/                     # 应用图标（PNG/ICNS/ICO）
│   └── src/
│       ├── main.rs                # Rust 入口
│       ├── lib.rs                 # 库入口（注册命令与插件）
│       ├── db.rs                  # 数据库初始化与连接管理
│       ├── crypto.rs              # 加密模块（PBKDF2 + AES-256-GCM）
│       └── commands/
│           ├── auth.rs            # 认证命令
│           ├── groups.rs          # 分组命令
│           ├── passwords.rs       # 密码命令
│           ├── backup.rs          # 导入导出命令
│           └── settings.rs        # 设置命令
├── docs/
│   ├── tech-stack.md              # 技术选型文档（本文档）
│   └── codesigning.md             # 代码签名配置指南
└── .github/
    └── workflows/
        └── build.yml              # CI 构建流水线
```

---

## 6. 数据库 Schema

```sql
-- 分组表
CREATE TABLE groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  is_private INTEGER NOT NULL DEFAULT 0,
  group_password TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 密码条目表
CREATE TABLE passwords (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  app_name TEXT NOT NULL,
  username TEXT NOT NULL,
  encrypted_password BLOB NOT NULL,       -- AES-256-GCM 密文
  iv BLOB NOT NULL,                        -- 12 字节独立随机 IV
  url TEXT,
  email TEXT,
  description TEXT,
  group_id INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL
);

-- 应用配置表（键值对）
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
-- 预置键：
--   master_password_hash          - PBKDF2-SHA256 派生的主密码哈希（Base64）
--   master_password_salt          - 随机生成 16 字节盐值（Base64）
--   theme                         - 主题模式：'light' | 'dark' | 'system'
--   hotkey_toggle_private         - 切换私密分组快捷键，默认 'F8'
--   ungrouped_name                - 未分组标签自定义名称

CREATE INDEX idx_passwords_app_name ON passwords(app_name);
```

---

## 7. 开发环境要求

| 工具        | 版本要求                                                    |
| ----------- | ----------------------------------------------------------- |
| **Bun**     | >= 1.1（作为前端包管理与脚本运行器）                        |
| **Rust**    | >= 1.77（stable 工具链，通过 rustup 安装）                  |
| **macOS**   | >= 10.15 + Xcode Command Line Tools                         |
| **Windows** | >= 10 + Visual Studio Build Tools + WebView2 Runtime        |
| **Linux**   | Ubuntu 22.04+ + `build-essential libgtk-3-dev libwebkit2gtk-4.1-dev` |

---

## 8. 核心依赖清单

### Rust 后端

| Crate                  | 用途                             |
| ---------------------- | -------------------------------- |
| `tauri`                | 桌面框架核心                     |
| `tauri-plugin-shell`   | 系统 Shell 集成（打开链接等）    |
| `tauri-plugin-updater` | 应用自动更新（桌面平台）         |
| `rusqlite`             | SQLite 数据库驱动（bundled）     |
| `aes-gcm`              | AES-256-GCM 加密                 |
| `ring`                 | PBKDF2-SHA256 密钥派生           |
| `base64`               | Base64 编/解码                   |
| `rand`                 | 随机数生成                       |
| `serde` / `serde_json` | 序列化/反序列化                  |
| `once_cell`            | 全局延迟初始化（Lazy）           |
| `dirs`                 | 跨平台用户目录获取               |
| `chrono`               | 时间处理（导出时间戳）           |
| `thiserror`            | 错误类型派生                     |

### 前端

| 包名                       | 用途                             |
| -------------------------- | -------------------------------- |
| `react` / `react-dom`      | UI 框架                          |
| `vite`                     | 构建工具                         |
| `@vitejs/plugin-react`     | Vite React 插件                  |
| `typescript`               | 类型系统                         |
| `tailwindcss`              | CSS 框架                         |
| `@radix-ui/*`              | 无障碍 UI 原语                   |
| `class-variance-authority` | 组件变体管理                     |
| `clsx` / `tailwind-merge`  | 类名合并工具                     |
| `lucide-react`             | 图标库                           |
| `zustand`                  | 状态管理                         |
| `@tauri-apps/api`          | Tauri 前端 API（invoke 等）      |
| `@tauri-apps/plugin-shell` | Tauri Shell 插件前端绑定         |
| `sharp`                    | 图标生成脚本图像处理             |
| `to-ico`                   | 图标生成脚本 ICO 格式转换        |

---

## 9. 开发与构建命令

```bash
# 安装依赖
bun install

# 前端开发服务器
bun run vite:dev

# 完整 Tauri 开发模式（自动启动 Vite + Tauri）
bun run dev

# 生产构建
bun run build

# Debug 构建（含调试符号）
bun run build:debug

# iOS/Android 初始化与开发
bun run ios:init && bun run ios:dev
bun run android:init && bun run android:dev

# 代码检查与格式化
bun run lint
bun run lint:fix
bun run format
bun run format:check
```

---

## 10. 架构优势总结

| 维度         | 说明                                                              |
| ------------ | ----------------------------------------------------------------- |
| **性能**     | Rust 零成本抽象 + 系统原生 Webview，启动快、内存低                |
| **安全**     | AES-256-GCM 加密，PBKDF2 600k 迭代密钥派生，Rust 内存安全保证    |
| **包体积**   | ~5-10MB，远小于 Electron 方案                                     |
| **跨平台**   | macOS / Windows / Linux / iOS / Android，一套代码多端覆盖         |
| **可维护性** | TypeScript strict 模式 + Rust 编译期检查，类型安全贯穿前后端      |
| **体验**     | shadcn/ui 精致 UI + 响应式布局 + 亮暗主题 + 全局快捷键            |
