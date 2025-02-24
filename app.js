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
            const tree = FileHelper.buildFileTree(files, this.currentPath);
            this.renderTree(tree);
            this.updateBreadcrumb();
        } catch (error) {
            UIHelper.toast('加载文件失败: ' + error.message);
        }
    }

    renderTree(tree, parentElement = document.getElementById('file-list')) {
        parentElement.innerHTML = '';
        const sortedTree = FileHelper.sortTree(tree.children);
        
        const list = document.createElement('ul');
        list.className = 'file-tree';

        Object.values(sortedTree).forEach(item => {
            const li = this.createTreeItem(item);
            if (Object.keys(item.children || {}).length > 0) {
                const childContainer = document.createElement('div');
                childContainer.className = 'file-tree-children';
                this.renderTree(item, childContainer);
                li.appendChild(childContainer);
            }
            list.appendChild(li);
        });

        parentElement.appendChild(list);
    }

    createTreeItem(item) {
        const li = document.createElement('li');
        li.className = 'file-tree-item';

        const itemDiv = document.createElement('div');
        itemDiv.className = `file-item ${this.currentFile?.path === item.path ? 'active' : ''}`;
        itemDiv.dataset.path = item.path;
        itemDiv.dataset.type = item.type;

        const isFolder = item.type === 'dir';
        const icon = isFolder ? 'folder' : 'file';

        itemDiv.innerHTML = `
            <div class="flex justify-between items-center">
                <div class="flex items-center">
                    <i class="fas fa-${icon} mr-2 ${isFolder ? 'text-yellow-500' : 'text-gray-500'}"></i>
                    <span class="truncate">${item.name}</span>
                </div>
                <div class="file-actions">
                    ${this.getItemActions(item)}
                </div>
            </div>
        `;

        this.attachItemEvents(itemDiv, item);
        li.appendChild(itemDiv);
        return li;
    }

    getItemActions(item) {
        const isFolder = item.type === 'dir';
        return `
            ${isFolder ? `
                <button class="action-btn create-file" title="新建文件">
                    <i class="fas fa-plus"></i>
                </button>
            ` : `
                <button class="action-btn edit" title="编辑">
                    <i class="fas fa-edit"></i>
                </button>
            `}
            <button class="action-btn delete" title="删除">
                <i class="fas fa-trash"></i>
            </button>
        `;
    }

    attachItemEvents(element, item) {
        element.addEventListener('click', (e) => {
            if (e.target.closest('.file-actions')) return;
            
            if (item.type === 'dir') {
                this.currentPath = item.path;
                this.loadFiles();
            } else {
                this.loadFileContent(item.path);
            }
        });

        // 文件夹创建按钮
        element.querySelector('.create-file')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showNewFileModal(item.path);
        });

        // 编辑按钮
        element.querySelector('.edit')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.loadFileContent(item.path);
        });

        // 删除按钮
        element.querySelector('.delete')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.confirmDelete(item);
        });
    }

    async confirmDelete(item) {
        const isFolder = item.type === 'dir';
        const confirmed = await UIHelper.confirm({
            title: `删除${isFolder ? '文件夹' : '文件'}`,
            message: `确定要删除 ${item.path} ${isFolder ? '及其所有内容' : ''} 吗？此操作不可恢复。`,
            type: 'danger'
        });

        if (confirmed) {
            await this.deleteItem(item);
        }
    }

    async deleteItem(item) {
        try {
            if (item.type === 'dir') {
                // 递归删除文件夹内容
                const files = await this.api.getContents(this.currentRepo, item.path);
                for (const file of files) {
                    await this.api.deleteFile(
                        this.currentRepo,
                        file.path,
                        file.sha,
                        `Delete ${file.path}`
                    );
                }
            } else {
                await this.api.deleteFile(
                    this.currentRepo,
                    item.path,
                    item.sha,
                    `Delete ${item.path}`
                );
            }
            
            if (this.currentFile?.path === item.path) {
                this.currentFile = null;
                this.clearEditor();
            }
            
            await this.loadFiles();
            UIHelper.toast('删除成功');
        } catch (error) {
            UIHelper.toast('删除失败: ' + error.message);
        }
    }

    clearEditor() {
        this.editor.setContent('');
        document.getElementById('current-file-name').textContent = '编辑器';
        document.getElementById('file-type-badge').textContent = '';
        document.getElementById('preview-container').classList.add('hidden');
    }

    async loadFileContent(path) {
        try {
            const file = await this.api.getFile(this.currentRepo, path);
            this.currentFile = file;
            
            // 检查是否是文件夹
            if (file.type === 'dir') {
                this.currentPath = path;
                this.loadFiles();
                return;
            }
            
            const content = await this.api.getFileContent(file.content);
            const fileType = FileHelper.getFileType(file.name);
            
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

    async saveFile(path, content) {
        try {
            await this.api.updateFile(
                this.currentRepo,
                path,
                content,
                this.currentFile.sha,
                `Update ${path}`
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
        const { folders, documents } = this.groupFiles(files);
        
        fileList.innerHTML = `
            ${this.renderFolderSection(folders)}
            ${this.renderFileSection(documents)}
        `;
    }

    groupFiles(files) {
        return files.reduce((acc, file) => {
            if (file.type === 'dir') {
                acc.folders.push(file);
            } else {
                acc.documents.push(file);
            }
            return acc;
        }, { folders: [], documents: [] });
    }

    renderFolderSection(folders) {
        if (!folders.length) return '';
        
        return `
            <div class="mb-4">
                <div class="text-sm font-semibold text-gray-500 mb-2">文件夹</div>
                ${folders.sort((a, b) => a.name.localeCompare(b.name))
                    .map(folder => this.createFileItem(folder, true))
                    .join('')}
            </div>
        `;
    }

    renderFileSection(files) {
        if (!files.length) return '';
        
        return `
            <div>
                <div class="text-sm font-semibold text-gray-500 mb-2">文件</div>
                ${files.sort((a, b) => a.name.localeCompare(b.name))
                    .map(file => this.createFileItem(file, false))
                    .join('')}
            </div>
        `;
    }

    createFileItem(file, isFolder) {
        const fileType = isFolder ? 
            { icon: 'fa-folder', color: 'text-yellow-500' } : 
            FileHelper.getFileType(file.name);

        return `
            <div class="file-item hover:bg-gray-100 p-2 rounded cursor-pointer flex justify-between items-center 
                ${this.currentFile?.path === file.path ? 'bg-blue-50' : ''}" 
                data-path="${file.path}" data-type="${file.type}">
                <div class="flex items-center">
                    <i class="fas ${fileType.icon} mr-2 ${fileType.color}"></i>
                    <span class="truncate">${file.name}</span>
                </div>
                <div class="flex items-center space-x-2">
                    ${!isFolder ? `
                        <span class="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600">
                            ${FileHelper.getFileType(file.name).type}
                        </span>
                        <span class="text-gray-500 text-sm">
                            ${UIHelper.formatSize(file.size)}
                        </span>
                    ` : ''}
                </div>
            </div>
        `;
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
