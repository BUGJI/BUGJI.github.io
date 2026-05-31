// router.js - 页面路由管理（无加载指示器版本）

class PageRouter {
    constructor() {
        this.currentPage = 'main';
        this.isLoading = false;
        this.container = document.getElementById('pageContainer');
        this.oldScripts = new Set(); // 跟踪已添加的脚本
        this.init();
    }
    
    init() {
        // 从 URL 获取初始页面
        const urlParams = new URLSearchParams(window.location.search);
        const initialPage = urlParams.get('page') || 'main';
        
        // 加载初始页面
        this.loadPage(initialPage);
        
        // 处理浏览器前进后退
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.page) {
                this.loadPage(e.state.page, false);
            }
        });
        
        // 将路由器实例挂载到 window 对象
        window.router = this;
    }
    
    async loadPage(page, addToHistory = true) {
        if (this.isLoading) return;
        
        console.log('加载页面:', page);
        
        this.isLoading = true;
        this.currentPage = page;
        
        try {
            // 获取完整页面内容
            const htmlContent = await this.fetchPage(page);
            
            // 添加退出动画
            await this.animateExit();
            
            // 清理旧页面的脚本（可选，帮助垃圾回收）
            this.cleanupOldScripts();
            
            // 更新页面内容
            this.updateContent(htmlContent);
            
            // 添加进入动画
            await this.animateEnter();
            
            // 更新 URL
            if (addToHistory) {
                history.pushState({ page: page }, '', `?page=${page}`);
            }
            
            // 触发页面加载完成事件
            this.dispatchPageLoadedEvent();
            
            // 重新绑定新页面的导航事件
            this.bindPageNavigation();
            
        } catch (error) {
            console.error('页面加载失败:', error);
            this.showError();
        } finally {
            this.isLoading = false;
        }
    }
    
    fetchPage(page) {
        return fetch(`pages/${page}.html`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                return response.text();
            });
    }
    
    showError() {
        this.container.innerHTML = `
            <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; z-index: 10000;">
                <div style="font-size: 3em; margin-bottom: 20px;">😵</div>
                <h3>页面加载失败</h3>
                <p style="color: #aaa; margin-top: 10px;">请检查网络连接后刷新重试</p>
                <button onclick="location.reload()" style="
                    margin-top: 20px;
                    padding: 10px 24px;
                    background: linear-gradient(135deg, #667eea, #764ba2);
                    border: none;
                    border-radius: 25px;
                    color: white;
                    cursor: pointer;
                ">刷新页面</button>
            </div>
        `;
    }
    
    updateContent(html) {
        // 直接设置整个页面容器的内容
        this.container.innerHTML = html;
        
        // 执行新页面内的脚本（确保不会重复执行）
        this.executeScriptsSafely(this.container);
    }
    
    // 安全的脚本执行方法
    executeScriptsSafely(container) {
        const scripts = container.querySelectorAll('script');
        
        scripts.forEach(oldScript => {
            // 检查是否已经存在相同 src 的脚本
            if (oldScript.src) {
                // 对于外部脚本，检查是否已经加载过
                const existingScript = document.querySelector(`script[src="${oldScript.src}"]`);
                if (existingScript && existingScript !== oldScript) {
                    console.log(`脚本已存在，跳过: ${oldScript.src}`);
                    oldScript.remove();
                    return;
                }
            } else {
                // 对于内联脚本，使用新的作用域避免变量冲突
                try {
                    // 创建一个新的函数执行环境
                    const scriptContent = oldScript.textContent;
                    
                    // 检查是否是模块脚本或已经有全局变量声明
                    if (scriptContent.includes('const ') || scriptContent.includes('let ') || scriptContent.includes('var ')) {
                        // 使用闭包包装脚本内容，避免变量泄漏到全局
                        const wrapper = new Function(`
                            "use strict";
                            return function() {
                                ${scriptContent}
                            }
                        `)();
                        wrapper.call(window);
                    } else {
                        // 简单脚本直接执行
                        const newScript = document.createElement('script');
                        newScript.textContent = scriptContent;
                        oldScript.parentNode.replaceChild(newScript, oldScript);
                        return;
                    }
                } catch (error) {
                    console.error('执行脚本失败:', error);
                    // 降级方案：直接执行
                    const newScript = document.createElement('script');
                    newScript.textContent = oldScript.textContent;
                    oldScript.parentNode.replaceChild(newScript, oldScript);
                    return;
                }
            }
            
            oldScript.remove();
        });
    }
    
    // 清理旧脚本标记
    cleanupOldScripts() {
        this.oldScripts.clear();
    }
    
    bindPageNavigation() {
        // 查找所有带有 data-page 属性的导航链接
        const navLinks = document.querySelectorAll('[data-page]');
        console.log('找到导航链接:', navLinks.length);
        
        navLinks.forEach(link => {
            // 移除旧的事件监听器（通过替换克隆）
            const newLink = link.cloneNode(true);
            link.parentNode.replaceChild(newLink, link);
            
            // 添加新的事件监听器
            newLink.addEventListener('click', (e) => {
                e.preventDefault();
                const page = newLink.getAttribute('data-page');
                console.log('点击导航:', page);
                if (page && window.router) {
                    window.router.loadPage(page);
                }
            });
        });
        
        // 更新当前页面的激活状态
        this.updateActiveNav();
    }
    
    updateActiveNav() {
        const navLinks = document.querySelectorAll('[data-page]');
        navLinks.forEach(link => {
            const page = link.getAttribute('data-page');
            if (page === this.currentPage) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }
    
    animateExit() {
        return new Promise((resolve) => {
            // 添加淡出动画
            this.container.style.transition = 'opacity 0.2s ease-out';
            this.container.style.opacity = '0';
            
            setTimeout(() => {
                this.container.style.opacity = '';
                this.container.style.transition = '';
                resolve();
            }, 200);
        });
    }
    
    animateEnter() {
        return new Promise((resolve) => {
            // 添加淡入动画
            this.container.style.opacity = '0';
            this.container.style.transition = 'opacity 0.3s ease-in';
            
            // 强制重绘
            this.container.offsetHeight;
            
            this.container.style.opacity = '1';
            
            setTimeout(() => {
                this.container.style.opacity = '';
                this.container.style.transition = '';
                resolve();
            }, 300);
        });
    }
    
    dispatchPageLoadedEvent() {
        const event = new CustomEvent('pageContentLoaded', { 
            detail: { page: this.currentPage }
        });
        window.dispatchEvent(event);
    }
}

// 初始化路由
const router = new PageRouter();