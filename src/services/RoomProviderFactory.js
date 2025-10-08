/**
 * 房間資料提供者工廠 - 雙模式支援
 * 根據應用模式動態創建對應的資料層服務
 * @version 3.0.0-dual-mode
 */

/**
 * 房間資料提供者介面規範
 * 所有房間服務都必須實現這些方法
 * @interface IRoomProvider
 */
const IRoomProvider = {
    // === 初始化相關 ===
    /**
     * 初始化服務
     * @param {string} roomId - 房間 ID (4-20字符，英數字)
     * @returns {Promise<{success: boolean, error?: string}>} 初始化結果
     * @throws {Error} 當 roomId 格式不正確時拋出錯誤
     */
    initialize: async (roomId) => {},
    
    /**
     * 銷毀服務並清理資源
     * @returns {Promise<void>} 清理完成的 Promise
     */
    destroy: async () => {},
    
    // === 房間管理 ===
    /**
     * 加入房間
     * @param {string} roomId - 房間 ID (4-20字符，英數字)
     * @param {Object} player - 玩家資訊
     * @param {string} player.id - 玩家唯一標識符
     * @param {string} player.name - 玩家名稱 (1-20字符)
     * @param {'dev'|'qa'|'scrum_master'|'po'|'other'} player.role - 玩家角色
     * @returns {Promise<{success: boolean, data?: Object, error?: string}>} 加入結果
     */
    joinRoom: async (roomId, player) => {},
    
    /**
     * 離開房間
     * @param {string} roomId - 房間 ID
     * @param {string} playerId - 玩家 ID
     * @param {boolean} [immediate=false] - 是否立即移除，不等待清理
     * @returns {Promise<{success: boolean, error?: string}>} 離開結果
     */
    leaveRoom: async (roomId, playerId, immediate = false) => {},
    
    // === 投票管理 ===
    /**
     * 提交投票
     * @param {string} playerId - 玩家 ID
     * @param {*} vote - 投票值
     * @returns {Promise<boolean>} 是否提交成功
     */
    submitVote: async (playerId, vote) => {},
    
    /**
     * 開牌 (揭曉所有投票)
     * @param {string} roomId - 房間 ID
     * @returns {Promise<boolean>} 是否開牌成功
     */
    revealVotes: async (roomId) => {},
    
    /**
     * 清除投票 (開始新一輪)
     * @param {string} roomId - 房間 ID
     * @returns {Promise<boolean>} 是否清除成功
     */
    clearVotes: async (roomId) => {},
    
    // === 事件監聽 ===
    /**
     * 監聽事件
     * @param {string} eventName - 事件名稱
     * @param {Function} callback - 回調函數
     * @returns {void}
     */
    on: (eventName, callback) => {},
    
    /**
     * 移除事件監聽
     * @param {string} eventName - 事件名稱
     * @param {Function} callback - 回調函數  
     * @returns {void}
     */
    off: (eventName, callback) => {},
    
    // === 資料查詢 ===
    /**
     * 獲取房間狀態
     * @param {string} roomId - 房間 ID
     * @returns {Promise<Object>} 房間狀態
     */
    getRoomState: async (roomId) => {},
    
    /**
     * 獲取玩家列表
     * @param {string} roomId - 房間 ID
     * @returns {Promise<Array>} 玩家列表
     */
    getPlayers: async (roomId) => {},
    
    /**
     * 獲取投票狀態
     * @param {string} roomId - 房間 ID
     * @returns {Promise<Object>} 投票狀態
     */
    getVotes: async (roomId) => {}
};

/**
 * 輸入驗證與安全工具
 */
class SecurityUtils {
    /**
     * 驗證房間 ID 格式
     * @param {string} roomId - 房間 ID
     * @returns {boolean} 是否有效
     */
    static validateRoomId(roomId) {
        if (typeof roomId !== 'string') return false;
        // 房間 ID：4-20字符，僅允許英數字、連字符、底線
        return /^[a-zA-Z0-9_-]{4,20}$/.test(roomId);
    }
    
