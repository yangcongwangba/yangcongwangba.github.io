# 洋葱王八的 GitHub Pages 博客系统

一个纯静态的 GitHub Pages 博客管理系统，无需后端服务器。

## 快速开始

### 1. 准备工作

1. Fork 本仓库到你的 GitHub 账号下
2. 将仓库名改为 `你的用户名.github.io`
3. 在仓库设置中启用 GitHub Pages：
   - Settings > Pages > Source 选择 `gh-pages` 分支

### 2. 配置 GitHub Token

1. 访问 [GitHub Token 设置页面](https://github.com/settings/tokens)
2. 点击 "Generate new token (classic)"
3. 填写说明，如 "Blog Management"
4. 选择以下权限：
   - `repo` (完整权限)
   - `workflow` (用于 Actions)
5. 生成并保存 Token（注意：token 只显示一次）

### 3. 修改配置

修改 `admin/config.js` 中的配置：
   - 修改 `repo` 为你的仓库名
   - 修改 `_config.yml` 中的站点信息

### 4. 访问管理后台

1. 打开 `https://[你的用户名].github.io/admin`
2. 使用 GitHub Token 登录

## 功能特性

- 支持多种文章类型(post/page/project等)
- 自定义模板系统
- Markdown 编辑器
- 文件管理
- 实时预览

## 目录结构

