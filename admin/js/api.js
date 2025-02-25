class GitHubAPI {
    constructor(auth) {
        this.auth = auth;
        this.baseURL = 'https://api.github.com';
        this.repoInfo = auth.getRepoInfo();
    }
    
    // 获取请求头
    getHeaders() {
        return {
            'Authorization': `token ${this.auth.token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
        };
    }
    
    // 获取仓库内容
    async getRepoContents(path = '') {
        try {
            const response = await fetch(`${this.baseURL}/repos/${this.repoInfo.owner}/${this.repoInfo.repo}/contents/${path}`, {
                headers: this.getHeaders()
            });
            
            return await response.json();
        } catch (error) {
            console.error('获取仓库内容失败:', error);
            throw error;
        }
    }
    
    // 获取文章列表
    async getPostsList() {
        try {
            const posts = await this.getRepoContents('_posts');
            return posts.filter(item => item.type === 'file' && item.name.endsWith('.md'));
        } catch (error) {
            console.error('获取文章列表失败:', error);
            return [];
        }
    }
    
    // 获取文章内容
    async getPostContent(path) {
        try {
            const response = await fetch(`${this.baseURL}/repos/${this.repoInfo.owner}/${this.repoInfo.repo}/contents/${path}`, {
                headers: this.getHeaders()
            });
            
            const data = await response.json();
            return {
                content: atob(data.content),
                sha: data.sha
            };
        } catch (error) {
            console.error('获取文章内容失败:', error);
            throw error;
        }
    }
    
    // 保存/更新文件
    async saveFile(path, content, message, sha = null) {
        try {
            const payload = {
                message,
                content: btoa(unescape(encodeURIComponent(content))),
                branch: 'main' // 或者是您的默认分支
            };
            
            if (sha) {
                payload.sha = sha;
            }
            
            const response = await fetch(`${this.baseURL}/repos/${this.repoInfo.owner}/${this.repoInfo.repo}/contents/${path}`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(payload)
            });
            
            return await response.json();
        } catch (error) {
            console.error('保存文件失败:', error);
            throw error;
        }
    }
    
    // 删除文件
    async deleteFile(path, message, sha) {
        try {
            const response = await fetch(`${this.baseURL}/repos/${this.repoInfo.owner}/${this.repoInfo.repo}/contents/${path}`, {
                method: 'DELETE',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    message,
                    sha,
                    branch: 'main' // 或者是您的默认分支
                })
            });
            
            return await response.json();
        } catch (error) {
            console.error('删除文件失败:', error);
            throw error;
        }
    }
    
    // 获取网站配置
    async getSiteConfig() {
        try {
            const { content, sha } = await this.getPostContent('_config.yml');
            return { content, sha };
        } catch (error) {
            console.error('获取网站配置失败:', error);
            return { content: '', sha: null };
        }
    }
    
    // 保存网站配置
    async saveSiteConfig(content) {
        try {
            const { sha } = await this.getSiteConfig();
            return await this.saveFile('_config.yml', content, '更新网站配置', sha);
        } catch (error) {
            console.error('保存网站配置失败:', error);
            throw error;
        }
    }
}

let api = null; 