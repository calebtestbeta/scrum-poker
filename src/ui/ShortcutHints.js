/**
 * 快捷鍵提示系統
 * @version v3.0.0-vanilla
 */

/**
 * 預設快捷鍵配置
 * @returns {Array<{key: string, desc: string}>} 快捷鍵陣列
 */
export function getDefaultShortcuts() {
    return [
        { key: 'Space', desc: '開牌/揭示投票' },
        { key: 'Ctrl/Cmd + R', desc: '重新開始' },
        { key: '1–9', desc: '快速投票' },
        { key: 'Enter', desc: '選擇卡牌' },
        { key: 'Tab', desc: '導航卡牌' },
        { key: 'H', desc: '展開/收合面板' }
    ];
}

/**
 * 格式化快捷鍵為 HTML 字串
 * @param {Array<{key: string, desc: string}>} shortcuts - 快捷鍵陣列
 * @returns {string} HTML 字串
 */
export function formatShortcutsHTML(shortcuts) {
    if (!Array.isArray(shortcuts) || shortcuts.length === 0) {
        return '<div class="shortcut-empty">暫無快捷鍵</div>';
    }
    
    return shortcuts.map(shortcut => {
        const safeKey = String(shortcut.key || '').replace(/[<>"'&]/g, '');
        const safeDesc = String(shortcut.desc || '').replace(/[<>"'&]/g, '');
        
        return `<div class="shortcut-item">
            <kbd class="shortcut-key">${safeKey}</kbd>
            <span class="shortcut-desc">${safeDesc}</span>
        </div>`;
    }).join('');
}

/**
 * 快捷鍵提示系統類別
 */
export class ShortcutHintsManager {
    constructor() {
        this.lastRenderedContent = null;
        this.containerId = 'shortcutHints';
        this.eventBus = window.eventBus || null;
    }
    
    /**
     * 更新快捷鍵提示
     * @param {Object} options - 選項
     * @param {string} options.containerId - 容器 ID
     * @param {Array} options.shortcuts - 快捷鍵陣列
     * @param {Object} options.eventBus - 事件匯流排
     */
    updateShortcutHints({ 
        containerId = this.containerId, 
        shortcuts = getDefaultShortcuts(), 
        eventBus = this.eventBus 
    } = {}) {
        try {
            const container = document.getElementById(containerId);
            if (!container) {
                console.warn(`⚠️ ShortcutHints: 找不到容器 #${containerId}，安全降級`);
                return false;
            }
            
            const shortcutsList = container.querySelector('.shortcuts-list');
            if (!shortcutsList) {
                console.warn(`⚠️ ShortcutHints: 找不到 .shortcuts-list，安全降級`);
                return false;
            }
            
            // 生成新內容
            const newContent = formatShortcutsHTML(shortcuts);
            
            // Diff 檢查：避免重複渲染
            if (this.lastRenderedContent === newContent) {
                console.log('🔄 ShortcutHints: 內容未變更，跳過渲染');
                return false;
            }
            
            // 更新 DOM
            shortcutsList.innerHTML = newContent;
            this.lastRenderedContent = newContent;
            
            console.log(`✅ ShortcutHints: 已渲染 ${shortcuts.length} 個快捷鍵`);
            
            // 發布事件
            if (eventBus && typeof eventBus.emit === 'function') {
                eventBus.emit('UI/ShortcutHintsRendered', {
                    count: shortcuts.length,
                    items: shortcuts.map(s => ({ key: s.key, desc: s.desc }))
                });
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ ShortcutHints: 更新失敗', error);
            return false;
        }
    }
    
    /**
     * 重置渲染狀態（用於測試）
     */
    reset() {
        this.lastRenderedContent = null;
    }
    
    /**
     * 獲取當前渲染狀態（用於測試）
     */
    getLastRenderedContent() {
        return this.lastRenderedContent;
    }
}

// 建立全域實例
export const shortcutHintsManager = new ShortcutHintsManager();