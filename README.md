# 洋葱王八的博客管理系统

一个基于 GitHub Pages 的静态博客管理系统。

## 快速开始

1. Fork 本仓库
2. 更新配置:
   - 修改 `admin/config.js` 中的 `repo` 为你的仓库名
   - 修改 `_config.yml` 中的站点信息
3. 开启 GitHub Pages:
   - 进入仓库设置 -> Pages
   - Source 选择 gh-pages 分支
4. 访问管理后台:
   - 打开 `https://[你的用户名].github.io/admin`
   - 使用 GitHub Token 登录

## 获取 GitHub Token

1. 访问 GitHub 设置页面
2. 进入 Developer settings -> Personal access tokens
3. 生成新 token，需要以下权限:
   - repo
   - workflow

## 功能特性

- 支持多种文章类型(post/page/project等)
- 自定义模板系统
- Markdown 编辑器
- 文件管理
- 实时预览

## 目录结构