    /**
     * 清理使用者輸入，防範 XSS
     * @param {string} input - 使用者輸入
     * @returns {string} 清理後的字串
     */
    static sanitizeUserInput(input) {
        if (typeof input !== 'string') return '';
        return input
            .replace(/[<>"'&]/g, (match) => {
                const entities = { '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '&': '&amp;' };
                return entities[match] || match;
            })
            .replace(/javascript:/gi, '')
            .trim()
            .slice(0, 100); // 限制長度
    }
    
    /**
     * 驗證玩家資料
     * @param {Object} player - 玩家資料
     * @returns {{valid: boolean, error?: string, sanitized?: Object}}
     */
    static validatePlayer(player) {
        if (!player || typeof player !== 'object') {
            return { valid: false, error: '玩家資料格式錯誤' };
        }
        
        const { name, role } = player;
        
        // 驗證名稱
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return { valid: false, error: '玩家名稱不能為空' };
        }
        
        if (name.length > 20) {
            return { valid: false, error: '玩家名稱過長（最多20字符）' };
        }
        
        // 驗證角色
        const validRoles = ['dev', 'qa', 'scrum_master', 'po', 'other'];
        if (!validRoles.includes(role)) {
            return { valid: false, error: '無效的玩家角色' };
        }
        
        // 清理並回傳
        const sanitized = {
            ...player,
            name: this.sanitizeUserInput(name),
            role,
            id: player.id || this.generatePlayerId()
        };
        
        return { valid: true, sanitized };
    }
    
    /**
     * 產生安全的玩家 ID
     * @returns {string} 玩家 ID
     */
    static generatePlayerId() {
        return 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
}

/**
 * 房間資料提供者工廠類別
 * 負責根據不同模式創建對應的資料層服務
 */
class RoomProviderFactory {
    /**
     * 創建房間資料提供者
     * @param {string} mode - 模式 ('firebase' | 'local')
     * @param {Object} config - 配置選項
     * @returns {Promise<Object>} 房間資料提供者實例
     */
    static async createProvider(mode, config = {}) {
        
        try {
            switch (mode) {
                case 'firebase':
                    return await RoomProviderFactory.createFirebaseProvider(config);
                    
                case 'local':
                    return await RoomProviderFactory.createLocalProvider(config);
                    
                default:
                    throw new Error(`不支援的房間資料提供者模式: ${mode}`);
            }
        } catch (error) {
            console.error(`❌ 建立房間資料提供者失敗 (${mode}):`, error);
            throw error;
        }
    }
    
    /**
     * 創建 Firebase 資料提供者
     * @param {Object} config - Firebase 配置
     * @returns {Promise<Object>} Firebase 提供者實例
     */
    static async createFirebaseProvider(config) {
        if (!window.FirebaseService) {
            throw new Error('FirebaseService 未載入或不可用');
        }
        
        const firebaseService = new FirebaseService();
        
        if (config.firebaseConfig) {
            const initialized = await firebaseService.initialize(config.firebaseConfig);
            if (!initialized) {
                throw new Error('Firebase 初始化失敗');
            }
        }
        
        return new FirebaseRoomProvider(firebaseService);
    }
    
    /**
     * 創建本機資料提供者
     * @param {Object} config - 本機配置
     * @returns {Promise<Object>} 本機提供者實例
     */
    static async createLocalProvider(config) {
        if (!window.LocalRoomService) {
            throw new Error('LocalRoomService 未載入或不可用');
        }
        
        const localService = new LocalRoomService();
        return new LocalRoomProvider(localService);
    }
    
