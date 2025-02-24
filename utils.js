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
            // 修复 base64 解码问题
            const decoded = atob(content.replace(/\s/g, ''));
            return new TextDecoder(encoding).decode(
                new Uint8Array([...decoded].map(c => c.charCodeAt(0)))
            );
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
        if (!filename) return { type: 'unknown', icon: 'fa-file', preview: false, color: 'text-gray-400' };
        
        const ext = filename.split('.').pop()?.toLowerCase();
        const typeMap = {
            // 开发相关文件
            'html': { type: 'html', icon: 'fa-html5', preview: true, color: 'text-orange-500' },
            'css': { type: 'css', icon: 'fa-css3-alt', preview: false, color: 'text-blue-500' },
            'js': { type: 'javascript', icon: 'fa-js', preview: false, color: 'text-yellow-500' },
            'jsx': { type: 'react', icon: 'fa-react', preview: false, color: 'text-blue-400' },
            'ts': { type: 'typescript', icon: 'fa-code', preview: false, color: 'text-blue-600' },
            'tsx': { type: 'react-ts', icon: 'fa-react', preview: false, color: 'text-blue-600' },
            'vue': { type: 'vue', icon: 'fa-vuejs', preview: false, color: 'text-green-500' },
            'php': { type: 'php', icon: 'fa-php', preview: false, color: 'text-purple-500' },
            'py': { type: 'python', icon: 'fa-python', preview: false, color: 'text-yellow-600' },
            'java': { type: 'java', icon: 'fa-java', preview: false, color: 'text-red-500' },
            
            // 配置文件
            'json': { type: 'json', icon: 'fa-brackets-curly', preview: false, color: 'text-yellow-400' },
            'yml': { type: 'yaml', icon: 'fa-file-lines', preview: false, color: 'text-gray-600' },
            'yaml': { type: 'yaml', icon: 'fa-file-lines', preview: false, color: 'text-gray-600' },
            'xml': { type: 'xml', icon: 'fa-code', preview: false, color: 'text-orange-400' },
            'conf': { type: 'config', icon: 'fa-cog', preview: false, color: 'text-gray-500' },
            'env': { type: 'env', icon: 'fa-key', preview: false, color: 'text-green-600' },
            
            // 文档类型
            'md': { type: 'markdown', icon: 'fa-markdown', preview: true, color: 'text-blue-500' },
            'txt': { type: 'text', icon: 'fa-file-lines', preview: true, color: 'text-gray-500' },
            'pdf': { type: 'pdf', icon: 'fa-file-pdf', preview: false, color: 'text-red-500' },
            'doc': { type: 'word', icon: 'fa-file-word', preview: false, color: 'text-blue-700' },
            'docx': { type: 'word', icon: 'fa-file-word', preview: false, color: 'text-blue-700' },
            'xls': { type: 'excel', icon: 'fa-file-excel', preview: false, color: 'text-green-700' },
            'xlsx': { type: 'excel', icon: 'fa-file-excel', preview: false, color: 'text-green-700' },
            'ppt': { type: 'powerpoint', icon: 'fa-file-powerpoint', preview: false, color: 'text-red-700' },
            'pptx': { type: 'powerpoint', icon: 'fa-file-powerpoint', preview: false, color: 'text-red-700' },
            
            // 图片类型
            'jpg': { type: 'image', icon: 'fa-image', preview: true, color: 'text-pink-500' },
            'jpeg': { type: 'image', icon: 'fa-image', preview: true, color: 'text-pink-500' },
            'png': { type: 'image', icon: 'fa-image', preview: true, color: 'text-pink-500' },
            'gif': { type: 'image', icon: 'fa-image', preview: true, color: 'text-pink-500' },
            'svg': { type: 'svg', icon: 'fa-bezier-curve', preview: true, color: 'text-orange-500' },
            'ico': { type: 'icon', icon: 'fa-image', preview: true, color: 'text-blue-300' },
            
            // 字体文件
            'ttf': { type: 'font', icon: 'fa-font', preview: false, color: 'text-purple-600' },
            'woff': { type: 'font', icon: 'fa-font', preview: false, color: 'text-purple-600' },
            'woff2': { type: 'font', icon: 'fa-font', preview: false, color: 'text-purple-600' },
            'eot': { type: 'font', icon: 'fa-font', preview: false, color: 'text-purple-600' },
            
            // 媒体文件
            'mp3': { type: 'audio', icon: 'fa-file-audio', preview: false, color: 'text-green-500' },
            'wav': { type: 'audio', icon: 'fa-file-audio', preview: false, color: 'text-green-500' },
            'mp4': { type: 'video', icon: 'fa-file-video', preview: false, color: 'text-blue-500' },
            'avi': { type: 'video', icon: 'fa-file-video', preview: false, color: 'text-blue-500' },
            'mov': { type: 'video', icon: 'fa-file-video', preview: false, color: 'text-blue-500' },
            
            // 压缩文件
            'zip': { type: 'archive', icon: 'fa-file-zipper', preview: false, color: 'text-yellow-700' },
            'rar': { type: 'archive', icon: 'fa-file-zipper', preview: false, color: 'text-yellow-700' },
            '7z': { type: 'archive', icon: 'fa-file-zipper', preview: false, color: 'text-yellow-700' },
            'tar': { type: 'archive', icon: 'fa-file-zipper', preview: false, color: 'text-yellow-700' },
            'gz': { type: 'archive', icon: 'fa-file-zipper', preview: false, color: 'text-yellow-700' },
            
            // Git相关
            'gitignore': { type: 'git', icon: 'fa-git-alt', preview: false, color: 'text-orange-600' },
            'gitattributes': { type: 'git', icon: 'fa-git-alt', preview: false, color: 'text-orange-600' }
        };
        
        // 对于没有后缀的文件，尝试通过文件名匹配
        if (!ext || !typeMap[ext]) {
            const nameMatch = {
                'dockerfile': { type: 'docker', icon: 'fa-docker', preview: false, color: 'text-blue-500' },
                'license': { type: 'license', icon: 'fa-gavel', preview: true, color: 'text-gray-600' },
                'readme': { type: 'markdown', icon: 'fa-book', preview: true, color: 'text-blue-500' }
            };
            
            const lowerName = filename.toLowerCase();
            return nameMatch[lowerName] || { type: 'unknown', icon: 'fa-file', preview: false, color: 'text-gray-400' };
        }
        
        return typeMap[ext] || { type: 'unknown', icon: 'fa-file', preview: false, color: 'text-gray-400' };
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

    static buildFileTree(files) {
        const root = { children: {} };
        
        files.forEach(file => {
            const parts = file.path.split('/');
            let current = root;
            
            parts.forEach((part, index) => {
                if (!current.children[part]) {
                    current.children[part] = {
                        name: part,
                        path: parts.slice(0, index + 1).join('/'),
                        type: index === parts.length - 1 ? file.type : 'dir',
                        size: file.size,
                        sha: file.sha,
                        children: {}
                    };
                }
                current = current.children[part];
            });
        });
        
        return root;
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
}
