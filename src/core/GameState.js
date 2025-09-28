/**
 * 狀態驗證錯誤類別
 */
class StateValidationError extends Error {
    constructor(message, field, value) {
        super(message);
        this.name = 'StateValidationError';
        this.field = field;
        this.value = value;
    }
}

/**
 * 狀態驗證模式定義
 */
const STATE_SCHEMA = {
    phase: {
        type: 'string',
        enum: ['waiting', 'voting', 'revealing', 'finished'],
        required: true
    },
    roomId: {
        type: ['string', 'null']
    },
    isGameStarted: {
        type: 'boolean',
        required: true
    },
    players: {
        type: 'object',
        validate: (value) => Array.isArray(value)
    },
    currentPlayer: {
        type: ['object', 'null']
    },
    playerCount: {
        type: 'number',
        validate: (value) => value >= 0
    },
    votes: {
        type: 'object'
    },
    selectedCard: {
        type: ['string', 'number', 'null']
    }
};

/**
 * 遊戲狀態管理器 - 中央狀態管理系統
 * 提供響應式狀態管理，支援狀態變更監聽和歷史記錄
 */
class GameState {
    constructor() {
        this.state = {
            // 遊戲基本狀態
            phase: 'waiting', // waiting, voting, revealing, finished
            roomId: null,
            isGameStarted: false,
            
            // 玩家相關
            players: [],
            currentPlayer: null,
            playerCount: 0,
            
            // 投票相關
            votes: {},
            selectedCard: null,
            votingProgress: {
                voted: 0,
                total: 0,
                percentage: 0
            },
            
            // 統計資料
            statistics: {
                totalVotes: 0,
                averagePoints: 0,
                consensus: 0,
                devAverage: 0,
                qaAverage: 0,
                roleBreakdown: {}
            },
            
            // UI 狀態
            showDeleteButtons: false,
            confirmDialog: {
                visible: false,
                title: '',
                message: '',
                onConfirm: null,
                onCancel: null
            },
            
            // 連線狀態
            connection: {
                isConnected: false,
                useFirebase: false,
                isAuthenticated: false
            }
        };

        this.listeners = [];
        this.history = [];
        this.maxHistorySize = 50;
        this.debug = false;
        this.isUpdating = false; // 防止遞迴更新
        this.validationEnabled = true; // 是否啟用狀態驗證
        
        // 性能監控
        this.performanceMetrics = {
            updateCount: 0,
            averageUpdateTime: 0,
            lastUpdateTime: 0
        };

        // 狀態變更通知系統
        this.stateChangeNotifications = new Map();
        this.setupStateChangeNotifications();
        
        // 綁定事件系統
        this.setupEventBindings();
        
        console.log('🎮 GameState 已初始化，版本：v3.0.0-enhanced');
    }

    /**
     * 設置狀態變更通知
     */
    setupStateChangeNotifications() {
        // 設置關鍵狀態變更的通知
        this.stateChangeNotifications.set('phase', (oldValue, newValue) => {
            console.log(`🎮 遊戲階段變更: ${oldValue} → ${newValue}`);
            if (window.eventBus) {
                window.eventBus.emit('phase:changed', { oldPhase: oldValue, newPhase: newValue });
            }
        });
        
        this.stateChangeNotifications.set('playerCount', (oldValue, newValue) => {
            console.log(`👥 玩家數量變更: ${oldValue} → ${newValue}`);
            if (window.eventBus) {
                window.eventBus.emit('playerCount:changed', { oldCount: oldValue, newCount: newValue });
            }
        });
        
        this.stateChangeNotifications.set(['votingProgress', 'percentage'], (oldValue, newValue) => {
            if (newValue === 100 && oldValue < 100) {
                console.log('✅ 所有玩家投票完成');
                if (window.eventBus) {
                    window.eventBus.emit('voting:completed');
                }
            }
        });
    }

    /**
     * 綁定事件系統
     */
    setupEventBindings() {
        if (window.eventBus) {
            // 監聽外部狀態更新請求
            window.eventBus.on('state:update', (data) => {
                this.updateState(data);
            });

            window.eventBus.on('state:reset', () => {
                this.resetState();
            });
        }
    }

