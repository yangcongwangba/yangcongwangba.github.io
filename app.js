import { CONFIG } from './config.js';
import { GithubAPI, UIHelper, FileHelper, EditorManager } from './utils.js';

class GitHubPagesManager {
    constructor() {
        this.init();
        this.bindEvents();
        this.currentPath = '';
        this.setupEditor();
        this.editor = new EditorManager(
            document.getElementById('editor-container'),
            content => this.handleEditorChange(content)
        );
        this.bindFileUpload();
    }

    init() {
        this.token = localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
        this.currentRepo = CONFIG.DEFAULT_REPO;
        this.currentFile = null;
        
        if (this.token) {
            this.api = new GithubAPI(this.token);
            this.showEditor();
            this.loadFiles();
        }
    }

    setupEditor() {
        const editor = document.getElementById('editor');
        const preview = document.getElementById('preview');
        
        editor.addEventListener('input', () => {
            preview.innerHTML = UIHelper.renderMarkdown(editor.value);
        });
    }

    bindEvents() {
        const handlers = {
            'login-btn': () => this.login(),
            'logout-btn': () => this.logout(),
            'save-btn': () => this.saveFile(),
            'delete-btn': () => this.deleteFile(),
            'new-file-btn': () => this.newFile(),
        };

        Object.entries(handlers).forEach(([id, handler]) => {
            document.getElementById(id)?.addEventListener('click', handler.bind(this));
        });

        document.getElementById('file-list')?.addEventListener('click', (e) => {
            if (e.target.classList.contains('file-item')) {
                this.loadFileContent(e.target.dataset.path);
            }
        });
    }

    bindFileUpload() {
        const fileUpload = document.getElementById('file-upload');
        const uploadStatus = document.getElementById('upload-status');
        
        fileUpload.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files);
            if (!files.length) return;

            uploadStatus.textContent = `准备上传 ${files.length} 个文件...`;
            
            try {
                for (const file of files) {
                    const path = this.currentPath ? 
                        `${this.currentPath}/${file.name}` : file.name;
                    
                    await this.api.uploadFile(this.currentRepo, path, file);
                    uploadStatus.textContent = `上传成功: ${file.name}`;
                }
                
                this.loadFiles();
                setTimeout(() => {
                    uploadStatus.textContent = '';
                }, 3000);
            } catch (error) {
                uploadStatus.textContent = `上传失败: ${error.message}`;
            }
            
