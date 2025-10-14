/**
 * 衝突解決器 - 處理併發操作和狀態衝突
 * 實現樂觀鎖、優先級規則和重試機制
 * @version 4.0.0-conflict-resolver
 */

/**
 * 衝突類型常數
 */
const CONFLICT_TYPES = {
    SIMULTANEOUS_REVEAL: 'simultaneous_reveal',    // 同時開牌
    SIMULTANEOUS_RESET: 'simultaneous_reset',      // 同時重置
    VOTE_DURING_REVEAL: 'vote_during_reveal',      // 開牌時投票
    RESET_DURING_VOTE: 'reset_during_vote',        // 投票時重置
    VERSION_MISMATCH: 'version_mismatch',          // 版本不匹配
    CONCURRENT_STATE_CHANGE: 'concurrent_state_change' // 併發狀態變更
};

/**
 * 解決策略常數
 */
const RESOLUTION_STRATEGIES = {
    FIRST_WRITER_WINS: 'first_writer_wins',        // 先寫者獲勝
    LAST_WRITER_WINS: 'last_writer_wins',          // 後寫者獲勝
    PRIORITY_BASED: 'priority_based',              // 基於優先級
    IGNORE_CONFLICT: 'ignore_conflict',            // 忽略衝突
    RETRY_WITH_BACKOFF: 'retry_with_backoff',      // 退避重試
    MERGE_STATES: 'merge_states'                   // 合併狀態
};

/**
 * 衝突解決配置
 */
const CONFLICT_RESOLUTION_RULES = {
    [CONFLICT_TYPES.SIMULTANEOUS_REVEAL]: {
        strategy: RESOLUTION_STRATEGIES.FIRST_WRITER_WINS,
        priority: 10,
        retryAttempts: 2,
        backoffDelay: 500
    },
    [CONFLICT_TYPES.SIMULTANEOUS_RESET]: {
        strategy: RESOLUTION_STRATEGIES.FIRST_WRITER_WINS,
        priority: 15,
        retryAttempts: 2,
        backoffDelay: 300
    },
    [CONFLICT_TYPES.VOTE_DURING_REVEAL]: {
        strategy: RESOLUTION_STRATEGIES.IGNORE_CONFLICT,
        priority: 5,
        retryAttempts: 0,
        message: '開牌進行中，無法投票'
    },
    [CONFLICT_TYPES.RESET_DURING_VOTE]: {
        strategy: RESOLUTION_STRATEGIES.PRIORITY_BASED,
        priority: 12,
        retryAttempts: 1,
        backoffDelay: 200
    },
    [CONFLICT_TYPES.VERSION_MISMATCH]: {
        strategy: RESOLUTION_STRATEGIES.RETRY_WITH_BACKOFF,
        priority: 8,
        retryAttempts: 3,
        backoffDelay: 1000
    },
    [CONFLICT_TYPES.CONCURRENT_STATE_CHANGE]: {
        strategy: RESOLUTION_STRATEGIES.LAST_WRITER_WINS,
        priority: 7,
        retryAttempts: 2,
        backoffDelay: 800
    }
};

/**
 * 衝突解決器類別
 */
class ConflictResolver {
    constructor() {
        this.version = '4.0.0-conflict-resolver';
        this.activeOperations = new Map(); // 追蹤進行中的操作
        this.conflictHistory = []; // 衝突歷史記錄
        this.maxHistorySize = 100;
        
        // 統計資料
        this.statistics = {
            totalConflicts: 0,
            resolvedConflicts: 0,
            failedResolutions: 0,
            strategyCounts: {}
        };
        
        console.log(`🔧 ConflictResolver v${this.version} 已初始化`);
    }

