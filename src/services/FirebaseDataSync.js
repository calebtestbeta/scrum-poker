/**
 * Firebase 數據同步層 - 專責數據存取和同步
 * 實現樂觀鎖、版本控制和批次更新
 * @version 4.0.0-data-sync
 */

/**
 * Firebase 數據同步類別
 */
class FirebaseDataSync {
    constructor(database, conflictResolver = null) {
        this.version = '4.0.0-data-sync';
        this.db = database;
        this.conflictResolver = conflictResolver;
        
        // 版本控制
        this.versionCounters = new Map(); // 追蹤各房間的版本號
        
        // 操作佇列
        this.operationQueue = [];
        this.isProcessingQueue = false;
        
        // 批次更新配置
        this.batchConfig = {
            maxBatchSize: 10,
            batchTimeout: 500, // 500ms
            enableBatching: true
        };
        
        // 批次更新緩衝
        this.batchBuffer = new Map();
        this.batchTimer = null;
        
        // 統計資料
        this.statistics = {
            totalOperations: 0,
            successfulOperations: 0,
            failedOperations: 0,
            batchedOperations: 0,
            conflictResolutions: 0
        };
        
        console.log(`📊 FirebaseDataSync v${this.version} 已初始化`);
    }

    /**
     * 讀取房間狀態
     * @param {string} roomId - 房間 ID
     * @returns {Promise<Object>} 房間狀態
     */
    async readRoomState(roomId) {
        try {
            const snapshot = await this.db.ref(`rooms/${roomId}`).once('value');
            const data = snapshot.val();
            
            if (!data) {
                return null;
            }

            // 確保版本號存在
            if (!data.version) {
                data.version = 1;
                await this.updateRoomVersion(roomId, 1);
            }

            console.log(`📖 讀取房間狀態: ${roomId}, 版本: ${data.version}`);
            return data;

        } catch (error) {
            console.error(`❌ 讀取房間狀態失敗 (${roomId}):`, error);
            throw error;
        }
    }

    /**
     * 寫入房間狀態（帶版本控制）
     * @param {string} roomId - 房間 ID
     * @param {Object} updates - 更新資料
     * @param {Object} options - 選項
     * @returns {Promise<boolean>} 寫入是否成功
     */
    async writeRoomState(roomId, updates, options = {}) {
        const {
            expectedVersion = null,
            playerId = 'system',
            operationType = 'update',
            enableConflictResolution = true
        } = options;

        try {
            this.statistics.totalOperations++;

            // 生成操作 ID
            const operationId = this.generateOperationId(operationType, playerId);

            // 如果啟用衝突解決，先註冊操作
            if (this.conflictResolver && enableConflictResolution) {
                this.conflictResolver.registerOperation(operationId, {
                    type: operationType,
                    roomId,
                    playerId,
                    timestamp: Date.now(),
                    data: updates
                });
            }

            // 樂觀鎖：檢查版本
            if (expectedVersion !== null) {
                const currentState = await this.readRoomState(roomId);
                if (!currentState) {
                    throw new Error(`房間 ${roomId} 不存在`);
                }

                if (currentState.version !== expectedVersion) {
                    // 版本衝突，嘗試解決
                    if (this.conflictResolver && enableConflictResolution) {
                        const conflict = this.conflictResolver.detectConflict({
                            type: operationType,
                            roomId,
                            playerId,
                            version: expectedVersion,
                            timestamp: Date.now()
                        }, currentState);

                        if (conflict) {
                            console.warn(`⚠️ 檢測到版本衝突: 期望 ${expectedVersion}, 實際 ${currentState.version}`);
                            
                            const resolution = await this.conflictResolver.resolveConflict(conflict);
                            this.statistics.conflictResolutions++;

                            if (!resolution.success || resolution.action === 'reject') {
                                this.statistics.failedOperations++;
                                this.conflictResolver.unregisterOperation(operationId);
                                return false;
                            }

                            // 根據解決策略調整操作
                            if (resolution.action === 'retry') {
                                this.conflictResolver.unregisterOperation(operationId);
                                await this.delay(resolution.backoffDelay || 500);
                                return this.writeRoomState(roomId, updates, {
                                    ...options,
                                    expectedVersion: currentState.version
                                });
                            }
                        }
                    } else {
                        this.statistics.failedOperations++;
                        throw new Error(`版本衝突: 期望 ${expectedVersion}, 實際 ${currentState.version}`);
                    }
                }
            }

            // 執行寫入操作
            const result = await this.executeWrite(roomId, updates, operationType);

            if (result) {
                this.statistics.successfulOperations++;
                console.log(`✅ 房間狀態寫入成功: ${roomId}, 操作: ${operationType}`);
            } else {
                this.statistics.failedOperations++;
            }

            // 取消註冊操作
            if (this.conflictResolver) {
                this.conflictResolver.unregisterOperation(operationId);
            }

            return result;

        } catch (error) {
            this.statistics.failedOperations++;
            console.error(`❌ 房間狀態寫入失敗 (${roomId}):`, error);
            throw error;
        }
    }

