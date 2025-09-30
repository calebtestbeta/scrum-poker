/**
 * Scrum Poker 主應用程式 - v3.0.0 Vanilla JavaScript 版本
 * 整合所有組件和服務的主控制器
 * @version 3.0.0-enhanced
 */

/**
 * 主應用程式類別
 */
class ScrumPokerApp {
    constructor() {
        this.version = 'v3.0.0-enhanced';
        this.buildTime = new Date().toISOString().slice(0,10).replace(/-/g,'') + '_' + new Date().toTimeString().slice(0,5).replace(':','');
        
        // 應用狀態
        this.isInitialized = false;
        this.currentState = 'loading'; // loading, login, game
        
        // 核心組件
        this.gameTable = null;
        this.currentPlayer = null;
        this.roomId = null;
        
        // 服務實例
        this.firebaseService = null;
        this.storageService = null;
        this.touchManager = null;
        
        // 投票進度節流控制
        this.lastAppProgressKey = null;
        this.lastAppProgressTime = null;
        
        // 玩家清理定時器
        this.playerCleanupTimer = null;
        
        // DOM 元素引用
        this.elements = {
            loadingScreen: null,
            loginScreen: null,
            gameContainer: null,
            toastContainer: null
        };
        
        // 初始化
        this.initialize();
    }
    
    /**
     * 初始化應用程式
     */
    async initialize() {
        console.log(`🚀 Scrum Poker ${this.version} 正在初始化...`);
        
        // 效能監控開始
        const initStartTime = performance.now();
        
        try {
            // 等待 DOM 載入完成
            if (document.readyState !== 'complete') {
                await this.waitForDOMReady();
            }
            
            // 初始化 DOM 元素引用
            this.initializeDOMReferences();
            
            // 初始化服務
            await this.initializeServices();
            
            // 設置事件監聽器
            this.setupEventListeners();
            
            // 設置全域錯誤處理
            this.setupErrorHandling();
            
            // 設置效能監控
            this.setupPerformanceMonitoring();
            
            // 檢查保存的使用者資訊
            await this.checkSavedUserInfo();
            
            // 隱藏載入畫面
            this.hideLoadingScreen();
            
            // 標記為已初始化
            this.isInitialized = true;
            
            // 效能監控結束
            const initEndTime = performance.now();
            const initDuration = Math.round(initEndTime - initStartTime);
            
            console.log(`✅ Scrum Poker ${this.version} 初始化完成 (${initDuration}ms)`);
            
            // 記錄效能指標
            this.recordPerformanceMetrics({
                initTime: initDuration,
                timestamp: Date.now()
            });
            
        } catch (error) {
            console.error('❌ 應用程式初始化失敗:', error);
            this.showError('應用程式初始化失敗，請重新整理頁面');
        }
    }
    
    /**
     * 等待 DOM 載入完成
     */
    waitForDOMReady() {
        return new Promise(resolve => {
            if (document.readyState === 'complete') {
                resolve();
            } else {
                window.addEventListener('load', resolve);
            }
        });
    }
    
    /**
     * 初始化 DOM 元素引用
     */
    initializeDOMReferences() {
        this.elements.loadingScreen = document.getElementById('loadingScreen');
        this.elements.loginScreen = document.getElementById('loginScreen');
        this.elements.gameContainer = document.getElementById('gameContainer');
        this.elements.toastContainer = document.getElementById('toastContainer');
        
        if (!this.elements.loginScreen || !this.elements.gameContainer) {
            throw new Error('缺少必要的 DOM 元素');
        }
    }
    
    /**
     * 初始化服務 - 懶載入優化
     */
    async initializeServices() {
        console.log('🛠️ 正在初始化服務...');
        
        try {
            // 優先初始化關鍵服務
            await this.initializeCriticalServices();
            
            // 延遲初始化次要服務
            this.initializeSecondaryServices();
            
        } catch (error) {
            console.error('❌ 服務初始化失敗:', error);
            throw error;
        }
    }
    
    /**
     * 初始化關鍵服務（阻塞載入）
     */
    async initializeCriticalServices() {
        // 初始化 StorageService - 關鍵服務
        if (window.StorageService) {
            this.storageService = new StorageService();
            console.log('✅ StorageService 已初始化');
        }
        
        // 取得 Firebase 設定 - 決定是否需要 Firebase
        const firebaseConfig = await this.getFirebaseConfig();
        if (firebaseConfig && window.FirebaseService) {
            try {
                this.firebaseService = new FirebaseService();
                
                // 監聽連線狀態變化
                this.firebaseService.on('firebase:connected', () => {
                    this.updateConnectionStatus(true);
                    this.showToast('success', 'Firebase 連線成功');
                });
                
                this.firebaseService.on('firebase:disconnected', () => {
                    this.updateConnectionStatus(false);
                    this.showToast('warning', 'Firebase 連線中斷');
                });
                
                this.firebaseService.on('firebase:error', (data) => {
                    console.error('Firebase 錯誤:', data.error);
                    this.showError('Firebase 連線異常，請檢查網路狀態');
                });
                
                // 設置 Firebase 事件監聽器
                this.setupFirebaseEventListeners();
                
                // 初始化 Firebase
                const initialized = await this.firebaseService.initialize(firebaseConfig);
                if (initialized) {
                    console.log('✅ FirebaseService 已初始化');
                } else {
                    throw new Error('Firebase 初始化失敗');
                }
            } catch (error) {
                console.error('❌ FirebaseService 初始化失敗:', error);
                this.firebaseService = null;
                this.showError('Firebase 初始化失敗，將使用本地模式');
            }
        } else {
            console.log('ℹ️ 使用本地模式（未設定 Firebase）');
        }
    }
    
    /**
     * 初始化次要服務（非阻塞載入）
     */
    initializeSecondaryServices() {
        // 延遲初始化 TouchManager
        setTimeout(() => {
            if (window.TouchManager) {
                this.touchManager = new TouchManager({
                    debug: false,
                    enableHapticFeedback: true,
                    enablePrevention: true
                });
                
                // 設置觸控手勢監聽器
                this.setupTouchGestures();
                console.log('✅ TouchManager 已初始化（延遲載入）');
            }
        }, 100); // 100ms 延遲，避免阻塞主執行緒
    }
    
    /**
     * 建構 Firebase 設定物件
     * @param {Object} config - 原始設定物件
     * @returns {Object} Firebase 設定物件
     */
    buildFirebaseConfig(config) {
        if (!config || !config.projectId || !config.apiKey) {
            return null;
        }
        
        return {
            projectId: config.projectId,
            apiKey: config.apiKey,
            authDomain: `${config.projectId}.firebaseapp.com`,
            databaseURL: `https://${config.projectId}-default-rtdb.firebaseio.com`,
            storageBucket: `${config.projectId}.appspot.com`
        };
    }
    
    /**
     * 取得 Firebase 設定
     */
    async getFirebaseConfig() {
        try {
            console.log('🔍 開始取得 Firebase 設定...');
            
            // 1. 優先從 Cookie 讀取（主要儲存方式）
            const cookieConfig = Utils.Cookie.getCookie('scrumPoker_firebaseConfig');
            if (cookieConfig && cookieConfig.projectId && cookieConfig.apiKey) {
                console.log('✅ 從 Cookie 取得 Firebase 設定');
                return this.buildFirebaseConfig(cookieConfig);
            }
            
            // 2. 從舊版 StorageService 讀取（向後兼容）
            if (this.storageService) {
                const config = await this.storageService.getItem('firebaseConfig');
                if (config && config.projectId && config.apiKey) {
                    console.log('✅ 從 StorageService 取得 Firebase 設定（舊資料）');
                    return this.buildFirebaseConfig(config);
                }
            }
            
            // 3. 從舊版 Utils.Storage 讀取（向後兼容）
            const legacyConfig = Utils.Storage.getItem('scrumPoker_firebaseConfig');
            if (legacyConfig && legacyConfig.projectId && legacyConfig.apiKey) {
                console.log('✅ 從 Utils.Storage 取得 Firebase 設定（舊資料）');
                return this.buildFirebaseConfig(legacyConfig);
            }
            
            console.log('ℹ️ 未找到有效的 Firebase 設定');
            return null;
        } catch (error) {
            console.error('❌ 取得 Firebase 設定失敗:', error);
            return null;
        }
    }
    
