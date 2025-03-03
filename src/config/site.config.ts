export const siteConfig = {
  // 基本配置
  title: '我的博客',
  description: '基于 GitHub Pages 的个人博客',
  language: 'zh-CN',
  
  // GitHub 配置
  github: {
    username: '', // 在此填入你的 GitHub 用户名
    repo: '', // 在此填入你的仓库名，通常是 <username>.github.io
    branch: 'main',
    token: process.env.GITHUB_TOKEN, // GitHub Personal Access Token
    clientId: process.env.GITHUB_CLIENT_ID, // GitHub OAuth App Client ID
    clientSecret: process.env.GITHUB_CLIENT_SECRET, // GitHub OAuth App Client Secret
  },

  // 主题配置
  theme: {
    defaultTheme: 'light' as 'light' | 'dark',
    colors: {
      primary: '#0070f3',
      secondary: '#00b4d8',
    },
  },

  // 导航配置
  nav: [
    { name: '首页', path: '/' },
    { name: '文章', path: '/posts' },
    { name: '关于', path: '/about' },
  ],

  // 评论配置
  comments: {
    enabled: true,
    repo: '', // 评论存储仓库，格式：username/repo
  },

  // 社交媒体链接
  social: {
    github: '',
    twitter: '',
    email: '',
  },

  // 管理后台配置
  admin: {
    path: '/admin',
    allowedUsers: [], // 允许访问管理后台的 GitHub 用户名列表
  },

  // SEO 配置
  seo: {
    googleSiteVerification: '',
    baiduSiteVerification: '',
  },
}

export type SiteConfig = typeof siteConfig 