    /**
     * 驗證狀態更新
     * @private
     * @param {Object} updates - 要驗證的更新物件
     * @returns {Array<string>} 驗證錯誤列表
     */
    validateUpdates(updates) {
        if (!this.validationEnabled) return [];
        
        const errors = [];
        
        Object.keys(updates).forEach(key => {
            const schema = STATE_SCHEMA[key];
            if (!schema) return; // 未定義的欄位跳過驗證
            
            const value = updates[key];
            
            // 檢查類型
            if (schema.type) {
                const expectedTypes = Array.isArray(schema.type) ? schema.type : [schema.type];
                const actualType = value === null ? 'null' : typeof value;
                
                if (!expectedTypes.includes(actualType)) {
                    errors.push(`${key}: 期望類型 ${expectedTypes.join(' 或 ')}，實際類型 ${actualType}`);
                }
            }
            
            // 檢查枚舉值
            if (schema.enum && !schema.enum.includes(value)) {
                errors.push(`${key}: 值必須為 ${schema.enum.join(', ')} 之一，實際值 ${value}`);
            }
            
            // 自定義驗證
            if (schema.validate && typeof schema.validate === 'function') {
                if (!schema.validate(value)) {
                    errors.push(`${key}: 自定義驗證失敗，值為 ${value}`);
                }
            }
        });
        
        return errors;
    }

    /**
     * 更新狀態（支援原子性和驗證）
     * @param {Object} updates - 要更新的狀態物件
     * @param {boolean} silent - 是否靜默更新（不觸發監聽器）
     * @returns {Promise<void>} 更新完成的 Promise
     * @throws {StateValidationError} 當狀態驗證失敗時
     */
    async updateState(updates, silent = false) {
        const startTime = performance.now();
        
        if (!updates || typeof updates !== 'object') {
            throw new StateValidationError('updates must be an object', 'updates', updates);
        }
        
        // 防止遞迴更新
        if (this.isUpdating) {
            console.warn('GameState: 正在更新中，忽略此次更新請求');
            return;
        }
        
        this.isUpdating = true;
        
        try {
            // 驗證更新
            const validationErrors = this.validateUpdates(updates);
            if (validationErrors.length > 0) {
                throw new StateValidationError(`狀態驗證失敗: ${validationErrors.join(', ')}`, 'validation', updates);
            }
            
            const oldState = this.deepClone(this.state);
            
            // 原子性更新：先備份，更新，如果失敗則回滾
            const backupState = this.deepClone(this.state);
            
            try {
                // 深度合併狀態
                this.state = this.deepMerge(this.state, updates);
                
                // 更新衍生狀態
                this.updateDerivedState();
                
                // 記錄狀態變更歷史
                this.recordStateChange(oldState, this.state, updates);
                
                // 更新性能指標
                this.updatePerformanceMetrics(startTime);
                
                if (this.debug) {
                    console.log('🎮 GameState 更新:', updates);
                }
                
                // 觸發監聽器
                if (!silent) {
                    this.notifyListeners('stateChanged', {
                        oldState,
                        newState: this.state,
                        updates
                    });
                    
                    // 觸發特定狀態變更通知
                    this.triggerStateChangeNotifications(oldState, this.state);
                }

                // 發布全域事件
                if (window.eventBus) {
                    window.eventBus.emit('gameState:changed', {
                        oldState,
                        newState: this.state,
                        updates
                    });
                }
                
            } catch (error) {
                // 回滾狀態
                this.state = backupState;
                console.error('GameState: 狀態更新失敗，已回滾:', error);
                throw error;
            }
            
        } finally {
            this.isUpdating = false;
        }
    }
    
    /**
     * 更新性能指標
     * @private
     * @param {number} startTime - 開始時間
     */
    updatePerformanceMetrics(startTime) {
        const duration = performance.now() - startTime;
        this.performanceMetrics.updateCount++;
        this.performanceMetrics.lastUpdateTime = duration;
        
        // 計算平均更新時間
        const { updateCount, averageUpdateTime } = this.performanceMetrics;
        this.performanceMetrics.averageUpdateTime = 
            (averageUpdateTime * (updateCount - 1) + duration) / updateCount;
        
        // 性能警告
        if (duration > 50) {
            console.warn(`⚠️ GameState: 狀態更新時間過長: ${duration.toFixed(2)}ms`);
        }
    }

