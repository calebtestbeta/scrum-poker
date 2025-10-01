/**
 * 面板管理系統
 * @version v3.0.0-vanilla
 */

/**
 * 面板管理器類別
 */
export class PanelManager {
    constructor() {
        this.eventBus = window.eventBus || null;
        this.panelStates = new Map(); // 記錄面板狀態
        this.isResponsiveMode = false; // 是否處於響應式模式
        this.setupResponsiveDetection();
        this.setupDrawerModeSupport();
    }
    
    /**
     * 設置響應式偵測
     */
    setupResponsiveDetection() {
        // 使用 matchMedia 監聽螢幕尺寸變化
        this.mediaQueries = {
            tablet: window.matchMedia('(max-width: 1024px)'),
            mobile: window.matchMedia('(max-width: 768px)'),
            smallMobile: window.matchMedia('(max-width: 480px)')
        };
        
        // 初始檢查
        this.checkResponsiveMode();
        
        // 監聽變化
        Object.values(this.mediaQueries).forEach(mq => {
            mq.addEventListener('change', () => this.checkResponsiveMode());
        });
    }
    
    /**
     * 檢查當前響應式模式
     */
    checkResponsiveMode() {
        const wasResponsive = this.isResponsiveMode;
        this.isResponsiveMode = this.mediaQueries.tablet.matches;
        
        // 模式轉換時的處理
        if (wasResponsive !== this.isResponsiveMode) {
            console.log(`📱 PanelManager: 切換到 ${this.isResponsiveMode ? '響應式' : '桌面'} 模式`);
            this.handleModeChange();
        }
    }
    
    /**
     * 處理模式變化
     */
    handleModeChange() {
        const panel = document.querySelector('.right-rail') || 
                     document.getElementById('notificationsPanel');
        if (!panel) return;
        
        if (this.isResponsiveMode) {
            // 切換到響應式模式（抽屜模式）
            panel.classList.remove('hidden');
            panel.classList.remove('is-open');
            panel.setAttribute('aria-hidden', 'true');
            this.ensureToggleButtonExists();
        } else {
            // 切換到桌面模式
            panel.classList.remove('is-open');
            panel.classList.remove('hidden');
            panel.setAttribute('aria-hidden', 'false');
            this.removeToggleButton();
            // 恢復背景滾動
            document.body.style.overflow = '';
        }
        
        // 更新狀態記錄
        const panelId = panel.id || 'right-rail';
        this.panelStates.set(panelId, !this.isResponsiveMode);
    }
    
