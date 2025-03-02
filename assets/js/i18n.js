// 多语言支持
class I18nManager {
    constructor() {
        this.currentLang = localStorage.getItem('language') || this.getBrowserLanguage();
        this.translations = {};
        this.loadTranslations(this.currentLang);
    }
    
    getBrowserLanguage() {
        const lang = navigator.language || navigator.userLanguage;
        return lang.split('-')[0]; // 获取主语言代码
    }
    
    async loadTranslations(lang) {
        try {
            const response = await fetch(`/_i18n/${lang}.json`);
            if (!response.ok) {
                throw new Error(`Language ${lang} not found`);
            }
            this.translations = await response.json();
            this.currentLang = lang;
            localStorage.setItem('language', lang);
            this.translatePage();
        } catch (error) {
            console.error('Loading translations failed:', error);
            // 如果失败且不是默认语言，回退到默认语言
            if (lang !== 'zh') {
                this.loadTranslations('zh');
            }
        }
    }
    
    translatePage() {
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (this.translations[key]) {
                element.innerHTML = this.translations[key];
            }
        });
    }
    
    setLanguage(lang) {
        this.loadTranslations(lang);
    }
    
    translate(key) {
        return this.translations[key] || key;
    }
}

// 初始化多语言支持
const i18n = new I18nManager();

// 在DOM加载完成后初始化语言选择器
document.addEventListener('DOMContentLoaded', () => {
    const langSelector = document.getElementById('language-selector');
    if (langSelector) {
        langSelector.value = i18n.currentLang;
        langSelector.addEventListener('change', (e) => {
            i18n.setLanguage(e.target.value);
        });
    }
}); 