    /**
     * 更新衍生狀態（自動計算的狀態）
     */
    updateDerivedState() {
        // 更新玩家數量
        this.state.playerCount = this.state.players.length;
        
        // 更新投票進度
        const votedPlayers = this.state.players.filter(p => p.hasVoted);
        this.state.votingProgress = {
            voted: votedPlayers.length,
            total: this.state.playerCount,
            percentage: this.state.playerCount > 0 ? 
                Math.round((votedPlayers.length / this.state.playerCount) * 100) : 0
        };
        
        // 更新統計資料
        this.updateStatistics();
    }

    /**
     * 更新統計資料
     */
    updateStatistics() {
        const votedPlayers = this.state.players.filter(p => p.hasVoted);
        const numericVotes = votedPlayers
            .map(p => p.vote)
            .filter(v => typeof v === 'number');

        if (numericVotes.length === 0) {
            this.state.statistics = {
                totalVotes: votedPlayers.length,
                averagePoints: 0,
                consensus: 0,
                devAverage: 0,
                qaAverage: 0,
                roleBreakdown: this.calculateRoleBreakdown()
            };
            return;
        }

        // 計算平均分數
        const total = numericVotes.reduce((sum, vote) => sum + vote, 0);
        const average = total / numericVotes.length;

        // 計算共識度
        const variance = numericVotes.reduce((sum, vote) => 
            sum + Math.pow(vote - average, 2), 0) / numericVotes.length;
        const maxVariance = Math.pow(
            Math.max(...numericVotes) - Math.min(...numericVotes), 2
        ) / 4;
        const consensus = Math.round((1 - (variance / (maxVariance || 1))) * 100);

        // 角色別統計
        const devVotes = votedPlayers
            .filter(p => p.role === 'dev' && typeof p.vote === 'number')
            .map(p => p.vote);
        const qaVotes = votedPlayers
            .filter(p => p.role === 'qa' && typeof p.vote === 'number')
            .map(p => p.vote);

        const devAverage = devVotes.length > 0 ? 
            devVotes.reduce((sum, vote) => sum + vote, 0) / devVotes.length : 0;
        const qaAverage = qaVotes.length > 0 ? 
            qaVotes.reduce((sum, vote) => sum + vote, 0) / qaVotes.length : 0;

        this.state.statistics = {
            totalVotes: votedPlayers.length,
            averagePoints: Math.round(average * 10) / 10,
            consensus: consensus,
            devAverage: Math.round(devAverage * 10) / 10,
            qaAverage: Math.round(qaAverage * 10) / 10,
            roleBreakdown: this.calculateRoleBreakdown()
        };
    }

    /**
     * 計算角色分佈
     */
    calculateRoleBreakdown() {
        const breakdown = {};
        this.state.players.forEach(player => {
            if (!breakdown[player.role]) {
                breakdown[player.role] = {
                    count: 0,
                    voted: 0,
                    averageVote: 0
                };
            }
            breakdown[player.role].count++;
            if (player.hasVoted) {
                breakdown[player.role].voted++;
            }
        });

        // 計算各角色平均投票
        Object.keys(breakdown).forEach(role => {
            const roleVotes = this.state.players
                .filter(p => p.role === role && p.hasVoted && typeof p.vote === 'number')
                .map(p => p.vote);
            
            if (roleVotes.length > 0) {
                breakdown[role].averageVote = 
                    roleVotes.reduce((sum, vote) => sum + vote, 0) / roleVotes.length;
            }
        });

        return breakdown;
    }

    /**
     * 記錄狀態變更歷史
     */
    recordStateChange(oldState, newState, updates) {
        const record = {
            timestamp: Date.now(),
            updates,
            oldState: this.deepClone(oldState),
            newState: this.deepClone(newState)
        };

        this.history.push(record);

        // 限制歷史記錄大小
        if (this.history.length > this.maxHistorySize) {
            this.history = this.history.slice(-this.maxHistorySize);
        }
    }

