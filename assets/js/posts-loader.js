// 文章加载功能
class PostsLoader {
    constructor(username, repoName) {
        this.username = username;
        this.repoName = repoName;
        this.repoPath = `${username}/${repoName}`;
    }
    
    async loadRecentPosts() {
        const container = document.getElementById('recent-posts-container');
        if (!container) return;
        
        try {
            const postsData = await this.fetchPosts();
            
            if (postsData.length === 0) {
                container.innerHTML = '<p>暂无文章</p>';
                return;
            }
            
            // 获取最新的10篇文章
            const recentPosts = postsData.slice(0, 10);
            let postsHtml = '';
            
            recentPosts.forEach(post => {
                postsHtml += `
                    <article class="post-item">
                        <h3 class="post-title">
                            <a href="${post.url}">${post.title}</a>
                        </h3>
                        <div class="post-meta">
                            <span class="post-date">${post.date}</span>
                            ${post.categories ? `<span class="post-categories">${post.categories}</span>` : ''}
                        </div>
                        <p class="post-excerpt">${post.excerpt}</p>
                        <a href="${post.url}" class="read-more" data-i18n="read_more">阅读更多</a>
                    </article>
                `;
            });
            
            container.innerHTML = postsHtml;
            
            // 如果有i18n实例，翻译页面
            if (window.i18n) {
                window.i18n.translatePage();
            }
            
        } catch (error) {
            console.error('加载文章失败:', error);
            container.innerHTML = '<p>加载文章失败，请稍后重试</p>';
        }
    }
    
    async loadFeaturedPosts() {
        const container = document.getElementById('featured-posts-container');
        if (!container) return;
        
        try {
            const postsData = await this.fetchPosts();
            
            // 获取标记为精选的文章
            const featuredPosts = postsData.filter(post => post.featured);
            
            if (featuredPosts.length === 0) {
                container.innerHTML = '<p>暂无精选文章</p>';
                return;
            }
            
            let postsHtml = '';
            
            featuredPosts.forEach(post => {
                postsHtml += `
                    <article class="featured-post-item">
                        <div class="post-thumbnail">
                            <a href="${post.url}">
                                <img src="${post.thumbnail || 'assets/images/default-thumbnail.jpg'}" alt="${post.title}">
                            </a>
                        </div>
                        <h3 class="post-title">
                            <a href="${post.url}">${post.title}</a>
                        </h3>
                        <p class="post-excerpt">${post.excerpt}</p>
                        <a href="${post.url}" class="read-more" data-i18n="read_more">阅读更多</a>
                    </article>
                `;
            });
            
            container.innerHTML = postsHtml;
            
        } catch (error) {
            console.error('加载精选文章失败:', error);
            container.innerHTML = '<p>加载精选文章失败，请稍后重试</p>';
        }
    }
    
    async fetchPosts() {
        // 获取_posts目录下的文章信息
        const response = await fetch(`https://api.github.com/repos/${this.repoPath}/contents/_posts`);
        
        if (!response.ok) {
            throw new Error('获取文章列表失败');
        }
        
        const files = await response.json();
        const posts = [];
        
        // 处理每个Markdown文件
        for (const file of files) {
            if (file.name.endsWith('.md')) {
                const fileResponse = await fetch(file.download_url);
                const content = await fileResponse.text();
                
                // 解析文章元数据
                const metadata = this.parsePostMetadata(content);
                const postUrl = `/posts/${file.name.replace('.md', '')}`;
                
                posts.push({
                    title: metadata.title || file.name.replace('.md', ''),
                    date: metadata.date,
                    categories: metadata.categories,
                    excerpt: metadata.excerpt || this.generateExcerpt(content),
                    url: postUrl,
                    featured: metadata.featured === true,
                    thumbnail: metadata.thumbnail
                });
            }
        }
        
        // 按日期排序（最新的在前）
        return posts.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    
    parsePostMetadata(content) {
        const metadata = {};
        
        // 查找YAML前言部分
        const match = content.match(/^---\n([\s\S]*?)\n---/);
        
        if (match && match[1]) {
            const yamlContent = match[1];
            
            // 提取各个字段
            const titleMatch = yamlContent.match(/title:\s*(.*)/);
            const dateMatch = yamlContent.match(/date:\s*(.*)/);
            const categoriesMatch = yamlContent.match(/categories:\s*(.*)/);
            const excerptMatch = yamlContent.match(/excerpt:\s*(.*)/);
            const featuredMatch = yamlContent.match(/featured:\s*(true|false)/);
            const thumbnailMatch = yamlContent.match(/thumbnail:\s*(.*)/);
            
            if (titleMatch) metadata.title = titleMatch[1].trim();
            if (dateMatch) metadata.date = dateMatch[1].trim();
            if (categoriesMatch) metadata.categories = categoriesMatch[1].trim();
            if (excerptMatch) metadata.excerpt = excerptMatch[1].trim();
            if (featuredMatch) metadata.featured = featuredMatch[1].trim() === 'true';
            if (thumbnailMatch) metadata.thumbnail = thumbnailMatch[1].trim();
        }
        
        return metadata;
    }
    
    generateExcerpt(content) {
        // 移除YAML前言
        const contentWithoutYaml = content.replace(/^---\n[\s\S]*?\n---/, '');
        
        // 移除Markdown语法并截取前150个字符
        const plainText = contentWithoutYaml
            .replace(/!\[.*?\]\(.*?\)/g, '') // 移除图片
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1') // 替换链接为纯文本
            .replace(/[#*_`~]/g, '') // 移除其他Markdown标记
            .trim();
            
        return plainText.substring(0, 150) + (plainText.length > 150 ? '...' : '');
    }
}

// 初始化并加载文章
document.addEventListener('DOMContentLoaded', () => {
    // 替换为实际的GitHub用户名
    const username = location.hostname.split('.')[0];
    const repoName = username + '.github.io';
    
    const postsLoader = new PostsLoader(username, repoName);
    postsLoader.loadRecentPosts();
    postsLoader.loadFeaturedPosts();
}); 