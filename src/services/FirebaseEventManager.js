/**
 * Firebase 事件管理器 - 專責事件監聽和分發
 * 實現智慧事件過濾、優先級管理和錯誤恢復
 * @version 4.0.0-event-manager
 */

/**
 * 事件優先級常數
 */
const EVENT_PRIORITIES = {
    CRITICAL: 1,    // 關鍵事件：連線狀態、錯誤
    HIGH: 2,        // 高優先級：遊戲狀態變更
    NORMAL: 3,      // 正常優先級：玩家更新、投票
    LOW: 4          // 低優先級：統計、心跳
};

/**
 * 事件類型配置
 */
const EVENT_CONFIG = {
    'room:players-updated': {
        priority: EVENT_PRIORITIES.NORMAL,
        throttle: 1000,
        enableDuplicateFilter: true,
        enableBatching: true
    },
    'room:votes-updated': {
        priority: EVENT_PRIORITIES.NORMAL,
        throttle: 500,
        enableDuplicateFilter: true,
        enableBatching: false
    },
    'room:phase-changed': {
        priority: EVENT_PRIORITIES.HIGH,
        throttle: 100,
        enableDuplicateFilter: false,
        enableBatching: false
    },
    'firebase:connected': {
        priority: EVENT_PRIORITIES.CRITICAL,
        throttle: 0,
        enableDuplicateFilter: false,
        enableBatching: false
    },
    'firebase:disconnected': {
        priority: EVENT_PRIORITIES.CRITICAL,
        throttle: 0,
        enableDuplicateFilter: false,
        enableBatching: false
    },
    'firebase:error': {
        priority: EVENT_PRIORITIES.CRITICAL,
        throttle: 0,
        enableDuplicateFilter: false,
        enableBatching: false
    },
    'room:statistics-updated': {
        priority: EVENT_PRIORITIES.LOW,
        throttle: 2000,
        enableDuplicateFilter: true,
        enableBatching: true
    }
};

/**
 * Firebase 事件管理器類別
 */
class FirebaseEventManager {
    constructor(eventBus = null) {
        this.version = '4.0.0-event-manager';
        this.eventBus = eventBus || (window.eventBus ? window.eventBus : null);
        
        // 事件監聽器註冊表
        this.listeners = new Map();
        this.activeListeners = new Map(); // Firebase 監聽器引用
        
        // 事件處理配置
        this.eventQueue = []; // 事件佇列
        this.isProcessingQueue = false;
        this.maxQueueSize = 1000;
        
        // 節流和防抖
        this.throttleTimers = new Map();
        this.lastEventData = new Map(); // 用於重複過濾
        
        // 批次事件處理
        this.batchBuffer = new Map();
        this.batchTimer = null;
        this.batchConfig = {
            timeout: 100, // 100ms
            maxSize: 20
        };
        
        // 統計資料
        this.statistics = {
            totalEvents: 0,
            processedEvents: 0,
            droppedEvents: 0,
            throttledEvents: 0,
            batchedEvents: 0,
            errorEvents: 0
        };
        
        // 錯誤恢復
        this.errorRecovery = {
            maxRetries: 3,
            retryDelay: 1000,
            failedEvents: new Map()
        };
        
        console.log(`📡 FirebaseEventManager v${this.version} 已初始化`);
    }

    /**
     * 註冊事件監聽器
     * @param {string} eventType - 事件類型
     * @param {Function} callback - 回調函數
     * @param {Object} options - 選項
     * @returns {string} 監聽器 ID
     */
    on(eventType, callback, options = {}) {
        const listenerId = this.generateListenerId(eventType);
        const config = EVENT_CONFIG[eventType] || {
            priority: EVENT_PRIORITIES.NORMAL,
            throttle: 1000,
            enableDuplicateFilter: true,
            enableBatching: false
        };

        const listener = {
            id: listenerId,
            eventType,
            callback,
            config: { ...config, ...options },
            registeredAt: Date.now(),
            callCount: 0,
            errorCount: 0
        };

        // 按優先級插入
        this.insertListenerByPriority(eventType, listener);

        console.log(`📝 註冊事件監聽器: ${eventType} (ID: ${listenerId})`);
        return listenerId;
    }

