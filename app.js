import { CONFIG } from './config.js';
import { GithubAPI, UIHelper, FileHelper, EditorManager } from './utils.js';

class GitHubPagesManager {
    constructor() {
        this.fileChangeDetector = new FileChangeDetector();
        this.setupBeforeUnload();
        this.init();
        this.bindEvents();
        this.currentPath = '';
        this.setupEditor();
        this.editor = new EditorManager(
            document.getElementById('editor-container'),
            content => this.handleEditorChange(content)
        );
        this.bindFileUpload();
        this.setupShortcuts();
        this.searchManager = null;
        this.setupSearch();
        this.setupAutoSave();
    }

    setupBeforeUnload() {
        window.addEventListener('beforeunload', (e) => {
            if (this.fileChangeDetector.hasUnsavedChanges()) {
                e.preventDefault();
                e.returnValue = '有未保存的更改，确定要离开吗？';
            }
        });
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
        PerformanceMonitor.startMeasure('loadFiles');
        try {
            const cacheKey = `files_${this.currentRepo}_${this.currentPath}`;
            const files = await CacheManager.fetchWithCache(
                cacheKey,
                () => this.api.getContents(this.currentRepo, this.currentPath)
            );

            const tree = FileHelper.buildTreeStructure(files, this.currentPath);
            this.renderFileTree(tree);
            this.updatePathBreadcrumb();
            
            // 更新搜索引擎
            this.searchManager = new SearchManager(this.flattenFileTree(tree));
            
            PerformanceMonitor.endMeasure('loadFiles');
        } catch (error) {
            ErrorHandler.handle(error, 'loadFiles');
        }
    }

    flattenFileTree(tree) {
        const result = [];
        const traverse = (node) => {
            result.push({
                name: node.name,
                path: node.path,
                type: node.type
            });
            if (node.children) {
                Object.values(node.children).forEach(traverse);
            }
        };
        traverse(tree);
        return result;
    }

    updatePathBreadcrumb() {
        const breadcrumb = document.getElementById('path-breadcrumb');
        const parts = this.currentPath.split('/').filter(Boolean);
        
        const createPathLink = (path, name, isLast) => {
            const span = document.createElement('span');
            span.className = `${isLast ? 'text-gray-600' : 'text-blue-600 cursor-pointer hover:text-blue-800'}`;
            span.textContent = name;
            if (!isLast) {
                span.onclick = () => {
                    this.currentPath = path;
                    this.loadFiles();
                };
            }
            return span;
        };

        breadcrumb.innerHTML = '';
        
        // 添加根目录链接
        breadcrumb.appendChild(createPathLink('', '📂 根目录', parts.length === 0));

        // 添加路径各部分
        let currentPath = '';
        parts.forEach((part, index) => {
            const separator = document.createElement('span');
            separator.textContent = ' / ';
            separator.className = 'text-gray-400 mx-1';
            breadcrumb.appendChild(separator);

            currentPath = currentPath ? `${currentPath}/${part}` : part;
            breadcrumb.appendChild(createPathLink(
                currentPath,
                index === parts.length - 1 ? `📂 ${part}` : part,
                index === parts.length - 1
            ));
        });
    }

    renderTree(tree, parentElement = document.getElementById('file-list')) {
        parentElement.innerHTML = '';
        const sortedTree = FileHelper.sortTree(tree.children);
        
        const list = document.createElement('ul');
        list.className = 'file-tree';

        const createTreeItem = (item) => {
            const li = document.createElement('li');
            li.className = 'file-tree-item';
            
            const isFolder = item.type === 'dir';
            const hasChildren = isFolder && item.children.length > 0;
            
            li.innerHTML = `
                <div class="file-content ${this.currentFile?.path === item.path ? 'active' : ''}">
                    <div class="flex items-center flex-1">
                        ${hasChildren ? `
                            <span class="folder-toggle mr-1">
                                <i class="fas fa-angle-right transform transition-transform"></i>
                            </span>
                        ` : '<span class="w-4"></span>'}
                        <i class="fas fa-${isFolder ? 'folder' : this.getFileIcon(item.name)} mr-2"></i>
                        <span class="file-name">${item.name}</span>
                    </div>
                    <div class="file-actions flex items-center">
                        ${this.getItemActions(item)}
                    </div>
                </div>
                ${hasChildren ? '<ul class="file-tree-children hidden"></ul>' : ''}
            `;

            if (hasChildren) {
                const children = li.querySelector('.file-tree-children');
                item.children.forEach(child => {
                    children.appendChild(createTreeItem(child));
                });

                // 文件夹展开/折叠
                const toggle = li.querySelector('.folder-toggle');
                toggle.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const icon = toggle.querySelector('i');
                    const children = li.querySelector('.file-tree-children');
                    icon.style.transform = children.classList.contains('hidden') ? 
                        'rotate(90deg)' : 'none';
                    children.classList.toggle('hidden');
                });
            }

