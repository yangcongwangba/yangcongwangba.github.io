import config from './config.js';

let token = localStorage.getItem('githubToken');

// 认证
async function authenticate() {
    token = document.getElementById('token').value;
    if (!token) {
        alert('请输入 GitHub API Key');
        return;
    }

    try {
        const response = await fetch(`https://api.github.com/repos/${config.repo}`, {
            headers: { Authorization: `token ${token}` }
        });
        
        if (response.ok) {
            localStorage.setItem('githubToken', token);
            document.getElementById('auth').classList.add('hidden');
            document.getElementById('app').classList.remove('opacity-50');
            loadPageTypes();
            showStatus('登录成功！');
        } else {
            throw new Error('API Key 无效');
        }
    } catch (error) {
        alert(`登录失败: ${error.message}`);
        document.getElementById('token').value = '';
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

// 初始化
window.addEventListener('load', () => {
    if (token) {
        loadPageTypes();
    }
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