    /**
     * 移除事件監聽器
     * @param {string} eventType - 事件類型
     * @param {string|Function} listenerIdOrCallback - 監聽器 ID 或回調函數
     */
    off(eventType, listenerIdOrCallback) {
        if (!this.listeners.has(eventType)) {
            return;
        }

        const listeners = this.listeners.get(eventType);
        let removedCount = 0;

        if (typeof listenerIdOrCallback === 'string') {
            // 按 ID 移除
            const index = listeners.findIndex(l => l.id === listenerIdOrCallback);
            if (index !== -1) {
                listeners.splice(index, 1);
                removedCount = 1;
            }
        } else if (typeof listenerIdOrCallback === 'function') {
            // 按回調函數移除
            const initialLength = listeners.length;
            const remaining = listeners.filter(l => l.callback !== listenerIdOrCallback);
            this.listeners.set(eventType, remaining);
            removedCount = initialLength - remaining.length;
        }

        // 如果沒有監聽器了，清除事件類型
        if (listeners.length === 0) {
            this.listeners.delete(eventType);
        }

        if (removedCount > 0) {
            console.log(`🗑️ 移除 ${removedCount} 個事件監聽器: ${eventType}`);
        }
    }

    /**
     * 發送事件
     * @param {string} eventType - 事件類型
     * @param {*} data - 事件資料
     * @param {Object} options - 選項
     */
    emit(eventType, data, options = {}) {
        this.statistics.totalEvents++;

        const event = {
            type: eventType,
            data,
            timestamp: Date.now(),
            id: this.generateEventId(),
            source: 'firebase',
            ...options
        };

        // 檢查佇列大小
        if (this.eventQueue.length >= this.maxQueueSize) {
            console.warn(`⚠️ 事件佇列已滿，丟棄事件: ${eventType}`);
            this.statistics.droppedEvents++;
            return;
        }

        // 加入佇列
        this.eventQueue.push(event);

        // 開始處理佇列
        if (!this.isProcessingQueue) {
            this.processEventQueue();
        }
    }

    /**
     * 處理事件佇列
     */
    async processEventQueue() {
        if (this.isProcessingQueue || this.eventQueue.length === 0) {
            return;
        }

        this.isProcessingQueue = true;

        try {
            while (this.eventQueue.length > 0) {
                const event = this.eventQueue.shift();
                await this.processEvent(event);
            }
        } catch (error) {
            console.error('❌ 事件佇列處理錯誤:', error);
        } finally {
            this.isProcessingQueue = false;
        }
    }

    /**
     * 處理單個事件
     * @param {Object} event - 事件物件
     */
    async processEvent(event) {
        const { type, data, timestamp, id } = event;
        
        try {
            // 取得事件監聽器
            const listeners = this.listeners.get(type) || [];
            if (listeners.length === 0) {
                return;
            }

            // 取得事件配置
            const config = EVENT_CONFIG[type] || {};

            // 重複過濾
            if (config.enableDuplicateFilter && this.isDuplicateEvent(type, data)) {
                console.log(`🔄 過濾重複事件: ${type}`);
                return;
            }

            // 節流檢查
            if (config.throttle > 0 && this.isThrottled(type, config.throttle)) {
                this.statistics.throttledEvents++;
                console.log(`⏱️ 事件被節流: ${type}`);
                return;
            }

            // 批次處理
            if (config.enableBatching) {
                this.addToBatch(type, event);
                return;
            }

            // 直接處理事件
            await this.executeEvent(event, listeners);

        } catch (error) {
            console.error(`❌ 處理事件失敗 (${type}):`, error);
            this.statistics.errorEvents++;
            
            // 錯誤恢復
            await this.handleEventError(event, error);
        }
    }

    /**
     * 執行事件處理
     * @param {Object} event - 事件物件
     * @param {Array} listeners - 監聽器列表
     */
    async executeEvent(event, listeners) {
        const { type, data } = event;

        // 按優先級處理監聽器
        for (const listener of listeners) {
            try {
                listener.callCount++;
                await listener.callback(data);
            } catch (error) {
                listener.errorCount++;
                console.error(`❌ 監聽器執行錯誤 (${type}, ${listener.id}):`, error);
            }
        }

        this.statistics.processedEvents++;

        // 轉發到全域事件匯流排
        if (this.eventBus) {
            this.eventBus.emit(`firebase:${type}`, data);
        }

        console.log(`✅ 事件處理完成: ${type}`);
    }

    /**
     * 批次事件處理
     * @param {string} eventType - 事件類型
     * @param {Object} event - 事件物件
     */
    addToBatch(eventType, event) {
        if (!this.batchBuffer.has(eventType)) {
            this.batchBuffer.set(eventType, []);
        }

        this.batchBuffer.get(eventType).push(event);
        this.statistics.batchedEvents++;

        // 設置批次處理定時器
        if (!this.batchTimer) {
            this.batchTimer = setTimeout(() => {
                this.processBatchedEvents();
            }, this.batchConfig.timeout);
        }

        // 檢查批次大小
        const totalBatchedEvents = Array.from(this.batchBuffer.values())
            .reduce((sum, events) => sum + events.length, 0);

        if (totalBatchedEvents >= this.batchConfig.maxSize) {
            this.processBatchedEvents();
        }
    }

