export class GithubAPI {
    constructor(token) {
        this.token = token;
        this.baseURL = 'https://api.github.com';
    }

    async fetchAPI(path, options = {}) {
        const headers = {
            'Accept': 'application/vnd.github.v3+json',
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json',
        };

        try {
            LoadingManager.show();
            const response = await fetch(this.baseURL + path, {
                ...options,
                headers
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw Object.assign(new Error(data.message || '请求失败'), {
                    status: response.status,
                    data
                });
            }
            
            return data;
        } catch (error) {
            console.error(`API Error (${path}):`, error);
            throw error;
        } finally {
            LoadingManager.hide();
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

    // 优化创建文件夹方法
    async createFolder(repo, path) {
        const gitkeepPath = path.endsWith('/') ? `${path}.gitkeep` : `${path}/.gitkeep`;
        return this.fetchAPI(`/repos/${repo}/contents/${gitkeepPath}`, {
            method: 'PUT',
            body: JSON.stringify({
                message: `Create folder ${path}`,
                content: btoa('')
            })
        });
    }

    // 创建文件方法
    async createFile(repo, path, content = '', message = '') {
        return this.fetchAPI(`/repos/${repo}/contents/${path}`, {
            method: 'PUT',
            body: JSON.stringify({
                message: message || `Create ${path}`,
                content: btoa(unescape(encodeURIComponent(content)))
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
            if (!content) return '';
            const decoded = atob(content.replace(/\s/g, ''));
            return decodeURIComponent(escape(decoded));
        } catch (error) {
            console.error('Content decode error:', error);
            return '';
        }
    }
}

export class UIHelper {
    static #toastContainer = null;

    static toast(message, type = 'info') {
        if (!this.#toastContainer) {
            this.#toastContainer = document.createElement('div');
            this.#toastContainer.className = 'fixed bottom-4 right-4 flex flex-col gap-2 z-50';
            document.body.appendChild(this.#toastContainer);
        }

        const toast = document.createElement('div');
        toast.className = `
            bg-white shadow-lg rounded-lg p-4 mb-4 flex items-center
            transform transition-all duration-300 translate-x-full
            ${type === 'error' ? 'border-l-4 border-red-500' : ''}
            ${type === 'success' ? 'border-l-4 border-green-500' : ''}
        `;

        toast.innerHTML = `
            <i class="fas fa-${this.#getIcon(type)} mr-2"></i>
            <span>${message}</span>
        `;

        this.#toastContainer.appendChild(toast);
        requestAnimationFrame(() => toast.classList.remove('translate-x-full'));

        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    static #getIcon(type) {
        return {
            info: 'info-circle',
            success: 'check-circle',
            error: 'times-circle',
            warning: 'exclamation-circle'
        }[type] || 'info-circle';
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
        if (!filename) return { type: 'unknown', icon: 'file' };
        
        const isFolder = !filename.includes('.');
        if (isFolder) return { type: 'folder', icon: 'folder' };

        const ext = filename.split('.').pop()?.toLowerCase();
        const isMarkdown = ext === 'md';
        const isImage = ['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(ext);

        return {
            type: ext || 'unknown',
            icon: isFolder ? 'folder' : 'file',
            preview: isMarkdown || isImage
        };
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

    static getExternalEditor(filename) {
        const ext = filename.split('.').pop()?.toLowerCase();
        const editorMap = {
            'md': 'markdown',
            'txt': 'text',
            'json': 'text',
            'html': 'html',
            'css': 'text',
            'js': 'text',
            'jpg': 'image',
            'jpeg': 'image',
            'png': 'image',
            'gif': 'image'
        };
        return editorMap[ext] || 'text';
    }

    static async openInExternalEditor(content, filename) {
        try {
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
            return true;
        } catch (error) {
            console.error('Failed to open external editor:', error);
            return false;
        }
    }

    static buildFileTree(files, currentPath = '') {
        const root = { name: '', path: currentPath, type: 'dir', children: {} };
        
        files.forEach(file => {
            if (!file.path.startsWith(currentPath)) return;
            
            const relativePath = file.path.slice(currentPath.length);
            const parts = relativePath.split('/').filter(Boolean);
            let current = root;
            
            parts.forEach((part, index) => {
                const isLast = index === parts.length - 1;
                const path = currentPath + parts.slice(0, index + 1).join('/');
                
                if (!current.children[part]) {
                    current.children[part] = {
                        name: part,
                        path: path,
                        type: isLast ? file.type : 'dir',
                        size: file.size,
                        sha: file.sha,
                        content: file.content,
                        children: {}
                    };
                }
                current = current.children[part];
            });
        });
        
        return root;
    }

    static sortTree(tree) {
        const sorted = {};
        
        // 先添加文件夹
        Object.keys(tree).filter(key => tree[key].type === 'dir')
            .sort()
            .forEach(key => {
                sorted[key] = {
                    ...tree[key],
                    children: this.sortTree(tree[key].children)
                };
            });
        
        // 再添加文件
        Object.keys(tree).filter(key => tree[key].type !== 'dir')
            .sort()
            .forEach(key => {
                sorted[key] = tree[key];
            });
        
        return sorted;
    }

    static buildTreeStructure(files, currentPath = '') {
        const tree = [];
        const paths = {};

        // 首先创建所有文件节点
        files.forEach(file => {
            const fullPath = file.path;
            const parts = fullPath.split('/');
            let currentNode = null;
            let currentPathStr = '';

            parts.forEach((part, index) => {
                currentPathStr = index === 0 ? part : `${currentPathStr}/${part}`;
                if (!paths[currentPathStr]) {
                    const isLast = index === parts.length - 1;
                    const node = {
                        id: currentPathStr,
                        name: part,
                        path: currentPathStr,
                        type: isLast ? file.type : 'dir',
                        children: [],
                        content: isLast ? file.content : null,
                        sha: isLast ? file.sha : null,
                        size: isLast ? file.size : null
                    };
                    paths[currentPathStr] = node;

                    if (index === 0) {
                        tree.push(node);
                    } else {
                        const parentPath = parts.slice(0, index).join('/');
                        const parent = paths[parentPath];
                        if (parent) {
                            parent.children.push(node);
                        }
                    }
                }
                currentNode = paths[currentPathStr];
            });
        });

        // 排序：文件夹在前，文件在后，同类型按字母排序
        const sortNodes = (nodes) => {
            return nodes.sort((a, b) => {
                if (a.type === b.type) {
                    return a.name.localeCompare(b.name);
                }
                return a.type === 'dir' ? -1 : 1;
            });
        };

        // 递归排序所有节点
        const sortTree = (node) => {
            if (node.children && node.children.length > 0) {
                node.children = sortNodes(node.children);
                node.children.forEach(sortTree);
            }
            return node;
        };

        return sortNodes(tree).map(sortTree);
    }

    static getDefaultContent(fileType) {
        const templates = {
            md: '# New Markdown File\n\n',
            html: '<!DOCTYPE html>\n<html>\n<head>\n    <title>New Page</title>\n</head>\n<body>\n\n</body>\n</html>',
            css: '/* Styles */\n',
            js: '// JavaScript\n',
            json: '{\n    \n}',
            yml: '# YAML Config\n',
            txt: ''
        };
        return templates[fileType] || '';
    }

    static validateFileName(name) {
        const invalidChars = /[<>:"\/\\|?*\x00-\x1F]/g;
        return {
            isValid: !invalidChars.test(name) && name.trim().length > 0,
            sanitized: name.replace(invalidChars, '')
        };
    }
}

export class CacheManager {
    static CACHE_PREFIX = 'ghp_';
    static CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

    static setCache(key, data) {
        const cacheData = {
            timestamp: Date.now(),
            data: data
        };
        localStorage.setItem(this.CACHE_PREFIX + key, JSON.stringify(cacheData));
    }

    static getCache(key) {
        const cached = localStorage.getItem(this.CACHE_PREFIX + key);
        if (!cached) return null;

        const { timestamp, data } = JSON.parse(cached);
        if (Date.now() - timestamp > this.CACHE_EXPIRY) {
            this.removeCache(key);
            return null;
        }

        return data;
    }

    static removeCache(key) {
        localStorage.removeItem(this.CACHE_PREFIX + key);
    }

    static clearCache() {
        Object.keys(localStorage)
            .filter(key => key.startsWith(this.CACHE_PREFIX))
            .forEach(key => localStorage.removeItem(key));
    }

    static async fetchWithCache(key, fetcher, ttl = 300000) {
        const cached = this.getCache(key);
        if (cached) return cached;

        const data = await fetcher();
        this.setCache(key, data, ttl);
        return data;
    }

    static invalidatePattern(pattern) {
        const regex = new RegExp(pattern);
        Object.keys(localStorage)
            .filter(key => regex.test(key))
            .forEach(key => this.removeCache(key));
    }
}

export class ExternalEditorManager {
    static async watchFile(filename, originalContent, onSave) {
        const checkInterval = 1000; // 每秒检查一次
        let fileHandle;

        try {
            const options = {
                types: [{
                    description: 'Text Files',
                    accept: { 'text/plain': ['.txt', '.md', '.js', '.css', '.html', '.json'] }
                }],
                suggestedName: filename
            };

            // 请求用户选择保存位置
            fileHandle = await window.showSaveFilePicker(options);
            const writable = await fileHandle.createWritable();
            await writable.write(originalContent);
            await writable.close();

            // 开始监视文件变化
            const intervalId = setInterval(async () => {
                try {
                    const file = await fileHandle.getFile();
                    const content = await file.text();
                    
                    if (content !== originalContent) {
                        await onSave(content);
                        clearInterval(intervalId);
                    }
                } catch (error) {
                    console.error('Error watching file:', error);
                    clearInterval(intervalId);
                }
            }, checkInterval);

            return () => clearInterval(intervalId); // 返回清理函数
        } catch (error) {
            console.error('Failed to set up file watching:', error);
            return null;
        }
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

    setLanguage(filename) {
        if (!this.editor) return;
        
        const ext = filename.split('.').pop()?.toLowerCase();
        const languageMap = {
            'md': 'markdown',
            'js': 'javascript',
            'ts': 'typescript',
            'html': 'html',
            'css': 'css',
            'json': 'json',
            'yml': 'yaml',
            'yaml': 'yaml',
            'xml': 'xml'
        };

        const model = this.editor.getModel();
        const language = languageMap[ext] || 'plaintext';
        monaco.editor.setModelLanguage(model, language);
    }
}

export class FileChangeDetector {
    constructor() {
        this.changes = new Map();
    }

    trackChange(path, content, originalContent) {
        if (content !== originalContent) {
            this.changes.set(path, {
                content,
                originalContent,
                timestamp: Date.now()
            });
        } else {
            this.changes.delete(path);
        }
    }

    hasUnsavedChanges() {
        return this.changes.size > 0;
    }

    getChangedFiles() {
        return Array.from(this.changes.keys());
    }

    clearChanges(path) {
        if (path) {
            this.changes.delete(path);
        } else {
            this.changes.clear();
        }
    }
}

export class ErrorHandler {
    static handle(error, context = '') {
        console.error(`Error in ${context}:`, error);

        if (error.response?.status === 401) {
            UIHelper.toast('认证失败，请重新登录');
            localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
            location.reload();
            return;
        }

        const message = this.getErrorMessage(error);
        UIHelper.toast(message);
    }

    static getErrorMessage(error) {
        if (error.response?.data?.message) {
            return error.response.data.message;
        }
        if (error.message) {
            return error.message;
        }
        return '操作失败，请重试';
    }
}

export class PathHelper {
    static join(...parts) {
        return parts.filter(Boolean).join('/').replace(/\/+/g, '/');
    }

    static getParentPath(path) {
        return path.split('/').slice(0, -1).join('/');
    }

    static getFileName(path) {
        return path.split('/').pop();
    }

    static isSubPath(parentPath, childPath) {
        return childPath.startsWith(parentPath + '/');
    }
}

export class FileHistoryManager {
    static HISTORY_KEY = 'ghp_history_';
    static MAX_HISTORY = 50;

    static addToHistory(path, content) {
        const key = this.HISTORY_KEY + path;
        const history = this.getHistory(path);
        history.unshift({
            content,
            timestamp: Date.now()
        });
        
        // 保留最近的历史记录
        if (history.length > this.MAX_HISTORY) {
            history.pop();
        }
        
        localStorage.setItem(key, JSON.stringify(history));
    }

    static getHistory(path) {
        const key = this.HISTORY_KEY + path;
        try {
            return JSON.parse(localStorage.getItem(key) || '[]');
        } catch {
            return [];
        }
    }

    static clearHistory(path) {
        if (path) {
            localStorage.removeItem(this.HISTORY_KEY + path);
        } else {
            Object.keys(localStorage)
                .filter(key => key.startsWith(this.HISTORY_KEY))
                .forEach(key => localStorage.removeItem(key));
        }
    }
}

export class NotificationManager {
    static TIMEOUT = 3000;
    static queue = [];
    static container = null;

    static init() {
        this.container = document.createElement('div');
        this.container.className = 'fixed bottom-4 right-4 flex flex-col gap-2';
        document.body.appendChild(this.container);
    }

    static show(message, type = 'info') {
        if (!this.container) this.init();
        
        const notification = document.createElement('div');
        notification.className = `
            notification ${type} transform transition-all duration-300
            bg-white shadow-lg rounded-lg p-4 flex items-center
            translate-x-full
        `;
        
        notification.innerHTML = `
            <i class="fas fa-${this.getIcon(type)} mr-2"></i>
            <span>${message}</span>
        `;

        this.container.appendChild(notification);
        requestAnimationFrame(() => {
            notification.classList.remove('translate-x-full');
        });

        setTimeout(() => {
            notification.classList.add('translate-x-full');
            setTimeout(() => notification.remove(), 300);
        }, this.TIMEOUT);
    }

    static getIcon(type) {
        const icons = {
            info: 'info-circle',
            success: 'check-circle',
            warning: 'exclamation-circle',
            error: 'times-circle'
        };
        return icons[type] || icons.info;
    }
}

export class SearchManager {
    constructor(items, options = {}) {
        this.items = items;
        this.options = {
            keys: ['name', 'path'],
            threshold: 0.4,
            ...options
        };
        this.fuse = new Fuse(items, this.options);
    }

    search(query) {
        if (!query) return this.items;
        return this.fuse.search(query).map(result => result.item);
    }

    updateItems(items) {
        this.items = items;
        this.fuse.setCollection(items);
    }
}

export class PerformanceMonitor {
    static metrics = new Map();

    static startMeasure(name) {
        this.metrics.set(name, performance.now());
    }

    static endMeasure(name) {
        const start = this.metrics.get(name);
        if (start) {
            const duration = performance.now() - start;
            this.metrics.delete(name);
            console.debug(`Performance [${name}]: ${duration.toFixed(2)}ms`);
            return duration;
        }
        return 0;
    }
}

export class LoadingManager {
    static show(message = '加载中...') {
        const overlay = document.getElementById('loading-overlay');
        const text = document.getElementById('loading-text');
        text.textContent = message;
        overlay.classList.remove('hidden');
    }

    static hide() {
        const overlay = document.getElementById('loading-overlay');
        overlay.classList.add('hidden');
    }
}

export class AuthManager {
    static TOKEN_KEY = 'github_token';
    static USER_KEY = 'github_user';

    static getToken() {
        return localStorage.getItem(this.TOKEN_KEY);
    }

    static setToken(token) {
        localStorage.setItem(this.TOKEN_KEY, token);
    }

    static clearToken() {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
    }

    static setUser(user) {
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    }

    static getUser() {
        try {
            return JSON.parse(localStorage.getItem(this.USER_KEY));
        } catch {
            return null;
        }
    }

    static isLoggedIn() {
        return !!this.getToken();
    }
}
