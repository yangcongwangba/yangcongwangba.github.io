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

    // 创建文件夹
    async createFolder(repo, path) {
        return this.fetchAPI(`/repos/${repo}/contents/${path}`, {
            method: 'PUT',
            body: JSON.stringify({
                message: `Create folder ${path}`,
                content: btoa(''), // 创建空文件
                path: `${path}/.gitkeep`
            })
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

    static #modalElement = null;

    static async confirm(options) {
        const { title, message, confirmText = '确认', cancelText = '取消', type = 'info' } = options;
        
        return new Promise((resolve) => {
            const modal = document.getElementById('delete-modal');
            const messageEl = document.getElementById('delete-message');
            
            messageEl.textContent = message;
            modal.classList.remove('hidden');

            const handleConfirm = () => {
                modal.classList.add('hidden');
                cleanup();
                resolve(true);
            };

            const handleCancel = () => {
                modal.classList.add('hidden');
                cleanup();
                resolve(false);
            };

            const cleanup = () => {
                document.getElementById('confirm-delete').removeEventListener('click', handleConfirm);
                document.getElementById('cancel-delete').removeEventListener('click', handleCancel);
            };

            document.getElementById('confirm-delete').addEventListener('click', handleConfirm);
            document.getElementById('cancel-delete').addEventListener('click', handleCancel);
        });
    }

    static renderMarkdown(content) {
        return marked.parse(content);
    }

    // 格式化文件大小
    static formatSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return `${size.toFixed(1)} ${units[unitIndex]}`;
    }
}
