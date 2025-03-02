// 管理后台主要功能
async function loadAdminPanel() {
    const token = localStorage.getItem('github_token');
    const username = await getUserInfo(token);
    const repoName = username + '.github.io';
    
    // 生成管理面板HTML
    const adminPanel = document.getElementById('admin-panel');
    adminPanel.innerHTML = `
        <header>
            <h1>博客管理系统</h1>
            <div class="user-info">
                <span>欢迎, ${username}</span>
                <button id="logout-btn">退出</button>
            </div>
        </header>
        
        <nav>
            <ul>
                <li><a href="#" data-section="posts">文章管理</a></li>
                <li><a href="#" data-section="new-post">新建文章</a></li>
                <li><a href="#" data-section="settings">网站设置</a></li>
                <li><a href="#" data-section="plugins">插件管理</a></li>
            </ul>
        </nav>
        
        <main id="main-content">
            <!-- 动态内容区域 -->
        </main>
    `;
    
    // 绑定导航事件
    document.querySelectorAll('nav a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = e.target.getAttribute('data-section');
            loadSection(section, username, repoName, token);
        });
    });
    
    // 默认加载文章列表
    loadSection('posts', username, repoName, token);
    
    // 绑定退出按钮
    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('github_token');
        window.location.reload();
    });
}

// 加载不同功能区域
async function loadSection(section, username, repoName, token) {
    const mainContent = document.getElementById('main-content');
    
    switch(section) {
        case 'posts':
            mainContent.innerHTML = '<h2>文章列表</h2><div id="posts-list">加载中...</div>';
            loadPosts(username, repoName, token);
            break;
        case 'new-post':
            // 加载可用的模板列表
            const templates = await loadTemplates(username, repoName, token);
            
            // 加载私密仓库列表
            const privateRepos = siteConfig.privateRepo.enabled ? 
                siteConfig.privateRepo.repositories : [];
            
            mainContent.innerHTML = `
                <h2>新建文章</h2>
                <form id="new-post-form">
                    <div class="form-group">
                        <label for="title">标题</label>
                        <input type="text" id="title" required>
                    </div>
                    <div class="form-group">
                        <label for="template">选择模板</label>
                        <select id="template">
                            <option value="default">默认模板</option>
                            <option value="diary">日记模板</option>
                            ${templates.map(tpl => `<option value="${tpl.name}">${tpl.title}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="visibility">可见性</label>
                        <select id="visibility">
                            <option value="public">公开</option>
                            <option value="private">私密</option>
                        </select>
                    </div>
                    <div id="private-repo-group" class="form-group hidden">
                        <label for="private-repo">私密仓库</label>
                        <select id="private-repo">
                            ${privateRepos.map(repo => 
                                `<option value="${repo.owner || username}/${repo.repo}/${repo.branch}/${repo.path}" ${repo.isDefault ? 'selected' : ''}>${repo.name}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="featured">精选文章</label>
                        <input type="checkbox" id="featured">
                    </div>
                    <div class="form-group">
                        <label for="content">内容</label>
                        <textarea id="content" rows="15" required></textarea>
                    </div>
                    <button type="submit">发布文章</button>
                </form>
            `;
            
            // 绑定可见性变化事件
            document.getElementById('visibility').addEventListener('change', (e) => {
                const privateRepoGroup = document.getElementById('private-repo-group');
                if (e.target.value === 'private') {
                    privateRepoGroup.classList.remove('hidden');
                } else {
                    privateRepoGroup.classList.add('hidden');
                }
            });
            
            bindNewPostForm(username, repoName, token);
            break;
        case 'private-posts':
            mainContent.innerHTML = '<h2>私密文章管理</h2><div id="repo-selector"></div><div id="private-posts-list">加载中...</div>';
            
            // 加载私密仓库选择器
            const repoSelector = document.getElementById('repo-selector');
            const repos = siteConfig.privateRepo.repositories;
            
            if (repos.length === 0) {
                repoSelector.innerHTML = '<p>未配置私密仓库，请先在config.js中配置</p>';
                return;
            }
            
            repoSelector.innerHTML = `
                <div class="form-group">
                    <label for="private-repo-select">选择私密仓库:</label>
                    <select id="private-repo-select">
                        ${repos.map(repo => 
                            `<option value="${repo.owner || username}/${repo.repo}/${repo.branch}/${repo.path}">${repo.name}</option>`
                        ).join('')}
                    </select>
                </div>
            `;
            
            // 绑定仓库选择事件
            const repoSelect = document.getElementById('private-repo-select');
            repoSelect.addEventListener('change', () => {
                const [owner, repo, branch, path] = repoSelect.value.split('/');
                loadPrivatePosts(owner, repo, branch, path, token);
            });
            
            // 加载默认仓库的文章
            const defaultRepo = repos.find(r => r.isDefault) || repos[0];
            loadPrivatePosts(defaultRepo.owner || username, defaultRepo.repo, defaultRepo.branch, defaultRepo.path, token);
            break;
        // 其他功能区域...
    }
}

// 获取仓库中的文章列表
async function loadPosts(username, repoName, token) {
    try {
        const response = await fetch(`https://api.github.com/repos/${username}/${repoName}/contents/_posts`, {
            headers: {
                'Authorization': `token ${token}`
            }
        });
        
        const files = await response.json();
        const postsList = document.getElementById('posts-list');
        
        if (files.length === 0) {
            postsList.innerHTML = '<p>暂无文章，点击"新建文章"开始创作。</p>';
            return;
        }
        
        let postsHtml = '<ul class="posts-list">';
        files.forEach(file => {
            if (file.name.endsWith('.md')) {
                postsHtml += `
                    <li>
                        <span class="post-title">${file.name.replace(/\.md$/, '')}</span>
                        <div class="post-actions">
                            <button class="edit-btn" data-path="${file.path}">编辑</button>
                            <button class="delete-btn" data-path="${file.path}">删除</button>
                        </div>
                    </li>
                `;
            }
        });
        postsHtml += '</ul>';
        
        postsList.innerHTML = postsHtml;
        
        // 绑定编辑和删除按钮事件
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const path = e.target.getAttribute('data-path');
                editPost(path, username, repoName, token);
            });
        });
        
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const path = e.target.getAttribute('data-path');
                deletePost(path, username, repoName, token);
            });
        });
    } catch (error) {
        console.error('加载文章失败:', error);
        document.getElementById('posts-list').innerHTML = '<p>加载文章失败，请检查网络连接或权限设置。</p>';
    }
}

