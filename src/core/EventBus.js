/**
 * 事件匯流排 - 核心事件系統
 * 提供發布/訂閱模式，支援組件間的鬆耦合通訊
 * 
 * @fileoverview 事件系統核心 - 負責統一管理組件間通訊
 * @version 3.0.0
 * @since 2024
 */

// 定義標準事件類型常量
const EVENT_TYPES = {
    // 玩家相關事件
    PLAYER_JOINED: 'player:joined',
    PLAYER_LEFT: 'player:left',
    PLAYER_UPDATED: 'player:updated',
    PLAYER_VOTED: 'player:voted',
    
    // 遊戲狀態事件
    GAME_STARTED: 'game:started',
    GAME_ENDED: 'game:ended',
    PHASE_CHANGED: 'phase:changed',
    
    // 投票相關事件
    VOTE_SUBMITTED: 'vote:submitted',
    VOTES_REVEALED: 'votes:revealed',
    VOTES_CLEARED: 'votes:cleared',
    
    // UI 相關事件
    UI_UPDATED: 'ui:updated',
    MODAL_OPENED: 'modal:opened',
    MODAL_CLOSED: 'modal:closed',
    
    // 系統事件
    ERROR_OCCURRED: 'error:occurred',
    CONNECTION_CHANGED: 'connection:changed',
    STATE_CHANGED: 'state:changed'
};

class EventBus {
    constructor() {
        this.events = new Map();
        this.onceEvents = new Map();
        this.debug = false;
        this.maxListeners = 50; // 防止記憶體洩漏
        this.eventStats = new Map(); // 事件統計
    }

    /**
     * 訂閱事件
     * @param {string} event - 事件名稱
     * @param {Function} callback - 回調函數
     * @param {Object} context - 執行上下文（可選）
     * @returns {Function} 取消訂閱函數
     * @throws {Error} 當回調不是函數或監聽器數量超過限制時
     */
    on(event, callback, context = null) {
        if (typeof callback !== 'function') {
            throw new Error('EventBus.on: callback must be a function');
        }

        // 檢查監聽器數量限制
        if (this.listenerCount(event) >= this.maxListeners) {
            console.warn(`EventBus: 事件 '${event}' 監聽器數量超過限制 (${this.maxListeners})`);
            throw new Error(`Too many listeners for event '${event}'. Maximum is ${this.maxListeners}`);
        }

        if (!this.events.has(event)) {
            this.events.set(event, []);
            this.eventStats.set(event, { subscriptions: 0, emissions: 0 });
        }

        const listener = { 
            callback, 
            context,
            id: this.generateListenerId(),
            subscribedAt: new Date().toISOString()
        };
        this.events.get(event).push(listener);
        
        // 更新統計
        const stats = this.eventStats.get(event);
        stats.subscriptions++;
        this.eventStats.set(event, stats);

        if (this.debug) {
            console.log(`📡 EventBus: 訂閱事件 '${event}' (ID: ${listener.id})`);
        }

        // 返回取消訂閱函數
        return () => this.off(event, callback, context);
    }

    /**
     * 一次性事件訂閱
     * @param {string} event - 事件名稱
     * @param {Function} callback - 回調函數
     * @param {Object} context - 執行上下文（可選）
     */
    once(event, callback, context = null) {
        if (typeof callback !== 'function') {
            throw new Error('EventBus.once: callback must be a function');
        }

        if (!this.onceEvents.has(event)) {
            this.onceEvents.set(event, []);
        }

        const listener = { callback, context };
        this.onceEvents.get(event).push(listener);

        if (this.debug) {
            console.log(`📡 EventBus: 一次性訂閱事件 '${event}'`);
        }

        // 返回取消訂閱函數
        return () => this.offOnce(event, callback, context);
    }

    /**
     * 發布事件
     * @param {string} event - 事件名稱
     * @param {*} data - 事件資料
     * @param {Object} options - 發布選項
     * @param {boolean} options.async - 是否異步執行回調
     */
    emit(event, data = null, options = { async: false }) {
        const startTime = performance.now();
        
        // 更新發布統計
        if (this.eventStats.has(event)) {
            const stats = this.eventStats.get(event);
            stats.emissions++;
            this.eventStats.set(event, stats);
        }

        if (this.debug) {
            console.log(`📡 EventBus: 發布事件 '${event}'`, data);
        }

        // 事件執行函數
        const executeCallback = (callback, context, data) => {
            try {
                if (context) {
                    return callback.call(context, data);
                } else {
                    return callback(data);
                }
            } catch (error) {
                console.error(`EventBus: 事件 '${event}' 處理錯誤:`, error);
                // 發布錯誤事件
                if (event !== EVENT_TYPES.ERROR_OCCURRED) {
                    this.emit(EVENT_TYPES.ERROR_OCCURRED, {
                        originalEvent: event,
                        error: error,
                        data: data
                    });
                }
                return null;
            }
        };

        const processListeners = (listeners, isOnce = false) => {
            if (options.async) {
                // 異步執行
                listeners.forEach(({ callback, context, id }) => {
                    setTimeout(() => executeCallback(callback, context, data), 0);
                });
            } else {
                // 同步執行
                listeners.forEach(({ callback, context, id }) => {
                    executeCallback(callback, context, data);
                });
            }
        };

        // 處理一般事件訂閱者
        if (this.events.has(event)) {
            const listeners = this.events.get(event).slice(); // 複製陣列避免在執行中修改
            processListeners(listeners);
        }

        // 處理一次性事件訂閱者
        if (this.onceEvents.has(event)) {
            const listeners = this.onceEvents.get(event).slice();
            this.onceEvents.delete(event); // 清除一次性事件
            processListeners(listeners, true);
        }
        
        // 性能監控
        if (this.debug) {
            const duration = performance.now() - startTime;
            if (duration > 10) {
                console.warn(`⚠️ EventBus: 事件 '${event}' 執行時間過長: ${duration.toFixed(2)}ms`);
            }
        }
    }

