class Auth {
    constructor() {
        // 不再需要 OAuth 配置
        this.storageKey = 'gh_admin_token';
        this.token = localStorage.getItem(this.storageKey);
        this.user = null;
    }
    
    // 初始化认证
    init() {
        // 初始化登录表单
        const loginContainer = document.getElementById('login-container');
        loginContainer.innerHTML = `
            <h2>GitHub Pages 管理后台</h2>
            <p>请输入您的 GitHub 个人访问令牌以登录</p>
            <div class="mb-3">
                <input type="password" id="token-input" class="form-control mb-3" placeholder="输入 GitHub 个人访问令牌">
                <div class="form-text mb-3">
                    <a href="https://github.com/settings/tokens" target="_blank">
                        如何创建个人访问令牌？
                    </a>
                    <br>
                    请确保令牌具有 repo 和 user 权限。
                </div>
                <button id="login-button" class="btn btn-primary">登录</button>
            </div>
        `;
        
        document.getElementById('login-button').addEventListener('click', () => this.login());
        
        // 添加按键监听，支持回车登录
        document.getElementById('token-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.login();
            }
        });
        
        // 检查是否有存储的令牌
        if (this.token) {
            this.getUserInfo();
        }
    }
    
    // 登录方法
    login() {
        const tokenInput = document.getElementById('token-input');
        const token = tokenInput.value.trim();
        
        if (!token) {
            alert('请输入 GitHub 个人访问令牌');
            return;
        }
        
        // 保存令牌并验证
        this.token = token;
        localStorage.setItem(this.storageKey, this.token);
        this.getUserInfo();
    }
    
    // 获取用户信息
    async getUserInfo() {
        if (!this.token) return;
        
        try {
            const response = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `token ${this.token}`
                }
            });
            
            if (response.status === 401) {
                // token无效
                alert('访问令牌无效或已过期，请重新输入');
                this.logout();
                return;
            }
            
            this.user = await response.json();
            this.showUserInfo();
            app.initAfterAuth(); // 初始化应用
        } catch (error) {
            console.error('获取用户信息失败:', error);
            alert('验证失败，请检查您的网络连接');
            this.logout();
        }
    }
    
    // 显示用户信息
    showUserInfo() {
        const userInfo = document.getElementById('user-info');
        userInfo.innerHTML = `
            <img src="${this.user.avatar_url}" alt="${this.user.login}" />
            <p>${this.user.name || this.user.login}</p>
            <button id="logout-button" class="btn btn-sm btn-outline-light">退出登录</button>
        `;
        
        document.getElementById('logout-button').addEventListener('click', () => this.logout());
    }
    
    // 退出登录
    logout() {
        localStorage.removeItem(this.storageKey);
        this.token = null;
        this.user = null;
        window.location.reload();
    }
    
    // 获取仓库信息
    getRepoInfo() {
        // 从当前URL解析用户名和仓库名
        const pathSegments = window.location.hostname.split('.');
        const username = pathSegments[0];
        return {
            owner: username,
            repo: `${username}.github.io`
        };
    }
}

const auth = new Auth();
document.addEventListener('DOMContentLoaded', () => auth.init()); 