    /**
     * 設置抽屜模式支援
     */
    setupDrawerModeSupport() {
        // 監聽點擊遮罩關閉抽屜
        document.addEventListener('click', (event) => {
            if (!this.isResponsiveMode) return;
            
            const panel = document.getElementById('notificationsPanel');
            if (!panel || !panel.classList.contains('panel-open')) return;
            
            // 點擊遮罩區域時關閉抽屜
            const rect = panel.getBoundingClientRect();
            const clickX = event.clientX;
            
            if (clickX < rect.left) {
                this.togglePanel('notificationsPanel', 'overlay-click');
            }
        });
        
        // 監聽 ESC 鍵關閉抽屜
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.isResponsiveMode) {
                const panel = document.querySelector('.right-rail') || 
                            document.getElementById('notificationsPanel');
                if (panel && panel.classList.contains('is-open')) {
                    this.togglePanel(panel.id || 'right-rail', 'escape-key');
                }
            }
        });
    }
    
    /**
     * 確保切換按鈕存在
     */
    ensureToggleButtonExists() {
        let toggleBtn = document.getElementById('panelToggleBtn');
        
        if (!toggleBtn) {
            toggleBtn = document.createElement('button');
            toggleBtn.id = 'panelToggleBtn';
            toggleBtn.className = 'panel-toggle';
            toggleBtn.innerHTML = 'H';
            toggleBtn.setAttribute('aria-label', '切換快捷鍵面板');
            toggleBtn.setAttribute('title', '切換右側面板 (H)');
            
            // 點擊事件 - 查找正確的面板 ID
            toggleBtn.addEventListener('click', () => {
                // 尋找右側面板元素
                const rightRail = document.querySelector('.right-rail') || 
                                document.getElementById('notificationsPanel');
                if (rightRail) {
                    this.togglePanel(rightRail.id || 'right-rail', 'button-click');
                }
            });
            
            // 添加到頁面
            document.body.appendChild(toggleBtn);
            console.log('🔲 PanelManager: 抽屜切換按鈕已創建');
        }
    }
    
    /**
     * 移除切換按鈕
     */
    removeToggleButton() {
        const toggleBtn = document.getElementById('panelToggleBtn');
        if (toggleBtn) {
            toggleBtn.remove();
            console.log('🗑️ PanelManager: 抽屜切換按鈕已移除');
        }
    }
    
    /**
     * 切換面板開合狀態
     * @param {string} panelId - 面板 ID
     * @param {string} reason - 觸發原因 ('keyboard' | 'manual' | 'button-click' | 'overlay-click' | 'escape-key')
     * @returns {boolean} 切換後的狀態 (true=開啟, false=關閉)
     */
    togglePanel(panelId = 'rightRail', reason = 'manual') {
        try {
            const panel = document.getElementById(panelId);
            if (!panel) {
                console.warn(`⚠️ PanelManager: 找不到面板 #${panelId}，安全降級`);
                return false;
            }
            
            // 根據模式使用不同的切換邏輯
            if (this.isResponsiveMode) {
                return this.toggleDrawerPanel(panel, panelId, reason);
            } else {
                return this.toggleDesktopPanel(panel, panelId, reason);
            }
            
        } catch (error) {
            console.error('❌ PanelManager: 切換失敗', error);
            return false;
        }
    }
    
    /**
     * 切換桌面模式面板
     */
    toggleDesktopPanel(panel, panelId, reason) {
        // 取得當前狀態
        const isCurrentlyHidden = panel.classList.contains('hidden') || 
                                panel.style.display === 'none' ||
                                !this.panelStates.get(panelId);
        
        // 切換狀態
        const newState = !isCurrentlyHidden;
        
        if (newState) {
            // 顯示面板
            panel.classList.remove('hidden');
            panel.style.display = '';
            panel.setAttribute('aria-hidden', 'false');
        } else {
            // 隱藏面板
            panel.classList.add('hidden');
            panel.setAttribute('aria-hidden', 'true');
        }
        
        return this.updatePanelState(panelId, newState, reason);
    }
    
    /**
     * 切換抽屜模式面板
     */
    toggleDrawerPanel(panel, panelId, reason) {
        // 在響應式模式下，使用 is-open 類別控制抽屜
        const isCurrentlyOpen = panel.classList.contains('is-open');
        const newState = !isCurrentlyOpen;
        
        if (newState) {
            // 開啟抽屜
            panel.classList.add('is-open');
            panel.setAttribute('aria-hidden', 'false');
            // 防止背景滾動
            document.body.style.overflow = 'hidden';
        } else {
            // 關閉抽屜
            panel.classList.remove('is-open');
            panel.setAttribute('aria-hidden', 'true');
            // 恢復背景滾動
            document.body.style.overflow = '';
        }
        
        return this.updatePanelState(panelId, newState, reason);
    }
    
    /**
     * 更新面板狀態
     */
    updatePanelState(panelId, newState, reason) {
        // 記錄狀態
        this.panelStates.set(panelId, newState);
        
        console.log(`${newState ? '📖' : '📕'} PanelManager: 面板 #${panelId} ${newState ? '開啟' : '關閉'} (${reason}) [${this.isResponsiveMode ? '響應式' : '桌面'}模式]`);
        
        // 面板開啟時，觸發快捷鍵更新
        if (newState && (panelId === 'rightRail' || panelId === 'notificationsPanel')) {
            // 延遲執行確保 DOM 更新完成
            setTimeout(() => {
                if (window.shortcutHintsManager) {
                    window.shortcutHintsManager.updateShortcutHints();
                }
            }, 50);
        }
        
        // 發布事件
        if (this.eventBus && typeof this.eventBus.emit === 'function') {
            this.eventBus.emit('UI/PanelToggled', {
                panelId,
                isOpen: newState,
                reason,
                mode: this.isResponsiveMode ? 'responsive' : 'desktop'
            });
        }
        
        return newState;
    }
    
    /**
     * 獲取面板狀態
     * @param {string} panelId - 面板 ID
     * @returns {boolean} 面板是否開啟
     */
    isPanelOpen(panelId) {
        return this.panelStates.get(panelId) || false;
    }
    
    /**
     * 獲取當前模式
     * @returns {string} 'desktop' | 'responsive'
     */
    getCurrentMode() {
        return this.isResponsiveMode ? 'responsive' : 'desktop';
    }
    
    /**
     * 獲取當前螢幕類型
     * @returns {string} 'desktop' | 'tablet' | 'mobile' | 'small-mobile'
     */
    getScreenType() {
        if (this.mediaQueries.smallMobile.matches) return 'small-mobile';
        if (this.mediaQueries.mobile.matches) return 'mobile';
        if (this.mediaQueries.tablet.matches) return 'tablet';
        return 'desktop';
    }
    
    /**
     * 強制關閉所有面板（用於特殊情況）
     */
    closeAllPanels() {
        this.panelStates.forEach((_, panelId) => {
            const panel = document.getElementById(panelId);
            if (panel) {
                if (this.isResponsiveMode) {
                    panel.classList.remove('panel-open');
                    document.body.style.overflow = '';
                } else {
                    panel.classList.add('hidden');
                }
                panel.setAttribute('aria-hidden', 'true');
                this.panelStates.set(panelId, false);
            }
        });
        console.log('🔒 PanelManager: 所有面板已關閉');
    }
    
    /**
     * 銷毀面板管理器
     */
    destroy() {
        // 移除事件監聽器
        Object.values(this.mediaQueries).forEach(mq => {
            mq.removeEventListener('change', this.checkResponsiveMode);
        });
        
        // 移除切換按鈕
        this.removeToggleButton();
        
        // 清除狀態
        this.panelStates.clear();
        
        console.log('🗑️ PanelManager: 已銷毀');
    }
}

// 建立全域實例
export const panelManager = new PanelManager();