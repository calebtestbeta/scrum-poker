// 管理者功能管理器 - 處理管理者相關操作
class AdminManager {
    constructor(firebaseManager) {
        this.firebaseManager = firebaseManager;
        this.isAdminMode = false;
        this.operationLogs = [];
        
        console.log('🔐 AdminManager 已初始化');
    }
    
    // 驗證 Firebase 連線和配置
    async authenticateWithFirebase(projectId, apiKey) {
        try {
            // 格式驗證
            if (!this.validateProjectId(projectId)) {
                return { success: false, message: 'Project ID 格式不正確' };
            }
            
            if (!this.validateApiKey(apiKey)) {
                return { success: false, message: 'API Key 格式不正確' };
            }
            
            // 初始化 Firebase 連線
            const config = { projectId, apiKey };
            const result = await this.firebaseManager.initialize(config);
            
            if (result) {
                this.isAdminMode = true;
                this.logOperation(`管理者連線成功 - 專案: ${projectId}`);
                console.log('✅ Firebase 管理者連線成功');
                return { success: true, message: 'Firebase 連線成功' };
            } else {
                this.logOperation(`Firebase 連線失敗 - 專案: ${projectId}`);
                console.warn('❌ Firebase 連線失敗');
                return { success: false, message: 'Firebase 連線失敗，請檢查 Project ID 和 API Key' };
            }
        } catch (error) {
            console.error('Firebase 連線過程發生錯誤:', error);
            this.logOperation(`Firebase 連線錯誤: ${error.message}`);
            return { success: false, message: `連線錯誤: ${error.message}` };
        }
    }
    
    // 登出管理者模式
    logoutAdmin() {
        this.isAdminMode = false;
        this.logOperation('管理者已登出');
        console.log('👋 管理者已登出');
    }
    
    // 檢查管理者權限
    checkAdminPermission() {
        if (!this.isAdminMode) {
            throw new Error('需要管理者權限才能執行此操作');
        }
        return true;
    }
    
    // 取得系統統計資訊
    async getSystemStats() {
        this.checkAdminPermission();
        
        try {
            const stats = {
                timestamp: new Date().toISOString(),
                totalRooms: 0,
                totalPlayers: 0,
                totalVotes: 0,
                roomDetails: [],
                systemInfo: {
                    useFirebase: this.firebaseManager.useFirebase,
                    isConnected: this.firebaseManager.isConnected,
                    currentRoom: this.firebaseManager.currentRoom
                }
            };
            
            if (this.firebaseManager.useFirebase && this.firebaseManager.db) {
                // Firebase 模式：讀取實際資料
                console.log('📊 管理者正在讀取 Firebase 房間資料...');
                const roomsRef = this.firebaseManager.db.ref('rooms');
                
                let snapshot, rooms;
                try {
                    snapshot = await roomsRef.once('value');
                    rooms = snapshot.val() || {};
                    console.log(`📋 成功讀取 ${Object.keys(rooms).length} 個房間`);
                } catch (readError) {
                    console.error('❌ 讀取房間資料失敗:', readError);
                    if (readError.code === 'PERMISSION_DENIED') {
                        console.error('🚫 管理者讀取權限被拒絕 - 可能原因:');
                        console.error('   1. Firebase 規則不允許讀取 rooms 節點');
                        console.error('   2. 需要身份驗證但未正確設定');
                        throw new Error('無權限讀取房間資料，請檢查 Firebase 規則');
                    }
                    throw readError;
                }
                
                stats.totalRooms = Object.keys(rooms).length;
                
                Object.entries(rooms).forEach(([roomId, roomData]) => {
                    const players = roomData.players || roomData.members || {};
                    const votes = roomData.votes || {};
                    
                    stats.totalPlayers += Object.keys(players).length;
                    stats.totalVotes += Object.keys(votes).length;
                    
                    stats.roomDetails.push({
                        id: roomId,
                        gameState: roomData.gameState,
                        phase: roomData.phase,
                        created: roomData.created,
                        playerCount: Object.keys(players).length,
                        voteCount: Object.keys(votes).length,
                        players: Object.values(players).map(p => ({
                            name: p.name,
                            role: p.role,
                            hasVoted: p.hasVoted || p.voted
                        }))
                    });
                });
            } else {
                // 模擬模式：讀取本地資料
                const rooms = this.firebaseManager.mockData.rooms || {};
                stats.totalRooms = Object.keys(rooms).length;
                
                Object.entries(rooms).forEach(([roomId, roomData]) => {
                    const players = roomData.players || {};
                    const votes = roomData.votes || {};
                    
                    stats.totalPlayers += Object.keys(players).length;
                    stats.totalVotes += Object.keys(votes).length;
                    
                    stats.roomDetails.push({
                        id: roomId,
                        gameState: roomData.gameState,
                        phase: roomData.phase,
                        created: new Date(roomData.created).toISOString(),
                        playerCount: Object.keys(players).length,
                        voteCount: Object.keys(votes).length,
                        players: Object.values(players).map(p => ({
                            name: p.name,
                            role: p.role,
                            hasVoted: p.hasVoted || p.voted
                        }))
                    });
                });
            }
            
            this.logOperation(`系統統計查詢完成 - ${stats.totalRooms} 個房間, ${stats.totalPlayers} 位玩家`);
            return stats;
            
        } catch (error) {
            console.error('取得系統統計失敗:', error);
            this.logOperation(`系統統計查詢失敗: ${error.message}`);
            throw error;
        }
    }
    
