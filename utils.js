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

    // 添加上传文件方法
    async uploadFile(repo, path, file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const content = e.target.result.split(',')[1]; // 获取 base64 内容
                    const response = await this.fetchAPI(`/repos/${repo}/contents/${path}`, {
                        method: 'PUT',
                        body: JSON.stringify({
                            message: `Upload ${file.name}`,
                            content: content
                        })
                    });
                    resolve(response);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsDataURL(file);
        });
    }

    // 优化文件内容读取方法
    async getFileContent(content, encoding = 'utf-8') {
        try {
            const decoded = atob(content);
            if (encoding === 'utf-8') {
                return decodeURIComponent(escape(decoded));
            }
            return decoded;
        } catch (error) {
            console.error('Content decode error:', error);
            return content;
        }
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

export class FileHelper {
    static getFileType(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const typeMap = {
            'md': { type: 'markdown', icon: 'fa-markdown', preview: true },
            'html': { type: 'html', icon: 'fa-html5', preview: true },
            'css': { type: 'css', icon: 'fa-css3', preview: false },
            'js': { type: 'javascript', icon: 'fa-js', preview: false },
            'json': { type: 'json', icon: 'fa-code', preview: false },
            'yml': { type: 'yaml', icon: 'fa-file-code', preview: false },
            'yaml': { type: 'yaml', icon: 'fa-file-code', preview: false },
            'txt': { type: 'text', icon: 'fa-file-alt', preview: false },
            'jpg': { type: 'image', icon: 'fa-image', preview: true },
            'jpeg': { type: 'image', icon: 'fa-image', preview: true },
            'png': { type: 'image', icon: 'fa-image', preview: true },
            'gif': { type: 'image', icon: 'fa-image', preview: true }
        };
        return typeMap[ext] || { type: 'text', icon: 'fa-file', preview: false };
    }

    static isFolder(path) {
        return !path.includes('.');
    }

    static sortFiles(files) {
        return files.sort((a, b) => {
            // 文件夹优先
            if (a.type === 'dir' && b.type !== 'dir') return -1;
            if (a.type !== 'dir' && b.type === 'dir') return 1;
            // 按名称排序
            return a.name.localeCompare(b.name);
        });
    }
}

export class EditorManager {
    constructor(container, onChange) {
        this.container = container;
        this.onChange = onChange;
        this.editor = null;
        this.init();
    }

    async init() {
        require.config({ paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.33.0/min/vs' }});
        
        require(['vs/editor/editor.main'], () => {
            this.editor = monaco.editor.create(this.container, {
                language: 'markdown',
                theme: 'vs',
                automaticLayout: true,
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                wordWrap: 'on',
                scrollBeyondLastLine: false,
            });

            this.editor.onDidChangeModelContent(() => {
                if (this.onChange) {
                    this.onChange(this.editor.getValue());
                }
            });
        });
    }

    setContent(content, language) {
        if (!this.editor) {
            setTimeout(() => this.setContent(content, language), 100);
            return;
        }
        
        const model = this.editor.getModel();
        monaco.editor.setModelLanguage(model, language);
        this.editor.setValue(content);
    }

    getValue() {
        return this.editor?.getValue() || '';
    }
}