    /**
     * 設置觸控手勢監聽器
     */
    setupTouchGestures() {
        if (!this.touchManager) return;
        
        // 卡牌點擊手勢
        this.touchManager.on('tap', (gestureData) => {
            const target = gestureData.target;
            
            // 檢查是否點擊卡牌
            if (target.closest('.card')) {
                const card = target.closest('.card');
                const value = card.dataset.value;
                
                if (value !== undefined && value !== null && window.eventBus) {
                    // 安全的數值轉換，保持特殊字符串不變
                    let processedValue;
                    if (!isNaN(value) && value !== '') {
                        processedValue = parseInt(value);
                    } else {
                        processedValue = value; // 保持特殊值如 "☕", "❓", "∞"
                    }
                    
                    console.log(`🎯 觸控手勢選擇卡牌: 原始值="${value}", 處理後值=${processedValue}`);
                    
                    window.eventBus.emit('deck:card-selected', {
                        value: processedValue,
                        card: card
                    });
                }
            }
            
            // 檢查是否點擊控制按鈕
            if (target.closest('.game-controls button')) {
                const button = target.closest('button');
                button.click();
            }
        });
        
        // 長按手勢 - 顯示卡牌資訊
        this.touchManager.on('longpress', (gestureData) => {
            const target = gestureData.target;
            
            if (target.closest('.card')) {
                const card = target.closest('.card');
                const value = card.dataset.value;
                
                if (value) {
                    this.showToast('info', `卡牌值: ${value}`, 2000);
                }
            }
        });
        
        // 滑動手勢 - 快速導航
        this.touchManager.on('swipe', (gestureData) => {
            if (this.currentState !== 'game') return;
            
            const { direction } = gestureData;
            
            switch (direction) {
                case 'left':
                    // 向左滑動 - 下一輪
                    if (this.gameTable) {
                        this.gameTable.clearVotes();
                    }
                    break;
                    
                case 'right':
                    // 向右滑動 - 開牌
                    if (this.gameTable) {
                        this.gameTable.revealVotes();
                    }
                    break;
                    
                case 'up':
                    // 向上滑動 - 顯示統計
                    this.showToast('info', '統計面板已展開', 2000);
                    break;
                    
                case 'down':
                    // 向下滑動 - 隱藏統計
                    this.showToast('info', '統計面板已收起', 2000);
                    break;
            }
        });
        
        console.log('👆 觸控手勢監聽器已設置');
    }
    
    /**
     * 設置事件監聽器
     */
    setupEventListeners() {
        // 登入表單
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }
        
        // 角色選擇變更（顯示/隱藏任務類型）
        const playerRole = document.getElementById('playerRole');
        if (playerRole) {
            playerRole.addEventListener('change', () => {
                this.handleRoleChange();
            });
        }
        
        // Firebase 設定按鈕
        const saveConfigBtn = document.getElementById('saveConfigBtn');
        if (saveConfigBtn) {
            saveConfigBtn.addEventListener('click', () => {
                this.saveFirebaseConfig();
            });
        }
        
        const localModeBtn = document.getElementById('localModeBtn');
        if (localModeBtn) {
            localModeBtn.addEventListener('click', () => {
                this.enableLocalMode();
            });
        }
        
        // 快速開始按鈕
        const quickStartBtn = document.getElementById('quickStartBtn');
        if (quickStartBtn) {
            quickStartBtn.addEventListener('click', () => {
                this.handleQuickStart();
            });
        }
        
        // 複製房間 ID 按鈕
        const copyRoomBtn = document.getElementById('copyRoomBtn');
        if (copyRoomBtn) {
            copyRoomBtn.addEventListener('click', () => {
                this.copyRoomId();
            });
        }
        
        // 全域事件監聽器
        if (window.eventBus) {
            this.setupGameEventListeners();
        }
        
        // 鍵盤快捷鍵
        this.setupKeyboardShortcuts();
        