// 加载模板列表
async function loadTemplates(username, repoName, token) {
    try {
        const response = await fetch(`https://api.github.com/repos/${username}/${repoName}/contents/_layouts`, {
            headers: {
                'Authorization': `token ${token}`
            }
        });
        
        if (!response.ok) {
            console.warn('无法加载模板，可能是_layouts目录不存在');
            return [];
        }
        
        const files = await response.json();
        const templates = [];
        
        for (const file of files) {
            if (file.name.endsWith('.html')) {
                const fileResponse = await fetch(file.download_url);
                const content = await fileResponse.text();
                
                // 提取模板标题
                const titleMatch = content.match(/<!--\s*Template:\s*(.*?)\s*-->/);
                const title = titleMatch ? titleMatch[1] : file.name.replace('.html', '');
                
                templates.push({
                    name: file.name.replace('.html', ''),
                    title: title
                });
            }
        }
        
        return templates;
    } catch (error) {
        console.error('加载模板失败:', error);
        return [];
    }
}

// 绑定发布文章表单
function bindNewPostForm(username, repoName, token) {
    document.getElementById('new-post-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const title = document.getElementById('title').value;
        const content = document.getElementById('content').value;
        const template = document.getElementById('template').value;
        const featured = document.getElementById('featured').checked;
        const visibility = document.getElementById('visibility').value;
        
        if (!title || !content) {
            alert('标题和内容不能为空！');
            return;
        }
        
        try {
            // 准备文章内容，添加YAML前言
            const date = new Date().toISOString().slice(0, 10);
            const fileName = `${date}-${title.toLowerCase().replace(/\s+/g, '-')}.md`;
            
            let fullContent = `---
title: ${title}
date: ${date}
layout: ${template}
featured: ${featured}
`;

            // 如果是日记模板，添加一些特殊字段
            if (template === 'diary') {
                fullContent += `mood: 平静
weather: 晴朗
location: 
`;
            }

            fullContent += `---

${content}`;
            
            if (visibility === 'private') {
                // 发布到私密仓库
                const privateRepoSelect = document.getElementById('private-repo');
                const [owner, repo, branch, path] = privateRepoSelect.value.split('/');
                
                const filePath = path ? 
                    `${path}/${fileName}` : 
                    fileName;
                
                await createFileInRepo(owner, repo, filePath, fullContent, token, branch);
                alert('私密文章发布成功！');
            } else {
                // 发布到公开博客
                await createFile(username, repoName, `_posts/${fileName}`, fullContent, token);
                alert('文章发布成功！');
            }
            
            // 清空表单或跳转到文章列表
            loadSection('posts', username, repoName, token);
        } catch (error) {
            console.error('发布文章失败:', error);
            alert('文章发布失败，请重试！');
        }
    });
}