    /**
     * 執行實際的寫入操作
     * @param {string} roomId - 房間 ID
     * @param {Object} updates - 更新資料
     * @param {string} operationType - 操作類型
     * @returns {Promise<boolean>} 寫入結果
     */
    async executeWrite(roomId, updates, operationType) {
        // 添加元數據
        const timestamp = Date.now();
        const newVersion = await this.getNextVersion(roomId);
        
        const finalUpdates = {
            ...updates,
            version: newVersion,
            lastUpdate: timestamp,
            lastOperation: operationType
        };

        // 批次更新優化
        if (this.batchConfig.enableBatching && this.shouldBatch(operationType)) {
            return this.addToBatch(roomId, finalUpdates);
        }

        // 直接更新
        await this.db.ref(`rooms/${roomId}`).update(finalUpdates);
        this.updateVersionCounter(roomId, newVersion);
        
        return true;
    }

    /**
     * 批次更新管理
     * @param {string} roomId - 房間 ID
     * @param {Object} updates - 更新資料
     * @returns {Promise<boolean>} 加入批次結果
     */
    async addToBatch(roomId, updates) {
        if (!this.batchBuffer.has(roomId)) {
            this.batchBuffer.set(roomId, {});
        }

        // 合併更新
        const existingUpdates = this.batchBuffer.get(roomId);
        this.batchBuffer.set(roomId, { ...existingUpdates, ...updates });

        this.statistics.batchedOperations++;

        // 設置批次處理定時器
        if (!this.batchTimer) {
            this.batchTimer = setTimeout(() => {
                this.processBatch();
            }, this.batchConfig.batchTimeout);
        }

        // 檢查批次大小限制
        if (this.batchBuffer.size >= this.batchConfig.maxBatchSize) {
            await this.processBatch();
        }

        return true;
    }

    /**
     * 處理批次更新
     */
    async processBatch() {
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.batchTimer = null;
        }

        if (this.batchBuffer.size === 0) {
            return;
        }

        console.log(`📦 處理批次更新: ${this.batchBuffer.size} 個房間`);

        const batchPromises = [];
        for (const [roomId, updates] of this.batchBuffer) {
            const promise = this.db.ref(`rooms/${roomId}`).update(updates)
                .then(() => {
                    this.updateVersionCounter(roomId, updates.version);
                    console.log(`✅ 批次更新完成: ${roomId}`);
                })
                .catch(error => {
                    console.error(`❌ 批次更新失敗 (${roomId}):`, error);
                });
            
            batchPromises.push(promise);
        }

        try {
            await Promise.all(batchPromises);
            console.log(`✅ 所有批次更新完成`);
        } catch (error) {
            console.error('❌ 批次更新部分失敗:', error);
        }