    /**
     * 檢測操作衝突
     * @param {Object} operation - 操作資訊
     * @param {Object} currentState - 當前狀態
     * @returns {Object|null} 衝突描述或 null
     */
    detectConflict(operation, currentState) {
        const { type, phase, version, playerId, timestamp } = operation;
        const { phase: currentPhase, version: currentVersion, lastUpdate } = currentState;

        // 版本衝突檢測
        if (version && currentVersion && version < currentVersion) {
            return {
                type: CONFLICT_TYPES.VERSION_MISMATCH,
                operation,
                currentState,
                reason: `操作版本 ${version} 低於當前版本 ${currentVersion}`
            };
        }

        // 狀態轉換衝突
        if (type === 'reveal' && currentPhase === 'revealing') {
            // 檢查是否有其他正在進行的開牌操作
            const activeReveals = Array.from(this.activeOperations.values())
                .filter(op => op.type === 'reveal' && op.playerId !== playerId);
            
            if (activeReveals.length > 0) {
                return {
                    type: CONFLICT_TYPES.SIMULTANEOUS_REVEAL,
                    operation,
                    currentState,
                    conflictingOperations: activeReveals,
                    reason: '檢測到同時開牌操作'
                };
            }
        }

        // 重置衝突
        if (type === 'reset' && currentPhase === 'resetting') {
            const activeResets = Array.from(this.activeOperations.values())
                .filter(op => op.type === 'reset' && op.playerId !== playerId);
            
            if (activeResets.length > 0) {
                return {
                    type: CONFLICT_TYPES.SIMULTANEOUS_RESET,
                    operation,
                    currentState,
                    conflictingOperations: activeResets,
                    reason: '檢測到同時重置操作'
                };
            }
        }

        // 投票與開牌衝突
        if (type === 'vote' && currentPhase === 'revealing') {
            return {
                type: CONFLICT_TYPES.VOTE_DURING_REVEAL,
                operation,
                currentState,
                reason: '開牌進行中，無法投票'
            };
        }

        // 重置與投票衝突
        if (type === 'reset' && currentPhase === 'voting') {
            const activeVotes = Array.from(this.activeOperations.values())
                .filter(op => op.type === 'vote');
            
            if (activeVotes.length > 0) {
                return {
                    type: CONFLICT_TYPES.RESET_DURING_VOTE,
                    operation,
                    currentState,
                    conflictingOperations: activeVotes,
                    reason: '投票進行中的重置操作'
                };
            }
        }

        // 併發狀態變更
        if (lastUpdate && timestamp && (timestamp - lastUpdate) < 1000) {
            const recentOperations = Array.from(this.activeOperations.values())
                .filter(op => op.timestamp && (timestamp - op.timestamp) < 1000);
            
            if (recentOperations.length > 0) {
                return {
                    type: CONFLICT_TYPES.CONCURRENT_STATE_CHANGE,
                    operation,
                    currentState,
                    conflictingOperations: recentOperations,
                    reason: '檢測到併發狀態變更'
                };
            }
        }

        return null; // 無衝突
    }

    /**
     * 解決衝突
     * @param {Object} conflict - 衝突描述
     * @returns {Promise<Object>} 解決結果
     */
    async resolveConflict(conflict) {
        try {
            this.statistics.totalConflicts++;
            
            const rule = CONFLICT_RESOLUTION_RULES[conflict.type];
            if (!rule) {
                console.warn(`⚠️ 未知衝突類型: ${conflict.type}`);
                return { success: false, reason: '未知衝突類型' };
            }

            console.log(`🔧 解決衝突: ${conflict.type}, 策略: ${rule.strategy}`);

            // 記錄衝突
            this.recordConflict(conflict, rule);

            // 根據策略解決衝突
            const result = await this.applyResolutionStrategy(conflict, rule);

            if (result.success) {
                this.statistics.resolvedConflicts++;
                console.log(`✅ 衝突解決成功: ${conflict.type}`);
            } else {
                this.statistics.failedResolutions++;
                console.warn(`❌ 衝突解決失敗: ${conflict.type}, 原因: ${result.reason}`);
            }

            return result;

        } catch (error) {
            this.statistics.failedResolutions++;
            console.error('❌ 衝突解決異常:', error);
            return { success: false, reason: error.message };
        }
    }

