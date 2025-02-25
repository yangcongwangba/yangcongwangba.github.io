document.addEventListener('DOMContentLoaded', function() {
    // 文章加载逻辑
    const postsContainer = document.getElementById('posts-container');
    const loadMoreBtn = document.getElementById('load-more');
    let currentPage = 1;
    const postsPerPage = 6;
    let allPosts = [];
    
    // 从GitHub获取文章列表
    async function fetchPosts() {
        try {
            // 从URL获取用户名
            const hostname = window.location.hostname;
            const username = hostname.split('.')[0];
            const repo = `${username}.github.io`;
            
            const response = await fetch(`https://api.github.com/repos/${username}/${repo}/contents/_posts`);
            const posts = await response.json();
            
            // 筛选出markdown文件
            allPosts = posts.filter(file => file.name.endsWith('.md'));
            
            // 按日期排序（新到旧）
            allPosts.sort((a, b) => {
                const dateA = a.name.split('-').slice(0, 3).join('-');
                const dateB = b.name.split('-').slice(0, 3).join('-');
                return dateB.localeCompare(dateA);
            });
            
            // 显示第一页
            displayPosts(1);
        } catch (error) {
            console.error('获取文章失败:', error);
            postsContainer.innerHTML = `
                <div class="col-12 text-center">
                    <p>加载文章失败，请稍后重试。</p>
                </div>
            `;
        }
    }
    
    // 显示指定页的文章
    function displayPosts(page) {
        // 计算起始和结束位置
        const start = (page - 1) * postsPerPage;
        const end = start + postsPerPage;
        const postsToShow = allPosts.slice(start, end);
        
        // 如果是第一页，清空容器
        if (page === 1) {
            postsContainer.innerHTML = '';
        }
        
        // 如果没有更多文章可显示，隐藏加载更多按钮
        if (end >= allPosts.length) {
            loadMoreBtn.style.display = 'none';
        } else {
            loadMoreBtn.style.display = 'inline-block';
        }
        
        // 为每篇文章创建卡片
        postsToShow.forEach(async (post) => {
            const date = post.name.split('-').slice(0, 3).join('-');
            const title = post.name.split('-').slice(3).join('-').replace('.md', '').replace(/-/g, ' ');
            
            // 创建文章卡片
            const postCard = document.createElement('div');
            postCard.className = 'col-md-4';
            postCard.innerHTML = `
                <div class="card post-card">
                    <img src="https://source.unsplash.com/random/600x400?${encodeURIComponent(title)}" class="card-img-top" alt="${title}">
                    <div class="card-body">
                        <h5 class="card-title">${title}</h5>
                        <div class="post-meta">
                            <i class="far fa-calendar-alt"></i> ${date}
                        </div>
                        <p class="card-text">加载中...</p>
                        <div class="post-tags"></div>
                        <a href="#" class="btn btn-primary mt-3 read-more" data-path="${post.path}">阅读全文</a>
                    </div>
                </div>
            `;
            
            postsContainer.appendChild(postCard);
            
            // 获取文章内容
            try {
                const contentResponse = await fetch(post.download_url);
                const content = await contentResponse.text();
                
                // 提取文章摘要和标签
                const frontMatterMatch = content.match(/^---\s+([\s\S]*?)\s+---\s+([\s\S]*)$/);
                if (frontMatterMatch) {
                    const frontMatter = frontMatterMatch[1];
                    const postContent = frontMatterMatch[2].trim();
                    
                    // 提取摘要（前150个字符）
                    const excerpt = postContent.substring(0, 150) + '...';
                    postCard.querySelector('.card-text').textContent = excerpt;
                    
                    // 提取标签
                    const tagsMatch = frontMatter.match(/tags:\s*\[(.*)\]/);
                    if (tagsMatch && tagsMatch[1]) {
                        const tags = tagsMatch[1].split(',').map(tag => tag.trim());
                        const tagsHTML = tags.map(tag => 
                            `<span class="badge bg-primary">${tag}</span>`
                        ).join(' ');
                        postCard.querySelector('.post-tags').innerHTML = tagsHTML;
                    }
                } else {
                    // 如果没有Front Matter，显示前150个字符
                    const excerpt = content.substring(0, 150) + '...';
                    postCard.querySelector('.card-text').textContent = excerpt;
                }
            } catch (error) {
                console.error('获取文章内容失败:', error);
                postCard.querySelector('.card-text').textContent = '无法加载文章摘要';
            }
        });
    }
    
    // 加载更多按钮点击事件
    loadMoreBtn.addEventListener('click', function(e) {
        e.preventDefault();
        currentPage++;
        displayPosts(currentPage);
    });
    
    // 初始加载文章
    fetchPosts();
    
    // 阅读全文点击事件委托
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('read-more')) {
            e.preventDefault();
            const path = e.target.getAttribute('data-path');
            // 可以在这里实现文章页面导航
            // 简单实现：打开一个新页面显示文章
            window.open(`/post.html?path=${encodeURIComponent(path)}`, '_blank');
        }
    });
}); 