        // 清空批次緩衝
        this.batchBuffer.clear();
    }

    /**
     * 設置數據監聽器
     * @param {string} path - 監聽路徑
     * @param {Function} callback - 回調函數
     * @param {Object} options - 選項
     * @returns {Function} 取消監聽函數
     */
    setupListener(path, callback, options = {}) {
        const {
            eventType = 'value',
            enableVersionCheck = true,
            enableConflictDetection = false
        } = options;

        console.log(`👂 設置監聽器: ${path} (${eventType})`);

        const ref = this.db.ref(path);
        let lastVersion = null;

        const wrappedCallback = (snapshot) => {
            try {
                const data = snapshot.val();
                
                if (data && enableVersionCheck) {
                    // 版本檢查
                    if (lastVersion !== null && data.version && data.version <= lastVersion) {
                        console.warn(`⚠️ 收到過時的數據版本: ${data.version}, 上次: ${lastVersion}`);
                        return; // 忽略過時數據
                    }
                    lastVersion = data.version;
                }

                // 衝突檢測
                if (this.conflictResolver && enableConflictDetection && data) {
                    const conflict = this.conflictResolver.detectConflict({
                        type: 'data_sync',
                        timestamp: Date.now(),
                        data: data
                    }, { version: lastVersion });

                    if (conflict) {
                        console.warn('⚠️ 數據同步衝突:', conflict.reason);
                    }
                }

                // 執行回調
                callback(snapshot);

            } catch (error) {
                console.error(`❌ 監聽器回調錯誤 (${path}):`, error);
            }
        };

        ref.on(eventType, wrappedCallback);

        // 返回取消監聽函數
        return () => {
            ref.off(eventType, wrappedCallback);
            console.log(`🔇 取消監聽器: ${path}`);
        };
    }

    /**
     * 事務性更新
     * @param {string} roomId - 房間 ID
     * @param {Function} updateFunction - 更新函數
     * @param {Object} options - 選項
     * @returns {Promise<Object>} 事務結果
     */
    async transaction(roomId, updateFunction, options = {}) {
        const { maxRetries = 3, playerId = 'system' } = options;
        
        console.log(`🔄 開始事務: ${roomId}`);

        const ref = this.db.ref(`rooms/${roomId}`);
        
        return new Promise((resolve, reject) => {
            ref.transaction(
                (currentData) => {
                    if (!currentData) {
                        return null; // 房間不存在
                    }

                    try {
                        // 執行更新函數
                        const newData = updateFunction(currentData);
                        
                        // 添加版本控制
                        if (newData) {
                            newData.version = (currentData.version || 0) + 1;
                            newData.lastUpdate = Date.now();
                            newData.lastOperation = 'transaction';
                        }

                        return newData;

                    } catch (error) {
                        console.error('❌ 事務更新函數錯誤:', error);
                        return; // 中止事務
                    }
                },
                (error, committed, snapshot) => {
                    if (error) {
                        console.error(`❌ 事務失敗 (${roomId}):`, error);
                        reject(error);
                    } else if (!committed) {
                        console.warn(`⚠️ 事務未提交 (${roomId})`);
                        resolve({ success: false, reason: '事務未提交' });
                    } else {
                        const newData = snapshot.val();
                        if (newData) {
                            this.updateVersionCounter(roomId, newData.version);
                        }
                        console.log(`✅ 事務成功 (${roomId})`);
                        resolve({ success: true, data: newData });
                    }
                },
                false // 不應用本地修改
            );
        });
    }

    /**
     * 獲取下一個版本號
     * @param {string} roomId - 房間 ID
     * @returns {Promise<number>} 新版本號
     */
    async getNextVersion(roomId) {
        const currentVersion = this.versionCounters.get(roomId) || 0;
        const newVersion = currentVersion + 1;
        this.versionCounters.set(roomId, newVersion);
        return newVersion;
    }

    /**
     * 更新版本計數器
     * @param {string} roomId - 房間 ID
     * @param {number} version - 版本號
     */
    updateVersionCounter(roomId, version) {
        const currentVersion = this.versionCounters.get(roomId) || 0;
        if (version > currentVersion) {
            this.versionCounters.set(roomId, version);
        }
    }

    /**
     * 更新房間版本
     * @param {string} roomId - 房間 ID
     * @param {number} version - 版本號
     * @returns {Promise<void>}
     */
    async updateRoomVersion(roomId, version) {
        await this.db.ref(`rooms/${roomId}/version`).set(version);
        this.updateVersionCounter(roomId, version);
    }

    /**
     * 判斷是否應該批次處理
     * @param {string} operationType - 操作類型
     * @returns {boolean} 是否批次處理
     */
    shouldBatch(operationType) {
        const batchableOperations = ['vote', 'heartbeat', 'statistics'];
        return batchableOperations.includes(operationType);
    }

    /**
     * 生成操作 ID
     * @param {string} operationType - 操作類型
     * @param {string} playerId - 玩家 ID
     * @returns {string} 操作 ID
     */
    generateOperationId(operationType, playerId) {
        return `${operationType}_${playerId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
     * 清理資源
     */
    async cleanup() {
        console.log('🧹 清理 FirebaseDataSync 資源...');

        // 處理剩餘的批次更新
        if (this.batchBuffer.size > 0) {
            await this.processBatch();
        }

        // 清除定時器
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.batchTimer = null;
        }

        // 清空緩衝
        this.batchBuffer.clear();
        this.versionCounters.clear();

        console.log('✅ FirebaseDataSync 資源清理完成');
    }

    /**
     * 獲取統計資料
     * @returns {Object} 統計資料
     */
    getStatistics() {
        const successRate = this.statistics.totalOperations > 0 
            ? (this.statistics.successfulOperations / this.statistics.totalOperations * 100).toFixed(2) + '%'
            : '100%';

        return {
            ...this.statistics,
            successRate,
            activeBatches: this.batchBuffer.size,
            trackedVersions: this.versionCounters.size
        };
    }

    /**
     * 重置統計資料
     */
    resetStatistics() {
        this.statistics = {
            totalOperations: 0,
            successfulOperations: 0,
            failedOperations: 0,
            batchedOperations: 0,
            conflictResolutions: 0
        };
        console.log('📊 FirebaseDataSync 統計資料已重置');
    }
}

// 匯出模組
window.FirebaseDataSync = FirebaseDataSync;

console.log('📊 FirebaseDataSync 模組已載入 - v4.0.0-data-sync');