    // 清除所有房間和玩家資訊
    async clearAllData() {
        this.checkAdminPermission();
        
        try {
            let clearedRooms = 0;
            let clearedPlayers = 0;
            
            if (this.firebaseManager.useFirebase && this.firebaseManager.db) {
                // Firebase 模式：清除實際資料
                console.log('🗑️ 開始清除 Firebase 資料...');
                
                try {
                    // 先獲取統計資料
                    const stats = await this.getSystemStats();
                    clearedRooms = stats.totalRooms;
                    clearedPlayers = stats.totalPlayers;
                    
                    // 清除所有房間
                    const roomsRef = this.firebaseManager.db.ref('rooms');
                    console.log(`🗑️ 準備清除 ${clearedRooms} 個房間...`);
                    await roomsRef.remove();
                    
                    console.log('✅ Firebase 資料清除完成');
                } catch (clearError) {
                    console.error('❌ 清除 Firebase 資料失敗:', clearError);
                    if (clearError.code === 'PERMISSION_DENIED') {
                        console.error('🚫 管理者清除權限被拒絕 - 可能原因:');
                        console.error('   1. Firebase 規則不允許刪除 rooms 節點');
                        console.error('   2. 需要管理者身份驗證');
                        throw new Error('無權限清除資料，請檢查 Firebase 規則和管理者權限');
                    }
                    throw clearError;
                }
                
            } else {
                // 模擬模式：清除本地資料
                console.log('🗑️ 開始清除模擬資料...');
                
                const rooms = this.firebaseManager.mockData.rooms || {};
                clearedRooms = Object.keys(rooms).length;
                
                // 計算玩家總數
                Object.values(rooms).forEach(room => {
                    clearedPlayers += Object.keys(room.players || {}).length;
                });
                
                // 清除本地資料
                this.firebaseManager.mockData.rooms = {};
                
                console.log('✅ 模擬資料清除完成');
            }
            
            const result = {
                success: true,
                timestamp: new Date().toISOString(),
                clearedRooms,
                clearedPlayers,
                message: `成功清除 ${clearedRooms} 個房間和 ${clearedPlayers} 位玩家的資料`
            };
            
            this.logOperation(`全資料清除完成 - ${clearedRooms} 個房間, ${clearedPlayers} 位玩家`);
            
            return result;
            
        } catch (error) {
            console.error('清除所有資料失敗:', error);
            this.logOperation(`全資料清除失敗: ${error.message}`);
            throw error;
        }
    }
    
