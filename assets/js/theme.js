// 主题切换功能
class ThemeManager {
    constructor() {
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.applyTheme(this.currentTheme);
        this.initThemeToggle();
    }
    
    applyTheme(theme) {
        document.body.classList.remove('theme-light', 'theme-dark');
        document.body.classList.add(`theme-${theme}`);
        
        // 更新CSS文件引用
        const themeCss = document.getElementById('theme-css');
        themeCss.href = `assets/css/theme-${theme}.css`;
        
        localStorage.setItem('theme', theme);
        this.currentTheme = theme;
        
        // 更新切换按钮图标
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.innerHTML = theme === 'light' ? '🌙' : '☀️';
        }
        
        // 通知插件系统主题已更改
        if (window.pluginSystem) {
            window.pluginSystem.applyHook('themeChanged', theme);
        }
    }
    
    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
    }
    
    initThemeToggle() {
        document.addEventListener('DOMContentLoaded', () => {
            const themeToggle = document.getElementById('theme-toggle');
            if (themeToggle) {
                themeToggle.addEventListener('click', () => this.toggleTheme());
            }
        });
    }
}

// 初始化主题管理器
const themeManager = new ThemeManager(); 