// 创建文件API
async function createFile(username, repoName, path, content, token) {
    const encodedContent = btoa(unescape(encodeURIComponent(content)));
    
    const response = await fetch(`https://api.github.com/repos/${username}/${repoName}/contents/${path}`, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            message: `Add ${path}`,
            content: encodedContent
        })
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '创建文件失败');
    }
    
    return await response.json();
}

// 添加在私密仓库创建文件的函数
async function createFileInRepo(owner, repo, path, content, token, branch = 'main') {
    const encodedContent = btoa(unescape(encodeURIComponent(content)));
    
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            message: `Add ${path}`,
            content: encodedContent,
            branch: branch
        })
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '创建文件失败');
    }
    
    return await response.json();
}

// 添加加载私密文章的函数
async function loadPrivatePosts(owner, repo, branch, path, token) {
    const postsListContainer = document.getElementById('private-posts-list');
    postsListContainer.innerHTML = '<p>加载中...</p>';
    
    try {
        // 构建API URL
        let apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
        if (branch && branch !== 'main') {
            apiUrl += `?ref=${branch}`;
        }
        
        // 获取私密仓库内容
        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `token ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status}`);
        }
        
        const items = await response.json();
        
        // 过滤出Markdown文件（文章）
        const posts = items.filter(item => 
            item.type === 'file' && 
            (item.name.endsWith('.md') || item.name.endsWith('.markdown'))
        );
        
        if (posts.length === 0) {
            postsListContainer.innerHTML = '<p>没有找到文章</p>';
            return;
        }
        
        // 构建文章列表
        let html = '<ul class="posts-list">';
        for (const post of posts) {
            const fileName = post.name;
            const fileDate = await getFileCreationDate(owner, repo, post.path, token);
            
            html += `
                <li class="post-item">
                    <div class="post-title">${fileName}</div>
                    <div class="post-date">${fileDate}</div>
                    <div class="post-actions">
                        <button onclick="editPrivatePost('${owner}', '${repo}', '${post.path}', '${token}')">编辑</button>
                        <button onclick="deletePrivatePost('${owner}', '${repo}', '${post.path}', '${token}')">删除</button>
                    </div>
                </li>
            `;
        }
        html += '</ul>';
        
        postsListContainer.innerHTML = html;
    } catch (error) {
        console.error('加载私密文章失败:', error);
        postsListContainer.innerHTML = `<p class="error">加载失败: ${error.message}</p>`;
    }
}