    /**
     * 檢測應用模式
     * @returns {string} 檢測到的模式 ('firebase' | 'local')
     */
    static detectMode() {
        const htmlElement = document.documentElement;
        const htmlMode = htmlElement.getAttribute('data-mode');
        if (htmlMode === 'local' || htmlMode === 'firebase') {
            return htmlMode;
        }
        
        if (window.APP_MODE === 'local' || window.APP_MODE === 'firebase') {
            return window.APP_MODE;
        }
        
        if (window.IS_PLAYGROUND === true) {
            return 'local';
        }
        
        const pathname = window.location.pathname;
        if (pathname.includes('playground.html')) {
            return 'local';
        }
        
        const hasFirebase = !!(window.firebase || window.FirebaseService);
        if (!hasFirebase) {
            return 'local';
        }
        
        return 'firebase';
    }
    
    /**
     * 驗證提供者是否符合介面規範
     * @param {Object} provider - 要驗證的提供者
     * @returns {boolean} 是否符合規範
     */
    static validateProvider(provider) {
        const requiredMethods = [
            'initialize', 'destroy', 'joinRoom', 'leaveRoom',
            'submitVote', 'revealVotes', 'clearVotes',
            'on', 'off', 'getRoomState', 'getPlayers', 'getVotes'
        ];
        
        for (const method of requiredMethods) {
            if (typeof provider[method] !== 'function') {
                console.error(`❌ 提供者缺少必要方法: ${method}`);
                return false;
            }
        }
        
        console.log('✅ 提供者介面驗證通過');
        return true;
    }
}

/**
 * Firebase 房間資料提供者包裝器
 * 將 FirebaseService 包裝成標準介面
 */
class FirebaseRoomProvider {
    constructor(firebaseService) {
        this.service = firebaseService;
        this.type = 'firebase';
        
        console.log('📦 Firebase 房間提供者包裝器已建立');
    }
    
    async initialize(roomId) {
        // FirebaseService 在建立時已初始化，這裡主要是設置房間
        return true;
    }
    
    destroy() {
        if (this.service && typeof this.service.destroy === 'function') {
            this.service.destroy();
        }
    }
    
    async joinRoom(roomId, player) {
        // 安全驗證
        if (!SecurityUtils.validateRoomId(roomId)) {
            throw new Error('無效的房間 ID 格式');
        }
        
        const validation = SecurityUtils.validatePlayer(player);
        if (!validation.valid) {
            throw new Error(validation.error);
        }
        
        try {
            const result = await this.service.joinRoom(roomId, validation.sanitized);
            return { success: !!result, data: result };
        } catch (error) {
            console.error('Firebase: 加入房間失敗:', error);
            return { success: false, error: error.message };
        }
    }
    
    async leaveRoom(roomId, playerId, immediate = false) {
        if (!SecurityUtils.validateRoomId(roomId)) {
            throw new Error('無效的房間 ID 格式');
        }
        
        try {
            let result;
            if (typeof this.service.leaveRoom === 'function') {
                result = await this.service.leaveRoom(roomId, playerId, immediate);
            } else {
                result = false;
            }
            return { success: !!result };
        } catch (error) {
            console.error('Firebase: 離開房間失敗:', error);
            return { success: false, error: error.message };
        }
    }
    
    async submitVote(playerId, vote) {
        // Firebase 需要房間 ID，從目前房間狀態獲取
        const roomId = this.service.currentRoomId || window.scrumPokerApp?.roomId;
        if (!roomId) {
            throw new Error('無法確定當前房間 ID');
        }
        return await this.service.submitVote(roomId, playerId, vote);
    }
    
    async revealVotes(roomId) {
        return await this.service.revealVotes(roomId);
    }
    
    async clearVotes(roomId) {
        return await this.service.clearVotes(roomId);
    }
    
    on(eventName, callback) {
        this.service.on(eventName, callback);
    }
    
    off(eventName, callback) {
        this.service.off(eventName, callback);
    }
    
    async getRoomState(roomId) {
        // Firebase 的房間狀態透過事件更新，這裡回傳快取狀態
        return this.service.currentRoomState || null;
    }
    
    async getPlayers(roomId) {
        // Firebase 的玩家列表透過事件更新，這裡回傳快取狀態
        return this.service.currentPlayers || [];
    }
    
