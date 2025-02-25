class PostEditor {
    constructor() {
        this.editor = null;
        this.currentPost = null;
        this.isEdit = false;
    }
    
    // 初始化编辑器
    init() {
        this.editor = new EasyMDE({
            element: document.getElementById('editor'),
            spellChecker: false,
            autofocus: true,
            placeholder: '在这里输入文章内容...',
            toolbar: [
                'bold', 'italic', 'strikethrough', 'heading', '|',
                'code', 'quote', 'unordered-list', 'ordered-list', '|',
                'link', 'image', 'table', '|',
                'preview', 'side-by-side', 'fullscreen', '|',
                'guide'
            ]
        });
        
        document.getElementById('save-post').addEventListener('click', () => this.savePost(false));
        document.getElementById('save-draft').addEventListener('click', () => this.savePost(true));
    }
    
    // 新建文章
    newPost() {
        this.isEdit = false;
        this.currentPost = null;
        document.getElementById('editor-title').textContent = '新建文章';
        document.getElementById('post-title').value = '';
        document.getElementById('post-categories').value = '';
        document.getElementById('post-tags').value = '';
        this.editor.value('');
    }
    
    // 编辑文章
    async editPost(path) {
        try {
            this.isEdit = true;
            document.getElementById('editor-title').textContent = '编辑文章';
            
            const { content, sha } = await api.getPostContent(path);
            this.currentPost = { path, sha };
            
            // 解析文章Front Matter
            const frontMatterMatch = content.match(/^---\s+([\s\S]*?)\s+---\s+([\s\S]*)$/);
            if (frontMatterMatch) {
                const frontMatter = frontMatterMatch[1];
                const postContent = frontMatterMatch[2].trim();
                
                // 提取标题、分类和标签
                const titleMatch = frontMatter.match(/title:\s*(.*)/);
                const categoriesMatch = frontMatter.match(/categories:\s*\[(.*)\]/);
                const tagsMatch = frontMatter.match(/tags:\s*\[(.*)\]/);
                
                document.getElementById('post-title').value = titleMatch ? titleMatch[1].trim() : '';
                document.getElementById('post-categories').value = categoriesMatch ? categoriesMatch[1].trim() : '';
                document.getElementById('post-tags').value = tagsMatch ? tagsMatch[1].trim() : '';
                
                this.editor.value(postContent);
            } else {
                this.editor.value(content);
            }
        } catch (error) {
            console.error('编辑文章失败:', error);
            alert('加载文章内容失败，请重试。');
        }
    }
    
    // 保存文章
    async savePost(isDraft) {
        try {
            const title = document.getElementById('post-title').value.trim();
            const categories = document.getElementById('post-categories').value.trim();
            const tags = document.getElementById('post-tags').value.trim();
            const content = this.editor.value().trim();
            
            if (!title) {
                alert('请输入文章标题');
                return;
            }
            
            if (!content) {
                alert('请输入文章内容');
                return;
            }
            
            // 生成Front Matter
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
            const frontMatter = `---
layout: post
title: ${title}
date: ${dateStr}
categories: [${categories}]
tags: [${tags}]
published: ${!isDraft}
---`;
            
            const fullContent = `${frontMatter}\n\n${content}`;
            
            let path, sha, message;
            
            if (this.isEdit && this.currentPost) {
                // 更新现有文章
                path = this.currentPost.path;
                sha = this.currentPost.sha;
                message = `更新文章: ${title}`;
            } else {
                // 创建新文章
                const slug = title
                    .toLowerCase()
                    .replace(/[^\w\s-]/g, '')  // 移除特殊字符
                    .replace(/\s+/g, '-')      // 空格替换为连字符
                    .replace(/-+/g, '-');      // 连续连字符替换为单个连字符
                
                path = `_posts/${dateStr}-${slug}.md`;
                sha = null;
                message = `发布新文章: ${title}`;
            }
            
            await api.saveFile(path, fullContent, message, sha);
            
            alert(isDraft ? '草稿已保存' : '文章已发布');
            app.showView('posts');
            app.loadPosts();
        } catch (error) {
            console.error('保存文章失败:', error);
            alert('保存文章失败，请重试。');
        }
    }
}

let postEditor = null; 