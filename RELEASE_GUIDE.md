# VSCode 扩展发布指南

## 自动发布（推荐）

GitHub Actions Workflow 已配置，将在 main 分支推送时自动：
1. 构建 VSIX 文件
2. 创建 GitHub Release
3. 上传 VSIX 文件作为 release 资产

触发条件：
- 推送代码到 main 分支
- 修改了 vscode-extension/ 目录下的文件

## 手动发布步骤

如果需要手动创建 GitHub Release：

### 方式一：使用 GitHub Web 界面

1. 访问：https://github.com/JochenYang/minimax-status/releases/new
2. 点击 "Create a new release"
3. 填写信息：
   - **Tag version**: `vscode-v1.0.0`
   - **Release title**: `VSCode Extension v1.0.0`
   - **Description**: 见下方模板
4. 点击 "Publish release"

### 方式二：使用 GitHub CLI

```bash
# 安装 GitHub CLI（如果未安装）
# macOS: brew install gh
# Windows: winget install GitHub.cli

# 登录
gh auth login

# 创建 release
gh release create \
  --repo JochenYang/minimax-status \
  --title "VSCode Extension v1.0.0" \
  --notes-file RELEASE_NOTES.md \
  --draft=false \
  vscode-v1.0.0 \
  ./vscode-extension/minimax-status-vscode-1.0.0.vsix
```

## Release 模板

```markdown
MiniMax Status - VSCode Extension v1.0.0

这是 VSCode 扩展的第一个正式版本。

## 安装说明

1. 点击下方 `minimax-status-vscode-1.0.0.vsix` 下载扩展包
2. 在 VS Code 中按 `Ctrl+Shift+P`
3. 输入 "Extensions: Install from VSIX..."
4. 选择下载的 `.vsix` 文件

## 功能特性

- 在 VSCode 底部状态栏显示 MiniMax 使用状态
- WebView 配置界面，操作简便
- 智能颜色提示（绿/黄/红）
- 实时自动刷新

## 系统要求

- VS Code 1.74.0 或更高版本

完整更新日志请查看: https://github.com/JochenYang/minimax-status/commits/main
```

## 版本管理

- 当前版本：v1.0.0
- 位置：`vscode-extension/package.json`
- 版本号格式：遵循语义化版本规范 (Semantic Versioning)

## 发布流程

1. 更新 `vscode-extension/package.json` 中的版本号
2. 提交更改
3. 推送到 main 分支
4. Workflow 自动构建并创建 release
5. 检查 release 页面确认成功

## 注意事项

- **不要**使用 `npm version` 命令更新版本（会失败，因为 git 工作目录不干净）
- **手动**编辑 `package.json` 更新版本号
- **或者**使用 `npm version --no-git-tag-version` 更新版本
