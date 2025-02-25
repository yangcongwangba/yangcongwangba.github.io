import config from './config.js';

let token = localStorage.getItem('githubToken');

// 认证函数改进
async function authenticate() {
    const tokenInput = document.getElementById('githubToken').value.trim();
    if (!tokenInput) {
        showError('请输入 GitHub Token');
        return;
    }

    try {
        // 直接测试仓库访问权限
        const response = await fetch(`${config.apiBase}/repos/${config.repo}`, {
            headers: {
                'Authorization': `Bearer ${tokenInput}`,
                'Accept': config.acceptHeader
            }
        });

        if (response.ok) {
            token = tokenInput;
            localStorage.setItem('githubToken', token);
            document.getElementById('login').style.display = 'none';
            document.getElementById('app').style.display = 'block';
            showSuccess('登录成功');
            await loadPageTypes();
        } else {
            throw new Error('Token无效或没有仓库访问权限');
        }
    } catch (error) {
        showError(`认证失败: ${error.message}`);
    }
}

// 添加页面类型
async function addPageType() {
    const newType = document.getElementById('newType').value.toLowerCase();
    if (!newType) return alert('请输入类型名称');
    if (config.pageTypes.includes(newType)) return alert('类型已存在');

    try {
        // 创建类型目录
        await createDirectory(`_${newType}s`);
        config.pageTypes.push(newType);
        localStorage.setItem('pageTypes', JSON.stringify(config.pageTypes));
        loadPageTypes();
        document.getElementById('newType').value = '';
        alert('添加成功！');
    } catch (error) {
        alert(`添加失败: ${error.message}`);
    }
}

// 增强的保存模板功能
async function saveTemplate() {
    const type = document.getElementById('typeSelect').value;
    const content = document.getElementById('templateContent').value;
    if (!content) return alert('请输入模板内容');

    try {
        const path = `${config.layoutsPath}/${type}.html`;
        await createFile(path, content);
        alert(`模板保存成功！\n预览地址: ${config.siteUrl}/${type}s/example`);
    } catch (error) {
        handleError(error, '保存模板');
    }
}

// GitHub API 封装
async function createDirectory(path) {
    return createFile(`${path}/.gitkeep`, '');
}

async function createFile(path, content) {
    const response = await fetch(`https://api.github.com/repos/${config.repo}/contents/${path}`, {
        method: 'PUT',
        headers: {
            Authorization: `token ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            message: `Add ${path}`,
            content: btoa(content),
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
    }
    return response.json();
}

// UI 更新
function loadPageTypes() {
    const container = document.getElementById('pageTypes');
    const select = document.getElementById('typeSelect');
    container.innerHTML = '';
    select.innerHTML = '';
    
    config.pageTypes.forEach(type => {
        // 添加类型卡片
        container.innerHTML += `
        <div class="border p-4 rounded">
            <h3 class="font-bold mb-2">${type}</h3>
            <button onclick="deletePageType('${type}')" class="text-red-500">删除</button>
        </div>`;
        
        // 添加选择选项
        select.innerHTML += `<option value="${type}">${type}</option>`;
    });
}

// 增强的错误处理
function handleError(error, operation) {
    console.error(`${operation} 失败:`, error);
    alert(`${operation}失败: ${error.message || '未知错误'}`);
}

// 预览模板
async function previewTemplate() {
    const type = document.getElementById('typeSelect').value;
    const content = document.getElementById('templateContent').value;
    const previewFrame = document.getElementById('preview');
    
    try {
        const html = await processTemplate(content);
        previewFrame.srcdoc = html;
    } catch (error) {
        handleError(error, '预览');
    }
}

// 处理模板
async function processTemplate(content) {
    const sampleData = {
        title: '示例标题',
        date: new Date().toISOString(),
        content: '示例内容'
    };
    
    return content.replace(/\{\{\s*page\.([^}]+)\s*\}\}/g, (match, key) => {
        return sampleData[key] || '';
    });
}

// 主题切换
function toggleTheme() {
    document.documentElement.classList.toggle('dark');
    localStorage.theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

// 美化的状态提示
function showStatus(message, type = 'info') {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = `status-message ${type === 'error' ? 'bg-red-500' : 'bg-blue-500'} text-white slide-in`;
    
    setTimeout(() => {
        status.classList.remove('slide-in');
        status.classList.add('slide-out');
    }, 3000);
}

function showError(message) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = 'status-message bg-red-500 text-white slide-in';
    status.classList.remove('hidden');
    
    console.error('错误:', message);
    
    setTimeout(() => {
        status.classList.remove('slide-in');
        status.classList.add('slide-out');
    }, 3000);
}

function showSuccess(message) {
    showStatus(message, 'success');
}

// 初始化
window.addEventListener('load', async () => {
    console.log('页面加载完成');
    
    // 检查已保存的 token
    const savedToken = localStorage.getItem('githubToken');
    if (savedToken) {
        console.log('发现已保存的 token');
        document.getElementById('token').value = savedToken;
        await authenticate();
    }
    
    // 主题初始化
    if (localStorage.theme === 'dark' || (!localStorage.theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    }
    
    // 登录状态检查
    const token = localStorage.getItem('githubToken');
    if (token) {
        authenticate();
    }
    
    // 绑定主题切换
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
});

// 导出全局函数
window.authenticate = authenticate;
window.addPageType = addPageType;
window.saveTemplate = saveTemplate;
window.previewTemplate = previewTemplate;

function showStatus(message) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.classList.remove('hidden');
    setTimeout(() => status.classList.add('hidden'), 3000);
}
