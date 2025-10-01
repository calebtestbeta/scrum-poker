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
    }
    
    /**
     * 切換面板開合狀態
     * @param {string} panelId - 面板 ID
     * @param {string} reason - 觸發原因 ('keyboard' | 'manual')
     * @returns {boolean} 切換後的狀態 (true=開啟, false=關閉)
     */
    togglePanel(panelId = 'notificationsPanel', reason = 'manual') {
        try {
            const panel = document.getElementById(panelId);
            if (!panel) {
                console.warn(`⚠️ PanelManager: 找不到面板 #${panelId}，安全降級`);
                return false;
            }
            
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
            
            // 記錄狀態
            this.panelStates.set(panelId, newState);
            
            console.log(`${newState ? '📖' : '📕'} PanelManager: 面板 #${panelId} ${newState ? '開啟' : '關閉'} (${reason})`);
            
            // 面板開啟時，觸發快捷鍵更新
            if (newState && panelId === 'notificationsPanel') {
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
                    reason
                });
            }
            
            return newState;
            
        } catch (error) {
            console.error('❌ PanelManager: 切換失敗', error);
            return false;
        }
    }
    
    /**
     * 獲取面板狀態
     * @param {string} panelId - 面板 ID
     * @returns {boolean} 面板是否開啟
     */
    isPanelOpen(panelId) {
        return this.panelStates.get(panelId) || false;
    }
}

// 建立全域實例
export const panelManager = new PanelManager();