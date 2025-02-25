class App {
    constructor() {
        this.currentView = 'dashboard';
    }
    
    // 初始化应用
    init() {
        // 导航点击事件
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.showView(e.target.getAttribute('data-view'));
            });
        });
    }
    
    // 认证后初始化
    initAfterAuth() {
        document.getElementById('login-container').classList.add('d-none');
        document.getElementById('content-container').classList.remove('d-none');
        
        // 初始化API
        api = new GitHubAPI(auth);
        
        // 初始化编辑器
        postEditor = new PostEditor();
        postEditor.init();
        
        // 加载仪表盘数据
        this.loadDashboard();
        
        // 初始化当前视图
        this.showView(this.currentView);
    }
    
    // 显示指定视图
    showView(viewName) {
        this.currentView = viewName;
        
        // 隐藏所有视图
        document.querySelectorAll('.content-view').forEach(view => {
            view.classList.add('d-none');
        });
        
        // 显示当前视图
        document.getElementById(`${viewName}-view`).classList.remove('d-none');
        
        // 更新导航高亮
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`.nav-link[data-view="${viewName}"]`).classList.add('active');
        
        // 加载视图数据
        switch (viewName) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'posts':
                this.loadPosts();
                break;
            case 'new-post':
                postEditor.newPost();
                break;
            case 'settings':
                this.loadSettings();
                break;
        }
    }
    
    // 加载仪表盘数据
    async loadDashboard() {
        try {
            const statsContainer = document.querySelector('#dashboard-view .stats');
            statsContainer.innerHTML = '<p class="text-center">正在加载统计数据...</p>';
            
            // 获取文章数量
            const posts = await api.getPostsList();
            
            // 加载最近提交
            const response = await fetch(`https://api.github.com/repos/${api.repoInfo.owner}/${api.repoInfo.repo}/commits`, {
                headers: api.getHeaders()
            });
            const commits = await response.json();
            
            // 显示统计信息
            statsContainer.innerHTML = `
                <div class="col-md-4">
                    <div class="card">
                        <div class="card-body">
                            <h5 class="card-title">文章总数</h5>
                            <p class="card-text display-4">${posts.length}</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card">
                        <div class="card-body">
                            <h5 class="card-title">最近更新</h5>
                            <p class="card-text">${commits[0] ? new Date(commits[0].commit.author.date).toLocaleString() : '无数据'}</p>
                            <p>${commits[0] ? commits[0].commit.message : ''}</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card">
                        <div class="card-body">
                            <h5 class="card-title">快速操作</h5>
                            <button class="btn btn-primary mb-2 w-100" data-view="new-post">写新文章</button>
                            <button class="btn btn-secondary w-100" data-view="settings">网站设置</button>
                        </div>
                    </div>
                </div>
            `;
            
            // 添加快速操作按钮事件
            statsContainer.querySelectorAll('button[data-view]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    this.showView(e.target.getAttribute('data-view'));
                });
            });
        } catch (error) {
            console.error('加载仪表盘失败:', error);
        }
    }
    
    // 加载文章列表
    async loadPosts() {
        try {
            const postsContainer = document.getElementById('posts-list');
            postsContainer.innerHTML = '<tr><td colspan="3" class="text-center">正在加载文章列表...</td></tr>';
            
            const posts = await api.getPostsList();
            
            if (posts.length === 0) {
                postsContainer.innerHTML = '<tr><td colspan="3" class="text-center">暂无文章</td></tr>';
                return;
            }
            
            // 按日期排序（新到旧）
            posts.sort((a, b) => {
                const dateA = a.name.split('-').slice(0, 3).join('-');
                const dateB = b.name.split('-').slice(0, 3).join('-');
                return dateB.localeCompare(dateA);
            });
            
            // 生成文章列表
            postsContainer.innerHTML = posts.map(post => {
                const dateParts = post.name.split('-').slice(0, 3);
                const date = dateParts.join('-');
                const titleParts = post.name.split('-').slice(3).join('-').replace('.md', '');
                const title = titleParts.replace(/-/g, ' ');
                
                return `
                    <tr>
                        <td>${title}</td>
                        <td>${date}</td>
                        <td>
                            <i class="fas fa-edit text-primary action-btn edit-post" data-path="${post.path}" title="编辑"></i>
                            <i class="fas fa-trash-alt text-danger action-btn delete-post" data-path="${post.path}" data-sha="${post.sha}" title="删除"></i>
                        </td>
                    </tr>
                `;
            }).join('');
            
            // 添加编辑和删除事件
            document.querySelectorAll('.edit-post').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const path = e.target.getAttribute('data-path');
                    this.showView('new-post');
                    postEditor.editPost(path);
                });
            });
            
            document.querySelectorAll('.delete-post').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    if (confirm('确定要删除此文章吗？')) {
                        const path = e.target.getAttribute('data-path');
                        const sha = e.target.getAttribute('data-sha');
                        try {
                            await api.deleteFile(path, '删除文章', sha);
                            alert('文章已删除');
                            this.loadPosts();
                        } catch (error) {
                            console.error('删除文章失败:', error);
                            alert('删除文章失败，请重试。');
                        }
                    }
                });
            });
        } catch (error) {
            console.error('加载文章列表失败:', error);
        }
    }
    
    // 加载网站设置
    async loadSettings() {
        try {
            const titleInput = document.getElementById('site-title');
            const descriptionInput = document.getElementById('site-description');
            
            titleInput.value = '加载中...';
            descriptionInput.value = '加载中...';
            
            const { content } = await api.getSiteConfig();
            
            // 解析配置文件中的标题和描述
            const titleMatch = content.match(/title:\s*(.*)/);
            const descriptionMatch = content.match(/description:\s*(.*)/);
            
            titleInput.value = titleMatch ? titleMatch[1].trim() : '';
            descriptionInput.value = descriptionMatch ? descriptionMatch[1].trim() : '';
            
            // 保存设置事件
            document.getElementById('save-settings').onclick = async () => {
                try {
                    const newTitle = titleInput.value.trim();
                    const newDescription = descriptionInput.value.trim();
                    
                    // 更新配置文件中的标题和描述
                    let newContent = content;
                    if (titleMatch) {
                        newContent = newContent.replace(/title:\s*(.*)/, `title: ${newTitle}`);
                    } else {
                        newContent = `title: ${newTitle}\n${newContent}`;
                    }
                    
                    if (descriptionMatch) {
                        newContent = newContent.replace(/description:\s*(.*)/, `description: ${newDescription}`);
                    } else {
                        newContent = `description: ${newDescription}\n${newContent}`;
                    }
                    
                    await api.saveSiteConfig(newContent);
                    alert('网站设置已保存');
                } catch (error) {
                    console.error('保存设置失败:', error);
                    alert('保存设置失败，请重试。');
                }
            };
        } catch (error) {
            console.error('加载设置失败:', error);
        }
    }
}

const app = new App();
document.addEventListener('DOMContentLoaded', () => app.init()); 