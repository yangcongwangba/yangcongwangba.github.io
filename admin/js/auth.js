// GitHub OAuth和Token认证实现
let tokenFromInput = ''; // 存储用户手动输入的Token

// 初始化认证
function initAuth() {
    // 添加Token输入UI
    addTokenLoginUI();
    
    // 检查是否已有Token
    const token = localStorage.getItem(siteConfig.github.tokenStorageKey);
    if (token) {
        validateToken(token);
    } else {
        // 检查URL中是否有认证码
        const code = new URLSearchParams(window.location.search).get('code');
        if (code) {
            exchangeCodeForToken(code);
        }
    }
}

// 添加Token输入界面
function addTokenLoginUI() {
    const loginContainer = document.getElementById('login-container');
    const tokenLoginHtml = `
        <div class="login-option">
            <h3>使用Token登录</h3>
            <p>您可以在<a href="https://github.com/settings/tokens" target="_blank">GitHub的Token设置</a>创建一个具有repo权限的Token</p>
            <div class="token-input-group">
                <input type="password" id="github-token" placeholder="输入您的GitHub Token">
                <button id="token-login-btn" class="primary-btn">登录</button>
            </div>
        </div>
        <div class="login-separator">
            <span>或者</span>
        </div>
    `;
    
    // 在GitHub登录按钮前插入Token登录选项
    const githubLoginBtn = document.getElementById('github-login');
    if (githubLoginBtn && loginContainer) {
        loginContainer.innerHTML = tokenLoginHtml + loginContainer.innerHTML;
        
        // 绑定Token登录按钮事件
        document.getElementById('token-login-btn').addEventListener('click', handleTokenLogin);
        
        // 支持按回车键提交Token
        document.getElementById('github-token').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleTokenLogin();
            }
        });
    }
}

// 处理Token登录
async function handleTokenLogin() {
    const tokenInput = document.getElementById('github-token');
    if (tokenInput) {
        tokenFromInput = tokenInput.value.trim();
        if (tokenFromInput) {
            await validateToken(tokenFromInput);
        } else {
            alert('请输入有效的GitHub Token');
        }
    }
}

// 验证Token
async function validateToken(token) {
    try {
        const response = await fetch('https://api.github.com/user', {
            headers: {
                'Authorization': `token ${token}`
            }
        });
        
        if (response.ok) {
            const userData = await response.json();
            // 存储用户信息
            const username = userData.login;
            localStorage.setItem('github_username', username);
            localStorage.setItem(siteConfig.github.tokenStorageKey, token);
            
            // 显示管理界面
            document.getElementById('login-container').classList.add('hidden');
            document.getElementById('admin-panel').classList.remove('hidden');
            
            // 初始化管理界面
            if (typeof initAdminPanel === 'function') {
                initAdminPanel(username, siteConfig.github.repoName, token);
            } else {
                console.error('initAdminPanel函数未定义，请检查admin.js是否正确加载');
            }
            
            return true;
        } else {
            throw new Error('Token验证失败');
        }
    } catch (error) {
        console.error('验证Token时出错:', error);
        alert('验证Token失败，请检查Token是否有效');
        return false;
    }
}

// 重定向到GitHub授权页面
function redirectToGitHub() {
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${siteConfig.github.clientId}&redirect_uri=${siteConfig.github.redirectUri}&scope=repo`;
    window.location.href = authUrl;
}

// 使用授权码交换Token（需要通过代理服务解决CORS问题）
async function exchangeCodeForToken(code) {
    try {
        // 注意：实际中需要通过GitHub Actions创建的中间处理服务来完成这一步
        const response = await fetch('https://your-token-exchange-proxy.netlify.app/.netlify/functions/token-exchange', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                code,
                client_id: siteConfig.github.clientId,
                redirect_uri: siteConfig.github.redirectUri
            })
        });
        
        const data = await response.json();
        if (data.access_token) {
            const token = data.access_token;
            localStorage.setItem(siteConfig.github.tokenStorageKey, token);
            
            // 清除URL中的code参数
            const url = new URL(window.location.href);
            url.searchParams.delete('code');
            window.history.replaceState({}, document.title, url.toString());
            
            // 直接初始化管理面板，而不是刷新页面
            validateToken(token);
        }
    } catch (error) {
        console.error('交换Code获取Token失败:', error);
        // 显示错误信息而不是刷新页面
        alert('登录失败，请重试');
    }
}

// 显示管理面板
function showAdminPanel() {
    document.getElementById('login-container').classList.add('hidden');
    document.getElementById('admin-panel').classList.remove('hidden');
    loadAdminPanel();
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    
    // 绑定GitHub OAuth登录按钮
    const githubLoginBtn = document.getElementById('github-login');
    if (githubLoginBtn) {
        githubLoginBtn.addEventListener('click', redirectToGitHub);
    }
});

// 导出API给其他模块使用
window.auth = {
    getToken: () => localStorage.getItem(siteConfig.github.tokenStorageKey) || '',
    getUsername: () => localStorage.getItem('github_username') || '',
    logout: () => {
        localStorage.removeItem(siteConfig.github.tokenStorageKey);
        localStorage.removeItem('github_username');
        window.location.reload();
    }
}; 