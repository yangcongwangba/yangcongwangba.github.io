import { CONFIG } from './config.js';
import { GithubAPI, UIHelper } from './utils.js';

class GitHubPagesManager {
    constructor() {
        this.init();
        this.bindEvents();
        this.currentPath = '';
        this.setupEditor();
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
            const content = decodeURIComponent(escape(atob(file.content)));
            document.getElementById('editor').value = content;
        } catch (error) {
            UIHelper.toast('加载文件内容失败: ' + error.message);
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

    renderFileList(files) {
        const fileList = document.getElementById('file-list');
        const fileItems = files
            .filter(file => file.type === 'file')
            .map(file => this.createFileItem(file))
            .join('');
            
        fileList.innerHTML = fileItems;
    }

    createFileItem(file) {
        const isFolder = file.type === 'dir';
        return `
            <div class="file-item hover:bg-gray-100 p-2 rounded cursor-pointer flex justify-between items-center" 
                 data-path="${file.path}" data-type="${file.type}">
                <div class="flex items-center">
                    <i class="fas fa-${isFolder ? 'folder' : 'file'} mr-2"></i>
                    ${file.name}
                </div>
                <span class="text-gray-500 text-sm">
                    ${!isFolder ? UIHelper.formatSize(file.size) : ''}
                </span>
            </div>
        `;
    }
}

// 等待 DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', () => new GitHubPagesManager());
