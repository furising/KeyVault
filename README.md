# KeyVault — 离线密码管理器

KeyVault 是一款基于 Tauri v2 构建的跨平台桌面密码管理应用。所有数据本地加密存储，无需联网，保障隐私安全。

## 功能特性

- **主密码保护** — 首次启动设置主密码，后续每次打开应用需验证身份
- **AES-256-GCM 加密** — 密码字段始终以密文存储，每条记录使用独立随机 IV
- **分组管理** — 创建分组对密码进行分类，支持私密分组（额外密码保护）
- **密码增删改查** — 支持应用名、账号、密码、URL、邮箱、描述等完整字段
- **模糊搜索** — 按应用名实时搜索，300ms 防抖
- **一键复制** — 每个字段均可一键复制到剪贴板
- **导入/导出** — JSON 格式备份，导出密码保持加密状态
- **亮色/暗色主题** — 支持手动切换或跟随系统
- **全局快捷键** — F8 一键切换私密分组显示（可自定义）
- **修改主密码** — 支持在应用内安全修改主密码，自动重新加密所有数据

## 技术栈

| 层级     | 技术                                         |
| -------- | -------------------------------------------- |
| 桌面框架 | Tauri v2（系统原生 Webview，~5-10MB 包体积） |
| 后端语言 | Rust（rusqlite + ring + aes-gcm）            |
| 前端框架 | React 19 + TypeScript                        |
| 构建工具 | Vite 6                                       |
| UI 组件  | shadcn/ui（Radix UI + Tailwind CSS）         |
| 数据库   | SQLite（rusqlite bundled 模式）              |
| 状态管理 | Zustand v5                                   |
| 加密方案 | PBKDF2-SHA256（600k 迭代）+ AES-256-GCM      |
| 代码规范 | ESLint 9 + Prettier + typescript-eslint      |

## 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                      Tauri v2 桌面容器                        │
│                                                             │
│  ┌─────────────────────┐    ┌────────────────────────────┐  │
│  │   Webview 渲染层     │    │   Rust 主进程               │  │
│  │                     │    │                            │  │
│  │  React 19           │    │  rusqlite                  │  │
│  │  Zustand Store      │◄──►│  AES-256-GCM 加密          │  │
│  │  shadcn/ui          │IPC │  PBKDF2 密钥派生           │  │
│  │  Tailwind CSS       │    │  tauri-plugin-shell        │  │
│  │                     │    │                            │  │
│  └─────────────────────┘    └────────────────────────────┘  │
│                                                             │
│  本地数据库：~/.kv/data.sqlite（WAL 模式）                    │
└─────────────────────────────────────────────────────────────┘
```

### 目录结构

```
src/
└── mainview/                     # 前端渲染进程（Webview）
    ├── App.tsx                   # 根组件（页面流转控制）
    ├── pages/
    │   ├── SetupPage.tsx         # 首次设置主密码
    │   ├── UnlockPage.tsx        # 解锁验证
    │   └── VaultPage.tsx         # 密码库主页
    ├── components/               # 业务组件 + shadcn/ui 组件
    ├── stores/                   # Zustand 状态管理
    ├── hooks/                    # 自定义 Hooks
    └── lib/
        └── api.ts                # Tauri IPC 客户端

src-tauri/
└── src/                          # Rust 后端
    ├── lib.rs                    # 入口：注册命令与插件
    ├── db.rs                     # 数据库初始化与连接
    ├── crypto.rs                 # 加密模块（PBKDF2 + AES-256-GCM）
    └── commands/                 # Tauri 命令
        ├── auth.rs               # 认证（设置/验证/修改主密码）
        ├── groups.rs             # 分组增删改查
        ├── passwords.rs          # 密码增删改查
        ├── backup.rs             # 数据导入/导出
        └── settings.rs           # 键值配置读写
```

### 数据流

```
用户操作 → React 组件 → Zustand Store → API 客户端 (invoke)
                                              ↓
                                   Tauri IPC (Rust 原生)
                                              ↓
                              Rust Command → SQLite / 加密服务
```

### 安全模型

1. 用户设置主密码 → 生成随机 16 字节盐值 → PBKDF2-SHA256（600,000 次迭代）派生 256 位密钥 → Base64 编码存入 settings 表
2. 验证通过后 → 派生密钥缓存于 Rust 后端内存（`Mutex<Option<Vec<u8>>>`）
3. 保存密码 → 生成随机 12 字节 IV → AES-256-GCM 加密 → 密文和 IV 分别存入数据库
4. 读取密码 → 从数据库取出密文和 IV → 内存中密钥解密 → 明文仅存在于前端内存
5. 锁定/关闭应用 → 内存中的密钥自动清除
6. 修改主密码 → 旧密钥解密全部密码 → 新密钥重新加密 → 更新哈希和盐值

### 数据库结构

| 表名        | 说明                                                                                                      |
| ----------- | --------------------------------------------------------------------------------------------------------- |
| `groups`    | 分组（id, name, is_private, group_password, created_at, updated_at）                                      |
| `passwords` | 密码条目（id, app_name, username, encrypted_password, iv, url, email, description, group_id, timestamps） |
| `settings`  | 键值配置（master_password_hash, master_password_salt, theme, hotkey_toggle_private 等）                   |

数据库文件存储在 `~/.kv/data.sqlite`，启用 WAL 模式和外键约束。

## 环境要求

- **Bun** >= 1.1（前端包管理与脚本运行）
- **Rust** >= 1.77（通过 [rustup](https://rustup.rs/) 安装）
- **macOS** >= 10.15 + Xcode Command Line Tools
- **Windows** >= 10 + Visual Studio Build Tools + WebView2 Runtime
- **Linux** Ubuntu 22.04+ + `build-essential libgtk-3-dev libwebkit2gtk-4.1-dev`

## 快速开始

```bash
# 安装前端依赖
bun install

# 开发模式（前端 + Tauri 后端同时启动，带 HMR）
bun run dev

# 仅启动前端开发服务器
bun run vite:dev

# 生产构建
bun run build

# Debug 构建
bun run build:debug
```

## 常用命令

```bash
# 代码检查
bun run lint

# 代码检查并自动修复
bun run lint:fix

# 格式化代码
bun run format

# 检查格式化
bun run format:check
```

## 页面流转

```
首次启动 → 设置主密码页 → 密码库
后续启动 → 解锁页 → 密码库
```

密码库主页包含：左侧分组侧边栏 + 右侧密码列表 + 顶部搜索栏和操作按钮（添加密码、导入、导出、锁定）。

## 相关文档

- [技术选型文档](docs/tech-stack.md)
- [代码签名配置指南](docs/codesigning.md)