    /**
     * 應用解決策略
     * @param {Object} conflict - 衝突描述
     * @param {Object} rule - 解決規則
     * @returns {Promise<Object>} 解決結果
     */
    async applyResolutionStrategy(conflict, rule) {
        const { strategy } = rule;
        
        // 更新策略統計
        this.statistics.strategyCounts[strategy] = 
            (this.statistics.strategyCounts[strategy] || 0) + 1;

        switch (strategy) {
            case RESOLUTION_STRATEGIES.FIRST_WRITER_WINS:
                return this.firstWriterWins(conflict, rule);

            case RESOLUTION_STRATEGIES.LAST_WRITER_WINS:
                return this.lastWriterWins(conflict, rule);

            case RESOLUTION_STRATEGIES.PRIORITY_BASED:
                return this.priorityBased(conflict, rule);

            case RESOLUTION_STRATEGIES.IGNORE_CONFLICT:
                return this.ignoreConflict(conflict, rule);

            case RESOLUTION_STRATEGIES.RETRY_WITH_BACKOFF:
                return this.retryWithBackoff(conflict, rule);

            case RESOLUTION_STRATEGIES.MERGE_STATES:
                return this.mergeStates(conflict, rule);

            default:
                return { success: false, reason: `未實現的策略: ${strategy}` };
        }
    }

    /**
     * 先寫者獲勝策略
     */
    async firstWriterWins(conflict, rule) {
        const { operation, conflictingOperations = [] } = conflict;
        
        // 找出最早的操作
        const allOperations = [operation, ...conflictingOperations];
        const earliestOperation = allOperations.reduce((earliest, current) => 
            current.timestamp < earliest.timestamp ? current : earliest
        );

        if (earliestOperation === operation) {
            return { 
                success: true, 
                action: 'proceed',
                winner: operation.playerId,
                reason: '當前操作最早，允許繼續'
            };
        } else {
            return { 
                success: true, 
                action: 'reject',
                winner: earliestOperation.playerId,
                reason: '其他操作更早，拒絕當前操作'
            };
        }
    }

    /**
     * 後寫者獲勝策略
     */
    async lastWriterWins(conflict, rule) {
        return { 
            success: true, 
            action: 'proceed',
            winner: conflict.operation.playerId,
            reason: '後寫者獲勝，覆蓋之前操作'
        };
    }

    /**
     * 基於優先級策略
     */
    async priorityBased(conflict, rule) {
        const { operation } = conflict;
        const operationPriority = this.getOperationPriority(operation);
        const rulePriority = rule.priority;

        if (operationPriority >= rulePriority) {
            return { 
                success: true, 
                action: 'proceed',
                priority: operationPriority,
                reason: `操作優先級 ${operationPriority} >= 規則優先級 ${rulePriority}`
            };
        } else {
            return { 
                success: true, 
                action: 'reject',
                priority: operationPriority,
                reason: `操作優先級 ${operationPriority} < 規則優先級 ${rulePriority}`
            };
        }
    }

    /**
     * 忽略衝突策略
     */
    async ignoreConflict(conflict, rule) {
        return { 
            success: true, 
            action: 'reject',
            reason: rule.message || '根據規則忽略此操作'
        };
    }

    /**
     * 退避重試策略
     */
    async retryWithBackoff(conflict, rule) {
        const { retryAttempts, backoffDelay } = rule;
        
        // 實際重試邏輯由調用者實現，這裡只返回重試參數
        return { 
            success: true, 
            action: 'retry',
            retryAttempts,
            backoffDelay,
            reason: '需要重試操作'
        };
    }

    /**
     * 合併狀態策略
     */
    async mergeStates(conflict, rule) {
        const { operation, currentState } = conflict;
        
        // 簡單的狀態合併邏輯
        const mergedState = {
            ...currentState,
            ...operation.data,
            lastMerge: Date.now(),
            mergedBy: operation.playerId
        };

        return { 
            success: true, 
            action: 'merge',
            mergedState,
            reason: '狀態已合併'
        };
    }