    /**
     * 取消事件訂閱
     * @param {string} event - 事件名稱
     * @param {Function} callback - 回調函數
     * @param {Object} context - 執行上下文
     */
    off(event, callback = null, context = null) {
        if (!this.events.has(event)) {
            return;
        }

        const listeners = this.events.get(event);

        if (callback === null) {
            // 移除所有監聽器
            this.events.delete(event);
            if (this.debug) {
                console.log(`📡 EventBus: 移除事件 '${event}' 的所有監聽器`);
            }
        } else {
            // 移除特定監聽器
            const index = listeners.findIndex(listener => 
                listener.callback === callback && listener.context === context
            );
            
            if (index !== -1) {
                listeners.splice(index, 1);
                if (this.debug) {
                    console.log(`📡 EventBus: 移除事件 '${event}' 的特定監聽器`);
                }
            }

            // 如果沒有監聽器了，刪除事件
            if (listeners.length === 0) {
                this.events.delete(event);
            }
        }
    }

    /**
     * 取消一次性事件訂閱
     */
    offOnce(event, callback = null, context = null) {
        if (!this.onceEvents.has(event)) {
            return;
        }

        const listeners = this.onceEvents.get(event);

        if (callback === null) {
            this.onceEvents.delete(event);
        } else {
            const index = listeners.findIndex(listener => 
                listener.callback === callback && listener.context === context
            );
            
            if (index !== -1) {
                listeners.splice(index, 1);
            }

            if (listeners.length === 0) {
                this.onceEvents.delete(event);
            }
        }
    }

    /**
     * 獲取事件的監聽器數量
     * @param {string} event - 事件名稱
     * @returns {number} 監聽器數量
     */
    listenerCount(event) {
        const regularCount = this.events.has(event) ? this.events.get(event).length : 0;
        const onceCount = this.onceEvents.has(event) ? this.onceEvents.get(event).length : 0;
        return regularCount + onceCount;
    }

    /**
     * 獲取所有事件名稱
     * @returns {Array<string>} 事件名稱陣列
     */
    eventNames() {
        const regularEvents = Array.from(this.events.keys());
        const onceEvents = Array.from(this.onceEvents.keys());
        return [...new Set([...regularEvents, ...onceEvents])];
    }

    /**
     * 清除所有事件監聽器
     */
    clear() {
        this.events.clear();
        this.onceEvents.clear();
        if (this.debug) {
            console.log('📡 EventBus: 清除所有事件監聽器');
        }
    }

    /**
     * 啟用/停用除錯模式
     * @param {boolean} enabled - 是否啟用
     */
    setDebug(enabled) {
        this.debug = enabled;
        console.log(`📡 EventBus: 除錯模式 ${enabled ? '啟用' : '停用'}`);
    }

    /**
     * 生成監聽器唯一 ID
     * @private
     * @returns {string} 唯一 ID
     */
    generateListenerId() {
        return `listener_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    /**
     * 驗證事件名稱
     * @private
     * @param {string} event - 事件名稱
     * @returns {boolean} 是否有效
     */
    validateEventName(event) {
        if (typeof event !== 'string' || event.trim() === '') {
            return false;
        }
        // 檢查是否為建議的事件類型
        const standardEvents = Object.values(EVENT_TYPES);
        if (!standardEvents.includes(event)) {
            console.info(`💡 EventBus: 建議使用標準事件類型，目前使用: '${event}'`);
        }
        return true;
    }

    /**
     * 設定最大監聽器數量
     * @param {number} max - 最大數量
     */
    setMaxListeners(max) {
        if (typeof max !== 'number' || max < 1) {
            throw new Error('Max listeners must be a positive number');
        }
        this.maxListeners = max;
        console.log(`📡 EventBus: 設定最大監聽器數量為 ${max}`);
    }

    /**
     * 獲取事件統計資訊
     * @param {string} event - 特定事件名稱（可選）
     * @returns {Object} 統計資訊
     */
    getEventStats(event = null) {
        if (event) {
            return this.eventStats.get(event) || { subscriptions: 0, emissions: 0 };
        }
        
        const stats = {};
        this.eventStats.forEach((stat, eventName) => {
            stats[eventName] = { ...stat };
        });
        return stats;
    }

    /**
     * 獲取系統統計資訊
     * @returns {Object} 統計資訊
     */
    getStats() {
        const totalListeners = this.eventNames().reduce((sum, event) => 
            sum + this.listenerCount(event), 0
        );
        
        return {
            totalEvents: this.eventNames().length,
            regularEvents: this.events.size,
            onceEvents: this.onceEvents.size,
            totalListeners,
            maxListeners: this.maxListeners,
            eventStats: this.getEventStats(),
            memoryUsage: {
                eventsMapSize: this.events.size,
                onceEventsMapSize: this.onceEvents.size,
                statsMapSize: this.eventStats.size
            }
        };
    }

    /**
     * 檢查記憶體洩漏風險
     * @returns {Array} 風險事件列表
     */
    checkMemoryLeaks() {
        const risks = [];
        
        this.events.forEach((listeners, event) => {
            if (listeners.length > this.maxListeners * 0.8) {
                risks.push({
                    event,
                    listenerCount: listeners.length,
                    risk: 'high',
                    recommendation: '檢查是否有未正確清理的監聽器'
                });
            }
        });
        
        return risks;
    }
}

// 創建全域事件匯流排實例
window.eventBus = new EventBus();

console.log('📡 EventBus 已初始化');