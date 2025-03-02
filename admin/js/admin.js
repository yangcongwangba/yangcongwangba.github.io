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

// 其他管理功能... 