    /**
     * 獲取操作優先級
     * @param {Object} operation - 操作資訊
     * @returns {number} 優先級數值
     */
    getOperationPriority(operation) {
        const priorityMap = {
            'reveal': 10,    // 開牌優先級高
            'reset': 8,      // 重置優先級中等
            'vote': 5,       // 投票優先級較低
            'join': 3,       // 加入優先級低
            'leave': 2       // 離開優先級最低
        };

        return priorityMap[operation.type] || 1;
    }

    /**
     * 註冊活動操作
     * @param {string} operationId - 操作 ID
     * @param {Object} operation - 操作資訊
     */
    registerOperation(operationId, operation) {
        this.activeOperations.set(operationId, {
            ...operation,
            startTime: Date.now()
        });

        console.log(`📝 註冊操作: ${operationId} (${operation.type})`);
    }

    /**
     * 取消註冊操作
     * @param {string} operationId - 操作 ID
     */
    unregisterOperation(operationId) {
        const operation = this.activeOperations.get(operationId);
        if (operation) {
            const duration = Date.now() - operation.startTime;
            console.log(`✅ 操作完成: ${operationId} (${operation.type}), 耗時: ${duration}ms`);
            this.activeOperations.delete(operationId);
        }
    }

    /**
     * 記錄衝突歷史
     * @param {Object} conflict - 衝突描述
     * @param {Object} rule - 解決規則
     */
    recordConflict(conflict, rule) {
        const record = {
            timestamp: Date.now(),
            type: conflict.type,
            operation: conflict.operation,
            rule: rule.strategy,
            resolved: false
        };

        this.conflictHistory.push(record);

        // 限制歷史記錄大小
        if (this.conflictHistory.length > this.maxHistorySize) {
            this.conflictHistory = this.conflictHistory.slice(-this.maxHistorySize);
        }
    }

    /**
     * 獲取衝突統計
     * @returns {Object} 統計資料
     */
    getStatistics() {
        return {
            ...this.statistics,
            activeOperations: this.activeOperations.size,
            conflictHistorySize: this.conflictHistory.length,
            successRate: this.statistics.totalConflicts > 0 
                ? (this.statistics.resolvedConflicts / this.statistics.totalConflicts * 100).toFixed(2) + '%'
                : '100%'
        };
    }

    /**
     * 獲取衝突歷史
     * @param {number} limit - 限制數量
     * @returns {Array} 衝突歷史
     */
    getConflictHistory(limit = 20) {
        return this.conflictHistory.slice(-limit);
    }

    /**
     * 清理過期操作
     * @param {number} maxAge - 最大存活時間（毫秒）
     */
    cleanupExpiredOperations(maxAge = 30000) {
        const now = Date.now();
        const expired = [];

        for (const [operationId, operation] of this.activeOperations) {
            if (now - operation.startTime > maxAge) {
                expired.push(operationId);
            }
        }

        expired.forEach(operationId => {
            console.warn(`⚠️ 清理過期操作: ${operationId}`);
            this.unregisterOperation(operationId);
        });

        if (expired.length > 0) {
            console.log(`🧹 清理了 ${expired.length} 個過期操作`);
        }
    }

    /**
     * 生成操作 ID
     * @param {Object} operation - 操作資訊
     * @returns {string} 操作 ID
     */
    generateOperationId(operation) {
        return `${operation.type}_${operation.playerId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 重置統計資料
     */
    resetStatistics() {
        this.statistics = {
            totalConflicts: 0,
            resolvedConflicts: 0,
            failedResolutions: 0,
            strategyCounts: {}
        };
        this.conflictHistory = [];
        console.log('📊 衝突解決器統計資料已重置');
    }
}

// 匯出模組
window.ConflictResolver = ConflictResolver;
window.CONFLICT_TYPES = CONFLICT_TYPES;
window.RESOLUTION_STRATEGIES = RESOLUTION_STRATEGIES;

console.log('🔧 ConflictResolver 模組已載入 - v4.0.0-conflict-resolver');