    // 清除特定房間
    async clearRoom(roomId) {
        this.checkAdminPermission();
        
        if (!roomId) {
            throw new Error('房間 ID 不能為空');
        }
        
        try {
            let roomData = null;
            
            if (this.firebaseManager.useFirebase && this.firebaseManager.db) {
                // Firebase 模式
                const roomRef = this.firebaseManager.db.ref(`rooms/${roomId}`);
                const snapshot = await roomRef.once('value');
                roomData = snapshot.val();
                
                if (roomData) {
                    await roomRef.remove();
                    console.log(`✅ Firebase 房間 ${roomId} 已清除`);
                } else {
                    throw new Error(`房間 ${roomId} 不存在`);
                }
            } else {
                // 模擬模式
                roomData = this.firebaseManager.mockData.rooms[roomId];
                
                if (roomData) {
                    delete this.firebaseManager.mockData.rooms[roomId];
                    console.log(`✅ 模擬房間 ${roomId} 已清除`);
                } else {
                    throw new Error(`房間 ${roomId} 不存在`);
                }
            }
            
            const playersCount = Object.keys(roomData.players || {}).length;
            const result = {
                success: true,
                roomId,
                playersCleared: playersCount,
                message: `房間 ${roomId} 及其 ${playersCount} 位玩家已清除`
            };
            
            this.logOperation(`單房間清除完成 - 房間: ${roomId}, ${playersCount} 位玩家`);
            
            return result;
            
        } catch (error) {
            console.error(`清除房間 ${roomId} 失敗:`, error);
            this.logOperation(`單房間清除失敗 - 房間: ${roomId}, 錯誤: ${error.message}`);
            throw error;
        }
    }
    
    // 強制清除所有資料 (緊急用，跳過確認)
    async emergencyClearAll() {
        this.checkAdminPermission();
        
        console.warn('⚠️ 執行緊急清除所有資料...');
        
        try {
            if (this.firebaseManager.useFirebase && this.firebaseManager.db) {
                const roomsRef = this.firebaseManager.db.ref('rooms');
                await roomsRef.remove();
            } else {
                this.firebaseManager.mockData.rooms = {};
            }
            
            const result = {
                success: true,
                timestamp: new Date().toISOString(),
                message: '緊急清除完成'
            };
            
            this.logOperation('緊急清除完成');
            return result;
            
        } catch (error) {
            console.error('緊急清除失敗:', error);
            this.logOperation(`緊急清除失敗: ${error.message}`);
            throw error;
        }
    }
    
    // 記錄操作日誌
    logOperation(operation) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            operation,
            adminMode: this.isAdminMode
        };
        
        this.operationLogs.push(logEntry);
        
        // 保持最多 100 條日誌
        if (this.operationLogs.length > 100) {
            this.operationLogs = this.operationLogs.slice(-100);
        }
        
        console.log(`📝 [Admin Log] ${operation}`);
    }
    
    // 取得操作日誌
    getOperationLogs() {
        this.checkAdminPermission();
        return [...this.operationLogs];
    }
    
    // 匯出系統備份
    async exportSystemBackup() {
        this.checkAdminPermission();
        
        try {
            const stats = await this.getSystemStats();
            const backup = {
                exportTime: new Date().toISOString(),
                version: '1.0',
                systemStats: stats,
                operationLogs: this.operationLogs
            };
            
            this.logOperation('系統備份匯出完成');
            return backup;
            
        } catch (error) {
            console.error('匯出系統備份失敗:', error);
            this.logOperation(`系統備份匯出失敗: ${error.message}`);
            throw error;
        }
    }
    
    // 取得管理狀態
    getAdminStatus() {
        return {
            isAdminMode: this.isAdminMode,
            operationCount: this.operationLogs.length,
            lastOperation: this.operationLogs.length > 0 ? 
                this.operationLogs[this.operationLogs.length - 1] : null
        };
    }
    
    // 驗證 Project ID 格式
    validateProjectId(projectId) {
        if (!projectId || typeof projectId !== 'string') {
            return false;
        }
        // Firebase Project ID 格式：小寫字母、數字、連字號，6-30 字元
        const projectIdRegex = /^[a-z0-9-]{6,30}$/;
        return projectIdRegex.test(projectId);
    }
    
    // 驗證 API Key 格式
    validateApiKey(apiKey) {
        if (!apiKey || typeof apiKey !== 'string') {
            return false;
        }
        // Firebase API Key 格式：以 AIza 開頭，39 字元長度
        const apiKeyRegex = /^AIza[A-Za-z0-9_-]{35}$/;
        return apiKeyRegex.test(apiKey);
    }
}

// 匯出類別
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminManager;
}

console.log('🔐 AdminManager 類別已載入');