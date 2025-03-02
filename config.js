/**
 * GitHub Pages博客系统配置文件
 * 请根据您的实际情况修改以下配置
 */

const siteConfig = {
  // 网站基本信息
  site: {
    title: "我的GitHub博客",
    description: "基于GitHub Pages的个人博客",
    author: "您的名字",
    // 您的GitHub用户名，将用于自动提取仓库信息
    username: window.location.hostname.split('.')[0],
    // 网站语言，默认为中文
    defaultLanguage: 'zh'
  },
  
  // GitHub认证配置
  github: {
    // OAuth应用Client ID，在GitHub开发者设置中创建OAuth应用后获取
    clientId: "YOUR_GITHUB_CLIENT_ID", 
    
    // 认证回调URL，通常为您的admin页面地址
    redirectUri: `https://${window.location.hostname}/admin/`,
    
    // Token登录方式设置
    // 如果设置为true，将优先使用token方式登录
    preferTokenLogin: true,
    
    // 用于存储GitHub Token的localStorage键名
    tokenStorageKey: "github_token",
    
    // GitHub仓库信息（通常不需要手动配置，会根据用户名自动生成）
    get repoName() { return `${this.username}.github.io`; },
    get repoFullName() { return `${siteConfig.site.username}/${this.repoName}`; },
    
    // GitHub API基础URL
    apiBaseUrl: "https://api.github.com"
  },
  
  // 功能配置
  features: {
    // 是否启用评论功能
    enableComments: true,
    
    // 是否启用深色模式
    enableDarkMode: true,
    
    // 是否启用多语言支持
    enableI18n: true,
    
    // 是否启用插件系统
    enablePlugins: true
  },
  
  // 博客内容设置
  content: {
    // 每页显示的文章数量
    postsPerPage: 10,
    
    // 是否在首页显示文章摘要
    showExcerpt: true,
    
    // 默认缩略图
    defaultThumbnail: "/assets/images/default-thumbnail.jpg"
  },
  
  // 路径配置
  paths: {
    posts: "_posts",
    layouts: "_layouts",
    plugins: "_plugins",
    i18n: "_i18n"
  },
  
  // 添加私密仓库配置
  privateRepo: {
    // 是否启用私密文章功能
    enabled: true,
    
    // 私密仓库信息，可配置多个仓库
    repositories: [
      {
        name: "我的私密日记",
        owner: "", // 不填则默认为当前用户
        repo: "private-diary", // 仓库名称
        branch: "main", // 分支名称
        path: "", // 内容存储路径，空表示根目录
        isDefault: true // 是否为默认私密仓库
      },
      // 可添加更多私密仓库
      // {
      //   name: "其他私密内容",
      //   owner: "username",
      //   repo: "another-private-repo",
      //   branch: "main",
      //   path: "content"
      // }
    ],
    
    // 私密内容访问设置
    access: {
      // 访问私密内容时localStorage中存储token的键名
      tokenKey: "private_repo_token",
      
      // token过期时间（毫秒）,默认30天
      tokenExpiry: 30 * 24 * 60 * 60 * 1000,
      
      // 是否在URL中加密私密内容ID
      encryptId: true
    }
  }
};

// 导出配置
window.siteConfig = siteConfig; 