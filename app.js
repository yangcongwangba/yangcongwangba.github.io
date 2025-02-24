import { CONFIG } from './config.js';
import { GithubAPI, UIHelper } from './utils.js';

class GitHubPagesManager {
    constructor() {
        this.init();
        this.bindEvents();
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
            const files = await this.api.getContents(this.currentRepo);
            this.renderFileList(files);
        } catch (error) {
            UIHelper.toast('加载文件失败: ' + error.message);
        }
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
        if (!this.currentFile) return UIHelper.toast('请先选择文件', 'warning');
        if (!confirm('确定要删除此文件吗？')) return;
        
        try {
            const endpoint = CONFIG.API.ENDPOINTS.CONTENTS
                .replace('{repo}', this.currentRepo) + '/' + this.currentFile.path;
            
            await this.api.fetchAPI(endpoint, {
                method: 'DELETE',
                body: JSON.stringify({
                    message: `Delete ${this.currentFile.path}`,
                    sha: this.currentFile.sha
                })
            });

            UIHelper.toast('删除成功', 'success');
            this.currentFile = null;
            document.getElementById('editor').value = '';
            this.loadFiles();
        } catch (error) {
            UIHelper.toast(error.message, 'error');
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

    renderFileList(files) {
        const fileList = document.getElementById('file-list');
        const fileItems = files
            .filter(file => file.type === 'file')
            .map(file => this.createFileItem(file))
            .join('');
            
        fileList.innerHTML = fileItems;
    }

    createFileItem(file) {
        return `
            <div class="file-item hover:bg-gray-100 p-2 rounded cursor-pointer" 
                 data-path="${file.path}">
                ${file.name}
            </div>
        `;
    }
}

// 等待 DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', () => new GitHubPagesManager());