    /**
     * 獲取當前狀態（只讀）
     * @returns {Object} 當前狀態的深度複製
     */
    getState() {
        return this.deepClone(this.state);
    }

    /**
     * 獲取特定路徑的狀態值
     * @param {string} path - 狀態路徑，如 'players.0.name'
     * @returns {*} 狀態值
     */
    getStateByPath(path) {
        return this.getNestedValue(this.state, path);
    }

    /**
     * 訂閱狀態變更
     * @param {string} event - 事件類型
     * @param {Function} callback - 回調函數
     * @returns {Function} 取消訂閱函數
     */
    subscribe(event, callback) {
        if (typeof callback !== 'function') {
            throw new Error('GameState.subscribe: callback must be a function');
        }

        const listener = { event, callback };
        this.listeners.push(listener);

        // 返回取消訂閱函數
        return () => {
            const index = this.listeners.indexOf(listener);
            if (index !== -1) {
                this.listeners.splice(index, 1);
            }
        };
    }

    /**
     * 觸發狀態變更通知
     */
    triggerStateChangeNotifications(oldState, newState) {
        this.stateChangeNotifications.forEach((callback, key) => {
            try {
                if (Array.isArray(key)) {
                    // 處理嵌套屬性如 ['votingProgress', 'percentage']
                    const oldValue = this.getNestedValue(oldState, key.join('.'));
                    const newValue = this.getNestedValue(newState, key.join('.'));
                    if (oldValue !== newValue) {
                        callback(oldValue, newValue);
                    }
                } else {
                    // 處理簡單屬性
                    if (oldState[key] !== newState[key]) {
                        callback(oldState[key], newState[key]);
                    }
                }
            } catch (error) {
                console.error(`GameState: 狀態變更通知錯誤 (${key}):`, error);
            }
        });
    }

    /**
     * 通知監聽器
     */
    notifyListeners(event, data) {
        this.listeners
            .filter(listener => listener.event === event)
            .forEach(listener => {
                try {
                    listener.callback(data);
                } catch (error) {
                    console.error(`GameState: 監聽器錯誤 (${event}):`, error);
                }
            });
    }

    /**
     * 批量狀態更新（事務性）
     * @param {Array<Object>} updates - 更新陣列，每個包含 path 和 value
     * @returns {Promise<void>}
     */
    async batchUpdate(updates) {
        if (!Array.isArray(updates) || updates.length === 0) {
            throw new Error('batchUpdate: updates must be a non-empty array');
        }
        
        const batchUpdates = {};
        
        // 準備批量更新物件
        updates.forEach(({ path, value }) => {
            this.setNestedValue(batchUpdates, path, value);
        });
        
        // 執行原子性更新
        await this.updateState(batchUpdates);
    }
    
