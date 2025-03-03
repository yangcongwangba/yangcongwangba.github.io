# GitHub Pages 博客系统

这是一个基于 GitHub Pages 的静态博客系统，完全依托于 GitHub 的服务，无需额外的后端服务器。

## 特性

- 🚀 使用 Next.js 和 TypeScript 构建
- 🎨 使用 Chakra UI 构建美观的用户界面
- 🌙 支持亮色/暗色主题
- 🔒 GitHub OAuth 认证
- ✍️ Markdown 文章编辑器
- 📱 响应式设计
- 🔄 GitHub API 集成
- 🚫 无需后端服务器

## 部署步骤

1. Fork 这个仓库到你的 GitHub 账号下

2. 创建 GitHub OAuth App
   - 访问 GitHub Settings > Developer settings > OAuth Apps
   - 点击 "New OAuth App"
   - 填写应用信息：
     - Application name: 你的博客名称
     - Homepage URL: https://<username>.github.io
     - Authorization callback URL: https://<username>.github.io/api/auth/callback

3. 配置环境变量
   - 在仓库的 Settings > Secrets and variables > Actions 中添加以下 secrets：
     - GITHUB_TOKEN: 你的 GitHub Personal Access Token
     - GITHUB_CLIENT_ID: OAuth App 的 Client ID
     - GITHUB_CLIENT_SECRET: OAuth App 的 Client Secret

4. 修改配置文件
   打开 `src/config/site.config.ts`，修改以下配置：
   ```typescript
   github: {
     username: '你的 GitHub 用户名',
     repo: '你的仓库名',
     branch: 'main',
   }
   ```

5. 启用 GitHub Pages
   - 访问仓库的 Settings > Pages
   - Source 选择 "GitHub Actions"

6. 推送代码到 main 分支
   GitHub Actions 会自动构建并部署网站到 GitHub Pages

## 本地开发

1. 克隆仓库
   ```bash
   git clone https://github.com/<username>/<repo>.git
   cd <repo>
   ```

2. 安装依赖
   ```bash
   npm install
   ```

3. 创建 `.env.local` 文件
   ```
   GITHUB_TOKEN=你的_GitHub_Token
   GITHUB_CLIENT_ID=你的_OAuth_App_Client_ID
   GITHUB_CLIENT_SECRET=你的_OAuth_App_Client_Secret
   ```

4. 启动开发服务器
   ```bash
   npm run dev
   ```

## 使用说明

1. 访问 https://<username>.github.io 查看博客首页
2. 访问 https://<username>.github.io/admin 进入管理后台
3. 使用 GitHub 账号登录后即可管理文章
4. 在管理后台可以创建、编辑和删除文章
5. 文章使用 Markdown 格式编写

## 技术栈

- Next.js
- TypeScript
- Chakra UI
- GitHub API
- GitHub OAuth
- GitHub Actions

## 许可证

MIT 