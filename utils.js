export class GithubAPI {
    constructor(token) {
        this.token = token;
    }

    async fetchAPI(path, options = {}) {
        const headers = {
            'Accept': 'application/vnd.github.v3+json',
            'Authorization': `token ${this.token}`,
            'Content-Type': 'application/json',
        };

        try {
            const response = await fetch(`https://api.github.com${path}`, {
                ...options,
                headers
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || '请求失败');
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // 获取仓库文件列表
    async getContents(repo, path = '') {
        return this.fetchAPI(`/repos/${repo}/contents/${path}`);
    }

    // 获取文件内容
    async getFile(repo, path) {
        return this.fetchAPI(`/repos/${repo}/contents/${path}`);
    }

    // 更新文件
    async updateFile(repo, path, content, sha, message) {
        return this.fetchAPI(`/repos/${repo}/contents/${path}`, {
            method: 'PUT',
            body: JSON.stringify({
                message,
                content: btoa(unescape(encodeURIComponent(content))),
                sha
            })
        });
    }

    // 删除文件
    async deleteFile(repo, path, sha, message) {
        return this.fetchAPI(`/repos/${repo}/contents/${path}`, {
            method: 'DELETE',
            body: JSON.stringify({ message, sha })
        });
    }
}

export class UIHelper {
    static toast(message, type = 'info') {
        alert(message);
    }

    static confirm(message) {
        return window.confirm(message);
    }

    static prompt(message, defaultValue = '') {
        return window.prompt(message, defaultValue);
    }
}