            return li;
        };

        Object.values(sortedTree).forEach(item => {
            const li = createTreeItem(item);
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

    async handleFileEdit(content) {
        if (!this.currentFile) return;
        
        // 添加到历史记录
        FileHistoryManager.addToHistory(this.currentFile.path, content);
        
        this.fileChangeDetector.trackChange(
            this.currentFile.path,
            content,
            this.currentFile.originalContent
        );

        this.updateFileStatus();
        this.handleEditorChange(content);
    }

    updateFileStatus() {
        const fileItems = document.querySelectorAll('.file-item');
        fileItems.forEach(item => {
            const path = item.dataset.path;
            const statusEl = item.querySelector('.file-status');
            
            if (this.fileChangeDetector.changes.has(path)) {
                if (!statusEl) {
                    const status = document.createElement('div');
                    status.className = 'file-status modified';
                    item.querySelector('.flex').appendChild(status);
                }
            } else if (statusEl) {
                statusEl.remove();
            }
        });
    }

    async saveAllChanges() {
        const changedFiles = this.fileChangeDetector.getChangedFiles();
        if (!changedFiles.length) return;

        try {
            for (const path of changedFiles) {
                const change = this.fileChangeDetector.changes.get(path);
                await this.saveFile(path, change.content);
            }
            this.fileChangeDetector.clearChanges();
            this.updateFileStatus();
            UIHelper.toast('所有更改已保存');
        } catch (error) {
            ErrorHandler.handle(error, 'saveAllChanges');
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

    setupShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 's':
                        e.preventDefault();
                        this.saveFile();
                        break;
                    case 'n':
                        e.preventDefault();
                        this.showNewFileModal();
                        break;
                    case 'f':
                        e.preventDefault();
                        document.getElementById('file-filter').focus();
                        break;
                }
            } else if (e.key === 'Escape') {
                // 关闭所有模态框
                document.querySelectorAll('.modal').forEach(modal => 
                    modal.classList.add('hidden')
                );
            }
        });
    }

    getFileIcon(filename) {
        const ext = filename.split('.').pop()?.toLowerCase();
        const iconMap = {
            md: 'file-alt',
            html: 'html5',
            css: 'css3',
            js: 'js',
            json: 'file-code',
            yml: 'file-code',
            png: 'file-image',
            jpg: 'file-image',
            jpeg: 'file-image',
            gif: 'file-image',
            pdf: 'file-pdf',
            zip: 'file-archive'
        };
        return iconMap[ext] || 'file';
    }

    handleDragAndDrop() {
        const dropZone = document.getElementById('file-list');
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        dropZone.addEventListener('dragover', () => {
            dropZone.classList.add('drag-active');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-active');
        });

        dropZone.addEventListener('drop', (e) => {
            dropZone.classList.remove('drag-active');
            const files = Array.from(e.dataTransfer.files);
        });
    }

    setupSearch() {
        const searchInput = document.getElementById('file-filter');
        searchInput.addEventListener('input', debounce((e) => {
            if (!this.searchManager) return;
            
            const query = e.target.value.trim();
            const results = this.searchManager.search(query);
            this.renderSearchResults(results);
        }, 300));
    }

    setupAutoSave() {
        let autoSaveInterval = null;
        const AUTO_SAVE_DELAY = 30000; // 30秒

        this.editor?.addEventListener('change', () => {
            if (autoSaveInterval) clearTimeout(autoSaveInterval);
            
            autoSaveInterval = setTimeout(() => {
                if (this.fileChangeDetector.hasUnsavedChanges()) {
                    this.saveAllChanges();
                }
            }, AUTO_SAVE_DELAY);
        });
    }

    renderSearchResults(results) {
        const fileList = document.getElementById('file-list');
        if (!results.length) {
            fileList.innerHTML = '<div class="text-gray-500 text-center py-4">没有找到匹配的文件</div>';
            return;
        }
        
        const { folders, files } = results.reduce((acc, item) => {
            if (item.type === 'dir') {
                acc.folders.push(item);
            } else {
                acc.files.push(item);
            }
            return acc;
        }, { folders: [], files: [] });

        fileList.innerHTML = `
            ${this.renderFolderSection(folders)}
            ${this.renderFileSection(files)}
        `;
    }

    showContextMenu(e, item) {
        e.preventDefault();
        
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.innerHTML = `
            <ul class="bg-white shadow-lg rounded-lg py-2">
                ${this.getContextMenuItems(item)}
            </ul>
        `;
        
        // 定位菜单
        menu.style.left = `${e.pageX}px`;
        menu.style.top = `${e.pageY}px`;
        
        document.body.appendChild(menu);
        
        // 点击其他地方关闭菜单
        const closeMenu = () => {
            menu.remove();
            document.removeEventListener('click', closeMenu);
        };
        setTimeout(() => document.addEventListener('click', closeMenu), 0);
    }

    getContextMenuItems(item) {
        const isFolder = item.type === 'dir';
        return `
            ${isFolder ? `
                <li class="menu-item" data-action="new-file">
                    <i class="fas fa-plus mr-2"></i>新建文件
                </li>
                <li class="menu-item" data-action="new-folder">
                    <i class="fas fa-folder-plus mr-2"></i>新建文件夹
                </li>
            ` : `
                <li class="menu-item" data-action="edit">
                    <i class="fas fa-edit mr-2"></i>编辑
                </li>
                <li class="menu-item" data-action="download">
                    <i class="fas fa-download mr-2"></i>下载
                </li>
            `}
            <li class="menu-item text-red-600" data-action="delete">
                <i class="fas fa-trash mr-2"></i>删除
            </li>
        `;
    }
}

// 等待 DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', () => new GitHubPagesManager());