    async getVotes(roomId) {
        // Firebase 的投票狀態透過事件更新，這裡回傳快取狀態
        return this.service.currentVotes || {};
    }
}

/**
 * 本機房間資料提供者包裝器
 * 將 LocalRoomService 包裝成標準介面
 */
class LocalRoomProvider {
    constructor(localService) {
        this.service = localService;
        this.type = 'local';
        
        console.log('📦 本機房間提供者包裝器已建立');
    }
    
    async initialize(roomId) {
        return await this.service.initialize(roomId);
    }
    
    destroy() {
        if (this.service && typeof this.service.destroy === 'function') {
            this.service.destroy();
        }
    }
    
    async joinRoom(roomId, player) {
        // 安全驗證
        if (!SecurityUtils.validateRoomId(roomId)) {
            throw new Error('無效的房間 ID 格式');
        }
        
        const validation = SecurityUtils.validatePlayer(player);
        if (!validation.valid) {
            throw new Error(validation.error);
        }
        
        try {
            const result = await this.service.joinRoom(roomId, validation.sanitized);
            return { success: !!result, data: result };
        } catch (error) {
            console.error('本機: 加入房間失敗:', error);
            return { success: false, error: error.message };
        }
    }
    
    async leaveRoom(roomId, playerId, immediate = false) {
        if (!SecurityUtils.validateRoomId(roomId)) {
            throw new Error('無效的房間 ID 格式');
        }
        
        try {
            let result;
            if (typeof this.service.leaveRoom === 'function') {
                result = await this.service.leaveRoom(roomId, playerId);
            } else {
                result = true; // 本機模式預設成功
            }
            return { success: !!result };
        } catch (error) {
            console.error('本機: 離開房間失敗:', error);
            return { success: false, error: error.message };
        }
    }
    
    async submitVote(playerId, vote) {
        return await this.service.submitVote(playerId, vote);
    }
    
    async revealVotes(roomId) {
        // LocalRoomService 可能沒有這個方法，用事件模擬
        if (typeof this.service.revealVotes === 'function') {
            return await this.service.revealVotes(roomId);
        } else {
            // 透過事件系統觸發開牌
            if (window.eventBus) {
                window.eventBus.emit('game:phase-changed', { 
                    newPhase: 'revealing',
                    roomId 
                });
            }
            return true;
        }
    }
    
    async clearVotes(roomId) {
        // LocalRoomService 可能沒有這個方法，用事件模擬
        if (typeof this.service.clearVotes === 'function') {
            return await this.service.clearVotes(roomId);
        } else {
            // 透過事件系統觸發清除
            if (window.eventBus) {
                window.eventBus.emit('game:phase-changed', { 
                    newPhase: 'voting',
                    roomId 
                });
            }
            return true;
        }
    }
    
    on(eventName, callback) {
        this.service.on(eventName, callback);
    }
    
    off(eventName, callback) {
        this.service.off(eventName, callback);
    }
    
    async getRoomState(roomId) {
        if (typeof this.service.getRoomState === 'function') {
            return await this.service.getRoomState(roomId);
        }
        return this.service.roomState || null;
    }
    
    async getPlayers(roomId) {
        if (typeof this.service.getPlayers === 'function') {
            return await this.service.getPlayers(roomId);
        }
        return this.service.players || [];
    }
    
    async getVotes(roomId) {
        if (typeof this.service.getVotes === 'function') {
            return await this.service.getVotes(roomId);
        }
        return this.service.votes || {};
    }
}

// 匯出到全域
window.RoomProviderFactory = RoomProviderFactory;
window.IRoomProvider = IRoomProvider;
window.FirebaseRoomProvider = FirebaseRoomProvider;
window.LocalRoomProvider = LocalRoomProvider;
window.SecurityUtils = SecurityUtils;

console.log('🏭 房間資料提供者工廠已載入 - v3.0.0-dual-mode-secure');