    /**
     * 設置嵌套物件值
     */
    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        let current = obj;
        
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!(key in current)) {
                current[key] = {};
            }
            current = current[key];
        }
        
        current[keys[keys.length - 1]] = value;
    }
    
    /**
     * 建立狀態快照
     * @returns {Object} 狀態快照
     */
    createSnapshot() {
        return {
            state: this.deepClone(this.state),
            timestamp: Date.now(),
            performance: { ...this.performanceMetrics },
            historyLength: this.history.length
        };
    }
    
    /**
     * 從快照恢復狀態
     * @param {Object} snapshot - 狀態快照
     */
    async restoreFromSnapshot(snapshot) {
        if (!snapshot || !snapshot.state) {
            throw new Error('restoreFromSnapshot: invalid snapshot');
        }
        
        console.log(`🎮 從快照恢復狀態 (${new Date(snapshot.timestamp).toISOString()})`);
        await this.updateState(snapshot.state);
    }

    /**
     * 重置狀態
     */
    resetState() {
        const initialState = {
            phase: 'waiting',
            roomId: null,
            isGameStarted: false,
            players: [],
            currentPlayer: null,
            playerCount: 0,
            votes: {},
            selectedCard: null,
            votingProgress: { voted: 0, total: 0, percentage: 0 },
            statistics: {
                totalVotes: 0,
                averagePoints: 0,
                consensus: 0,
                devAverage: 0,
                qaAverage: 0,
                roleBreakdown: {}
            },
            showDeleteButtons: false,
            confirmDialog: {
                visible: false,
                title: '',
                message: '',
                onConfirm: null,
                onCancel: null
            },
            connection: {
                isConnected: false,
                useFirebase: false,
                isAuthenticated: false
            }
        };

        this.updateState(initialState);
        this.history = [];
        
        console.log('🎮 GameState 已重置');
    }

    // 工具方法

    /**
     * 深度複製物件
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj);
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === 'object') {
            const cloned = {};
            Object.keys(obj).forEach(key => {
                cloned[key] = this.deepClone(obj[key]);
            });
            return cloned;
        }
    }

    /**
     * 深度合併物件
     */
    deepMerge(target, source) {
        const result = this.deepClone(target);
        
        Object.keys(source).forEach(key => {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(result[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        });
        
        return result;
    }

    /**
     * 獲取嵌套物件值
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    }

    /**
     * 啟用/停用除錯模式
     */
    setDebug(enabled) {
        this.debug = enabled;
        console.log(`🎮 GameState: 除錯模式 ${enabled ? '啟用' : '停用'}`);
    }

    /**
     * 獲取狀態統計資訊
     */
    getStats() {
        const memoryUsage = this.calculateMemoryUsage();
        const recentPerformance = this.calculateRecentPerformance();
        
        return {
            // 基本統計
            totalListeners: this.listeners.length,
            historySize: this.history.length,
            stateKeys: Object.keys(this.state).length,
            lastUpdate: this.history.length > 0 ? 
                new Date(this.history[this.history.length - 1].timestamp) : null,
            
            // 性能統計
            performance: {
                ...this.performanceMetrics,
                recentAverage: recentPerformance.averageTime,
                recentUpdates: recentPerformance.updateCount
            },
            
            // 記憶體使用
            memory: memoryUsage,
            
            // 狀態健康度
            health: {
                validationEnabled: this.validationEnabled,
                isUpdating: this.isUpdating,
                debugMode: this.debug,
                notificationCount: this.stateChangeNotifications.size
            },
            
            // 遊戲狀態摘要
            gameStatus: {
                phase: this.state.phase,
                playerCount: this.state.playerCount,
                votingProgress: this.state.votingProgress.percentage,
                isConnected: this.state.connection.isConnected
            }
        };
    }
    
    /**
     * 計算記憶體使用情況
     */
    calculateMemoryUsage() {
        const stateSize = JSON.stringify(this.state).length;
        const historySize = this.history.reduce((size, record) => 
            size + JSON.stringify(record).length, 0);
        
        return {
            stateSize: `${(stateSize / 1024).toFixed(2)} KB`,
            historySize: `${(historySize / 1024).toFixed(2)} KB`,
            totalSize: `${((stateSize + historySize) / 1024).toFixed(2)} KB`,
            averageRecordSize: this.history.length > 0 ? 
                `${(historySize / this.history.length / 1024).toFixed(2)} KB` : '0 KB'
        };
    }
    
    /**
     * 計算最近的性能統計
     */
    calculateRecentPerformance() {
        const recentHistory = this.history.slice(-10); // 最近 10 次更新
        
        if (recentHistory.length === 0) {
            return { averageTime: 0, updateCount: 0 };
        }
        
        const times = recentHistory.map(record => {
            // 估算更新時間（基於時間戳差異）
            const index = this.history.indexOf(record);
            if (index > 0) {
                return this.history[index].timestamp - this.history[index - 1].timestamp;
            }
            return 0;
        }).filter(time => time > 0);
        
        const averageTime = times.length > 0 ? 
            times.reduce((sum, time) => sum + time, 0) / times.length : 0;
        
        return {
            averageTime: `${averageTime.toFixed(2)}ms`,
            updateCount: recentHistory.length
        };
    }
}

// 創建全域遊戲狀態實例
window.gameState = new GameState();

console.log('🎮 GameState 已初始化');