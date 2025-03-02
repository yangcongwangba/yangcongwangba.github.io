/**
 * 私密内容处理脚本
 * 用于访问和显示私密仓库中的内容
 */

class PrivateContentManager {
    constructor() {
        this.token = localStorage.getItem(siteConfig.privateRepo.access.tokenKey) || '';
        this.selectedRepo = null;
        this.currentContent = null;
        this.currentPath = '';
        this.pathHistory = [];
        
        // 初始化DOM元素引用
        this.authContainer = document.getElementById('auth-container');
        this.privateContent = document.getElementById('private-content');
        this.contentViewer = document.getElementById('content-viewer');
        this.repoSelector = document.getElementById('repo-selector');
        this.itemsContainer = document.getElementById('private-items-container');
        
        // 检查是否有URL参数
        const urlParams = new URLSearchParams(window.location.search);
        this.contentId = urlParams.get('id');
        
        // 初始化
        this.init();
    }
    
    async init() {
        // 绑定按钮事件
        document.getElementById('access-btn').addEventListener('click', () => this.handleAccess());
        document.getElementById('back-to-list').addEventListener('click', () => this.showContentList());
        
        // 支持按回车键提交Token
        document.getElementById('private-token').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleAccess();
            }
        });
        
        // 检查Token是否过期
        const tokenTime = parseInt(localStorage.getItem(siteConfig.privateRepo.access.tokenKey + '_time') || '0');
        const now = Date.now();
        const isExpired = now - tokenTime > siteConfig.privateRepo.access.tokenExpiry;
        
        // 如果已有Token，且未过期，尝试验证
        if (this.token && !isExpired) {
            try {
                const isValid = await this.validateToken(this.token);
                if (isValid) {
                    this.showContentList();
                    
                    // 如果URL中有内容ID，直接加载该内容
                    if (this.contentId) {
                        this.loadContentById(this.contentId);
                    }
                    return;
                }
            } catch (error) {
                console.error('Token验证失败:', error);
            }
            
            // 如果验证失败，清除存储的Token
            localStorage.removeItem(siteConfig.privateRepo.access.tokenKey);
            localStorage.removeItem(siteConfig.privateRepo.access.tokenKey + '_time');
            this.token = '';
        }
        
        // 显示认证界面
        this.showAuthView();
    }
    
    // 处理Token输入并访问私密内容
    async handleAccess() {
        const tokenInput = document.getElementById('private-token');
        const newToken = tokenInput.value.trim();
        
        if (!newToken) {
            alert('请输入有效的GitHub Token');
            return;
        }
        
        try {
            const isValid = await this.validateToken(newToken);
            if (isValid) {
                this.token = newToken;
                localStorage.setItem(siteConfig.privateRepo.access.tokenKey, newToken);
                
                // 记录Token存储时间
                localStorage.setItem(siteConfig.privateRepo.access.tokenKey + '_time', Date.now());
                
                this.showContentList();
            } else {
                alert('Token无效或没有足够的权限');
            }
        } catch (error) {
            console.error('验证失败:', error);
            alert('验证失败，请重试');
        }
    }
    
    // 验证Token是否有效
    async validateToken(token) {
        try {
            // 尝试访问第一个私密仓库
            const defaultRepo = siteConfig.privateRepo.repositories.find(r => r.isDefault) || 
                               siteConfig.privateRepo.repositories[0];
            
            if (!defaultRepo) return false;
            
            const owner = defaultRepo.owner || siteConfig.site.username;
            const repo = defaultRepo.repo;
            
            const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            return response.status === 200;
        } catch (error) {
            console.error('Token验证出错:', error);
            return false;
        }
    }
    
    // 显示认证视图
    showAuthView() {
        this.authContainer.classList.remove('hidden');
        this.privateContent.classList.add('hidden');
        this.contentViewer.classList.add('hidden');
    }
    
    // 显示内容列表
    async showContentList() {
        this.authContainer.classList.add('hidden');
        this.privateContent.classList.remove('hidden');
        this.contentViewer.classList.add('hidden');
        
        // 生成仓库选择器
        this.generateRepoSelector();
        
        // 加载默认仓库的内容
        await this.loadRepoContents();
    }
    
    // 生成仓库选择器
    generateRepoSelector() {
        const { repositories } = siteConfig.privateRepo;
        
        if (repositories.length <= 1) {
            this.repoSelector.classList.add('hidden');
            this.selectedRepo = repositories[0];
            return;
        }
        
        this.repoSelector.classList.remove('hidden');
        
        let html = '<select id="repo-select">';
        repositories.forEach(repo => {
            const selected = repo.isDefault ? 'selected' : '';
            html += `<option value="${repo.repo}" ${selected}>${repo.name}</option>`;
        });
        html += '</select>';
        
        this.repoSelector.innerHTML = html;
        
        // 设置默认选中的仓库
        this.selectedRepo = repositories.find(r => r.isDefault) || repositories[0];
        
        // 绑定选择事件
        document.getElementById('repo-select').addEventListener('change', (e) => {
            const repoName = e.target.value;
            this.selectedRepo = repositories.find(r => r.repo === repoName);
            this.currentPath = '';
            this.pathHistory = [];
            this.loadRepoContents();
        });
    }
    
    // 加载仓库内容
    async loadRepoContents(path = '') {
        if (!this.selectedRepo) return;
        
        this.itemsContainer.innerHTML = '<div class="loading-indicator">加载中...</div>';
        
        const owner = this.selectedRepo.owner || siteConfig.site.username;
        const repo = this.selectedRepo.repo;
        const branch = this.selectedRepo.branch || 'main';
        
        // 组合基础路径和当前路径
        const basePath = this.selectedRepo.path || '';
        const fullPath = basePath ? (path ? `${basePath}/${path}` : basePath) : path;
        
        try {
            const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${fullPath}?ref=${branch}`, {
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch repository contents: ${response.statusText}`);
            }
            
            const data = await response.json();
            this.currentPath = fullPath;
            
            this.displayItems(data, fullPath);
        } catch (error) {
            console.error('加载仓库内容失败:', error);
            this.itemsContainer.innerHTML = '<div class="error-message">加载失败，请重试</div>';
        }
    }
    
    // 显示内容项目
    displayItems(items, path) {
        if (!Array.isArray(items)) {
            items = [items]; // 处理单个文件的情况
        }
        
        // 排序：目录在前，文件在后，按名称字母顺序排序
        items.sort((a, b) => {
            if (a.type === 'dir' && b.type !== 'dir') return -1;
            if (a.type !== 'dir' && b.type === 'dir') return 1;
            return a.name.localeCompare(b.name);
        });
        
        // 生成当前路径导航
        let pathNavHtml = '';
        if (path) {
            const pathParts = path.split('/');
            pathNavHtml = '<div class="path-nav">';
            pathNavHtml += '<span class="path-item" data-path="">根目录</span>';
            
            let currentPath = '';
            for (let i = 0; i < pathParts.length; i++) {
                if (!pathParts[i]) continue;
                
                currentPath = currentPath ? `${currentPath}/${pathParts[i]}` : pathParts[i];
                const isLast = i === pathParts.length - 1;
                
                if (isLast) {
                    pathNavHtml += ` / <span class="path-item current">${pathParts[i]}</span>`;
                } else {
                    pathNavHtml += ` / <span class="path-item" data-path="${currentPath}">${pathParts[i]}</span>`;
                }
            }
            pathNavHtml += '</div>';
        }
        
        // 生成项目列表
        let itemsHtml = pathNavHtml + '<ul class="private-items">';
        
        // 添加返回上级目录选项
        if (path) {
            const parentPath = path.split('/').slice(0, -1).join('/');
            itemsHtml += `
                <li class="folder-item" data-path="${parentPath}">
                    <span class="folder-icon">📁</span>
                    <span class="item-name">..</span>
                </li>
            `;
        }
        
        // 添加所有项目
        items.forEach(item => {
            if (item.type === 'dir') {
                itemsHtml += `
                    <li class="folder-item" data-path="${item.path}">
                        <span class="folder-icon">📁</span>
                        <span class="item-name">${item.name}</span>
                    </li>
                `;
            } else if (item.name.endsWith('.md')) {
                // 只显示Markdown文件
                itemsHtml += `
                    <li class="file-item" data-path="${item.path}" data-sha="${item.sha}">
                        <span class="file-icon">📄</span>
                        <span class="item-name">${this.getFileTitle(item.name)}</span>
                    </li>
                `;
            }
        });
        
        itemsHtml += '</ul>';
        
        this.itemsContainer.innerHTML = itemsHtml;
        
        // 绑定点击事件
        document.querySelectorAll('.folder-item').forEach(item => {
            item.addEventListener('click', () => {
                const path = item.getAttribute('data-path');
                this.pathHistory.push(this.currentPath); // 保存当前路径用于返回
                this.loadRepoContents(path);
            });
        });
        
        document.querySelectorAll('.file-item').forEach(item => {
            item.addEventListener('click', () => {
                const path = item.getAttribute('data-path');
                const sha = item.getAttribute('data-sha');
                this.loadContent(path, sha);
            });
        });
        
        document.querySelectorAll('.path-item').forEach(item => {
            if (!item.classList.contains('current')) {
                item.addEventListener('click', () => {
                    const path = item.getAttribute('data-path');
                    this.loadRepoContents(path);
                });
            }
        });
    }
    
    // 从文件名获取标题
    getFileTitle(filename) {
        // 移除日期前缀和扩展名
        const withoutExt = filename.replace(/\.md$/, '');
        const withoutDate = withoutExt.replace(/^\d{4}-\d{2}-\d{2}-/, '');
        
        // 将连字符替换为空格并首字母大写
        return withoutDate.replace(/-/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
    
    // 加载内容
    async loadContent(path, sha) {
        if (!this.selectedRepo) return;
        
        const owner = this.selectedRepo.owner || siteConfig.site.username;
        const repo = this.selectedRepo.repo;
        
        try {
            let response;
            if (sha) {
                // 使用blob API获取内容（适用于大文件）
                response = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/blobs/${sha}`, {
                    headers: {
                        'Authorization': `token ${this.token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
            } else {
                // 直接获取文件内容
                response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
                    headers: {
                        'Authorization': `token ${this.token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
            }
            
            if (!response.ok) {
                throw new Error(`Failed to fetch content: ${response.statusText}`);
            }
            
            const data = await response.json();
            const content = sha ? 
                this.decodeBase64(data.content) : 
                this.decodeBase64(data.content);
            
            const filename = path.split('/').pop();
            this.displayContent(filename, content, path, sha || data.sha);
            
            // 更新URL但不重新加载页面
            if (siteConfig.privateRepo.access.encryptId) {
                // 这里可以实现一个简单的加密，如Base64
                const encodedId = btoa(path);
                history.pushState(null, '', `?id=${encodedId}`);
            } else {
                history.pushState(null, '', `?id=${path}`);
            }
        } catch (error) {
            console.error('加载内容失败:', error);
            alert('加载内容失败，请重试');
        }
    }
    
    // 根据ID加载内容
    async loadContentById(id) {
        // 如果ID是加密的，先解密
        const decodedId = siteConfig.privateRepo.access.encryptId ? 
            atob(id) : id;
            
        // 解析内容ID
        // 这里可以扩展为从URL参数解密真实路径
        // 目前简单处理，假设ID就是路径
        this.loadContent(decodedId);
    }
    
    // 显示内容
    displayContent(filename, content, path, sha) {
        this.currentContent = {
            filename,
            content,
            path,
            sha
        };
        
        // 提取YAML前言和Markdown内容
        const { frontMatter, markdown } = this.extractFrontMatter(content);
        
        // 转换Markdown为HTML
        const htmlContent = this.markdownToHtml(markdown);
        
        // 设置标题
        const title = frontMatter.title || this.getFileTitle(filename);
        document.getElementById('content-title').textContent = title;
        
        // 设置元数据
        let metaHtml = '';
        if (frontMatter.date) {
            const date = new Date(frontMatter.date);
            metaHtml += `<span class="meta-item">${date.toLocaleDateString()}</span>`;
        }
        if (frontMatter.mood) {
            metaHtml += `<span class="meta-item">心情: ${frontMatter.mood}</span>`;
        }
        if (frontMatter.weather) {
            metaHtml += `<span class="meta-item">天气: ${frontMatter.weather}</span>`;
        }
        if (frontMatter.location) {
            metaHtml += `<span class="meta-item">位置: ${frontMatter.location}</span>`;
        }
        if (frontMatter.tags && frontMatter.tags.length) {
            const tagsHtml = frontMatter.tags.map(tag => 
                `<span class="tag">${tag}</span>`
            ).join('');
            metaHtml += `<div class="tags-container">${tagsHtml}</div>`;
        }
        document.getElementById('content-meta').innerHTML = metaHtml;
        
        // 设置内容
        document.getElementById('content-body').innerHTML = htmlContent;
        
        // 显示内容查看区域
        this.authContainer.classList.add('hidden');
        this.privateContent.classList.add('hidden');
        this.contentViewer.classList.remove('hidden');
    }
    
    // 提取YAML前言和Markdown内容
    extractFrontMatter(content) {
        const frontMatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
        const match = content.match(frontMatterRegex);
        
        if (match) {
            const yamlStr = match[1];
            const markdown = match[2];
            
            // 简单解析YAML (实际项目中可以使用proper YAML parser)
            const frontMatter = {};
            yamlStr.split('\n').forEach(line => {
                const colonIndex = line.indexOf(':');
                if (colonIndex > 0) {
                    const key = line.slice(0, colonIndex).trim();
                    let value = line.slice(colonIndex + 1).trim();
                    
                    // 处理列表
                    if (value.startsWith('[') && value.endsWith(']')) {
                        value = value.slice(1, -1).split(',').map(v => v.trim());
                    }
                    
                    frontMatter[key] = value;
                }
            });
            
            return { frontMatter, markdown };
        }
        
        return { frontMatter: {}, markdown: content };
    }
    
    // Base64解码
    decodeBase64(str) {
        return decodeURIComponent(escape(atob(str)));
    }
    
    // 简单的Markdown到HTML转换
    markdownToHtml(markdown) {
        // 这里使用简单的正则替换，实际项目中应使用成熟的Markdown解析器
        return markdown
            // 标题
            .replace(/^### (.*$)/gm, '<h3>$1</h3>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
            // 加粗和斜体
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            // 链接
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
            // 图片
            .replace(/!\[([^\]]+)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')
            // 代码块
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            // 行内代码
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            // 列表
            .replace(/^\- (.*$)/gm, '<li>$1</li>')
            .replace(/<li>(.*)<\/li>/gm, function(match) {
                return '<ul>' + match + '</ul>';
            })
            // 水平线
            .replace(/^\-\-\-$/gm, '<hr>')
            // 段落
            .replace(/\n\n/g, '</p><p>')
            // 包装在段落中
            .replace(/^(.+)$/gm, function(match) {
                if (!match.startsWith('<')) {
                    return '<p>' + match + '</p>';
                }
                return match;
            });
    }
}

// 初始化私密内容管理器
document.addEventListener('DOMContentLoaded', () => {
    const privateContentManager = new PrivateContentManager();
}); 