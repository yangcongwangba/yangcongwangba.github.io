// 插件加载器
class PluginSystem {
    constructor() {
        this.plugins = {};
        this.hooks = {};
    }
    
    // 注册钩子点
    registerHook(hookName) {
        if (!this.hooks[hookName]) {
            this.hooks[hookName] = [];
        }
    }
    
    // 注册插件
    registerPlugin(pluginName, plugin) {
        this.plugins[pluginName] = plugin;
        
        // 遍历插件支持的钩子
        Object.keys(plugin.hooks || {}).forEach(hookName => {
            this.registerHook(hookName);
            this.hooks[hookName].push({
                name: pluginName,
                fn: plugin.hooks[hookName]
            });
        });
        
        // 如果插件有初始化方法，执行它
        if (typeof plugin.init === 'function') {
            plugin.init();
        }
    }
    
    // 执行钩子
    applyHook(hookName, ...args) {
        if (!this.hooks[hookName]) {
            return null;
        }
        
        let results = [];
        for (const plugin of this.hooks[hookName]) {
            try {
                const result = plugin.fn(...args);
                results.push(result);
            } catch (error) {
                console.error(`插件 ${plugin.name} 在钩子 ${hookName} 执行失败:`, error);
            }
        }
        
        return results;
    }
}

// 初始化插件系统
const pluginSystem = new PluginSystem();

// 预定义的钩子点
pluginSystem.registerHook('afterContentLoaded');
pluginSystem.registerHook('beforeFormSubmit');
pluginSystem.registerHook('afterCommentLoaded');
pluginSystem.registerHook('themeChanged');

// 导出插件系统实例
window.pluginSystem = pluginSystem;

// 加载已启用的插件
document.addEventListener('DOMContentLoaded', () => {
    // 从配置或本地存储中获取启用的插件列表
    const enabledPlugins = JSON.parse(localStorage.getItem('enabledPlugins') || '{}');
    
    // 加载每个启用的插件
    Object.keys(enabledPlugins).forEach(pluginName => {
        if (enabledPlugins[pluginName]) {
            loadPlugin(pluginName);
        }
    });
});

// 动态加载插件
function loadPlugin(pluginName) {
    const script = document.createElement('script');
    script.src = `/_plugins/${pluginName}.js`;
    script.onload = () => console.log(`插件 ${pluginName} 加载成功`);
    script.onerror = () => console.error(`插件 ${pluginName} 加载失败`);
    document.head.appendChild(script);
} 