        // 瀏覽器關閉時自動清理
        this.setupBrowserCloseCleanup();
    }
    
    /**
     * 設置 Firebase 事件監聽器
     */
    setupFirebaseEventListeners() {
        if (!this.firebaseService) return;
        
        // 玩家加入/離開事件
        this.firebaseService.on('room:player-joined', (data) => {
            this.showToast('info', `${data.player.name} 加入了遊戲`);
        });
        
        this.firebaseService.on('room:players-updated', (data) => {
            try {
                if (this.gameTable && typeof this.gameTable.updatePlayers === 'function') {
                    console.log('📢 收到玩家更新事件:', data);
                    this.gameTable.updatePlayers(data.players);
                } else {
                    console.warn('⚠️ GameTable 尚未初始化或 updatePlayers 方法不存在，跳過玩家更新');
                    console.log('   GameTable 狀態:', {
                        exists: !!this.gameTable,
                        hasMethod: this.gameTable ? typeof this.gameTable.updatePlayers === 'function' : false,
                        currentState: this.currentState
                    });
                }
            } catch (error) {
                console.error('❌ 處理玩家更新事件失敗:', error);
                this.showToast('error', '玩家數據更新失敗');
            }
        });
        
        this.firebaseService.on('room:votes-updated', (data) => {
            try {
                if (this.gameTable && typeof this.gameTable.updateVotes === 'function') {
                    console.log('📢 收到投票更新事件:', data);
                    this.gameTable.updateVotes(data.votes);
                } else {
                    console.warn('⚠️ GameTable 尚未初始化或 updateVotes 方法不存在，跳過投票更新');
                    console.log('   GameTable 狀態:', {
                        exists: !!this.gameTable,
                        hasMethod: this.gameTable ? typeof this.gameTable.updateVotes === 'function' : false,
                        currentState: this.currentState
                    });
                }
            } catch (error) {
                console.error('❌ 處理投票更新事件失敗:', error);
                this.showToast('error', '投票數據更新失敗');
            }
        });
        
        this.firebaseService.on('room:phase-changed', (data) => {
            try {
                if (this.gameTable && typeof this.gameTable.updatePhase === 'function') {
                    console.log('📢 收到階段更新事件:', data);
                    this.gameTable.updatePhase(data.phase);
                } else {
                    console.warn('⚠️ GameTable 尚未初始化或 updatePhase 方法不存在，跳過階段更新');
                    console.log('   GameTable 狀態:', {
                        exists: !!this.gameTable,
                        hasMethod: this.gameTable ? typeof this.gameTable.updatePhase === 'function' : false,
                        currentState: this.currentState
                    });
                }
            } catch (error) {
                console.error('❌ 處理階段更新事件失敗:', error);
                this.showToast('error', '遊戲階段更新失敗');
            }
        });
        
        this.firebaseService.on('players:voting-progress', (progress) => {
            this.updateVotingProgress(progress);
        });
        
        console.log('📡 Firebase 事件監聽器已設置');
    }
    
    /**
     * 設置遊戲事件監聽器
     */
    setupGameEventListeners() {
        // 遊戲狀態變更
        window.eventBus.on('game:vote-submitted', (data) => {
            try {
                console.log('📢 收到 game:vote-submitted 事件:', data);
                this.handleVoteSubmitted(data);
            } catch (error) {
                console.error('❌ 處理 game:vote-submitted 事件失敗:', error);
                this.showToast('error', '投票處理失敗');
            }
        });
        
        window.eventBus.on('game:votes-revealed', (data) => {
            this.handleVotesRevealed(data);
        });
        
        window.eventBus.on('game:votes-cleared', () => {
            this.handleVotesCleared();
        });
        
        window.eventBus.on('game:phase-finished', (data) => {
            this.handlePhaseFinished(data);
        });
        
        window.eventBus.on('game:leave-room', () => {
            this.handleLeaveRoom();
        });
        
        // 玩家事件
        window.eventBus.on('players:player-added', (data) => {
            this.showToast('success', `${data.player.name} 加入房間`);
        });
        
        window.eventBus.on('players:player-removed', (data) => {
            this.showToast('info', '玩家離開房間');
        });
        
        // 投票進度
        window.eventBus.on('players:voting-progress', (progress) => {
            this.updateVotingProgress(progress);
        });
    }
    
    /**
     * 設置鍵盤快捷鍵
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // 只在遊戲狀態下啟用快捷鍵
            if (this.currentState !== 'game') return;
            
            // Ctrl/Cmd + R: 重新開始
            if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
                event.preventDefault();
                if (this.gameTable) {
                    this.gameTable.clearVotes();
                }
            }
            
            // 空白鍵: 開牌
            if (event.code === 'Space' && !event.target.matches('input, textarea')) {
                event.preventDefault();
                if (this.gameTable) {
                    this.gameTable.revealVotes();
                }
            }
            
            // 數字鍵: 快速投票
            if (event.key >= '0' && event.key <= '9' && !event.target.matches('input, textarea')) {
                const value = parseInt(event.key);
                const fibValues = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89];
                if (fibValues.includes(value)) {
                    this.quickVote(value);
                }
            }
            
            // Enter 鍵: 選擇聚焦的卡牌
            if (event.key === 'Enter' && event.target.classList.contains('card')) {
                event.preventDefault();
                const value = event.target.dataset.value;
                if (value !== undefined && value !== null && window.eventBus) {
                    // 安全的數值轉換，保持特殊字符串不變
                    let processedValue;
                    if (!isNaN(value) && value !== '') {
                        processedValue = parseInt(value);
                    } else {
                        processedValue = value; // 保持特殊值如 "☕", "❓", "∞"
                    }
                    
                    console.log(`⌨️ 鍵盤快捷鍵選擇卡牌: 原始值="${value}", 處理後值=${processedValue}`);
                    
                    window.eventBus.emit('deck:card-selected', {
                        value: processedValue,
                        card: event.target
                    });
                }
            }
        });
    }
    
    /**
     * 設置全域錯誤處理
     */
    setupErrorHandling() {
        window.addEventListener('error', (event) => {
            console.error('🚨 全域錯誤:', event.error);
            this.showError('發生未預期的錯誤');
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            console.error('🚨 未處理的 Promise 錯誤:', event.reason);
            this.showError('發生系統錯誤');
        });
    }
    
    /**
     * 檢查保存的使用者資訊
     */
    async checkSavedUserInfo() {
        console.log('🔍 檢查保存的用戶資訊...');
        
        // 從 Cookie 讀取用戶資訊
        const savedInfo = Utils.Cookie.getCookie('scrumPoker_userInfo');
        if (savedInfo) {
            console.log('✅ 從 Cookie 找到保存的用戶資訊:', {
                name: savedInfo.name,
                role: savedInfo.role,
                roomId: savedInfo.roomId ? savedInfo.roomId.substring(0, 6) + '...' : '無'
            });
            
            const playerName = document.getElementById('playerName');
            const playerRole = document.getElementById('playerRole');
            const roomIdInput = document.getElementById('roomId');
            const rememberMe = document.getElementById('rememberMe');
            
            if (playerName) playerName.value = savedInfo.name || '';
            if (playerRole) playerRole.value = savedInfo.role || 'dev';
            if (roomIdInput && savedInfo.roomId) roomIdInput.value = savedInfo.roomId;
            if (rememberMe) rememberMe.checked = true;
            
            this.handleRoleChange(); // 觸發角色變更邏輯
        } else {
            console.log('ℹ️ Cookie 中未找到保存的用戶資訊');
        }
        
        // 檢查保存的 Firebase 設定（檢查兩種儲存方式）
        const hasFirebaseConfig = await this.hasFirebaseConfig();
        if (hasFirebaseConfig) {
            this.hideFirebaseConfig();
        } else {
            this.showFirebaseConfig();
        }
    }
    
    /**
     * 檢查是否已有 Firebase 設定或本地模式
     * @returns {Promise<boolean>} 是否有設定
     */
    async hasFirebaseConfig() {
        try {
            console.log('🔍 檢查 Firebase 設定或本地模式是否存在...');
            
            // 首先檢查是否啟用了本地模式
            const localMode = Utils.Cookie.getCookie('scrumPoker_localMode');
            if (localMode === true) {
                console.log('✅ 發現本地模式設定');
                return true;
            }
            
            // 檢查 Cookie 中的 Firebase 設定
            const cookieConfig = Utils.Cookie.getCookie('scrumPoker_firebaseConfig');
            if (cookieConfig && cookieConfig.projectId && cookieConfig.apiKey) {
                console.log('✅ Cookie 中存在有效的 Firebase 設定');
                return true;
            }
            
            // 檢查舊版 StorageService（向後兼容）
            if (this.storageService) {
                const config = await this.storageService.getItem('firebaseConfig');
                if (config && config.projectId && config.apiKey) {
                    console.log('✅ StorageService 中存在有效設定（舊資料）');
                    return true;
                }
            }
            
            // 檢查舊版 Utils.Storage（向後兼容）
            const legacyConfig = Utils.Storage.getItem('scrumPoker_firebaseConfig');
            if (legacyConfig && legacyConfig.projectId && legacyConfig.apiKey) {
                console.log('✅ Utils.Storage 中存在有效設定（舊資料）');
                return true;
            }
            
            console.log('ℹ️ 未找到任何有效的 Firebase 設定或本地模式');
            return false;
        } catch (error) {
            console.error('❌ 檢查 Firebase 設定失敗:', error);
            return false;
        }
    }
    
    /**
     * 隱藏載入畫面
     */
    hideLoadingScreen() {
        if (this.elements.loadingScreen) {
            Utils.Animation.fadeOut(this.elements.loadingScreen, 500).then(() => {
                this.elements.loadingScreen.style.display = 'none';
                this.currentState = 'login';
            });
        } else {
            this.currentState = 'login';
        }
    }
    
    /**
     * 處理角色變更
     */
    handleRoleChange() {
        const playerRole = document.getElementById('playerRole');
        const taskTypeGroup = document.getElementById('taskTypeGroup');
        
        if (playerRole && taskTypeGroup) {
            const role = playerRole.value;
            if (role === 'scrum_master' || role === 'po') {
                taskTypeGroup.classList.remove('hidden');
            } else {
                taskTypeGroup.classList.add('hidden');
            }
        }
    }
    
    /**
     * 處理登入
     */
    async handleLogin() {
        const playerName = document.getElementById('playerName')?.value?.trim();
        const playerRole = document.getElementById('playerRole')?.value;
        const roomId = document.getElementById('roomId')?.value?.trim();
        const taskType = document.getElementById('taskType')?.value;
        const rememberMe = document.getElementById('rememberMe')?.checked;
        
        // 驗證輸入
        if (!playerName) {
            this.showError('請輸入您的名字');
            return;
        }
        
        // 進階輸入驗證和清理（增強版）
        try {
            console.log('🔍 開始驗證玩家名稱:', playerName);
            
            // 檢查名字長度和格式
            if (playerName.length < 1 || playerName.length > 20) {
                throw new Error('名字長度必須在 1-20 個字符之間');
            }
            console.log('✅ 長度檢查通過:', playerName.length);
            
            // 移除潛在的惡意字符
            const sanitizedName = playerName
                .replace(/[<>\"'&]/g, '') // 移除 HTML 字符
                .replace(/javascript:/gi, '') // 移除 JavaScript 協議
                .replace(/data:/gi, '') // 移除 data 協議
                .trim();
            
            console.log('🧹 清理後的名稱:', sanitizedName);
            
            // 檢查清理後是否為空
            if (!sanitizedName) {
                throw new Error('名字包含不允許的字符（清理後為空）');
            }
            console.log('✅ 清理後非空檢查通過');
            
            // 檢查是否只包含允許的字符（字母、數字、中文、空格、連字符、底線）
            const regex = /^[a-zA-Z0-9\u4e00-\u9fff\s_-]+$/;
            const regexTest = regex.test(sanitizedName);
            console.log('🔍 正規表達式測試:', regexTest, '使用:', regex.toString());
            
            if (!regexTest) {
                // 提供更詳細的錯誤資訊
                const invalidChars = [...sanitizedName].filter(char => {
                    return !regex.test(char);
                });
                console.error('❌ 無效字符:', invalidChars);
                throw new Error(`名字包含不允許的字符: ${invalidChars.join(', ')}`);
            }
            console.log('✅ 字符格式檢查通過');
            
            // 更新為清理後的名字
            document.getElementById('playerName').value = sanitizedName;
            console.log('✅ 玩家名稱驗證完成:', sanitizedName);
            
        } catch (error) {
            this.showError(error.message);
            return;
        }
        
        // 驗證房間 ID（如果提供）
        if (roomId) {
            try {
                // 房間 ID 長度檢查
                if (roomId.length > 20) {
                    throw new Error('房間 ID 長度不能超過 20 個字符');
                }
                
                // 清理房間 ID
                const sanitizedRoomId = roomId
                    .replace(/[<>\"'&]/g, '') // 移除 HTML 字符
                    .replace(/javascript:/gi, '') // 移除 JavaScript 協議
                    .replace(/data:/gi, '') // 移除 data 協議
                    .trim();
                
                // 檢查房間 ID 格式（只允許字母、數字、連字符、底線）
                if (!/^[a-zA-Z0-9_-]+$/.test(sanitizedRoomId)) {
                    throw new Error('房間 ID 只能包含字母、數字、連字符和底線');
                }
                
                // 更新為清理後的房間 ID
                document.getElementById('roomId').value = sanitizedRoomId;
                
            } catch (error) {
                this.showError(error.message);
                return;
            }
        }
        
        // 驗證角色
        const allowedRoles = ['dev', 'qa', 'scrum_master', 'po', 'other'];
        if (!allowedRoles.includes(playerRole)) {
            this.showError('無效的玩家角色');
            return;
        }
        
        try {
            // 儲存使用者資訊到 Cookie
            if (rememberMe) {
                const userInfo = {
                    name: playerName,
                    role: playerRole,
                    roomId: roomId,
                    timestamp: Date.now()
                };
                
                const cookieSuccess = Utils.Cookie.setCookie('scrumPoker_userInfo', userInfo, {
                    days: 30,
                    secure: window.location.protocol === 'https:',
                    sameSite: 'Lax'
                });
                
                if (cookieSuccess) {
                    console.log('✅ 用戶資訊已儲存到 Cookie');
                } else {
                    console.warn('⚠️ 用戶資訊 Cookie 儲存失敗');
                }
            }
            
            // 生成或驗證房間 ID
            const finalRoomId = roomId || Utils.Game.generateRoomId();
            
            // 創建玩家物件
            this.currentPlayer = {
                id: Utils.Data.generateId('player'),
                name: playerName,
                role: playerRole,
                taskType: taskType
            };
            
            // 開始遊戲
            await this.startGame(finalRoomId);
            
        } catch (error) {
            console.error('登入失敗:', error);
            
            // 根據錯誤類型提供更友善的錯誤訊息
            let errorMessage = '登入失敗，請重試';
            
            if (error.message && error.message.includes('房間已達到最大容量')) {
                errorMessage = error.message;
            } else if (error.message && error.message.includes('房間已被鎖定')) {
                errorMessage = '該房間已被鎖定，無法加入。請聯繫房間創建者或嘗試其他房間。';
            } else if (error.message && error.message.includes('Firebase')) {
                errorMessage = '網路連線異常，請檢查網路狀態後重試。';
            } else if (error.message && error.message.includes('格式錯誤')) {
                errorMessage = error.message;
            }
            
            this.showError(errorMessage);
        }
    }
    
    /**
     * 開始遊戲
     * @param {string} roomId - 房間 ID
     */
    async startGame(roomId) {
        try {
            // 隱藏登入畫面
            if (Utils.Animation) {
                await Utils.Animation.fadeOut(this.elements.loginScreen, 300);
            }
            this.elements.loginScreen.classList.add('hidden');
            
            // 顯示遊戲容器
            this.elements.gameContainer.classList.remove('hidden');
            if (Utils.Animation) {
                await Utils.Animation.fadeIn(this.elements.gameContainer, 300);
            }
            
            // 設置房間 ID
            this.roomId = roomId;
            this.updateRoomIdDisplay(roomId);
            
            // 先初始化遊戲桌面，再加入 Firebase 房間
            const gameArea = document.getElementById('gameArea');
            if (gameArea && window.GameTable) {
                this.gameTable = new GameTable(gameArea);
                this.gameTable.setRoomId(roomId);
                this.gameTable.setCurrentPlayer(this.currentPlayer.id);
                
                // 添加當前玩家到遊戲桌面
                this.gameTable.addPlayer(
                    this.currentPlayer.id,
                    this.currentPlayer.name,
                    this.currentPlayer.role
                );
                
                // 開始遊戲
                this.gameTable.startGame();
                
                console.log('✅ GameTable 初始化完成，現在可以安全處理 Firebase 事件');
            }
            
            // 在 GameTable 初始化完成後，才加入 Firebase 房間
            if (this.firebaseService) {
                console.log('🔄 GameTable 已就緒，正在加入 Firebase 房間...');
                await this.firebaseService.joinRoom(roomId, this.currentPlayer);
            }
            
            // 更新狀態
            this.currentState = 'game';
            
            // 顯示成功訊息
            this.showToast('success', `歡迎來到房間 ${roomId}！`);
            
            // 設置連線狀態
            this.updateConnectionStatus(this.firebaseService ? true : false);
            
            // 啟動定期清理超時玩家（每 2 分鐘執行一次）
            if (this.firebaseService) {
                this.startPlayerCleanupTimer(roomId);
            }
            
            console.log(`🎮 遊戲開始 - 房間: ${roomId}, 玩家: ${this.currentPlayer.name}`);
            
        } catch (error) {
            console.error('遊戲啟動失敗:', error);
            this.showError('遊戲啟動失敗');
        }
    }
    
    /**
     * 快速投票
     * @param {number} value - 投票值
     */
    quickVote(value) {
        if (this.currentState === 'game' && this.gameTable) {
            // 模擬卡牌點擊
            if (window.eventBus) {
                window.eventBus.emit('deck:card-selected', {
                    value: value,
                    card: null
                });
            }
        }
    }
    
    /**
     * 處理投票提交 - 增強錯誤處理
     * @param {Object} data - 投票數據
     */
    handleVoteSubmitted(data) {
        try {
            console.log('🎯 處理投票提交事件:', data);
            
            // 驗證數據完整性
            if (!data || typeof data !== 'object') {
                console.error('❌ 無效的投票數據:', data);
                this.showToast('error', '投票數據無效');
                return;
            }
            
            if (data.vote === undefined || data.vote === null) {
                console.error('❌ 投票值無效:', data.vote);
                this.showToast('error', '投票值無效');
                return;
            }
            
            // 根據是否為重新投票顯示不同訊息
            const message = data.isRevote ? '投票已更新' : '投票已提交';
            let formattedVote;
            
            try {
                formattedVote = Utils.Game && Utils.Game.formatPoints ? 
                    Utils.Game.formatPoints(data.vote) : data.vote;
            } catch (error) {
                console.warn('⚠️ 格式化投票值失敗:', error);
                formattedVote = data.vote;
            }
            
            this.showToast('success', `${message}: ${formattedVote}`);
            console.log(`✅ 投票提示已顯示: ${message}: ${formattedVote}`);
            
            // 如果有 Firebase 服務，同步投票（帶錯誤處理）
            if (this.firebaseService && this.roomId && this.currentPlayer) {
                console.log('🔄 開始 Firebase 投票同步...');
                
                this.firebaseService.submitVote(this.roomId, this.currentPlayer.id, data.vote)
                    .then(() => {
                        console.log('✅ Firebase 投票同步成功');
                    })
                    .catch(error => {
                        console.error('❌ Firebase 投票同步失敗:', error);
                        this.showToast('error', error.message || '投票同步失敗，請重試');
                        
                        // 如果 Firebase 投票失敗，允許用戶重新選擇
                        if (this.gameTable && this.gameTable.cardDeck) {
                            try {
                                this.gameTable.cardDeck.setClickable(true);
                                console.log('🎴 已重新啟用卡牌選擇');
                            } catch (deckError) {
                                console.error('❌ 重新啟用卡牌失敗:', deckError);
                            }
                        }
                    });
            } else {
                console.warn('⚠️ Firebase 服務或必要參數缺失，跳過同步', {
                    firebaseService: !!this.firebaseService,
                    roomId: !!this.roomId,
                    currentPlayer: !!this.currentPlayer
                });
            }
            
        } catch (error) {
            console.error('❌ handleVoteSubmitted 執行失敗:', error);
            console.error('錯誤詳情:', {
                data,
                stack: error.stack
            });
            this.showToast('error', '投票處理發生錯誤');
        }
    }
    
    /**
     * 處理投票揭曉
     * @param {Object} data - 投票結果數據
     */
    handleVotesRevealed(data) {
        const stats = data.statistics;
        this.showToast('info', 
            `投票結果 - 平均: ${stats.averagePoints}, 共識度: ${stats.consensus}%`);
        
        // 更新統計面板
        this.updateStatisticsPanel(stats);
        
        // 如果有 Firebase 服務，同步結果
        if (this.firebaseService && this.roomId) {
            this.firebaseService.revealVotes(this.roomId);
        }
    }
    
    /**
     * 處理投票清除
     */
    handleVotesCleared() {
        this.showToast('info', '投票已清除，開始新一輪');
        
        // 如果有 Firebase 服務，同步清除
        if (this.firebaseService && this.roomId) {
            this.firebaseService.clearVotes(this.roomId);
        }
    }
    
    /**
     * 處理階段完成
     * @param {Object} data - 階段數據
     */
    handlePhaseFinished(data) {
        console.log('🏁 遊戲階段完成:', data);
        
        // 同步階段到 Firebase（如果需要）
        if (this.firebaseService && this.roomId && data.phase === 'finished') {
            // 注意：這裡不直接更新 Firebase 階段，避免循環觸發
            // Firebase 的階段更新應該由 revealVotes() 或其他明確的用戶操作觸發
            console.log('🔄 階段完成事件已處理，開牌狀態應保持持久');
        }
    }
    
    /**
     * 處理離開房間
     */
    handleLeaveRoom() {
        this.leaveGame();
    }
    
    /**
     * 啟動玩家清理定時器
     * @param {string} roomId - 房間 ID
     */
    startPlayerCleanupTimer(roomId) {
        // 清除現有定時器
        if (this.playerCleanupTimer) {
            clearInterval(this.playerCleanupTimer);
        }
        
        // 每 2 分鐘清理一次超時玩家
        this.playerCleanupTimer = setInterval(async () => {
            try {
                if (this.firebaseService && this.currentState === 'game') {
                    const cleanedCount = await this.firebaseService.cleanupInactivePlayers(roomId, 3); // 3分鐘超時
                    if (cleanedCount > 0) {
                        this.showToast('info', `已清理 ${cleanedCount} 個離線玩家`, 2000);
                    }
                }
            } catch (error) {
                console.warn('⚠️ 定期清理玩家失敗:', error);
            }
        }, 2 * 60 * 1000); // 2 分鐘間隔
        
        console.log('🕐 玩家清理定時器已啟動 (每 2 分鐘)');
    }
    
    /**
     * 停止玩家清理定時器
     */
    stopPlayerCleanupTimer() {
        if (this.playerCleanupTimer) {
            clearInterval(this.playerCleanupTimer);
            this.playerCleanupTimer = null;
            console.log('⏹️ 玩家清理定時器已停止');
        }
    }
    
    /**
     * 離開遊戲
     */
    async leaveGame() {
        try {
            // 停止玩家清理定時器
            this.stopPlayerCleanupTimer();
            
            // 如果有 Firebase 服務，離開房間
            if (this.firebaseService && this.roomId && this.currentPlayer) {
                await this.firebaseService.leaveRoom(this.roomId, this.currentPlayer.id);
            }
            
            // 銷毀遊戲桌面
            if (this.gameTable) {
                this.gameTable.destroy();
                this.gameTable = null;
            }
            
            // 隱藏遊戲容器
            if (Utils.Animation) {
                await Utils.Animation.fadeOut(this.elements.gameContainer, 300);
            }
            this.elements.gameContainer.classList.add('hidden');
            
            // 顯示登入畫面
            this.elements.loginScreen.classList.remove('hidden');
            if (Utils.Animation) {
                await Utils.Animation.fadeIn(this.elements.loginScreen, 300);
            }
            
            // 重置狀態
            this.currentState = 'login';
            this.currentPlayer = null;
            this.roomId = null;
            
            // 更新連線狀態
            this.updateConnectionStatus(false);
            
            console.log('🚪 已離開遊戲');
            
        } catch (error) {
            console.error('離開遊戲失敗:', error);
        }
    }
    
    /**
     * 更新房間 ID 顯示
     * @param {string} roomId - 房間 ID
     */
    updateRoomIdDisplay(roomId) {
        const roomIdElement = document.getElementById('currentRoomId');
        if (roomIdElement) {
            roomIdElement.textContent = roomId;
        }
    }
    
    /**
     * 複製房間 ID
     */
    async copyRoomId() {
        if (!this.roomId) return;
        
        try {
            await navigator.clipboard.writeText(this.roomId);
            this.showToast('success', '房間 ID 已複製到剪貼簿');
        } catch (error) {
            console.error('複製失敗:', error);
            
            // 降級方案
            const textArea = document.createElement('textarea');
            textArea.value = this.roomId;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            
            this.showToast('success', '房間 ID 已複製到剪貼簿');
        }
    }
    
    /**
     * 更新連線狀態
     * @param {boolean} connected - 是否連線
     */
    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('connectionStatus');
        if (statusElement) {
            const indicator = statusElement.querySelector('.status-indicator');
            const text = statusElement.querySelector('.status-text');
            
            if (connected) {
                statusElement.className = 'connection-status connected';
                if (text) text.textContent = '已連線';
                if (indicator) indicator.setAttribute('title', '連線正常');
            } else {
                statusElement.className = 'connection-status disconnected';
                if (text) text.textContent = '未連線';
                if (indicator) indicator.setAttribute('title', '未連線');
            }
        }
    }
    
    /**
     * 更新投票進度（使用節流避免重複 log）
     * @param {Object} progress - 進度數據
     */
    updateVotingProgress(progress) {
        // 使用節流避免重複 log 輸出
        const progressKey = `${progress.voted}_${progress.total}_${progress.percentage}`;
        const now = Date.now();
        
        // 檢查是否與上次進度相同或時間間隔太短
        if (this.lastAppProgressKey !== progressKey || 
            !this.lastAppProgressTime || 
            (now - this.lastAppProgressTime) > 1000) { // 至少間隔 1 秒
            
            this.lastAppProgressKey = progressKey;
            this.lastAppProgressTime = now;
            
            // 只在進度真正變化或間隔足夠時記錄 log
            if (progress.total > 0) {
                console.log(`🎯 全域投票進度: ${progress.voted}/${progress.total} 玩家已投票 (${progress.percentage}%)`);
            }
        }
        
        // 這裡可以添加全域進度顯示邏輯，如更新 UI 元素
        this.updateGlobalProgressDisplay(progress);
    }
    
    /**
     * 更新全域進度顯示
     * @param {Object} progress - 進度數據
     */
    updateGlobalProgressDisplay(progress) {
        // 更新頁面標題或其他全域 UI 元素
        if (progress.total > 0 && progress.percentage < 100) {
            document.title = `Scrum Poker - 投票中 (${progress.percentage}%)`;
        } else if (progress.percentage >= 100) {
            document.title = `Scrum Poker - 投票完成`;
        } else {
            document.title = `Scrum Poker - 等待玩家`;
        }
    }
    
    /**
     * 更新統計面板
     * @param {Object} statistics - 統計數據
     */
    updateStatisticsPanel(statistics) {
        const statsContent = document.getElementById('statsContent');
        if (!statsContent) return;
        
        const html = `
            <div class="stats-item">
                <div class="stats-label">總投票數</div>
                <div class="stats-value">${statistics.totalVotes}</div>
            </div>
            <div class="stats-item">
                <div class="stats-label">平均點數</div>
                <div class="stats-value">${statistics.averagePoints}</div>
            </div>
            <div class="stats-item">
                <div class="stats-label">共識度</div>
                <div class="stats-value">${statistics.consensus}%</div>
            </div>
            <div class="stats-item">
                <div class="stats-label">最小值</div>
                <div class="stats-value">${statistics.min}</div>
            </div>
            <div class="stats-item">
                <div class="stats-label">最大值</div>
                <div class="stats-value">${statistics.max}</div>
            </div>
        `;
        
        statsContent.innerHTML = html;
    }
    
    /**
     * 保存 Firebase 設定
     */
    async saveFirebaseConfig() {
        const projectId = document.getElementById('projectId')?.value?.trim();
        const apiKey = document.getElementById('apiKey')?.value?.trim();
        
        if (!projectId || !apiKey) {
            this.showError('請填入完整的 Firebase 設定');
            return;
        }
        
        console.log('💾 開始保存 Firebase 設定...', { 
            projectId: projectId.substring(0, 10) + '...', 
            apiKeyPreview: apiKey.substring(0, 10) + '...' 
        });
        
        // 驗證 Firebase 設定格式
        try {
            // 驗證 Project ID 格式
            if (!/^[a-z0-9-]+$/.test(projectId)) {
                throw new Error('Project ID 格式無效（只能包含小寫字母、數字和連字符）');
            }
            
            if (projectId.length < 3 || projectId.length > 30) {
                throw new Error('Project ID 長度必須在 3-30 字符之間');
            }
            
            // 驗證 API Key 格式（基本檢查）
            if (!/^AIza[a-zA-Z0-9_-]{35}$/.test(apiKey)) {
                throw new Error('API Key 格式無效');
            }
            
            // 檢查是否包含可疑內容
            const suspiciousPatterns = [
                /javascript:/i,
                /data:/i,
                /vbscript:/i,
                /<script/i,
                /eval\(/i,
                /function\(/i
            ];
            
            for (const pattern of suspiciousPatterns) {
                if (pattern.test(projectId) || pattern.test(apiKey)) {
                    throw new Error('設定包含不允許的內容');
                }
            }
            
        } catch (error) {
            this.showError(error.message);
            return;
        }
        
        const config = {
            projectId: projectId,
            apiKey: apiKey,
            timestamp: Date.now()
        };
        
        try {
            // 儲存到 Cookie（主要儲存方式）
            const cookieSuccess = Utils.Cookie.setCookie('scrumPoker_firebaseConfig', config, {
                days: 30,
                secure: window.location.protocol === 'https:',
                sameSite: 'Lax'
            });
            console.log('🍪 Cookie 儲存結果:', cookieSuccess);
            
            // 檢查儲存結果
            if (!cookieSuccess) {
                throw new Error('Cookie 儲存失敗');
            }
            
            console.log('✅ Firebase 設定已成功儲存到 Cookie');
            
            this.hideFirebaseConfig();
            this.showToast('success', 'Firebase 設定已保存');
            
            // 重新初始化 Firebase 服務
            if (window.FirebaseService) {
                const firebaseConfig = await this.getFirebaseConfig();
                if (firebaseConfig) {
                    try {
                        // 清理舊的服務實例
                        if (this.firebaseService) {
                            this.firebaseService.destroy();
                        }
                        
                        // 創建新的服務實例
                        this.firebaseService = new FirebaseService();
                        
                        // 重新設置事件監聽器
                        this.setupFirebaseEventListeners();
                        
                        // 初始化服務
                        const initialized = await this.firebaseService.initialize(firebaseConfig);
                        if (initialized) {
                            console.log('🔄 FirebaseService 已重新初始化');
                            this.showToast('success', 'Firebase 重新連線成功');
                        }
                    } catch (error) {
                        console.error('❌ Firebase 重新初始化失敗:', error);
                        this.showError('Firebase 重新連線失敗');
                    }
                }
            }
        } catch (error) {
            console.error('保存 Firebase 設定失敗:', error);
            this.showError('保存設定失敗');
        }
    }
    
    /**
     * 啟用本地模式
     */
    async enableLocalMode() {
        try {
            // 儲存本地模式標記到 Cookie
            Utils.Cookie.setCookie('scrumPoker_localMode', true, {
                days: 30,
                secure: window.location.protocol === 'https:',
                sameSite: 'Lax'
            });
            
            this.hideFirebaseConfig();
            this.showToast('info', '已啟用本地模式（僅限單人遊戲）');
            console.log('✅ 本地模式已啟用並儲存到 Cookie');
        } catch (error) {
            console.error('啟用本地模式失敗:', error);
        }
    }
    
    /**
     * 處理快速開始
     */
    async handleQuickStart() {
        try {
            // 自動填入預設值
            const playerName = document.getElementById('playerName');
            const playerRole = document.getElementById('playerRole');
            const roomId = document.getElementById('roomId');
            
            if (!playerName.value.trim()) {
                playerName.value = `玩家_${Math.random().toString(36).substring(2, 8)}`;
            }
            
            if (!playerRole.value) {
                playerRole.value = 'dev';
            }
            
            if (!roomId.value.trim()) {
                roomId.value = `快速房間_${Math.random().toString(36).substring(2, 8)}`;
            }
            
            // 啟用本地模式
            await this.enableLocalMode();
            
            // 直接開始遊戲
            this.showToast('info', '正在啟動快速遊戲模式...');
            
            // 稍微延遲以讓用戶看到提示
            setTimeout(() => {
                this.handleLogin();
            }, 500);
            
        } catch (error) {
            console.error('快速開始失敗:', error);
            this.showError('快速開始失敗，請重試');
        }
    }
    
    /**
     * 顯示 Firebase 設定
     */
    showFirebaseConfig() {
        const configElement = document.getElementById('firebaseConfig');
        if (configElement) {
            configElement.style.display = 'block';
        }
    }
    
    /**
     * 隱藏 Firebase 設定
     */
    hideFirebaseConfig() {
        const configElement = document.getElementById('firebaseConfig');
        if (configElement) {
            configElement.style.display = 'none';
        }
    }
    
    /**
     * 顯示 Toast 通知
     * @param {string} type - 通知類型 (success, error, warning, info)
     * @param {string} message - 通知訊息
     * @param {number} duration - 顯示時間（毫秒）
     */
    showToast(type, message, duration = 3000) {
        if (!this.elements.toastContainer) return;
        
        const toast = Utils.DOM?.createElement ? Utils.DOM.createElement('div', {
            className: `toast toast-${type}`,
            innerHTML: `
                <div class="toast-content">
                    <span class="toast-message">${message}</span>
                    <button class="toast-close" aria-label="關閉通知">×</button>
                </div>
            `
        }) : document.createElement('div');
        
        if (!Utils.DOM?.createElement) {
            toast.className = `toast toast-${type}`;
            toast.innerHTML = `
                <div class="toast-content">
                    <span class="toast-message">${message}</span>
                    <button class="toast-close" aria-label="關閉通知">×</button>
                </div>
            `;
        }
        
        // 關閉按鈕事件
        const closeBtn = toast.querySelector('.toast-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hideToast(toast);
            });
        }
        
        // 添加到容器
        this.elements.toastContainer.appendChild(toast);
        
        // 顯示動畫
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // 自動隱藏
        setTimeout(() => {
            this.hideToast(toast);
        }, duration);
    }
    
    /**
     * 隱藏 Toast 通知
     * @param {Element} toast - Toast 元素
     */
    hideToast(toast) {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }
    
    /**
     * 顯示錯誤訊息
     * @param {string} message - 錯誤訊息
     */
    showError(message) {
        this.showToast('error', message, 5000);
    }
    
    /**
     * 記錄效能指標
     * @param {Object} metrics - 效能指標
     */
    recordPerformanceMetrics(metrics) {
        try {
            // 儲存到本地存儲
            const existingMetrics = JSON.parse(localStorage.getItem('scrumPoker_performanceMetrics') || '[]');
            existingMetrics.push(metrics);
            
            // 只保留最近 50 筆記錄
            if (existingMetrics.length > 50) {
                existingMetrics.splice(0, existingMetrics.length - 50);
            }
            
            localStorage.setItem('scrumPoker_performanceMetrics', JSON.stringify(existingMetrics));
            
            // 如果初始化時間過長，發出警告
            if (metrics.initTime > 2000) {
                console.warn(`⚠️ 初始化時間較長: ${metrics.initTime}ms`);
            }
            
        } catch (error) {
            console.error('效能指標記錄失敗:', error);
        }
    }
    
    /**
     * 取得效能指標
     * @returns {Array} 效能指標陣列
     */
    getPerformanceMetrics() {
        try {
            return JSON.parse(localStorage.getItem('scrumPoker_performanceMetrics') || '[]');
        } catch (error) {
            console.error('讀取效能指標失敗:', error);
            return [];
        }
    }
    
    /**
     * 清除效能指標
     */
    clearPerformanceMetrics() {
        try {
            localStorage.removeItem('scrumPoker_performanceMetrics');
            console.log('效能指標已清除');
        } catch (error) {
            console.error('清除效能指標失敗:', error);
        }
    }
    
    /**
     * 設置瀏覽器關閉時自動清理
     */
    setupBrowserCloseCleanup() {
        const cleanup = async () => {
            if (this.firebaseService && this.roomId && this.currentPlayer) {
                try {
                    console.log('🔄 瀏覽器關閉，正在清理玩家資料...');
                    
                    // 使用 sendBeacon 進行可靠的清理（非阻塞）
                    if (navigator.sendBeacon) {
                        const cleanupData = JSON.stringify({
                            roomId: this.roomId,
                            playerId: this.currentPlayer.id,
                            timestamp: Date.now()
                        });
                        
                        // 注意：這需要後端 API 支援，目前先用同步清理
                        // navigator.sendBeacon('/api/cleanup', cleanupData);
                    }
                    
                    // 同步清理（僅在頁面卸載時執行）
                    await this.firebaseService.leaveRoom(this.roomId, this.currentPlayer.id, true);
                    console.log('✅ 玩家資料清理完成');
                } catch (error) {
                    console.error('❌ 瀏覽器關閉清理失敗:', error);
                }
            }
        };
        
        // 監聽頁面卸載事件
        window.addEventListener('beforeunload', cleanup);
        window.addEventListener('unload', cleanup);
        
        // 監聽頁面可見性變化（用於檢測標籤頁切換）
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // 頁面隱藏時更新最後活動時間
                if (this.firebaseService && this.roomId && this.currentPlayer) {
                    try {
                        this.firebaseService.updatePlayerHeartbeat();
                    } catch (error) {
                        console.warn('⚠️ 更新心跳失敗:', error);
                    }
                }
            }
        });
        
        console.log('🛡️ 瀏覽器關閉自動清理機制已設置');
    }
    
    /**
     * 效能監控
     */
    setupPerformanceMonitoring() {
        // 監控記憶體使用
        if (performance.memory) {
            setInterval(() => {
                const memoryMB = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
                if (memoryMB > 50) { // 超過 50MB 發出警告
                    console.warn(`⚠️ 記憶體使用較高: ${memoryMB}MB`);
                }
            }, 30000); // 每 30 秒檢查一次
        }
        
        // 監控長任務
        if (window.PerformanceObserver) {
            try {
                const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (entry.duration > 50) { // 超過 50ms 的任務
                            console.warn(`⚠️ 長任務檢測: ${Math.round(entry.duration)}ms`);
                        }
                    }
                });
                observer.observe({ entryTypes: ['longtask'] });
            } catch (error) {
                console.log('瀏覽器不支援長任務監控');
            }
        }
        
        // 監控頁面可見性變化
        let lastVisibilityState = document.visibilityState;
        document.addEventListener('visibilitychange', () => {
            const currentState = document.visibilityState;
            
            // 只在狀態改變時觸發操作
            if (currentState !== lastVisibilityState) {
                lastVisibilityState = currentState;
                
                if (document.hidden) {
                    console.log('📱 頁面已隱藏，暫停非必要操作');
                    // 暫停動畫或減少更新頻率
                    if (window.eventBus) {
                        window.eventBus.emit('app:page-hidden');
                    }
                } else {
                    console.log('📱 頁面已顯示，恢復正常操作');
                    // 恢復正常操作
                    if (window.eventBus) {
                        window.eventBus.emit('app:page-visible');
                    }
                }
            }
        });
    }
    
    /**
     * 清理舊資料並遷移到 Cookie
     * @returns {Promise<Object>} 遷移結果
     */
    async migrateToCookie() {
        console.log('🔄 開始遷移舊資料到 Cookie...');
        
        const migrationResults = {
            firebaseConfig: false,
            userInfo: false,
            localMode: false
        };
        
        try {
            // 遷移 Firebase 設定
            const legacyFirebaseConfig = Utils.Storage.getItem('scrumPoker_firebaseConfig');
            if (legacyFirebaseConfig && legacyFirebaseConfig.projectId && legacyFirebaseConfig.apiKey) {
                const success = Utils.Cookie.setCookie('scrumPoker_firebaseConfig', legacyFirebaseConfig, {
                    days: 30,
                    secure: window.location.protocol === 'https:',
                    sameSite: 'Lax'
                });
                if (success) {
                    migrationResults.firebaseConfig = true;
                    console.log('✅ Firebase 設定已遷移到 Cookie');
                }
            }
            
            // 遷移用戶資訊
            const legacyUserInfo = Utils.Storage.getItem('scrumPoker_userInfo');
            if (legacyUserInfo && legacyUserInfo.name) {
                const success = Utils.Cookie.setCookie('scrumPoker_userInfo', legacyUserInfo, {
                    days: 30,
                    secure: window.location.protocol === 'https:',
                    sameSite: 'Lax'
                });
                if (success) {
                    migrationResults.userInfo = true;
                    console.log('✅ 用戶資訊已遷移到 Cookie');
                }
            }
            
            // 遷移本地模式設定
            const legacyLocalMode = Utils.Storage.getItem('scrumPoker_localMode');
            if (legacyLocalMode === true) {
                const success = Utils.Cookie.setCookie('scrumPoker_localMode', true, {
                    days: 30,
                    secure: window.location.protocol === 'https:',
                    sameSite: 'Lax'
                });
                if (success) {
                    migrationResults.localMode = true;
                    console.log('✅ 本地模式設定已遷移到 Cookie');
                }
            }
            
            console.log('🔄 資料遷移完成:', migrationResults);
            return migrationResults;
        } catch (error) {
            console.error('❌ 資料遷移失敗:', error);
            return migrationResults;
        }
    }
    
    /**
     * 測試玩家名稱驗證問題
     * @returns {Object} 測試結果
     */
    testPlayerNameValidation() {
        console.log('🧪 測試玩家名稱驗證問題...');
        
        const testResults = {
            appValidation: [],
            firebaseValidation: [],
            problematicNames: []
        };
        
        const testNames = [
            'caleb',
            'Caleb', 
            'CALEB',
            'caleb123',
            'caleb-test',
            'caleb_test',
            'caleb test',
            '測試用戶',
            'user123',
            'test-user',
            'test_user'
        ];
        
        // 測試 app.js 中的驗證邏輯
        testNames.forEach(name => {
            try {
                // 模擬 app.js 中的驗證邏輯
                if (name.length < 1 || name.length > 20) {
                    throw new Error('名字長度必須在 1-20 個字符之間');
                }
                
                const sanitizedName = name
                    .replace(/[<>\"'&]/g, '') // 移除 HTML 字符
                    .replace(/javascript:/gi, '') // 移除 JavaScript 協議
                    .replace(/data:/gi, '') // 移除 data 協議
                    .trim();
                
                if (!sanitizedName) {
                    throw new Error('名字包含不允許的字符');
                }
                
                if (!/^[a-zA-Z0-9\u4e00-\u9fff\s_-]+$/.test(sanitizedName)) {
                    throw new Error('名字包含不允許的字符');
                }
                
                testResults.appValidation.push({
                    name,
                    sanitized: sanitizedName,
                    status: '✅ 通過 app.js 驗證'
                });
            } catch (error) {
                testResults.appValidation.push({
                    name,
                    error: error.message,
                    status: '❌ app.js 驗證失敗'
                });
            }
        });
        
        // 測試 FirebaseService 驗證邏輯（如果可用）
        if (this.firebaseService && typeof this.firebaseService.validateAndSanitizeInput === 'function') {
            testNames.forEach(name => {
                try {
                    const result = this.firebaseService.validateAndSanitizeInput(name, 20, 'playerName');
                    testResults.firebaseValidation.push({
                        name,
                        result,
                        status: '✅ 通過 Firebase 驗證'
                    });
                } catch (error) {
                    testResults.firebaseValidation.push({
                        name,
                        error: error.message,
                        status: '❌ Firebase 驗證失敗'
                    });
                }
            });
        }
        
        // 檢查特定問題案例
        const problematicName = 'caleb';
        try {
            // 完整模擬登入流程的名稱檢查
            console.log(`🔍 詳細檢查 "${problematicName}":`);
            console.log('- 原始名稱:', problematicName);
            console.log('- 長度:', problematicName.length);
            console.log('- 字符碼:', [...problematicName].map(c => c.charCodeAt(0)));
            
            const sanitized = problematicName
                .replace(/[<>\"'&]/g, '')
                .replace(/javascript:/gi, '')
                .replace(/data:/gi, '')
                .trim();
            
            console.log('- 清理後:', sanitized);
            console.log('- 正規表達式測試:', /^[a-zA-Z0-9\u4e00-\u9fff\s_-]+$/.test(sanitized));
            
            testResults.problematicNames.push({
                name: problematicName,
                analysis: {
                    original: problematicName,
                    length: problematicName.length,
                    charCodes: [...problematicName].map(c => c.charCodeAt(0)),
                    sanitized: sanitized,
                    regexTest: /^[a-zA-Z0-9\u4e00-\u9fff\s_-]+$/.test(sanitized)
                }
            });
        } catch (error) {
            testResults.problematicNames.push({
                name: problematicName,
                error: error.message
            });
        }
        
        console.log('🧪 玩家名稱驗證測試結果:', testResults);
        return testResults;
    }
    
    /**
     * 測試玩家 ID 驗證修復
     * @returns {Object} 測試結果
     */
    testPlayerIdValidation() {
        console.log('🧪 測試玩家 ID 驗證修復...');
        
        const testResults = {
            utilsGeneration: [],
            firebaseValidation: null,
            integration: []
        };
        
        // 測試 Utils.Data.generateId 生成的 ID
        for (let i = 0; i < 5; i++) {
            const id = Utils.Data.generateId('player');
            testResults.utilsGeneration.push({
                id,
                format: id.match(/^player_[a-z0-9]+_[a-z0-9]+$/) ? '✅ 格式正確' : '❌ 格式錯誤'
            });
        }
        
        // 測試 FirebaseService 驗證功能（如果可用）
        if (this.firebaseService && typeof this.firebaseService.testPlayerIdValidation === 'function') {
            testResults.firebaseValidation = this.firebaseService.testPlayerIdValidation();
        }
        
        // 測試整合場景
        const testPlayer = {
            id: Utils.Data.generateId('player'),
            name: '測試玩家',
            role: 'dev'
        };
        
        testResults.integration.push({
            scenario: '標準玩家創建',
            playerId: testPlayer.id,
            status: '✅ 成功創建'
        });
        
        console.log('🧪 玩家 ID 驗證修復測試結果:', testResults);
        return testResults;
    }
    
    /**
     * 測試 Cookie 儲存和讀取功能
     * @returns {Promise<Object>} 測試結果
     */
    async testCookieStorage() {
        console.log('🧪 開始測試 Cookie 儲存和讀取功能...');
        
        const testFirebaseConfig = {
            projectId: 'test-project-12345',
            apiKey: 'AIzaTestKey1234567890123456789012345678'
        };
        
        const testUserInfo = {
            name: '測試用戶',
            role: 'dev',
            roomId: 'TEST123'
        };
        
        const results = {
            firebaseConfig: { write: false, read: false },
            userInfo: { write: false, read: false },
            localMode: { write: false, read: false }
        };
        
        try {
            // 測試 Firebase 設定 Cookie
            try {
                Utils.Cookie.setCookie('test_firebaseConfig', testFirebaseConfig, { days: 1 });
                results.firebaseConfig.write = true;
                const readFirebaseConfig = Utils.Cookie.getCookie('test_firebaseConfig');
                results.firebaseConfig.read = !!(readFirebaseConfig && readFirebaseConfig.projectId === testFirebaseConfig.projectId);
                Utils.Cookie.deleteCookie('test_firebaseConfig');
            } catch (error) {
                console.warn('Firebase 設定 Cookie 測試失敗:', error.message);
            }
            
            // 測試用戶資訊 Cookie
            try {
                Utils.Cookie.setCookie('test_userInfo', testUserInfo, { days: 1 });
                results.userInfo.write = true;
                const readUserInfo = Utils.Cookie.getCookie('test_userInfo');
                results.userInfo.read = !!(readUserInfo && readUserInfo.name === testUserInfo.name);
                Utils.Cookie.deleteCookie('test_userInfo');
            } catch (error) {
                console.warn('用戶資訊 Cookie 測試失敗:', error.message);
            }
            
            // 測試本地模式 Cookie
            try {
                Utils.Cookie.setCookie('test_localMode', true, { days: 1 });
                results.localMode.write = true;
                const readLocalMode = Utils.Cookie.getCookie('test_localMode');
                results.localMode.read = readLocalMode === true;
                Utils.Cookie.deleteCookie('test_localMode');
            } catch (error) {
                console.warn('本地模式 Cookie 測試失敗:', error.message);
            }
            
            console.log('🧪 Cookie 測試結果:', results);
            return results;
        } catch (error) {
            console.error('❌ 測試過程中發生錯誤:', error);
            return results;
        }
    }
    
    /**
     * 獲取應用狀態
     * @returns {Object} 應用狀態
     */
    getAppState() {
        return {
            version: this.version,
            buildTime: this.buildTime,
            isInitialized: this.isInitialized,
            currentState: this.currentState,
            roomId: this.roomId,
            currentPlayer: this.currentPlayer,
            gameStatistics: this.gameTable ? this.gameTable.getStatistics() : null,
            services: {
                firebase: !!this.firebaseService,
                storage: !!this.storageService,
                touch: !!this.touchManager
            },
            performance: {
                metrics: this.getPerformanceMetrics(),
                memory: performance.memory ? {
                    used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                    total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                    limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
                } : null
            }
        };
    }
}

// 全域應用實例
let scrumPokerApp = null;

// 當 DOM 載入完成時啟動應用
document.addEventListener('DOMContentLoaded', () => {
    scrumPokerApp = new ScrumPokerApp();
    
    // 掛載到全域以便調試
    window.scrumPokerApp = scrumPokerApp;
});

// 匯出應用類別
window.ScrumPokerApp = ScrumPokerApp;

console.log('🚀 Scrum Poker App 主控制器已載入 - v3.0.0-enhanced');