            fileUpload.value = ''; // 重置文件输入
        });
    }

    async login() {
        const token = document.getElementById('token-input').value.trim();
        if (!token) return UIHelper.toast('请输入 Token');
        
        try {
            this.api = new GithubAPI(token);
            await this.api.fetchAPI('/user');
            localStorage.setItem(CONFIG.STORAGE_KEYS.TOKEN, token);
            this.token = token;
            this.showEditor();
            this.loadFiles();
        } catch (error) {
            UIHelper.toast('登录失败: ' + error.message);
        }
    }

    logout() {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
        location.reload();
    }

    showEditor() {
        document.getElementById('login-section').classList.add('hidden');
        document.getElementById('editor-section').classList.remove('hidden');
    }

    async loadFiles() {
        try {
            const files = await this.api.getContents(this.currentRepo, this.currentPath);
            this.renderFileList(files);
            this.updateBreadcrumb();
        } catch (error) {
            UIHelper.toast('加载文件失败: ' + error.message);
        }
    }

    updateBreadcrumb() {
        const parts = this.currentPath.split('/').filter(Boolean);
        const breadcrumb = document.getElementById('path-breadcrumb');
        
        breadcrumb.innerHTML = `
            <span class="cursor-pointer" data-path="">根目录</span>
            ${parts.map((part, index) => `
                <span class="mx-2">/</span>
                <span class="cursor-pointer" data-path="${parts.slice(0, index + 1).join('/')}">
                    ${part}
                </span>
            `).join('')}
        `;

        breadcrumb.addEventListener('click', (e) => {
            if (e.target.dataset.path !== undefined) {
                this.currentPath = e.target.dataset.path;
                this.loadFiles();
            }
        });
    }

    async loadFileContent(path) {
        try {
            const file = await this.api.getFile(this.currentRepo, path);
            this.currentFile = file;
            
            // 优化文件内容加载
            const content = await this.api.getFileContent(file.content);
            const fileType = FileHelper.getFileType(file.name);
            
            // 等待编辑器初始化完成
            await this.ensureEditor();
            
            this.editor.setContent(content, fileType.type);
            document.getElementById('current-file-name').textContent = file.name;
            document.getElementById('file-type-badge').textContent = fileType.type;
            this.handleEditorChange(content);
        } catch (error) {
            UIHelper.toast('加载文件内容失败: ' + error.message);
        }
    }

    async ensureEditor() {
        if (!this.editor) {
            return new Promise(resolve => {
                const checkEditor = () => {
                    if (this.editor) {
                        resolve();
                    } else {
                        setTimeout(checkEditor, 100);
                    }
                };
                checkEditor();
            });
        }
    }

    handleEditorChange(content) {
        const preview = document.getElementById('preview-container');
        if (!this.currentFile) return;
        
        const fileType = FileHelper.getFileType(this.currentFile.name);
        if (fileType.preview) {
            switch (fileType.type) {
                case 'markdown':
                    preview.innerHTML = marked.parse(content);
                    preview.classList.remove('hidden');
                    break;
                case 'html':
                    preview.innerHTML = content;
                    preview.classList.remove('hidden');
                    break;
                case 'image':
                    preview.innerHTML = `<img src="data:image;base64,${content}" alt="Preview">`;
                    preview.classList.remove('hidden');
                    break;
                default:
                    preview.classList.add('hidden');
            }
        } else {
            preview.classList.add('hidden');
        }
    }

    async saveFile() {
        if (!this.currentFile) return UIHelper.toast('请先选择文件');
        
        try {
            const content = document.getElementById('editor').value;
            await this.api.updateFile(
                this.currentRepo,
                this.currentFile.path,
                content,
                this.currentFile.sha,
                `Update ${this.currentFile.path}`
            );
            UIHelper.toast('保存成功');
            this.loadFiles();
        } catch (error) {
            UIHelper.toast('保存失败: ' + error.message);
        }
    }

    async deleteFile() {
        if (!this.currentFile) return;
        
        const confirmed = await UIHelper.confirm({
            message: `确定要删除 ${this.currentFile.path} 吗？此操作不可恢复。`,
            type: 'danger'
        });

        if (!confirmed) return;
        
        try {
            await this.api.deleteFile(
                this.currentRepo,
                this.currentFile.path,
                this.currentFile.sha,
                `Delete ${this.currentFile.path}`
            );

            UIHelper.toast('删除成功');
            this.currentFile = null;
            document.getElementById('editor').value = '';
            document.getElementById('preview').innerHTML = '';
            this.loadFiles();
        } catch (error) {
            UIHelper.toast('删除失败: ' + error.message);
        }
    }

    async newFile() {
        const filename = prompt('输入文件名:');
        if (!filename) return;
        
        try {
            const endpoint = CONFIG.API.ENDPOINTS.CONTENTS.replace('{repo}', this.currentRepo) + '/' + filename;
            
            await this.api.fetchAPI(endpoint, {
                method: 'PUT',
                body: JSON.stringify({
                    message: `Create ${filename}`,
                    content: btoa('# New File')
                })
            });

            UIHelper.toast('创建成功', 'success');
            this.loadFiles();
        } catch (error) {
            UIHelper.toast(error.message, 'error');
        }
    }

    async newFolder() {
        const folderName = UIHelper.prompt('输入文件夹名称:');
        if (!folderName) return;
        
        try {
            const path = this.currentPath ? `${this.currentPath}/${folderName}` : folderName;
            await this.api.createFolder(this.currentRepo, path);
            UIHelper.toast('创建文件夹成功');
            this.loadFiles();
        } catch (error) {
            UIHelper.toast('创建文件夹失败: ' + error.message);
        }
    }

    showNewFileModal() {
        const modal = document.getElementById('new-file-modal');
        const input = document.getElementById('new-file-name');
        modal.classList.remove('hidden');
        input.value = '';
        input.focus();
    }

    async createNewFile(name) {
        if (!name) return;
        
        try {
            const path = this.currentPath ? `${this.currentPath}/${name}` : name;
            if (FileHelper.isFolder(name)) {
                await this.api.createFolder(this.currentRepo, path);
                UIHelper.toast('创建文件夹成功');
            } else {
                const fileType = FileHelper.getFileType(name);
                let defaultContent = '';
                switch (fileType.type) {
                    case 'markdown':
                        defaultContent = '# New Markdown File';
                        break;
                    case 'html':
                        defaultContent = '<!DOCTYPE html>\n<html>\n<body>\n\n</body>\n</html>';
                        break;
                    // 可以添加其他文件类型的默认内容
                }
                await this.api.createFile(this.currentRepo, path, defaultContent);
                UIHelper.toast('创建文件成功');
            }
            this.loadFiles();
        } catch (error) {
            UIHelper.toast('创建失败: ' + error.message);
        }
    }

    renderFileList(files) {
        const fileList = document.getElementById('file-list');
        const sortedFiles = FileHelper.sortFiles(files);
        
        const fileItems = sortedFiles.map(file => {
            const isFolder = file.type === 'dir';
            const fileType = isFolder ? { icon: 'fa-folder' } : FileHelper.getFileType(file.name);
            
            return `
                <div class="file-item hover:bg-gray-100 p-2 rounded cursor-pointer flex justify-between items-center ${this.currentFile?.path === file.path ? 'bg-blue-50' : ''}" 
                     data-path="${file.path}" data-type="${file.type}">
                    <div class="flex items-center">
                        <i class="fas ${fileType.icon} mr-2 ${isFolder ? 'text-yellow-500' : ''} ${this.getFileIconColor(file.name)}"></i>
                        <span class="truncate">${file.name}</span>
                    </div>
                    <div class="flex items-center space-x-2">
                        <span class="text-gray-500 text-sm">
                            ${!isFolder ? UIHelper.formatSize(file.size) : ''}
                        </span>
                    </div>
                </div>
            `;
        }).join('');
            
        fileList.innerHTML = fileItems;
    }

    getFileIconColor(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const colorMap = {
            md: 'text-green-500',
            html: 'text-orange-500',
            css: 'text-blue-500',
            js: 'text-yellow-500',
            json: 'text-purple-500',
            png: 'text-pink-500',
            jpg: 'text-pink-500',
            jpeg: 'text-pink-500',
        };
        return colorMap[ext] || 'text-gray-500';
    }
}

// 等待 DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', () => new GitHubPagesManager());
