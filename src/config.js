/**
 * 项目配置文件
 * 所有可配置项集中在此文件中，方便维护和扩展
 */

const config = {
  // 网站基本信息
  site: {
    title: 'GitHub Pages React Site',
    description: '基于GitHub Pages的React网站',
    author: 'Your Name',
    repository: 'username/repo-name', // 替换为你的GitHub仓库名称
  },
  
  // GitHub相关配置
  github: {
    // GitHub OAuth应用配置
    clientId: 'YOUR_GITHUB_CLIENT_ID', // 替换为你的GitHub OAuth App的Client ID
    redirectUri: 'https://username.github.io/login/callback', // 替换为你的回调URL
    tokenProxyUrl: 'https://username.github.io/.netlify/functions/token', // 替换为你的token代理URL
    
    // 内容仓库配置
    contentRepo: 'username/content-repo', // 存储网站内容的仓库
    contentBranch: 'main', // 内容分支
    contentPath: 'content', // 内容路径
    
    // 评论系统配置
    issueRepo: 'username/comments-repo', // 用于存储评论的仓库
    issueLabel: 'comment', // 评论issue的标签
  },
  
  // 布局配置
  layout: {
    // 导航菜单项
    navItems: [
      { label: 'home', path: '/' },
      { label: 'blog', path: '/blog' },
      { label: 'about', path: '/about' },
    ],
    
    // 页脚链接
    footerLinks: [
      { label: 'GitHub', url: 'https://github.com/username' },
      { label: 'Twitter', url: 'https://twitter.com/username' },
    ],
  },
  
  // 内容配置
  content: {
    // 页面模板
    templates: [
      { id: 'blog', name: '博客文章', icon: 'article' },
      { id: 'page', name: '普通页面', icon: 'description' },
      { id: 'gallery', name: '图片集', icon: 'collections' },
    ],
    
    // 默认元数据
    defaultMetadata: {
      author: 'Your Name',
      language: 'zh',
      tags: [],
      draft: false,
    },
  },
  
  // 功能开关
  features: {
    comments: true, // 是否启用评论功能
    darkMode: true, // 是否启用暗黑模式
    multilingual: true, // 是否启用多语言
  },
  
  // 支持的语言
  languages: [
    { code: 'en', name: 'English' },
    { code: 'zh', name: '中文' },
  ],
};

export default config;