    /**
     * 處理批次事件
     */
    async processBatchedEvents() {
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.batchTimer = null;
        }

        if (this.batchBuffer.size === 0) {
            return;
        }

        console.log(`📦 處理批次事件: ${this.batchBuffer.size} 種類型`);

        for (const [eventType, events] of this.batchBuffer) {
            try {
                const listeners = this.listeners.get(eventType) || [];
                
                // 合併批次事件資料
                const batchData = this.mergeBatchData(events);
                const batchEvent = {
                    type: eventType,
                    data: batchData,
                    timestamp: Date.now(),
                    id: this.generateEventId(),
                    isBatch: true,
                    batchSize: events.length
                };

                await this.executeEvent(batchEvent, listeners);

            } catch (error) {
                console.error(`❌ 批次事件處理失敗 (${eventType}):`, error);
            }
        }

        // 清空批次緩衝
        this.batchBuffer.clear();
    }

    /**
     * 合併批次事件資料
     * @param {Array} events - 事件列表
     * @returns {*} 合併後的資料
     */
    mergeBatchData(events) {
        if (events.length === 1) {
            return events[0].data;
        }

        // 根據事件類型決定合併策略
        const firstEvent = events[0];
        const eventType = firstEvent.type;

        switch (eventType) {
            case 'room:players-updated':
                // 取最新的玩家資料
                return events[events.length - 1].data;

            case 'room:statistics-updated':
                // 合併統計資料
                return events.reduce((merged, event) => ({
                    ...merged,
                    ...event.data
                }), {});

            default:
                // 預設取最新資料
                return events[events.length - 1].data;
        }
    }

    /**
     * 設置 Firebase 監聽器
     * @param {string} path - Firebase 路徑
     * @param {string} eventType - Firebase 事件類型
     * @param {Function} callback - 回調函數
     * @param {Object} options - 選項
     * @returns {Function} 取消監聽函數
     */
    setupFirebaseListener(path, eventType, callback, options = {}) {
        const { 
            database,
            enableVersionControl = true,
            enableErrorRecovery = true
        } = options;

        if (!database) {
            throw new Error('需要提供 Firebase database 實例');
        }

        const ref = database.ref(path);
        const listenerId = this.generateListenerId(`firebase:${path}:${eventType}`);

        // 包裝回調函數
        const wrappedCallback = (snapshot) => {
            try {
                const data = snapshot.val();
                
                // 版本控制檢查
                if (enableVersionControl && data && data.version) {
                    const lastVersion = this.lastEventData.get(`${path}:version`);
                    if (lastVersion && data.version <= lastVersion) {
                        console.log(`📊 忽略過時版本: ${path}, 版本 ${data.version}`);
                        return;
                    }
                    this.lastEventData.set(`${path}:version`, data.version);
                }

                // 執行回調
                callback(snapshot);

            } catch (error) {
                console.error(`❌ Firebase 監聽器錯誤 (${path}):`, error);
                
                if (enableErrorRecovery) {
                    this.handleListenerError(listenerId, path, eventType, error);
                }
            }
        };

        // 設置監聽器
        ref.on(eventType, wrappedCallback);
        
        // 記錄活躍監聽器
        this.activeListeners.set(listenerId, {
            ref,
            eventType,
            callback: wrappedCallback,
            path,
            createdAt: Date.now()
        });

        console.log(`🔗 設置 Firebase 監聽器: ${path} (${eventType})`);

        // 返回取消函數
        return () => {
            ref.off(eventType, wrappedCallback);
            this.activeListeners.delete(listenerId);
            console.log(`🔌 取消 Firebase 監聽器: ${path}`);
        };
    }

    /**
     * 檢查是否為重複事件
     * @param {string} eventType - 事件類型
     * @param {*} data - 事件資料
     * @returns {boolean} 是否重複
     */
    isDuplicateEvent(eventType, data) {
        const key = `${eventType}:data`;
        const lastData = this.lastEventData.get(key);
        
        if (!lastData) {
            this.lastEventData.set(key, data);
            return false;
        }

        // 簡單的深度比較
        const isDuplicate = JSON.stringify(lastData) === JSON.stringify(data);
        
        if (!isDuplicate) {
            this.lastEventData.set(key, data);
        }

        return isDuplicate;
    }

    /**
     * 檢查是否被節流
     * @param {string} eventType - 事件類型
     * @param {number} throttleMs - 節流時間
     * @returns {boolean} 是否被節流
     */
    isThrottled(eventType, throttleMs) {
        const now = Date.now();
        const lastTime = this.throttleTimers.get(eventType);
        
        if (!lastTime || (now - lastTime) >= throttleMs) {
            this.throttleTimers.set(eventType, now);
            return false;
        }

        return true;
    }

    /**
     * 按優先級插入監聽器
     * @param {string} eventType - 事件類型
     * @param {Object} listener - 監聽器
     */
    insertListenerByPriority(eventType, listener) {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, []);
        }

        const listeners = this.listeners.get(eventType);
        const priority = listener.config.priority;

        // 找到插入位置（按優先級排序）
        let insertIndex = listeners.length;
        for (let i = 0; i < listeners.length; i++) {
            if (listeners[i].config.priority > priority) {
                insertIndex = i;
                break;
            }
        }

        listeners.splice(insertIndex, 0, listener);
    }

    /**
     * 處理事件錯誤
     * @param {Object} event - 事件物件
     * @param {Error} error - 錯誤物件
     */
    async handleEventError(event, error) {
        const { type, id } = event;
        const key = `${type}:${id}`;

        if (!this.errorRecovery.failedEvents.has(key)) {
            this.errorRecovery.failedEvents.set(key, {
                event,
                error,
                retryCount: 0,
                lastRetry: Date.now()
            });
        }

        const failedEvent = this.errorRecovery.failedEvents.get(key);
        failedEvent.retryCount++;

        if (failedEvent.retryCount <= this.errorRecovery.maxRetries) {
            console.log(`🔄 重試事件處理: ${type}, 第 ${failedEvent.retryCount} 次`);
            
            await this.delay(this.errorRecovery.retryDelay);
            
            try {
                const listeners = this.listeners.get(type) || [];
                await this.executeEvent(event, listeners);
                
                // 成功後移除失敗記錄
                this.errorRecovery.failedEvents.delete(key);
                
            } catch (retryError) {
                console.error(`❌ 事件重試失敗 (${type}):`, retryError);
            }
        } else {
            console.error(`❌ 事件處理徹底失敗，放棄重試: ${type}`);
            this.errorRecovery.failedEvents.delete(key);
        }
    }

    /**
     * 處理監聽器錯誤
     * @param {string} listenerId - 監聽器 ID
     * @param {string} path - Firebase 路徑
     * @param {string} eventType - 事件類型
     * @param {Error} error - 錯誤物件
     */
    handleListenerError(listenerId, path, eventType, error) {
        console.error(`❌ Firebase 監聽器錯誤 (${listenerId}):`, error);
        
        // 可以在這裡實現監聽器重連邏輯
        // 例如：自動重新設置監聽器
    }

    /**
     * 生成監聽器 ID
     * @param {string} eventType - 事件類型
     * @returns {string} 監聽器 ID
     */
    generateListenerId(eventType) {
        return `listener_${eventType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 生成事件 ID
     * @returns {string} 事件 ID
     */
    generateEventId() {
        return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 延遲函數
     * @param {number} ms - 延遲毫秒數
     * @returns {Promise<void>}
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 清理所有資源
     */
    cleanup() {
        console.log('🧹 清理 FirebaseEventManager 資源...');

        // 處理剩餘的批次事件
        if (this.batchBuffer.size > 0) {
            this.processBatchedEvents();
        }

        // 清除定時器
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.batchTimer = null;
        }

        // 取消所有 Firebase 監聽器
        for (const [listenerId, listener] of this.activeListeners) {
            listener.ref.off(listener.eventType, listener.callback);
        }
        this.activeListeners.clear();

        // 清空資料結構
        this.listeners.clear();
        this.eventQueue = [];
        this.throttleTimers.clear();
        this.lastEventData.clear();
        this.batchBuffer.clear();
        this.errorRecovery.failedEvents.clear();

        console.log('✅ FirebaseEventManager 資源清理完成');
    }

    /**
     * 獲取統計資料
     * @returns {Object} 統計資料
     */
    getStatistics() {
        const processRate = this.statistics.totalEvents > 0 
            ? (this.statistics.processedEvents / this.statistics.totalEvents * 100).toFixed(2) + '%'
            : '100%';

        return {
            ...this.statistics,
            processRate,
            queueSize: this.eventQueue.length,
            activeListeners: this.activeListeners.size,
            registeredEventTypes: this.listeners.size,
            activeBatches: this.batchBuffer.size,
            failedEventsCount: this.errorRecovery.failedEvents.size
        };
    }

    /**
     * 重置統計資料
     */
    resetStatistics() {
        this.statistics = {
            totalEvents: 0,
            processedEvents: 0,
            droppedEvents: 0,
            throttledEvents: 0,
            batchedEvents: 0,
            errorEvents: 0
        };
        console.log('📊 FirebaseEventManager 統計資料已重置');
    }
}

// 匯出模組
window.FirebaseEventManager = FirebaseEventManager;
window.EVENT_PRIORITIES = EVENT_PRIORITIES;

console.log('📡 FirebaseEventManager 模組已載入 - v4.0.0-event-manager');