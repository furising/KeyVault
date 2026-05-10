# 代码签名配置指南

## 概述
本项目已配置自动代码签名功能，支持macOS和Windows平台。现在有两种方案可以解决macOS"已损坏"的问题：

### 🎯 方案A：自动ad-hoc签名（推荐，无需证书）
✅ **已自动配置完成**，不需要任何操作！
- GitHub Actions构建时会自动执行ad-hoc签名
- 用户安装后不需要执行任何命令即可直接打开
- 仅适用于内部测试使用，发布到App Store仍需要正式证书

### 🎯 方案B：正式证书签名（适合公开发布）
需要配置GitHub Secrets来启用正式签名。

---

## 快速验证
现在提交代码并触发GitHub Actions构建，生成的安装包将不再提示"已损坏"！

---

## 正式发布配置（可选）

### 1. 获取正式证书
- **macOS**: 加入Apple Developer Program ($99/年)，申请Developer ID证书
- **Windows**: 购买受信任的代码签名证书（如DigiCert、Sectigo等）

### 2. 配置GitHub Secrets
在项目Settings → Secrets and variables → Actions中添加以下Secrets：

| Secret名称 | 描述 | 值来源 |
|-----------|------|--------|
| `APPLE_CERTIFICATE_BASE64` | macOS证书Base64 | `.certificates/macos_cert_base64.txt` 或正式证书 |
| `APPLE_CERTIFICATE_PASSWORD` | macOS证书密码 | 你的证书密码（默认: changeme） |
| `APPLE_SIGNING_IDENTITY` | 签名身份 | "KeyVault macOS Signing" 或正式证书名称 |
| `WINDOWS_CERTIFICATE_BASE64` | Windows证书Base64 | `.certificates/windows_cert_base64.txt` 或正式证书 |
| `WINDOWS_CERTIFICATE_PASSWORD` | Windows证书密码 | 你的证书密码（默认: changeme） |

### 3. 公证配置（macOS正式发布需要）
如果需要让应用在所有macOS上无需任何操作即可打开，需要配置公证：
1. 在Apple Developer网站创建App Store Connect API Key
2. 添加以下Secrets：
   - `APPLE_API_KEY_CONTENT`: API Key文件内容
   - `APPLE_API_KEY_ID`: API Key ID
   - `APPLE_API_ISSUER`: Issuer ID

---

## 本地构建测试

### macOS本地构建
```bash
# 使用ad-hoc签名构建
bunx tauri build -- --config '{"bundle": {"macOS": {"signingIdentity": "-"}}}'

# 或者使用证书签名
bunx tauri build
```

### Windows本地构建
```powershell
bunx tauri build
```

---

## 安全提示
⚠️ **重要安全注意事项**：
1. 永远不要将`.certificates`目录提交到代码仓库（已自动添加到.gitignore）
2. 定期更换证书密码，使用强密码
3. 自签名证书仅用于内部测试，公开发布必须使用受信任的正式证书
4. 不要在任何公共场合泄露证书和私钥文件

---

## 故障排除

### 仍然提示"已损坏"
1. 检查是否是从GitHub下载的安装包（本地构建不会有这个问题）
2. 尝试右键 → 打开，跳过Gatekeeper检查
3. 如果仍不行，执行：`xattr -cr /Applications/KeyVault.app`

### 签名失败
1. 检查证书密码是否正确
2. 确认证书格式是否为PKCS12(.p12/.pfx)
3. 查看GitHub Actions构建日志获取详细错误信息