// 获取文件创建日期
async function getFileCreationDate(owner, repo, path, token) {
    try {
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?path=${path}&page=1&per_page=1`, {
            headers: {
                'Authorization': `token ${token}`
            }
        });
        
        if (!response.ok) {
            return '未知日期';
        }
        
        const commits = await response.json();
        if (commits.length > 0) {
            const date = new Date(commits[0].commit.author.date);
            return date.toLocaleDateString();
        }
        
        return '未知日期';
    } catch (error) {
        console.error('获取文件日期失败:', error);
        return '未知日期';
    }
}

// 其他管理功能...

// 确保管理面板初始化函数正确定义
function initAdminPanel(username, repoName, token) {
    console.log('初始化管理面板...');
    
    // 显示欢迎信息
    const welcomeMessage = document.createElement('div');
    welcomeMessage.className = 'welcome-message';
    welcomeMessage.innerHTML = `
        <h2>欢迎，${username}！</h2>
        <p>您现在可以管理您的博客内容。</p>
    `;
    
    // 创建管理菜单
    const adminMenu = document.createElement('div');
    adminMenu.className = 'admin-menu';
    adminMenu.innerHTML = `
        <button id="posts-btn" class="menu-btn active">文章管理</button>
        <button id="new-post-btn" class="menu-btn">新建文章</button>
        <button id="private-posts-btn" class="menu-btn">私密文章</button>
        <button id="settings-btn" class="menu-btn">网站设置</button>
        <button id="logout-btn" class="menu-btn">退出登录</button>
    `;
    
    // 创建内容区域
    const contentArea = document.createElement('div');
    contentArea.id = 'main-content';
    contentArea.className = 'main-content';
    
    // 添加到管理面板
    const adminPanel = document.getElementById('admin-panel');
    adminPanel.innerHTML = ''; // 清空现有内容
    adminPanel.appendChild(welcomeMessage);
    adminPanel.appendChild(adminMenu);
    adminPanel.appendChild(contentArea);
    
    // 绑定菜单按钮事件
    document.getElementById('posts-btn').addEventListener('click', () => {
        setActiveButton('posts-btn');
        loadSection('posts', username, repoName, token);
    });
    
    document.getElementById('new-post-btn').addEventListener('click', () => {
        setActiveButton('new-post-btn');
        loadSection('new-post', username, repoName, token);
    });
    
    document.getElementById('settings-btn').addEventListener('click', () => {
        setActiveButton('settings-btn');
        loadSection('settings', username, repoName, token);
    });
    
    document.getElementById('logout-btn').addEventListener('click', () => {
        if (confirm('确定要退出登录吗？')) {
            localStorage.removeItem(siteConfig.github.tokenStorageKey);
            localStorage.removeItem('github_username');
            window.location.reload();
        }
    });
    
    // 绑定私密文章按钮事件
    document.getElementById('private-posts-btn').addEventListener('click', () => {
        setActiveButton('private-posts-btn');
        loadSection('private-posts', username, repoName, token);
    });
    
    // 默认加载文章列表
    loadSection('posts', username, repoName, token);
}

// 设置当前激活的菜单按钮
function setActiveButton(btnId) {
    document.querySelectorAll('.menu-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(btnId).classList.add('active');
}

// 检查页面加载时是否已登录
document.addEventListener('DOMContentLoaded', () => {
    // 如果auth.js已经完成了登录检查，这里就不需要再检查
    // 这段代码仅作为备份，确保管理面板能够初始化
    
    const token = localStorage.getItem(siteConfig.github.tokenStorageKey);
    const username = localStorage.getItem('github_username');
    
    if (token && username && 
        document.getElementById('admin-panel') && 
        !document.getElementById('admin-panel').classList.contains('hidden')) {
        // 登录状态，但管理面板还没有初始化
        initAdminPanel(username, siteConfig.github.repoName, token);
    }
});

// 添加提示消息函数
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // 添加到页面
    document.body.appendChild(notification);
    
    // 3秒后自动消失
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 500);
    }, 3000);
}

// 在成功操作后调用
// showNotification('文章发布成功', 'success');

// 在错误发生时调用
// showNotification('操作失败，请重试', 'error');

// 添加CSS样式 