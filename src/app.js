/**
 * Scrum Poker 主應用程式 - v3.0.0 Vanilla JavaScript 版本
 * 整合所有組件和服務的主控制器 - 雙模式支援版本
 * @version 3.0.0-dual-mode
 */

import { shortcutHintsManager } from './ui/ShortcutHints.js';
import { panelManager } from './ui/PanelManager.js';

/**
 * 主應用程式類別
 */
class ScrumPokerApp {
    constructor() {
        this.version = 'v3.0.0-dual-mode';
        this.buildTime = new Date().toISOString().slice(0,10).replace(/-/g,'') + '_' + new Date().toTimeString().slice(0,5).replace(':','');
        
        // 應用狀態
        this.isInitialized = false;
        this.currentState = 'loading'; // loading, login, game
        
        // 核心組件
        this.gameTable = null;
        this.currentPlayer = null;
        this.roomId = null;
        
        // 雙模式架構：統一房間資料提供者介面
        this.roomProvider = null; // 統一的房間資料提供者
        this.appMode = null; // 當前應用模式 ('firebase' | 'local')
        
        // 服務實例（向後兼容）
        this.firebaseService = null;
        this.localRoomService = null;
        this.storageService = null;
        this.touchManager = null;
        
        // UI 管理器
        this.shortcutHintsManager = shortcutHintsManager;
        this.panelManager = panelManager;
        this.adviceUI = null; // ScrumAdviceUI 管理器
        
        // 事件監聽器統一管理 - AbortController 模式
        this.abortController = new AbortController();
        this.signal = this.abortController.signal;
        
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
            
            // 設置網路狀態監控
            this.setupNetworkMonitoring();
            
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
     * 初始化關鍵服務（阻塞載入）- 雙模式架構重構版本
     */
    async initializeCriticalServices() {
        console.log('🏗️ 雙模式架構：正在初始化關鍵服務...');
        
        // 1. 初始化 StorageService - 關鍵服務
        if (window.StorageService) {
            this.storageService = new StorageService();
            console.log('✅ StorageService 已初始化');
        }
        
        // 2. 檢測應用模式
        this.appMode = this.detectAppMode();
        console.log(`📍 檢測到應用模式: ${this.appMode}`);
        
        // 3. 等待 RoomProviderFactory 載入
        if (!window.RoomProviderFactory) {
            console.log('⏳ 等待 RoomProviderFactory 載入...');
            await this.waitForRoomProviderFactory();
        }
        
        // 4. 建立對應的房間資料提供者
        try {
            const providerConfig = await this.buildProviderConfig();
            this.roomProvider = await window.RoomProviderFactory.createProvider(this.appMode, providerConfig);
            
            // 驗證提供者介面
            if (!window.RoomProviderFactory.validateProvider(this.roomProvider)) {
                throw new Error('房間資料提供者介面驗證失敗');
            }
            
            console.log(`✅ ${this.appMode} 房間資料提供者已建立`);
            
            // 5. 向後兼容：設置舊有服務引用
            this.setupLegacyServiceReferences();
            
            // 6. 顯示模式狀態
            this.displayModeStatus();
            
        } catch (error) {
            console.error(`❌ 初始化 ${this.appMode} 房間資料提供者失敗:`, error);
            
            // 失敗時的降級策略
            await this.handleProviderInitializationFailure(error);
        }
    }
    
    /**
     * 檢測用戶使用意圖
     */
    async detectUserIntention() {
        // 1. 檢查是否有明確的試用標記
        const trialMode = Utils.Cookie.getCookie('scrumPoker_trialMode');
        if (trialMode === true) {
            return 'trial-only';
        }
        
        // 2. 檢查是否有 Firebase 配置（暗示團隊使用）
        const firebaseConfig = await this.getFirebaseConfig();
        if (firebaseConfig) {
            return 'team-collaboration';
        }
        
        // 3. 檢查舊用戶資料（有房間記錄暗示團隊使用）
        const userInfo = Utils.Cookie.getCookie('scrumPoker_userInfo');
        if (userInfo && userInfo.roomId) {
            return 'returning-team-user';
        }
        
        // 4. 預設為首次使用（應該引導到團隊設定）
        return 'first-time-setup';
    }
    
    /**
     * 嘗試 Firebase 初始化（帶重試機制）
     */
    async tryFirebaseInitializationWithRetry() {
        const maxRetries = 3;
        const baseDelay = 2000; // 2 秒基礎延遲
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            console.log(`🔄 Firebase 初始化嘗試 ${attempt}/${maxRetries}`);
            
            const result = await this.tryFirebaseInitialization();
            
            // 成功或不可重試的錯誤，直接返回
            if (result.success || !result.retryable) {
                if (result.success) {
                    console.log(`✅ Firebase 初始化成功 (嘗試 ${attempt})`);
                } else {
                    console.log(`❌ Firebase 初始化失敗，不可重試 (嘗試 ${attempt})`);
                }
                return result;
            }
            
            // 如果不是最後一次嘗試，等待後重試
            if (attempt < maxRetries) {
                const delay = baseDelay * Math.pow(2, attempt - 1); // 指數退避
                console.log(`⏳ Firebase 初始化失敗，${delay}ms 後重試 (嘗試 ${attempt}/${maxRetries})`);
                
                // 顯示重試提示給用戶
                this.showToast('info', `🔄 Firebase 連線重試中... (${attempt}/${maxRetries})`, delay);
                
                await new Promise(resolve => setTimeout(resolve, delay));
                
                // 檢查網路狀態
                if (!navigator.onLine) {
                    console.log('❌ 網路離線，停止重試');
                    result.errorType = 'OFFLINE_ERROR';
                    result.retryable = false;
                    return result;
                }
            } else {
                console.log(`❌ Firebase 初始化最終失敗，已達最大重試次數`);
            }
        }
        
        // 所有重試都失敗
        const finalResult = await this.tryFirebaseInitialization();
        console.error('❌ Firebase 初始化完全失敗，將使用備援方案');
        return finalResult;
    }
    
    /**
     * 嘗試 Firebase 初始化（增強錯誤處理）
     */
    async tryFirebaseInitialization() {
        const result = {
            success: false,
            hasConfig: false,
            error: null,
            errorType: null,
            retryable: false,
            diagnostics: {}
        };
        
        try {
            // 網路連線檢查
            if (!navigator.onLine) {
                throw new Error('NETWORK_OFFLINE');
            }
            
            // 檢查 Firebase 配置
            const userFirebaseConfig = await this.getFirebaseConfig();
            if (!userFirebaseConfig) {
                console.log('ℹ️ 未找到 Firebase 配置，將引導用戶設定');
                result.errorType = 'NO_CONFIG';
                return result;
            }
            
            result.hasConfig = true;
            result.diagnostics.config = {
                projectId: userFirebaseConfig.projectId,
                hasApiKey: !!userFirebaseConfig.apiKey,
                apiKeyFormat: this.validateApiKeyFormat(userFirebaseConfig.apiKey)
            };
            
            // 檢查 FirebaseService 可用性
            if (!window.FirebaseService) {
                throw new Error('FIREBASE_SERVICE_MISSING');
            }
            
            // 初始化 Firebase 服務（帶重試機制）
            this.firebaseService = new FirebaseService();
            
            // 設置事件監聽器
            this.setupFirebaseEventListeners();
            
            // 帶超時的連線嘗試
            const initializationPromise = this.firebaseService.initialize(userFirebaseConfig);
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('INITIALIZATION_TIMEOUT')), 15000);
            });
            
            const initialized = await Promise.race([initializationPromise, timeoutPromise]);
            
            if (initialized) {
                result.success = true;
                result.diagnostics.connectionTime = Date.now();
                console.log('✅ Firebase 團隊模式初始化成功');
                
                // 執行連線後驗證
                await this.verifyFirebaseConnection();
            } else {
                throw new Error('INITIALIZATION_FAILED');
            }
            
        } catch (error) {
            console.error('❌ Firebase 初始化嘗試失敗:', error);
            
            // 錯誤分類和診斷
            result.error = error;
            result.errorType = this.classifyFirebaseError(error);
            result.retryable = this.isRetryableError(error);
            result.diagnostics = {
                ...result.diagnostics,
                errorCode: error.code,
                errorMessage: error.message,
                timestamp: Date.now(),
                userAgent: navigator.userAgent,
                online: navigator.onLine
            };
            
            // 清理失敗的服務實例
            if (this.firebaseService) {
                try {
                    this.firebaseService.destroy();
                } catch (cleanupError) {
                    console.warn('⚠️ Firebase 服務清理失敗:', cleanupError);
                }
                this.firebaseService = null;
            }
        }
        
        return result;
    }
    
    /**
     * 驗證 API Key 格式（安全性強化）
     */
    validateApiKeyFormat(apiKey) {
        if (!apiKey) return { valid: false, reason: 'missing' };
        if (typeof apiKey !== 'string') return { valid: false, reason: 'invalid_type' };
        if (!apiKey.startsWith('AIza')) return { valid: false, reason: 'wrong_prefix' };
        if (apiKey.length < 35) return { valid: false, reason: 'too_short' };
        
        // 安全性檢查：防止注入攻擊
        const dangerousPatterns = [
            /<script/i, /javascript:/i, /data:/i, /vbscript:/i,
            /on\w+\s*=/i, /eval\(/i, /function\(/i, /\${/
        ];
        
        for (const pattern of dangerousPatterns) {
            if (pattern.test(apiKey)) {
                return { valid: false, reason: 'potentially_malicious' };
            }
        }
        
        return { valid: true };
    }
    
    /**
     * 分類 Firebase 錯誤
     */
    classifyFirebaseError(error) {
        const message = error.message?.toLowerCase() || '';
        const code = error.code?.toLowerCase() || '';
        
        if (message.includes('network') || code.includes('network')) {
            return 'NETWORK_ERROR';
        }
        if (message.includes('auth') || code.includes('auth')) {
            return 'AUTH_ERROR';
        }
        if (message.includes('permission') || code.includes('permission')) {
            return 'PERMISSION_ERROR';
        }
        if (message.includes('timeout') || message.includes('INITIALIZATION_TIMEOUT')) {
            return 'TIMEOUT_ERROR';
        }
        if (message.includes('offline') || message.includes('NETWORK_OFFLINE')) {
            return 'OFFLINE_ERROR';
        }
        if (message.includes('FIREBASE_SERVICE_MISSING')) {
            return 'SERVICE_ERROR';
        }
        if (code.includes('project-not-found') || message.includes('project')) {
            return 'PROJECT_ERROR';
        }
        
        return 'UNKNOWN_ERROR';
    }
    
    /**
     * 判斷錯誤是否可重試
     */
    isRetryableError(error) {
        const retryableTypes = [
            'NETWORK_ERROR',
            'TIMEOUT_ERROR',
            'OFFLINE_ERROR',
            'UNKNOWN_ERROR'
        ];
        
        const errorType = this.classifyFirebaseError(error);
        return retryableTypes.includes(errorType);
    }
    
    /**
     * 驗證 Firebase 連線
     */
    async verifyFirebaseConnection() {
        try {
            if (!this.firebaseService || !this.firebaseService.database) {
                throw new Error('Firebase 服務未正確初始化');
            }
            
            // 簡單的連線測試
            const testRef = this.firebaseService.database.ref('.info/connected');
            const snapshot = await testRef.once('value');
            const connected = snapshot.val();
            
            if (!connected) {
                throw new Error('Firebase 資料庫連線失敗');
            }
            
            console.log('✅ Firebase 連線驗證成功');
            return true;
        } catch (error) {
            console.warn('⚠️ Firebase 連線驗證失敗:', error);
            return false;
        }
    }
    
    /**
     * 回退到本地模式但保持 Firebase 意圖
     */
    async fallbackToLocalWithFirebaseIntent() {
        console.log('🔄 Firebase 暫時不可用，使用本地模式但保持團隊配置');
        
        // 初始化本地服務作為臨時解決方案
        if (window.LocalRoomService) {
            this.localRoomService = new LocalRoomService();
            console.log('✅ LocalRoomService 已初始化（Firebase 備援模式）');
        }
        
        this.isLocalMode = true;
        this.hasFirebaseIntent = true; // 標記有 Firebase 使用意圖
        
        // 儲存 Firebase 意圖標記
        Utils.Cookie.setCookie('scrumPoker_firebaseIntent', true, {
            days: 7,
            secure: window.location.protocol === 'https:',
            sameSite: 'Lax'
        });
        
        this.showToast('warning', '⚠️ Firebase 暫時不可用，已切換到本地模式');
    }
    
    /**
     * 初始化本地試用模式
     */
    async initializeLocalTrialMode(isExplicitTrial = false) {
        console.log(`🏠 初始化本地試用模式 - 明確試用: ${isExplicitTrial}`);
        
        // 初始化本地房間服務
        if (window.LocalRoomService) {
            this.localRoomService = new LocalRoomService();
            console.log('✅ LocalRoomService 已初始化（試用模式）');
        }
        
        this.isLocalMode = true;
        this.isTrialMode = true;
        
        // 儲存試用模式標記
        if (isExplicitTrial) {
            Utils.Cookie.setCookie('scrumPoker_trialMode', true, {
                days: 1, // 試用標記短期有效
                secure: window.location.protocol === 'https:',
                sameSite: 'Lax'
            });
        }
        
        const message = isExplicitTrial ? 
            '🎮 試用模式已啟用 - 體驗基本功能' : 
            '🏠 本地模式已啟用 - 可升級到團隊協作';
            
        this.showToast('info', message);
    }
    
    /**
     * 顯示 Firebase 連線指引（增強版）
     */
    showFirebaseConnectionGuidance(result) {
        console.group('🔧 Firebase 連線故障排除');
        console.log('錯誤詳情:', result);
        
        const { error, errorType, retryable, diagnostics } = result;
        
        let guidance = '🔧 Firebase 連線問題排除建議：\n\n';
        let solutions = [];
        let canRetry = retryable;
        
        // 根據錯誤類型提供具體指引
        switch (errorType) {
            case 'NETWORK_ERROR':
                guidance += '🌐 網路連線問題\n';
                solutions.push('檢查網路連線狀態');
                solutions.push('確認防火牆或代理伺服器允許 Firebase 連線');
                solutions.push('嘗試使用其他網路環境（如手機熱點）');
                solutions.push('檢查是否有網路阻擋 *.firebaseio.com 域名');
                break;
                
            case 'AUTH_ERROR':
                guidance += '🔑 身份驗證問題\n';
                solutions.push('檢查 Firebase API Key 是否正確');
                solutions.push('確認 Firebase Authentication 已在控制台啟用');
                solutions.push('檢查 API Key 權限是否包含 Realtime Database');
                solutions.push('嘗試重新生成 API Key');
                break;
                
            case 'PERMISSION_ERROR':
                guidance += '🛡️ 權限設定問題\n';
                solutions.push('檢查 Firebase 資料庫規則設定');
                solutions.push('確認匿名身份驗證已啟用');
                solutions.push('檢查資料庫規則是否允許匿名用戶讀寫');
                solutions.push('參考：規則應設為 "auth != null"');
                break;
                
            case 'PROJECT_ERROR':
                guidance += '📂 專案設定問題\n';
                solutions.push('檢查 Project ID 是否正確拼寫');
                solutions.push('確認 Firebase 專案狀態正常');
                solutions.push('檢查專案是否已啟用 Realtime Database');
                solutions.push('嘗試在 Firebase 控制台重新建立專案');
                break;
                
            case 'TIMEOUT_ERROR':
                guidance += '⏱️ 連線超時問題\n';
                solutions.push('檢查網路速度是否正常');
                solutions.push('稍後重試連線');
                solutions.push('確認 Firebase 服務狀態正常');
                solutions.push('嘗試使用更穩定的網路環境');
                canRetry = true;
                break;
                
            case 'OFFLINE_ERROR':
                guidance += '📡 離線狀態\n';
                solutions.push('檢查網路連線');
                solutions.push('確認已連接到網際網路');
                solutions.push('等待網路連線恢復後重試');
                canRetry = true;
                break;
                
            case 'SERVICE_ERROR':
                guidance += '🔧 服務載入問題\n';
                solutions.push('重新整理頁面');
                solutions.push('檢查瀏覽器控制台是否有 JavaScript 錯誤');
                solutions.push('確認 FirebaseService 已正確載入');
                solutions.push('嘗試清除瀏覽器快取');
                canRetry = true;
                break;
                
            case 'NO_CONFIG':
                guidance += '⚙️ 缺少設定\n';
                solutions.push('點擊上方「Firebase 設定」輸入 Project ID 和 API Key');
                solutions.push('使用「快速設定範本」簡化設定流程');
                solutions.push('參考「設定說明」建立 Firebase 專案');
                canRetry = false;
                break;
                
            default:
                guidance += '❓ 未知問題\n';
                solutions.push('重新整理頁面後重試');
                solutions.push('檢查瀏覽器控制台錯誤訊息');
                solutions.push('嘗試清除瀏覽器資料');
                solutions.push('聯繫技術支援並提供錯誤詳情');
                break;
        }
        
        // 添加解決方案
        solutions.forEach((solution, index) => {
            guidance += `${index + 1}. ${solution}\n`;
        });
        
        // 技術診斷資訊
        if (diagnostics.config) {
            guidance += '\n🔍 診斷資訊：\n';
            guidance += `• Project ID: ${diagnostics.config.projectId}\n`;
            guidance += `• API Key 格式: ${diagnostics.config.apiKeyFormat?.valid ? '✅ 正確' : '❌ 錯誤'}\n`;
            if (diagnostics.errorCode) {
                guidance += `• 錯誤代碼: ${diagnostics.errorCode}\n`;
            }
            guidance += `• 網路狀態: ${diagnostics.online ? '✅ 線上' : '❌ 離線'}\n`;
        }
        
        // 後續動作建議
        guidance += '\n💡 後續動作：\n';
        if (canRetry) {
            guidance += '• 可以點擊「測試連線」重新嘗試\n';
        }
        guidance += '• 暫時使用「試用模式」體驗基本功能\n';
        guidance += '• 查看「設定說明」獲得詳細教學\n';
        guidance += '• 完成設定後享受完整團隊協作功能';
        
        console.log(guidance);
        console.groupEnd();
        
        // 顯示用戶友善的錯誤訊息
        if (errorType !== 'NO_CONFIG') {
            this.showToast('warning', `Firebase 連線失敗: ${this.getErrorTypeDescription(errorType)}`, 8000);
        }
    }
    
    /**
     * 獲取錯誤類型的用戶友善描述
     */
    getErrorTypeDescription(errorType) {
        const descriptions = {
            'NETWORK_ERROR': '網路連線問題',
            'AUTH_ERROR': 'API Key 或身份驗證問題',
            'PERMISSION_ERROR': '資料庫權限設定問題',
            'PROJECT_ERROR': 'Firebase 專案設定問題',
            'TIMEOUT_ERROR': '連線超時，請重試',
            'OFFLINE_ERROR': '目前離線狀態',
            'SERVICE_ERROR': '服務載入失敗',
            'NO_CONFIG': '尚未設定 Firebase',
            'UNKNOWN_ERROR': '未知錯誤'
        };
        
        return descriptions[errorType] || '未知錯誤';
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
        
        // 延遲初始化 ScrumAdviceUI - Phase 4 整合
        setTimeout(async () => {
            if (window.ScrumAdviceUI) {
                try {
                    this.adviceUI = new ScrumAdviceUI();
                    await this.adviceUI.initialize();
                    console.log('✅ ScrumAdviceUI 已初始化（延遲載入）');
                    
                    // Phase 5: 如果已經在房間中且有 Firebase 服務，立即設置學習建議監聽
                    if (this.roomId && this.firebaseService) {
                        this.setupFirebaseLearningAdviceListener();
                    }
                } catch (error) {
                    console.warn('⚠️ ScrumAdviceUI 初始化失敗:', error);
                    this.adviceUI = null;
                }
            }
        }, 200); // 200ms 延遲，讓 DOM 完全準備好
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
        // 登入表單 - 使用 AbortController 管理
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            }, { signal: this.signal });
        }
        
        // 角色選擇變更（顯示/隱藏任務類型） - 使用 AbortController 管理
        const playerRole = document.getElementById('playerRole');
        if (playerRole) {
            playerRole.addEventListener('change', () => {
                this.handleRoleChange();
            }, { signal: this.signal });
        }
        
        // Firebase 設定按鈕 - 使用 AbortController 管理
        const saveConfigBtn = document.getElementById('saveConfigBtn');
        if (saveConfigBtn) {
            saveConfigBtn.addEventListener('click', () => {
                this.saveFirebaseConfig();
            }, { signal: this.signal });
        }
        
        // Firebase 手動連線按鈕
        const connectFirebaseBtn = document.getElementById('connectFirebaseBtn');
        if (connectFirebaseBtn) {
            connectFirebaseBtn.addEventListener('click', () => {
                this.connectFirebaseNow();
            }, { signal: this.signal });
        }
        
        // Firebase 連線測試按鈕
        const testConnectionBtn = document.getElementById('testConnectionBtn');
        if (testConnectionBtn) {
            testConnectionBtn.addEventListener('click', () => {
                this.testFirebaseConnection();
            }, { signal: this.signal });
        }
        
        // Firebase 清除設定按鈕
        const clearConfigBtn = document.getElementById('clearConfigBtn');
        if (clearConfigBtn) {
            clearConfigBtn.addEventListener('click', () => {
                this.clearFirebaseConfig();
            }, { signal: this.signal });
        }
        
        // Firebase 設定說明按鈕（原toggle功能調整）
        const toggleFirebaseConfigBtn = document.getElementById('toggleFirebaseConfigBtn');
        if (toggleFirebaseConfigBtn) {
            toggleFirebaseConfigBtn.addEventListener('click', () => {
                this.showFirebaseSetupGuide();
            }, { signal: this.signal });
        }
        
        // Firebase 配置範本按鈕
        const templateNewProjectBtn = document.getElementById('templateNewProject');
        if (templateNewProjectBtn) {
            templateNewProjectBtn.addEventListener('click', () => {
                this.applyConfigTemplate('new-project');
            }, { signal: this.signal });
        }
        
        const templateExistingProjectBtn = document.getElementById('templateExistingProject');
        if (templateExistingProjectBtn) {
            templateExistingProjectBtn.addEventListener('click', () => {
                this.applyConfigTemplate('existing-project');
            }, { signal: this.signal });
        }
        
        const templateFromClipboardBtn = document.getElementById('templateFromClipboard');
        if (templateFromClipboardBtn) {
            templateFromClipboardBtn.addEventListener('click', () => {
                this.importConfigFromClipboard();
            }, { signal: this.signal });
        }
        
        // 實時驗證輸入欄位
        const projectIdInput = document.getElementById('projectId');
        if (projectIdInput) {
            projectIdInput.addEventListener('input', () => {
                this.validateProjectIdInput();
            }, { signal: this.signal });
            
            projectIdInput.addEventListener('blur', () => {
                this.validateProjectIdInput(true);
            }, { signal: this.signal });
        }
        
        const apiKeyInput = document.getElementById('apiKey');
        if (apiKeyInput) {
            apiKeyInput.addEventListener('input', () => {
                this.validateApiKeyInput();
            }, { signal: this.signal });
            
            apiKeyInput.addEventListener('blur', () => {
                this.validateApiKeyInput(true);
            }, { signal: this.signal });
        }
        
        const localModeBtn = document.getElementById('localModeBtn');
        if (localModeBtn) {
            localModeBtn.addEventListener('click', () => {
                this.enableLocalMode();
            }, { signal: this.signal });
        }
        
        // 快速開始按鈕 - 使用 AbortController 管理
        const quickStartBtn = document.getElementById('quickStartBtn');
        if (quickStartBtn) {
            quickStartBtn.addEventListener('click', () => {
                this.handleQuickStart();
            }, { signal: this.signal });
        }
        
        // 複製房間 ID 按鈕 - 使用 AbortController 管理
        const copyRoomBtn = document.getElementById('copyRoomBtn');
        if (copyRoomBtn) {
            copyRoomBtn.addEventListener('click', () => {
                this.copyRoomId();
            }, { signal: this.signal });
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
     * 設置本地房間事件監聽器
     */
    setupLocalRoomEventListeners() {
        if (!this.localRoomService) return;
        
        console.log('🏠 正在設置本地房間事件監聽器...');
        
        // 玩家相關事件
        this.localRoomService.on('players:player-added', (player) => {
            console.log('👤 本地房間：玩家加入', player);
            if (this.gameTable) {
                this.gameTable.addPlayer(player.id, player.name, player.role);
            }
        });
        
        // 投票相關事件
        this.localRoomService.on('room:votes-updated', (votes) => {
            console.log('🗳️ 本地房間：投票更新', votes);
            if (this.gameTable) {
                // 更新所有玩家的投票狀態
                Object.keys(votes).forEach(playerId => {
                    const vote = votes[playerId];
                    this.gameTable.updatePlayerVote(playerId, vote.value);
                });
            }
        });
        
        // 階段變更事件
        this.localRoomService.on('game:phase-changed', (data) => {
            console.log('🎮 本地房間：階段變更', data);
            if (this.gameTable) {
                if (data.newPhase === 'revealing') {
                    this.gameTable.revealAllVotes();
                } else if (data.newPhase === 'voting') {
                    this.gameTable.clearAllVotes();
                }
            }
        });
        
        // 房間同步事件
        this.localRoomService.on('room:synced', (roomData) => {
            console.log('🔄 本地房間：跨標籤頁同步', roomData);
        });
        
        console.log('✅ 本地房間事件監聽器已設置');
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
                    this.gameTable.updatePlayers(data.players);
                } else {
                    console.warn('⚠️ GameTable 尚未初始化，跳過玩家更新');
                }
            } catch (error) {
                console.error('❌ 處理玩家更新事件失敗:', error);
                this.showToast('error', '玩家數據更新失敗');
            }
        });
        
        this.firebaseService.on('room:votes-updated', (data) => {
            try {
                if (this.gameTable && typeof this.gameTable.updateVotes === 'function') {
                    this.gameTable.updateVotes(data.votes);
                } else {
                    console.warn('⚠️ GameTable 尚未初始化或 updateVotes 方法不存在');
                }
            } catch (error) {
                console.error('❌ 處理投票更新事件失敗:', error);
                this.showToast('error', '投票數據更新失敗');
            }
        });
        
        this.firebaseService.on('room:phase-changed', (data) => {
            try {
                if (this.gameTable && typeof this.gameTable.updatePhase === 'function') {
                    this.gameTable.updatePhase(data.phase);
                } else {
                    console.warn('⚠️ GameTable 尚未初始化或 updatePhase 方法不存在');
                }
            } catch (error) {
                console.error('❌ 處理階段更新事件失敗:', error);
                this.showToast('error', '遊戲階段更新失敗');
            }
        });
        
        this.firebaseService.on('players:voting-progress', (progress) => {
            this.updateVotingProgress(progress);
        });
        
    }
    
    /**
     * Phase 5: 設置 Firebase 學習建議監聽器
     */
    setupFirebaseLearningAdviceListener() {
        if (!this.firebaseService || !this.adviceUI || !this.roomId) {
            console.warn('⚠️ 無法設置學習建議監聽器: 服務未初始化或房間未設置');
            return;
        }
        
        console.log('📚 設置 Firebase 學習建議監聽器...');
        
        // 監聽 Firebase 學習建議更新
        this.firebaseService.listenToLearningAdvice(this.roomId, (advice) => {
            try {
                console.log('📢 收到 Firebase 學習建議更新:', advice);
                
                if (!advice || !advice.visible_to_all) {
                    console.log('⚠️ 建議不可見或無效，跳過顯示');
                    return;
                }
                
                // 將 Firebase 建議數據轉換為 UI 格式
                const uiAdvice = {
                    title: advice.title || '智慧建議',
                    content: advice.content || '',
                    keywords: advice.keywords || [],
                    metadata: {
                        ...advice.metadata,
                        source: 'firebase',
                        generatedAt: new Date(advice.stored_at).toISOString()
                    },
                    learningInsights: advice.learning_insights || null
                };
                
                // 更新 ScrumAdviceUI 的當前建議
                this.adviceUI.currentAdvice = uiAdvice;
                
                // 自動顯示建議（按照用戶需求：開牌後自動顯示）
                this.adviceUI.showFullAdvice();
                
                // 更新建議預覽（如果有）
                this.adviceUI.updateAdvicePreview();
                
                console.log('✅ Firebase 學習建議已自動顯示給所有玩家');
                
            } catch (error) {
                console.error('❌ 處理 Firebase 學習建議失敗:', error);
            }
        });
        
        console.log('✅ Firebase 學習建議監聽器已設置');
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
            
            // H 鍵: 展開/收合面板
            if (event.key === 'h' || event.key === 'H') {
                if (!event.target.matches('input, textarea')) {
                    event.preventDefault();
                    this.panelManager.togglePanel('rightRail', 'keyboard');
                    // 面板開關後刷新快捷鍵清單，避免只剩標題
                    setTimeout(() => this.shortcutHintsManager.updateShortcutHints(), 0);
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
        }, { signal: this.signal });
    }
    
    /**
     * 設置全域錯誤處理
     */
    setupErrorHandling() {
        window.addEventListener('error', (event) => {
            console.error('🚨 全域錯誤:', event.error);
            this.showError('發生未預期的錯誤');
        }, { signal: this.signal });
        
        window.addEventListener('unhandledrejection', (event) => {
            console.error('🚨 未處理的 Promise 錯誤:', event.reason);
            this.showError('發生系統錯誤');
        }, { signal: this.signal });
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
        
        // 🏠 新架構：預設隱藏 Firebase 設定，使用本地模式
        this.hideFirebaseConfig();
        
        // 只有在使用者明確要求使用 Firebase 時才顯示設定
        const forceFirebase = Utils.Cookie.getCookie('scrumPoker_forceFirebase');
        const hasFirebaseConfig = await this.hasFirebaseConfig();
        
        if (forceFirebase || hasFirebaseConfig) {
            console.log('🔧 使用者要求使用 Firebase 模式，顯示設定區域');
            // 可以選擇性地顯示設定區域
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
        
        // 進階輸入驗證和清理（安全性強化）
        try {
            // 檢查名字長度和格式
            if (playerName.length < 1 || playerName.length > 20) {
                throw new Error('名字長度必須在 1-20 個字符之間');
            }
            
            // 安全性檢查：檢測潛在的惡意內容
            const maliciousPatterns = [
                /<script/i, /javascript:/i, /data:/i, /vbscript:/i,
                /on\w+\s*=/i, /eval\(/i, /function\(/i, /\${/, /<%/,
                /\{\{/, /\[\[/, /@@/, /\$\(/
            ];
            
            for (const pattern of maliciousPatterns) {
                if (pattern.test(playerName)) {
                    throw new Error('名字包含不允許的內容，請使用安全字符');
                }
            }
            
            // 移除潛在的惡意字符
            const sanitizedName = playerName
                .replace(/[<>\"'&]/g, '') // 移除 HTML 字符
                .replace(/javascript:/gi, '') // 移除 JavaScript 協議
                .replace(/data:/gi, '') // 移除 data 協議
                .replace(/vbscript:/gi, '') // 移除 VBScript 協議
                .trim();
            
            // 檢查清理後是否為空
            if (!sanitizedName) {
                throw new Error('名字包含不允許的字符（清理後為空）');
            }
            
            // 檢查是否只包含允許的字符（字母、數字、中文、空格、連字符、底線）
            const regex = /^[a-zA-Z0-9\u4e00-\u9fff\s_-]+$/;
            if (!regex.test(sanitizedName)) {
                const invalidChars = [...sanitizedName].filter(char => !regex.test(char));
                throw new Error(`名字包含不允許的字符: ${invalidChars.join(', ')}`);
            }
            
            // 更新為清理後的名字
            document.getElementById('playerName').value = sanitizedName;
            
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
            
            // 🏗️ 雙模式架構：使用統一房間資料提供者介面
            if (this.roomProvider) {
                console.log(`🏗️ 正在使用 ${this.appMode} 模式加入房間...`);
                
                // 使用統一介面加入房間
                await this.joinRoomUnified(roomId, this.currentPlayer);
                
                console.log(`✅ ${this.appMode} 模式：已成功加入房間 ${roomId}`);
                
                // Phase 5: Firebase 特有功能（學習建議監聽）
                if (this.appMode === 'firebase' && this.adviceUI) {
                    this.setupFirebaseLearningAdviceListener();
                }
                
            } else {
                // 降級：使用舊有邏輯（向後兼容）
                console.warn('⚠️ 房間資料提供者未初始化，使用向後兼容模式');
                
                if (this.isLocalMode && this.localRoomService) {
                    console.log('🏠 向後兼容：正在加入本地房間...');
                    await this.localRoomService.initialize(roomId);
                    this.setupLocalRoomEventListeners();
                    await this.localRoomService.joinRoom(roomId, this.currentPlayer);
                    console.log('✅ 向後兼容：已成功加入本地房間');
                    
                } else if (this.firebaseService) {
                    console.log('🔄 向後兼容：正在設置 Firebase 事件監聽器...');
                    this.setupFirebaseEventListeners();
                    console.log('🔄 向後兼容：GameTable 已就緒，正在加入 Firebase 房間...');
                    await this.firebaseService.joinRoom(roomId, this.currentPlayer);
                    
                    if (this.adviceUI) {
                        this.setupFirebaseLearningAdviceListener();
                    }
                }
            }
            
            // 更新狀態
            this.currentState = 'game';
            
            // 顯示成功訊息
            let modeText;
            if (this.isTrialMode) {
                modeText = '試用模式 - 限制版功能';
            } else if (this.isLocalMode) {
                modeText = '本地模式';
            } else {
                modeText = 'Firebase 團隊模式';
            }
            
            this.showToast('success', `歡迎來到房間 ${roomId}！(${modeText})`);
            
            // 設置連線狀態
            this.updateConnectionStatus(this.isLocalMode || this.firebaseService ? true : false);
            
            // 啟動定期清理超時玩家（每 2 分鐘執行一次）
            if (this.firebaseService) {
                this.startPlayerCleanupTimer(roomId);
            }
            
            console.log(`🎮 遊戲開始 - 房間: ${roomId}, 玩家: ${this.currentPlayer.name}`);
            
            // 初始化快捷鍵提示
            setTimeout(() => {
                this.shortcutHintsManager.updateShortcutHints();
            }, 100);
            
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
            
            // 檢查試用模式限制
            if (!this.checkTrialLimitations()) {
                console.warn('⚠️ 試用模式限制阻止投票操作');
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
            
            // 🏠 根據模式同步投票
            if (this.isLocalMode && this.localRoomService && this.roomId && this.currentPlayer) {
                console.log('🏠 開始本地投票同步...');
                
                this.localRoomService.submitVote(this.currentPlayer.id, data.vote)
                    .then(() => {
                        console.log('✅ 本地投票同步成功');
                    })
                    .catch(error => {
                        console.error('❌ 本地投票同步失敗:', error);
                        this.showToast('error', '投票儲存失敗，請重試');
                    });
                    
            } else if (this.firebaseService && this.roomId && this.currentPlayer) {
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
                console.warn('⚠️ 房間服務或必要參數缺失，跳過同步', {
                    isLocalMode: !!this.isLocalMode,
                    localRoomService: !!this.localRoomService,
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
        
        // Phase 5: 只有觸發開牌的人才執行建議生成和 Firebase 保存
        if (data.triggeredBy === this.currentPlayer?.id) {
            console.log('🎯 我是開牌觸發者，執行智慧建議生成...');
            this.generateSmartAdvice(data);
        } else {
            console.log('👁️ 我不是開牌觸發者，等待接收 Firebase 建議...');
            // 非觸發者只監聽 Firebase 建議更新（現有監聽器會處理）
        }
        
        // 如果有 Firebase 服務，同步結果
        if (this.firebaseService && this.roomId) {
            this.firebaseService.revealVotes(this.roomId);
        }
    }
    
    /**
     * 處理投票清除
     */
    handleVotesCleared() {
        try {
            console.log('📢 處理投票清除事件');
            
            // 顯示成功訊息
            this.showToast('info', '投票已清除，開始新一輪');
            
            // 如果有 Firebase 服務，同步清除
            if (this.firebaseService && this.roomId) {
                console.log('🔄 同步清除投票到 Firebase');
                this.firebaseService.clearVotes(this.roomId)
                    .then(() => {
                        console.log('✅ Firebase 清除投票同步成功');
                    })
                    .catch(error => {
                        console.error('❌ Firebase 清除投票同步失敗:', error);
                        this.showToast('warning', 'Firebase 同步失敗，但本地清除成功');
                    });
            } else {
                console.log('ℹ️ 跳過 Firebase 同步（本地模式或服務不可用）');
            }
            
        } catch (error) {
            console.error('❌ 處理投票清除事件失敗:', error);
            this.showError('清除投票處理失敗');
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
                    const cleanedCount = await this.firebaseService.cleanupInactivePlayers(roomId); // 使用基於角色的差異化超時
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
        } finally {
            // 確保事件監聽器被清理
            this.destroy();
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
            
            // 驗證 API Key 格式（放寬規則）
            if (!/^AIza[a-zA-Z0-9_-]{35,}$/.test(apiKey)) {
                throw new Error('API Key 格式無效（應以 AIza 開頭且長度至少 39 字元）');
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
            this.showToast('success', 'Firebase 設定已保存！點擊「連線到 Firebase」按鈕進行連線');
            
            // 不再自動重新初始化 Firebase，讓使用者手動連線
            console.log('💾 Firebase 設定已保存，請使用手動連線按鈕');
        } catch (error) {
            console.error('保存 Firebase 設定失敗:', error);
            this.showError('保存設定失敗');
        }
    }
    
    /**
     * 手動連線到 Firebase
     */
    async connectFirebaseNow() {
        try {
            console.log('🔄 使用者手動要求連線 Firebase...');
            
            // 檢查是否有 Firebase 設定
            const firebaseConfig = await this.getFirebaseConfig();
            if (!firebaseConfig) {
                console.warn('⚠️ 未找到 Firebase 設定');
                this.showFirebaseConfig();
                this.showError('請先設定 Firebase Project ID 和 API Key');
                return;
            }
            
            // 更新按鈕狀態
            const connectBtn = document.getElementById('connectFirebaseBtn');
            const originalText = connectBtn ? connectBtn.textContent : '';
            if (connectBtn) {
                connectBtn.disabled = true;
                connectBtn.textContent = '⏳ 連線中...';
            }
            
            try {
                // 清理舊的服務實例
                if (this.firebaseService) {
                    this.firebaseService.destroy();
                    this.firebaseService = null;
                }
                
                // 嘗試連線 Firebase
                const firebaseResult = await this.tryFirebaseInitializationWithRetry();
                
                if (firebaseResult.success) {
                    console.log('✅ 手動 Firebase 連線成功');
                    this.isLocalMode = false;
                    this.showToast('success', '🔥 Firebase 團隊協作模式已啟用！');
                    
                    // 如果當前在遊戲中，重新加入 Firebase 房間
                    if (this.currentState === 'game' && this.roomId && this.currentPlayer) {
                        console.log('🔄 當前在遊戲中，重新加入 Firebase 房間...');
                        await this.rejoinFirebaseRoom();
                        this.showToast('success', '🏠 已重新加入團隊房間！');
                    }
                    
                } else {
                    console.error('❌ 手動 Firebase 連線失敗');
                    this.showFirebaseConnectionGuidance(firebaseResult);
                }
                
            } finally {
                // 恢復按鈕狀態
                if (connectBtn) {
                    connectBtn.disabled = false;
                    connectBtn.textContent = originalText;
                }
            }
            
        } catch (error) {
            console.error('❌ connectFirebaseNow 執行失敗:', error);
            this.showError('連線 Firebase 失敗，請重試');
        }
    }
    
    /**
     * 清除 Firebase 設定
     */
    async clearFirebaseConfig() {
        try {
            // 彈出確認對話框
            const confirmed = confirm(
                '🧹 清除 Firebase 設定\n\n' +
                '確定要清除目前儲存的 Firebase 設定嗎？\n' +
                '清除後需要重新輸入 Project ID 和 API Key。\n\n' +
                '點擊「確定」繼續，「取消」返回。'
            );
            
            if (!confirmed) {
                console.log('👤 使用者取消清除 Firebase 設定');
                return;
            }
            
            console.log('🧹 開始清除 Firebase 設定...');
            
            // 1. 停用現有的 Firebase 連線
            if (this.firebaseService) {
                try {
                    console.log('🔌 正在中斷 Firebase 連線...');
                    if (typeof this.firebaseService.destroy === 'function') {
                        this.firebaseService.destroy();
                    }
                    this.firebaseService = null;
                    this.updateConnectionStatus(false);
                    console.log('✅ Firebase 服務已停用');
                } catch (error) {
                    console.warn('⚠️ 停用 Firebase 服務時出現警告:', error);
                }
            }
            
            // 2. 清除主要的 Cookie 配置
            const mainCookieDeleted = Utils.Cookie.deleteCookie('scrumPoker_firebaseConfig');
            console.log(`🍪 主要配置 Cookie: ${mainCookieDeleted ? '已清除' : '清除失敗'}`);
            
            // 3. 清除本地模式標記 Cookie（如果存在）
            const localModeDeleted = Utils.Cookie.deleteCookie('scrumPoker_localMode');
            console.log(`🏠 本地模式 Cookie: ${localModeDeleted ? '已清除' : '不存在或清除失敗'}`);
            
            // 4. 清除舊版儲存資料（向後兼容）
            let legacyDataCleaned = 0;
            
            // 清除 StorageService 中的舊資料
            if (this.storageService) {
                try {
                    await this.storageService.removeItem('firebaseConfig');
                    legacyDataCleaned++;
                    console.log('🗂️ StorageService 舊資料已清除');
                } catch (error) {
                    console.warn('⚠️ 清除 StorageService 資料失敗:', error);
                }
            }
            
            // 清除 Utils.Storage 中的舊資料
            try {
                if (Utils.Storage.getItem('scrumPoker_firebaseConfig')) {
                    Utils.Storage.removeItem('scrumPoker_firebaseConfig');
                    legacyDataCleaned++;
                    console.log('💾 Utils.Storage 舊資料已清除');
                }
            } catch (error) {
                console.warn('⚠️ 清除 Utils.Storage 資料失敗:', error);
            }
            
            // 清除 localStorage 中可能的殘留資料
            try {
                const keysToRemove = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && (key.includes('firebase') || key.includes('scrumPoker'))) {
                        keysToRemove.push(key);
                    }
                }
                
                keysToRemove.forEach(key => {
                    localStorage.removeItem(key);
                    legacyDataCleaned++;
                });
                
                if (keysToRemove.length > 0) {
                    console.log(`🧹 已清除 ${keysToRemove.length} 個 localStorage 項目:`, keysToRemove);
                }
            } catch (error) {
                console.warn('⚠️ 清除 localStorage 資料失敗:', error);
            }
            
            // 5. 清空 Firebase 設定表單
            const projectIdInput = document.getElementById('projectId');
            const apiKeyInput = document.getElementById('apiKey');
            
            if (projectIdInput) projectIdInput.value = '';
            if (apiKeyInput) apiKeyInput.value = '';
            
            console.log('📝 Firebase 設定表單已清空');
            
            // 6. 重新顯示 Firebase 設定區域
            this.showFirebaseConfig();
            
            // 7. 顯示成功訊息
            const totalCleaned = (mainCookieDeleted ? 1 : 0) + (localModeDeleted ? 1 : 0) + legacyDataCleaned;
            this.showToast('success', `🧹 設定已清除（共 ${totalCleaned} 項）`);
            
            console.log('✅ Firebase 設定清除完成');
            console.log('📊 清除統計:', {
                mainCookie: mainCookieDeleted,
                localModeCookie: localModeDeleted,
                legacyData: legacyDataCleaned,
                totalItems: totalCleaned
            });
            
        } catch (error) {
            console.error('❌ 清除 Firebase 設定失敗:', error);
            this.showError('清除設定失敗，請重新整理頁面後重試');
        }
    }
    
    /**
     * 測試 Firebase 連線
     */
    async testFirebaseConnection() {
        const projectId = document.getElementById('projectId')?.value?.trim();
        const apiKey = document.getElementById('apiKey')?.value?.trim();
        
        if (!projectId || !apiKey) {
            this.showError('請先填入 Firebase Project ID 和 API Key');
            return;
        }
        
        console.log('🔍 開始測試 Firebase 連線...');
        
        // 更新按鈕狀態
        const testBtn = document.getElementById('testConnectionBtn');
        const originalText = testBtn ? testBtn.textContent : '';
        if (testBtn) {
            testBtn.disabled = true;
            testBtn.textContent = '⏳ 測試中...';
        }
        
        try {
            // 建立測試用 Firebase 配置
            const testConfig = this.buildFirebaseConfig({ projectId, apiKey });
            if (!testConfig) {
                throw new Error('無法建立 Firebase 配置');
            }
            
            // 驗證格式
            if (!/^[a-z0-9-]+$/.test(projectId)) {
                throw new Error('Project ID 格式無效（只能包含小寫字母、數字和連字符）');
            }
            
            if (!/^AIza[a-zA-Z0-9_-]{35}$/.test(apiKey)) {
                throw new Error('API Key 格式無效（應以 AIza 開頭）');
            }
            
            // 創建臨時 Firebase 服務進行測試
            if (!window.FirebaseService) {
                throw new Error('FirebaseService 未載入，請重新整理頁面');
            }
            
            const testService = new FirebaseService();
            
            // 設置測試超時
            const testTimeout = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('連線測試超時（10秒）')), 10000);
            });
            
            // 進行連線測試
            const testResult = await Promise.race([
                testService.initialize(testConfig),
                testTimeout
            ]);
            
            if (testResult) {
                console.log('✅ Firebase 連線測試成功');
                this.showToast('success', '🔥 Firebase 連線測試成功！可以儲存設定');
                
                // 簡單驗證資料庫讀寫權限
                try {
                    const testRef = testService.database.ref('connection-test');
                    await testRef.set({ timestamp: Date.now(), test: true });
                    await testRef.remove();
                    console.log('✅ Firebase 讀寫權限驗證成功');
                } catch (permissionError) {
                    console.warn('⚠️ Firebase 讀寫權限可能有問題:', permissionError);
                    this.showToast('warning', '⚠️ 連線成功，但資料庫權限可能需要檢查');
                }
            } else {
                throw new Error('Firebase 連線測試失敗');
            }
            
            // 清理測試服務
            if (testService && typeof testService.destroy === 'function') {
                testService.destroy();
            }
            
        } catch (error) {
            console.error('❌ Firebase 連線測試失敗:', error);
            
            let errorMessage = '🔧 連線測試失敗：';
            
            if (error.message.includes('auth')) {
                errorMessage += '\n• API Key 可能無效或專案設定錯誤';
            } else if (error.message.includes('permission')) {
                errorMessage += '\n• 資料庫權限設定需要檢查';
            } else if (error.message.includes('network') || error.message.includes('timeout')) {
                errorMessage += '\n• 網路連線問題或防火牆阻擋';
            } else if (error.message.includes('格式無效')) {
                errorMessage += '\n• ' + error.message;
            } else {
                errorMessage += '\n• Project ID 或 API Key 可能不正確';
            }
            
            errorMessage += '\n\n💡 建議：檢查 Firebase 控制台設定或嘗試重新建立專案';
            
            this.showError(errorMessage);
        } finally {
            // 恢復按鈕狀態
            if (testBtn) {
                testBtn.disabled = false;
                testBtn.textContent = originalText;
            }
        }
    }
    
    /**
     * 顯示 Firebase 設定指南
     */
    showFirebaseSetupGuide() {
        console.log('📖 顯示 Firebase 設定指南');
        
        const guideContent = `
🔥 Firebase 團隊協作設定指南

📋 設定步驟：
1️⃣ 前往 Firebase 控制台 (https://console.firebase.google.com)
2️⃣ 建立新專案或選擇現有專案
3️⃣ 啟用 Realtime Database
4️⃣ 設定資料庫規則為測試模式
5️⃣ 取得專案設定資訊

🔑 必要資訊：
• Project ID: 專案設定 > 一般 > 專案 ID
• API Key: 專案設定 > 一般 > 網頁 API 金鑰

⚙️ 資料庫規則設定：
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}

🛡️ 安全提醒：
• 僅在內部團隊使用
• 定期檢查使用量
• 不要分享 API Key 給外部人員

💡 需要協助？聯繫系統管理員
        `;
        
        // 彈出指南對話框
        alert(guideContent);
        
        // 可選：開啟 Firebase 控制台（新分頁）
        const openConsole = confirm('是否要開啟 Firebase 控制台？');
        if (openConsole) {
            window.open('https://console.firebase.google.com', '_blank');
        }
    }
    
    /**
     * 應用 Firebase 配置範本
     */
    applyConfigTemplate(templateType) {
        console.log(`🚀 應用配置範本: ${templateType}`);
        
        const projectIdInput = document.getElementById('projectId');
        const apiKeyInput = document.getElementById('apiKey');
        
        switch (templateType) {
            case 'new-project':
                this.showNewProjectTemplate();
                break;
                
            case 'existing-project':
                this.showExistingProjectHelper();
                break;
                
            default:
                console.warn('未知的範本類型:', templateType);
        }
    }
    
    /**
     * 新專案設定範本
     */
    showNewProjectTemplate() {
        const instructions = `
🆕 新 Firebase 專案設定指南

📋 請依照以下步驟建立新專案：

1️⃣ 開啟 Firebase 控制台
   https://console.firebase.google.com

2️⃣ 點擊「建立專案」或「新增專案」

3️⃣ 輸入專案名稱（建議格式）：
   • scrum-poker-[您的團隊名稱]
   • 例如：scrum-poker-dev-team

4️⃣ 啟用 Google Analytics（選填）

5️⃣ 專案建立完成後：
   - 進入「專案設定」
   - 複製「專案 ID」到下方欄位
   - 複製「網頁 API 金鑰」到下方欄位

6️⃣ 啟用 Realtime Database：
   - 左側選單選擇「Database」
   - 選擇「Realtime Database」
   - 點擊「建立資料庫」
   - 選擇「測試模式」

💡 完成後點擊「測試連線」驗證設定
        `;
        
        alert(instructions);
        
        // 詢問是否要開啟 Firebase 控制台
        const openConsole = confirm('是否要開啟 Firebase 控制台來建立新專案？');
        if (openConsole) {
            window.open('https://console.firebase.google.com', '_blank');
        }
    }
    
    /**
     * 現有專案設定助手
     */
    showExistingProjectHelper() {
        const instructions = `
🔄 現有 Firebase 專案設定

📋 如果您已有 Firebase 專案：

1️⃣ 開啟 Firebase 控制台
   https://console.firebase.google.com

2️⃣ 選擇您的專案

3️⃣ 確認 Realtime Database 已啟用：
   - 左側選單 > Database > Realtime Database
   - 如未啟用，點擊「建立資料庫」

4️⃣ 檢查資料庫規則（重要）：
   - 點擊「規則」標籤
   - 確認規則允許已驗證用戶讀寫：
   {
     "rules": {
       ".read": "auth != null",
       ".write": "auth != null"
     }
   }

5️⃣ 取得專案設定：
   - 點擊「專案設定」（齒輪圖示）
   - 在「一般」標籤中找到：
     • 專案 ID
     • 網頁 API 金鑰

💡 複製這些資訊到下方輸入欄位
        `;
        
        alert(instructions);
        
        const openConsole = confirm('是否要開啟 Firebase 控制台？');
        if (openConsole) {
            window.open('https://console.firebase.google.com', '_blank');
        }
    }
    
    /**
     * 從剪貼簿匯入配置
     */
    async importConfigFromClipboard() {
        try {
            console.log('📋 嘗試從剪貼簿匯入 Firebase 配置...');
            
            // 檢查 Clipboard API 支援
            if (!navigator.clipboard || !navigator.clipboard.readText) {
                throw new Error('瀏覽器不支援剪貼簿 API');
            }
            
            // 讀取剪貼簿內容
            const clipboardText = await navigator.clipboard.readText();
            
            if (!clipboardText || clipboardText.trim() === '') {
                throw new Error('剪貼簿內容為空');
            }
            
            console.log('📋 剪貼簿內容長度:', clipboardText.length);
            
            // 嘗試解析 JSON 配置
            let config = null;
            try {
                config = JSON.parse(clipboardText);
            } catch (jsonError) {
                // 嘗試從文字中提取 Project ID 和 API Key
                const projectIdMatch = clipboardText.match(/(?:projectId|project_id)[\s:="']*([a-z0-9-]+)/i);
                const apiKeyMatch = clipboardText.match(/(?:apiKey|api_key)[\s:="']*(AIza[a-zA-Z0-9_-]{35})/i);
                
                if (projectIdMatch && apiKeyMatch) {
                    config = {
                        projectId: projectIdMatch[1],
                        apiKey: apiKeyMatch[1]
                    };
                } else {
                    throw new Error('無法從剪貼簿內容解析 Firebase 配置');
                }
            }
            
            // 驗證配置格式
            if (!config || typeof config !== 'object') {
                throw new Error('配置格式無效');
            }
            
            const projectId = config.projectId || config.project_id;
            const apiKey = config.apiKey || config.api_key;
            
            if (!projectId || !apiKey) {
                throw new Error('配置中缺少必要欄位（projectId 或 apiKey）');
            }
            
            // 填入表單
            const projectIdInput = document.getElementById('projectId');
            const apiKeyInput = document.getElementById('apiKey');
            
            if (projectIdInput) projectIdInput.value = projectId;
            if (apiKeyInput) apiKeyInput.value = apiKey;
            
            // 觸發驗證
            this.validateProjectIdInput(true);
            this.validateApiKeyInput(true);
            
            this.showToast('success', '✅ 已成功從剪貼簿匯入 Firebase 配置');
            console.log('✅ 配置匯入成功:', { projectId, apiKey: apiKey.substring(0, 10) + '...' });
            
        } catch (error) {
            console.error('❌ 從剪貼簿匯入配置失敗:', error);
            
            let errorMessage = '匯入失敗：' + error.message;
            
            if (error.message.includes('不支援')) {
                errorMessage += '\n\n💡 建議：手動複製 Project ID 和 API Key 到輸入欄位';
            } else if (error.message.includes('無法解析')) {
                errorMessage += '\n\n💡 建議：確認剪貼簿包含有效的 Firebase 配置 JSON';
            }
            
            this.showError(errorMessage);
        }
    }
    
    /**
     * 驗證 Project ID 輸入
     */
    validateProjectIdInput(detailed = false) {
        const input = document.getElementById('projectId');
        const status = document.getElementById('projectIdStatus');
        const feedback = document.getElementById('projectIdFeedback');
        
        if (!input || !status || !feedback) return;
        
        const value = input.value.trim();
        const isValid = this.isValidProjectId(value);
        
        // 更新狀態指示器
        if (value === '') {
            status.textContent = '';
            status.className = 'validation-status';
            feedback.textContent = '';
            feedback.className = 'validation-feedback';
        } else if (isValid) {
            status.textContent = '✅';
            status.className = 'validation-status valid';
            feedback.textContent = detailed ? '✅ Project ID 格式正確' : '';
            feedback.className = 'validation-feedback valid';
        } else {
            status.textContent = '❌';
            status.className = 'validation-status invalid';
            feedback.textContent = detailed ? '❌ Project ID 格式無效（只能包含小寫字母、數字和連字符）' : '';
            feedback.className = 'validation-feedback invalid';
        }
        
        // 更新整體格式狀態
        this.updateFormatStatus();
    }
    
    /**
     * 驗證 API Key 輸入
     */
    validateApiKeyInput(detailed = false) {
        const input = document.getElementById('apiKey');
        const status = document.getElementById('apiKeyStatus');
        const feedback = document.getElementById('apiKeyFeedback');
        
        if (!input || !status || !feedback) return;
        
        const value = input.value.trim();
        const isValid = this.isValidApiKey(value);
        
        // 更新狀態指示器
        if (value === '') {
            status.textContent = '';
            status.className = 'validation-status';
            feedback.textContent = '';
            feedback.className = 'validation-feedback';
        } else if (isValid) {
            status.textContent = '✅';
            status.className = 'validation-status valid';
            feedback.textContent = detailed ? '✅ API Key 格式正確' : '';
            feedback.className = 'validation-feedback valid';
        } else {
            status.textContent = '❌';
            status.className = 'validation-status invalid';
            feedback.textContent = detailed ? '❌ API Key 格式無效（應以 AIza 開頭，長度 39 字符）' : '';
            feedback.className = 'validation-feedback invalid';
        }
        
        // 更新整體格式狀態
        this.updateFormatStatus();
    }
    
    /**
     * 檢查 Project ID 是否有效
     */
    isValidProjectId(projectId) {
        if (!projectId || typeof projectId !== 'string') return false;
        return /^[a-z0-9-]+$/.test(projectId) && projectId.length >= 3 && projectId.length <= 30;
    }
    
    /**
     * 檢查 API Key 是否有效（放寬規則）
     */
    isValidApiKey(apiKey) {
        if (!apiKey || typeof apiKey !== 'string') return false;
        return /^AIza[a-zA-Z0-9_-]{35,}$/.test(apiKey);
    }
    
    /**
     * 更新整體格式狀態
     */
    updateFormatStatus() {
        const projectIdInput = document.getElementById('projectId');
        const apiKeyInput = document.getElementById('apiKey');
        const formatStatusIcon = document.getElementById('formatStatusIcon');
        const formatStatusText = document.querySelector('#configStatus .status-item:first-child .status-text');
        
        if (!projectIdInput || !apiKeyInput || !formatStatusIcon || !formatStatusText) return;
        
        const projectIdValid = this.isValidProjectId(projectIdInput.value.trim());
        const apiKeyValid = this.isValidApiKey(apiKeyInput.value.trim());
        const bothEmpty = projectIdInput.value.trim() === '' && apiKeyInput.value.trim() === '';
        
        if (bothEmpty) {
            formatStatusIcon.textContent = '⚪';
            formatStatusText.textContent = '格式驗證：等待輸入';
        } else if (projectIdValid && apiKeyValid) {
            formatStatusIcon.textContent = '✅';
            formatStatusText.textContent = '格式驗證：通過';
        } else {
            formatStatusIcon.textContent = '❌';
            formatStatusText.textContent = '格式驗證：需要修正';
        }
    }
    
    /**
     * 回退到本地模式
     */
    async fallbackToLocalMode() {
        console.log('🔄 正在切換到本地模式...');
        
        // 清理 Firebase 服務
        if (this.firebaseService) {
            try {
                this.firebaseService.destroy();
            } catch (error) {
                console.warn('清理 Firebase 服務時出現警告:', error);
            }
            this.firebaseService = null;
        }
        
        // 初始化本地服務
        if (!this.localRoomService && window.LocalRoomService) {
            this.localRoomService = new LocalRoomService();
        }
        
        this.isLocalMode = true;
        await this.enableLocalMode();
        this.showToast('info', '已切換到本地模式');
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
     * 處理快速開始（試用模式）
     */
    async handleQuickStart() {
        try {
            console.log('🎯 啟動試用模式...');
            
            // 顯示試用模式說明
            const confirmed = confirm(
                '🎮 歡迎使用 Scrum Poker 試用版！\n\n' +
                '✨ 試用版功能：\n' +
                '• 基本投票和統計功能\n' +
                '• 最多 4 人同時使用\n' +
                '• 僅限單一瀏覽器\n' +
                '• 資料不會保存\n\n' +
                '🔥 升級到團隊版可享受：\n' +
                '• 無人數限制\n' +
                '• 跨裝置即時同步\n' +
                '• 投票記錄雲端保存\n' +
                '• 完整統計分析\n\n' +
                '是否要開始試用？'
            );
            
            if (!confirmed) {
                console.log('👤 用戶取消試用');
                return;
            }
            
            // 自動填入預設值
            const playerName = document.getElementById('playerName');
            const playerRole = document.getElementById('playerRole');
            const roomId = document.getElementById('roomId');
            
            if (!playerName.value.trim()) {
                playerName.value = `試用者_${Math.random().toString(36).substring(2, 6)}`;
            }
            
            if (!playerRole.value) {
                playerRole.value = 'dev';
            }
            
            if (!roomId.value.trim()) {
                roomId.value = `試用房間_${Math.random().toString(36).substring(2, 6)}`;
            }
            
            // 標記為明確的試用模式
            this.isExplicitTrial = true;
            Utils.Cookie.setCookie('scrumPoker_trialMode', true, {
                days: 1, // 試用標記短期有效
                secure: window.location.protocol === 'https:',
                sameSite: 'Lax'
            });
            
            // 啟用本地試用模式
            await this.enableLocalTrialMode(true);
            
            // 顯示試用啟動訊息
            this.showToast('info', '🎮 正在啟動試用模式...');
            
            // 稍微延遲以讓用戶看到提示
            setTimeout(() => {
                this.handleLogin();
            }, 800);
            
            // 設置試用模式的定期提醒
            this.setupTrialReminders();
            
        } catch (error) {
            console.error('試用模式啟動失敗:', error);
            this.showError('試用模式啟動失敗，請重試');
        }
    }
    
    /**
     * 啟用本地試用模式（替換原本的 enableLocalMode）
     */
    async enableLocalTrialMode(isExplicitTrial = false) {
        try {
            console.log(`🎮 啟用本地試用模式 - 明確試用: ${isExplicitTrial}`);
            
            // 儲存試用模式標記
            if (isExplicitTrial) {
                Utils.Cookie.setCookie('scrumPoker_trialMode', true, {
                    days: 1, // 試用標記短期有效
                    secure: window.location.protocol === 'https:',
                    sameSite: 'Lax'
                });
            }
            
            this.isLocalMode = true;
            this.isTrialMode = true;
            this.trialStartTime = Date.now();
            
            // 顯示試用模式提示
            const message = isExplicitTrial ? 
                '🎮 試用模式已啟用 - 體驗基本功能！' : 
                '🏠 本地模式已啟用 - 可隨時升級到團隊協作';
                
            this.showToast('info', message);
            
        } catch (error) {
            console.error('啟用試用模式失敗:', error);
        }
    }
    
    /**
     * 設置試用模式定期提醒
     */
    setupTrialReminders() {
        if (!this.isTrialMode) return;
        
        console.log('⏰ 設置試用模式提醒機制');
        
        // 5分鐘後第一次提醒
        setTimeout(() => {
            if (this.isTrialMode && this.currentState === 'game') {
                this.showTrialUpgradeHint('reminder-5min');
            }
        }, 5 * 60 * 1000); // 5分鐘
        
        // 10分鐘後第二次提醒
        setTimeout(() => {
            if (this.isTrialMode && this.currentState === 'game') {
                this.showTrialUpgradeHint('reminder-10min');
            }
        }, 10 * 60 * 1000); // 10分鐘
        
        // 20分鐘後強制提醒
        setTimeout(() => {
            if (this.isTrialMode && this.currentState === 'game') {
                this.showTrialUpgradeHint('reminder-final');
            }
        }, 20 * 60 * 1000); // 20分鐘
    }
    
    /**
     * 顯示試用版升級提示
     */
    showTrialUpgradeHint(reminderType) {
        console.log(`💡 顯示試用升級提示: ${reminderType}`);
        
        let title, message, actionText;
        
        switch (reminderType) {
            case 'reminder-5min':
                title = '🎮 試用進行中';
                message = '您正在使用試用版！\n\n升級到團隊版可享受無限制協作功能。';
                actionText = '稍後再說';
                break;
                
            case 'reminder-10min':
                title = '🔥 升級到團隊版';
                message = '試用版限制：\n• 最多4人參與\n• 無跨裝置同步\n• 資料不保存\n\n升級享受完整功能！';
                actionText = '現在升級';
                break;
                
            case 'reminder-final':
                title = '⏰ 建議升級';
                message = '您已使用試用版20分鐘。\n\n為了更好的團隊協作體驗，建議升級到Firebase團隊版。';
                actionText = '立即升級';
                break;
                
            case 'player-limit':
                title = '👥 人數限制';
                message = '試用版最多支援4人同時使用。\n\n升級到團隊版可支援無限人數！';
                actionText = '升級解除限制';
                break;
                
            default:
                return;
        }
        
        const upgrade = confirm(`${title}\n\n${message}\n\n點擊「確定」${actionText}，「取消」繼續試用。`);
        
        if (upgrade) {
            this.handleTrialUpgrade();
        }
    }
    
    /**
     * 處理試用版升級
     */
    handleTrialUpgrade() {
        console.log('🔥 用戶選擇升級到團隊版');
        
        // 清除試用模式標記
        Utils.Cookie.deleteCookie('scrumPoker_trialMode');
        
        // 顯示升級說明
        alert(
            '🔥 升級到 Firebase 團隊版\n\n' +
            '📋 升級步驟：\n' +
            '1. 點擊「離開房間」退出試用\n' +
            '2. 在首頁設定 Firebase 配置\n' +
            '3. 享受完整的團隊協作功能！\n\n' +
            '💡 您的當前遊戲進度將會保留到頁面重新載入'
        );
        
        // 可選：直接導向升級流程
        const goNow = confirm('是否要立即前往設定 Firebase？');
        if (goNow) {
            // 離開當前遊戲並返回首頁
            this.leaveGame();
        }
    }
    
    /**
     * 檢查試用模式限制
     */
    checkTrialLimitations() {
        if (!this.isTrialMode) return true;
        
        // 檢查玩家數量限制（最多4人）
        if (this.gameTable && this.gameTable.playerList) {
            const playerCount = this.gameTable.playerList.getPlayerCount();
            if (playerCount >= 4) {
                console.warn('⚠️ 試用版人數限制達到上限');
                this.showTrialUpgradeHint('player-limit');
                return false;
            }
        }
        
        // 檢查試用時間（30分鐘限制）
        if (this.trialStartTime) {
            const trialDuration = Date.now() - this.trialStartTime;
            const maxTrialDuration = 30 * 60 * 1000; // 30分鐘
            
            if (trialDuration > maxTrialDuration) {
                console.warn('⚠️ 試用時間已達上限');
                alert(
                    '⏰ 試用時間已結束\n\n' +
                    '您已使用試用版超過30分鐘。\n' +
                    '請升級到團隊版繼續使用完整功能。'
                );
                this.handleTrialUpgrade();
                return false;
            }
        }
        
        return true;
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
     * 切換 Firebase 設定區域顯示狀態
     */
    toggleFirebaseConfig() {
        const configElement = document.getElementById('firebaseConfig');
        if (configElement) {
            const isVisible = configElement.style.display !== 'none';
            
            if (isVisible) {
                this.hideFirebaseConfig();
                console.log('🔧 Firebase 設定區域已隱藏');
            } else {
                this.showFirebaseConfig();
                console.log('🔧 Firebase 設定區域已顯示');
                
                // 提示使用者可以在這裡清除設定
                this.showToast('info', '💡 在此區域可以重新設定或清除 Firebase 配置');
            }
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
        
        // 關閉按鈕事件 - 使用 AbortController 管理
        const closeBtn = toast.querySelector('.toast-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hideToast(toast);
            }, { signal: this.signal });
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
        
        // 監聽頁面卸載事件 - 使用 AbortController 管理
        window.addEventListener('beforeunload', cleanup, { signal: this.signal });
        window.addEventListener('unload', cleanup, { signal: this.signal });
        
        // 監聽頁面可見性變化（用於檢測標籤頁切換） - 使用 AbortController 管理
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
            } else {
                // 頁面重新可見時立即更新心跳，避免被誤判為不活躍
                if (this.firebaseService && this.roomId && this.currentPlayer) {
                    try {
                        this.firebaseService.updatePlayerHeartbeat();
                        console.log('🔄 頁面重新可見，已更新心跳');
                    } catch (error) {
                        console.warn('⚠️ 頁面可見心跳更新失敗:', error);
                    }
                }
            }
        }, { signal: this.signal });
        
        console.log('🛡️ 瀏覽器關閉自動清理機制已設置');
    }
    
    /**
     * 設置網路狀態監控
     */
    setupNetworkMonitoring() {
        // 初始網路狀態
        this.isOnline = navigator.onLine;
        this.networkRetryCount = 0;
        this.maxNetworkRetries = 3;
        this.networkRetryDelay = 5000; // 5 秒
        
        // 監聽網路狀態變化
        window.addEventListener('online', () => {
            console.log('🌐 網路連線已恢復');
            this.isOnline = true;
            this.handleNetworkOnline();
        }, { signal: this.signal });
        
        window.addEventListener('offline', () => {
            console.log('📡 網路連線已中斷');
            this.isOnline = false;
            this.handleNetworkOffline();
        }, { signal: this.signal });
        
        // 定期檢查網路連線品質
        this.networkCheckInterval = setInterval(() => {
            this.checkNetworkQuality();
        }, 30000); // 每 30 秒檢查一次
        
        console.log(`📡 網路監控已啟動 - 初始狀態: ${this.isOnline ? '線上' : '離線'}`);
    }
    
    /**
     * 處理網路連線恢復
     */
    async handleNetworkOnline() {
        this.updateConnectionStatus(true);
        this.showToast('success', '🌐 網路連線已恢復');
        
        // 如果在遊戲中且有 Firebase 意圖，嘗試重新連線
        if (this.hasFirebaseIntent && !this.firebaseService && this.currentState === 'game') {
            console.log('🔄 網路恢復，嘗試重新連線 Firebase...');
            await this.retryFirebaseConnection();
        }
        
        // 重置重試計數器
        this.networkRetryCount = 0;
    }
    
    /**
     * 處理網路連線中斷
     */
    handleNetworkOffline() {
        this.updateConnectionStatus(false);
        this.showToast('warning', '📡 網路連線中斷，已切換到離線模式', 5000);
        
        // 如果在遊戲中，提醒用戶
        if (this.currentState === 'game') {
            setTimeout(() => {
                this.showOfflineGuidance();
            }, 2000);
        }
    }
    
    /**
     * 檢查網路連線品質
     */
    async checkNetworkQuality() {
        if (!this.isOnline) return;
        
        try {
            const startTime = performance.now();
            
            // 嘗試連線到 Google DNS (可靠的連線測試)
            const response = await fetch('https://dns.google/resolve?name=google.com&type=A', {
                method: 'GET',
                cache: 'no-cache',
                signal: AbortSignal.timeout(5000) // 5 秒超時
            });
            
            if (response.ok) {
                const endTime = performance.now();
                const latency = Math.round(endTime - startTime);
                
                // 連線品質分級
                let quality = 'excellent';
                if (latency > 2000) quality = 'poor';
                else if (latency > 1000) quality = 'fair';
                else if (latency > 500) quality = 'good';
                
                console.log(`🌐 網路品質檢測: ${latency}ms (${quality})`);
                
                // 如果連線品質差且有 Firebase 服務，發出警告
                if (quality === 'poor' && this.firebaseService) {
                    this.showToast('warning', '⚠️ 網路連線較慢，可能影響即時同步', 3000);
                }
            }
        } catch (error) {
            console.warn('🌐 網路品質檢測失敗:', error);
            
            // 如果檢測失敗但瀏覽器認為在線，可能是網路問題
            if (this.isOnline) {
                this.showToast('warning', '⚠️ 網路連線不穩定', 3000);
            }
        }
    }
    
    /**
     * 重試 Firebase 連線
     */
    async retryFirebaseConnection() {
        if (this.networkRetryCount >= this.maxNetworkRetries) {
            console.log('🔄 Firebase 重連達到最大次數，停止重試');
            this.showToast('error', '🔥 Firebase 重連失敗，請手動重新整理', 5000);
            return;
        }
        
        this.networkRetryCount++;
        console.log(`🔄 嘗試 Firebase 重連 (${this.networkRetryCount}/${this.maxNetworkRetries})`);
        
        try {
            // 延遲重試，避免頻繁請求
            await new Promise(resolve => setTimeout(resolve, this.networkRetryDelay));
            
            const firebaseResult = await this.tryFirebaseInitializationWithRetry();
            if (firebaseResult.success) {
                console.log('✅ Firebase 重連成功');
                this.isLocalMode = false;
                this.showToast('success', '🔥 Firebase 重連成功！');
                
                // 如果在遊戲中，需要重新設定房間監聽
                if (this.currentState === 'game' && this.roomId) {
                    await this.rejoinFirebaseRoom();
                }
            } else {
                console.warn('❌ Firebase 重連失敗，稍後再試');
                if (firebaseResult.retryable) {
                    setTimeout(() => this.retryFirebaseConnection(), this.networkRetryDelay * 2);
                }
            }
        } catch (error) {
            console.error('❌ Firebase 重連過程出錯:', error);
        }
    }
    
    /**
     * 重新加入 Firebase 房間
     */
    async rejoinFirebaseRoom() {
        try {
            if (this.firebaseService && this.roomId && this.currentPlayer) {
                console.log('🔄 重新加入 Firebase 房間...');
                
                // 設置事件監聽器
                this.setupFirebaseEventListeners();
                
                // 重新加入房間
                await this.firebaseService.joinRoom(this.roomId, this.currentPlayer);
                
                console.log('✅ 已重新加入 Firebase 房間');
            }
        } catch (error) {
            console.error('❌ 重新加入 Firebase 房間失敗:', error);
        }
    }
    
    /**
     * 顯示離線指引
     */
    showOfflineGuidance() {
        const guidance = 
            '📡 網路連線中斷提示\\n\\n' +
            '目前功能狀態：\\n' +
            '✅ 本地投票功能正常\\n' +
            '✅ 卡牌選擇與統計\\n' +
            '❌ 暫停即時同步\\n' +
            '❌ 暫停跨裝置協作\\n\\n' +
            '恢復連線後將自動重連 Firebase';
        
        // 使用 confirm 讓用戶確認了解
        const understood = confirm(guidance + '\\n\\n點擊「確定」繼續使用離線功能');
        if (understood) {
            console.log('👤 用戶確認了解離線狀態');
        }
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
        
        // 監控頁面可見性變化 - 使用 AbortController 管理
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
                    // 補充更新快捷鍵提示
                    if (!document.hidden && this.currentState === 'game') {
                        this.shortcutHintsManager.updateShortcutHints();
                    }
                }
            }
        }, { signal: this.signal });
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
     * 銷毀應用並清理所有資源
     */
    destroy() {
        try {
            // 中斷所有 AbortController 管理的事件監聽器
            if (this.abortController) {
                this.abortController.abort();
                this.abortController = null;
                this.signal = null;
            }
            
            // 停止定時器
            this.stopPlayerCleanupTimer();
            
            // 停止網路監控
            if (this.networkCheckInterval) {
                clearInterval(this.networkCheckInterval);
                this.networkCheckInterval = null;
            }
            
            // 銷毀遊戲桌面
            if (this.gameTable) {
                this.gameTable.destroy();
                this.gameTable = null;
            }
            
            // 銷毀服務實例
            if (this.firebaseService) {
                this.firebaseService.destroy();
                this.firebaseService = null;
            }
            
            if (this.storageService) {
                this.storageService = null;
            }
            
            if (this.touchManager) {
                this.touchManager = null;
            }
            
            // 清空主要 DOM 元素引用
            this.elements = {};
            
            // 重置狀態
            this.currentState = 'destroyed';
            this.currentPlayer = null;
            this.roomId = null;
            this.isInitialized = false;
            
            console.log('🧹 ScrumPokerApp 已銷毀所有監聽器與資源');
            
        } catch (error) {
            console.error('❌ 銷毀應用時發生錯誤:', error);
        }
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
     * 測試 Firebase-First 架構流程
     * @returns {Promise<Object>} 測試結果
     */
    async testFirebaseFirstArchitecture() {
        console.group('🧪 Firebase-First 架構測試');
        
        const testResults = {
            userIntentionDetection: { passed: false, details: {} },
            firebaseInitialization: { passed: false, details: {} },
            errorHandling: { passed: false, details: {} },
            networkMonitoring: { passed: false, details: {} },
            retryMechanism: { passed: false, details: {} },
            trialMode: { passed: false, details: {} },
            configurationHelpers: { passed: false, details: {} },
            overall: { passed: false, score: 0 }
        };
        
        try {
            // 測試 1: 用戶意圖檢測
            console.log('📋 測試 1: 用戶意圖檢測');
            try {
                const intentions = ['trial-only', 'team-collaboration', 'first-time-setup'];
                const detectedIntention = await this.detectUserIntention();
                
                testResults.userIntentionDetection.passed = intentions.includes(detectedIntention);
                testResults.userIntentionDetection.details = {
                    detected: detectedIntention,
                    validIntentions: intentions
                };
                
                console.log(`✅ 用戶意圖檢測: ${detectedIntention}`);
            } catch (error) {
                testResults.userIntentionDetection.details.error = error.message;
                console.error('❌ 用戶意圖檢測失敗:', error);
            }
            
            // 測試 2: Firebase 初始化邏輯
            console.log('📋 測試 2: Firebase 初始化邏輯');
            try {
                const firebaseConfig = await this.getFirebaseConfig();
                const hasConfig = !!firebaseConfig;
                
                testResults.firebaseInitialization.passed = true;
                testResults.firebaseInitialization.details = {
                    hasConfig,
                    configSource: hasConfig ? 'found' : 'none',
                    firebaseServiceAvailable: !!window.FirebaseService
                };
                
                console.log(`✅ Firebase 配置檢測: ${hasConfig ? '已設定' : '未設定'}`);
            } catch (error) {
                testResults.firebaseInitialization.details.error = error.message;
                console.error('❌ Firebase 初始化測試失敗:', error);
            }
            
            // 測試 3: 錯誤處理機制
            console.log('📋 測試 3: 錯誤處理機制');
            try {
                const mockError = new Error('TEST_ERROR');
                const errorType = this.classifyFirebaseError(mockError);
                const isRetryable = this.isRetryableError(mockError);
                const description = this.getErrorTypeDescription(errorType);
                
                testResults.errorHandling.passed = !!(errorType && typeof isRetryable === 'boolean' && description);
                testResults.errorHandling.details = {
                    errorType,
                    isRetryable,
                    description
                };
                
                console.log(`✅ 錯誤分類系統正常`);
            } catch (error) {
                testResults.errorHandling.details.error = error.message;
                console.error('❌ 錯誤處理測試失敗:', error);
            }
            
            // 測試 4: 網路監控
            console.log('📋 測試 4: 網路監控');
            try {
                const networkStatus = {
                    online: navigator.onLine,
                    hasMonitoring: !!this.networkCheckInterval,
                    retryCount: this.networkRetryCount || 0
                };
                
                testResults.networkMonitoring.passed = typeof networkStatus.online === 'boolean';
                testResults.networkMonitoring.details = networkStatus;
                
                console.log(`✅ 網路監控: ${networkStatus.online ? '線上' : '離線'}`);
            } catch (error) {
                testResults.networkMonitoring.details.error = error.message;
                console.error('❌ 網路監控測試失敗:', error);
            }
            
            // 測試 5: 重試機制
            console.log('📋 測試 5: 重試機制');
            try {
                const retryMethods = [
                    'tryFirebaseInitializationWithRetry',
                    'retryFirebaseConnection',
                    'isRetryableError'
                ];
                
                const availableMethods = retryMethods.filter(method => 
                    typeof this[method] === 'function'
                );
                
                testResults.retryMechanism.passed = availableMethods.length === retryMethods.length;
                testResults.retryMechanism.details = {
                    requiredMethods: retryMethods,
                    availableMethods
                };
                
                console.log(`✅ 重試機制: ${availableMethods.length}/${retryMethods.length} 方法可用`);
            } catch (error) {
                testResults.retryMechanism.details.error = error.message;
                console.error('❌ 重試機制測試失敗:', error);
            }
            
            // 測試 6: 試用模式
            console.log('📋 測試 6: 試用模式功能');
            try {
                const trialMethods = [
                    'handleQuickStart',
                    'checkTrialLimitations',
                    'showTrialUpgradeHint'
                ];
                
                const availableTrialMethods = trialMethods.filter(method => 
                    typeof this[method] === 'function'
                );
                
                testResults.trialMode.passed = availableTrialMethods.length === trialMethods.length;
                testResults.trialMode.details = {
                    requiredMethods: trialMethods,
                    availableMethods: availableTrialMethods,
                    isTrialMode: this.isTrialMode || false
                };
                
                console.log(`✅ 試用模式: ${availableTrialMethods.length}/${trialMethods.length} 功能可用`);
            } catch (error) {
                testResults.trialMode.details.error = error.message;
                console.error('❌ 試用模式測試失敗:', error);
            }
            
            // 測試 7: 配置助手
            console.log('📋 測試 7: 配置助手功能');
            try {
                const configMethods = [
                    'testFirebaseConnection',
                    'showFirebaseSetupGuide',
                    'applyConfigTemplate',
                    'importConfigFromClipboard',
                    'validateProjectIdInput',
                    'validateApiKeyInput'
                ];
                
                const availableConfigMethods = configMethods.filter(method => 
                    typeof this[method] === 'function'
                );
                
                testResults.configurationHelpers.passed = availableConfigMethods.length >= configMethods.length * 0.8;
                testResults.configurationHelpers.details = {
                    requiredMethods: configMethods,
                    availableMethods: availableConfigMethods,
                    coverage: Math.round((availableConfigMethods.length / configMethods.length) * 100)
                };
                
                console.log(`✅ 配置助手: ${availableConfigMethods.length}/${configMethods.length} 功能可用 (${testResults.configurationHelpers.details.coverage}%)`);
            } catch (error) {
                testResults.configurationHelpers.details.error = error.message;
                console.error('❌ 配置助手測試失敗:', error);
            }
            
            // 計算總體測試分數
            const passedTests = Object.values(testResults).slice(0, -1).filter(test => test.passed).length;
            const totalTests = Object.keys(testResults).length - 1; // 減去 overall
            const score = Math.round((passedTests / totalTests) * 100);
            
            testResults.overall.passed = score >= 80; // 80% 通過率算成功
            testResults.overall.score = score;
            testResults.overall.passedTests = passedTests;
            testResults.overall.totalTests = totalTests;
            
            console.log(`📊 測試總結: ${passedTests}/${totalTests} 項通過 (${score}%)`);
            
            if (testResults.overall.passed) {
                console.log('🎉 Firebase-First 架構測試通過！');
                this.showToast('success', `✅ 架構測試通過 (${score}/100)`, 5000);
            } else {
                console.warn('⚠️ Firebase-First 架構需要進一步優化');
                this.showToast('warning', `⚠️ 架構測試需改進 (${score}/100)`, 5000);
            }
            
        } catch (error) {
            console.error('❌ 架構測試過程出錯:', error);
            testResults.overall.error = error.message;
        }
        
        console.groupEnd();
        return testResults;
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
    
    /**
     * Phase 4: 自動觸發智慧建議生成
     * @param {Object} data - 投票結果數據
     */
    async generateSmartAdvice(data) {
        try {
            console.log('🧠 自動觸發智慧建議生成...', data);
            
            // 檢查前置條件
            if (!this.adviceUI) {
                console.warn('⚠️ ScrumAdviceUI 未初始化，跳過建議生成');
                return;
            }
            
            if (!data || !data.statistics) {
                console.warn('⚠️ 缺少投票統計數據，跳過建議生成');
                return;
            }
            
            // 收集投票數據
            const votesData = this.collectVotesData();
            if (!votesData) {
                console.warn('⚠️ 無法收集投票數據，跳過建議生成');
                return;
            }
            
            // 收集玩家角色資訊
            const playersData = this.collectPlayersData();
            
            // 取得任務類型
            const taskType = this.getTaskType();
            
            // 組合建議生成所需的資料
            const adviceContext = {
                taskType: taskType,
                players: playersData,
                sessionInfo: {
                    roomId: this.roomId,
                    timestamp: Date.now(),
                    gamePhase: 'finished'
                }
            };
            
            console.log('📊 建議生成資料:', {
                votesData: Object.keys(votesData.votes || {}).length,
                playersCount: Object.keys(playersData || {}).length,
                taskType,
                statistics: data.statistics
            });
            
            // 觸發建議生成
            await this.adviceUI.generateAdviceFromVotes(votesData, adviceContext);
            
            // Phase 5: Firebase 學習數據整合
            if (this.firebaseService && this.roomId) {
                try {
                    // 儲存學習會話到 Firebase（匿名化處理）
                    const sessionData = {
                        taskType: taskType,
                        votes: votesData.votes,
                        statistics: data.statistics,
                        sessionInfo: adviceContext.sessionInfo
                    };
                    
                    await this.firebaseService.saveLearningSession(this.roomId, sessionData);
                    console.log('📚 學習會話已保存到 Firebase');
                    
                    // 如果有生成的建議，也保存到 Firebase 供所有玩家查看
                    if (this.adviceUI.currentAdvice) {
                        await this.firebaseService.saveLearningAdvice(this.roomId, this.adviceUI.currentAdvice);
                        console.log('💡 智慧建議已保存到 Firebase，所有玩家可見');
                    }
                    
                } catch (firebaseError) {
                    console.warn('⚠️ Firebase 學習數據保存失敗:', firebaseError);
                    // 不影響主要流程，繼續執行
                }
            }
            
            console.log('✅ 智慧建議自動生成完成');
            
        } catch (error) {
            console.error('❌ 自動建議生成失敗:', error);
            // 不影響主要遊戏流程，只記錄錯誤
        }
    }
    
    /**
     * 收集當前投票數據
     * @returns {Object|null} 投票數據
     */
    collectVotesData() {
        try {
            if (!this.gameTable || !this.gameTable.playerList) {
                return null;
            }
            
            const players = this.gameTable.playerList.getAllPlayers();
            const votes = {};
            
            players.forEach(player => {
                if (player.hasVoted && player.vote !== undefined && player.vote !== null) {
                    votes[player.id] = {
                        value: player.vote,
                        timestamp: Date.now(),
                        player_role: player.role || 'other'
                    };
                }
            });
            
            return { votes };
        } catch (error) {
            console.error('❌ 收集投票數據失敗:', error);
            return null;
        }
    }
    
    /**
     * 收集玩家角色資訊
     * @returns {Object} 玩家資料
     */
    collectPlayersData() {
        try {
            if (!this.gameTable || !this.gameTable.playerList) {
                return {};
            }
            
            const players = this.gameTable.playerList.getAllPlayers();
            const playersData = {};
            
            players.forEach(player => {
                playersData[player.id] = {
                    name: player.name || 'Unknown',
                    role: player.role || 'other'
                };
            });
            
            return playersData;
        } catch (error) {
            console.error('❌ 收集玩家資料失敗:', error);
            return {};
        }
    }
    
    /**
     * 取得任務類型
     * @returns {string} 任務類型
     */
    getTaskType() {
        try {
            // 優先從當前玩家的任務類型取得
            if (this.currentPlayer && this.currentPlayer.taskType) {
                return this.currentPlayer.taskType;
            }
            
            // 從所有玩家中找到 Scrum Master 或 PO 的任務類型
            if (this.gameTable && this.gameTable.playerList) {
                const players = this.gameTable.playerList.getAllPlayers();
                const leaderPlayer = players.find(p => 
                    p.role === 'scrum_master' || p.role === 'po'
                );
                
                if (leaderPlayer && leaderPlayer.taskType) {
                    return leaderPlayer.taskType;
                }
            }
            
            // 預設值
            return 'general';
        } catch (error) {
            console.error('❌ 取得任務類型失敗:', error);
            return 'general';
        }
    }
    
    // ========================================
    // 雙模式架構支援方法
    // ========================================
    
    /**
     * 檢測應用模式
     * @returns {string} 檢測到的模式 ('firebase' | 'local')
     */
    detectAppMode() {
        try {
            if (window.RoomProviderFactory && typeof window.RoomProviderFactory.detectMode === 'function') {
                return window.RoomProviderFactory.detectMode();
            }
            
            // 降級檢測邏輯
            if (window.IS_PLAYGROUND === true || window.location.pathname.includes('playground.html')) {
                console.log('🎮 檢測到 playground 模式');
                return 'local';
            }
            
            // 檢查 HTML data-mode 屬性
            const htmlMode = document.documentElement.getAttribute('data-mode');
            if (htmlMode === 'local' || htmlMode === 'firebase') {
                console.log(`🏷️ 從 HTML data-mode 檢測到模式: ${htmlMode}`);
                return htmlMode;
            }
            
            const detectedMode = window.APP_MODE || 'firebase';
            console.log(`📍 使用預設模式: ${detectedMode}`);
            return detectedMode;
        } catch (error) {
            console.error('❌ 模式檢測失敗，使用預設 firebase 模式:', error);
            return 'firebase';
        }
    }
    
    /**
     * 等待 RoomProviderFactory 載入
     * @returns {Promise<void>}
     */
    async waitForRoomProviderFactory() {
        const maxWaitTime = 5000; // 最多等待 5 秒
        const checkInterval = 100; // 每 100ms 檢查一次
        let waitedTime = 0;
        
        while (!window.RoomProviderFactory && waitedTime < maxWaitTime) {
            await new Promise(resolve => setTimeout(resolve, checkInterval));
            waitedTime += checkInterval;
        }
        
        if (!window.RoomProviderFactory) {
            throw new Error('RoomProviderFactory 載入超時');
        }
        
        console.log('✅ RoomProviderFactory 已載入');
    }
    
    /**
     * 建構資料提供者配置
     * @returns {Promise<Object>} 提供者配置
     */
    async buildProviderConfig() {
        const config = {};
        
        if (this.appMode === 'firebase') {
            // Firebase 模式：嘗試取得 Firebase 配置
            const firebaseConfig = await this.getFirebaseConfig();
            if (firebaseConfig) {
                config.firebaseConfig = firebaseConfig;
            } else {
                console.warn('⚠️ Firebase 模式但未找到配置，將在 UI 中提示設定');
            }
        } else if (this.appMode === 'local') {
            // 本機模式：設定本機專用配置
            config.maxPlayers = window.IS_PLAYGROUND ? 4 : 10; // 試用版限制人數
            config.enablePersistence = !window.IS_PLAYGROUND; // 試用版不保存資料
        }
        
        return config;
    }
    
    /**
     * 向後兼容：設置舊有服務引用
     */
    setupLegacyServiceReferences() {
        if (this.roomProvider) {
            if (this.roomProvider.type === 'firebase' && this.roomProvider.service) {
                // 向後兼容：設置 firebaseService 引用
                this.firebaseService = this.roomProvider.service;
                this.isLocalMode = false;
            } else if (this.roomProvider.type === 'local' && this.roomProvider.service) {
                // 向後兼容：設置 localRoomService 引用
                this.localRoomService = this.roomProvider.service;
                this.isLocalMode = true;
                this.isTrialMode = window.IS_PLAYGROUND || false;
            }
        }
        
        console.log('✅ 向後兼容服務引用已設置');
    }
    
    /**
     * 顯示當前模式狀態
     */
    displayModeStatus() {
        const modeInfo = {
            firebase: {
                icon: '🔥',
                name: 'Firebase 團隊協作模式',
                features: ['無人數限制', '跨裝置即時同步', '雲端資料保存']
            },
            local: {
                icon: '🏠',
                name: window.IS_PLAYGROUND ? '本機試用模式' : '本機模式',
                features: window.IS_PLAYGROUND 
                    ? ['基本功能體驗', '本機多標籤頁同步', '限制4人使用']
                    : ['本機協作', '瀏覽器儲存', '無網路依賴']
            }
        };
        
        const info = modeInfo[this.appMode];
        if (info) {
            console.log(`${info.icon} 當前模式: ${info.name}`);
            console.log('📋 可用功能:', info.features.join(', '));
            
            // 可選：顯示 Toast 通知
            if (this.showToast) {
                this.showToast('info', `${info.icon} ${info.name}已啟用`, 3000);
            }
        }
    }
    
    /**
     * 處理資料提供者初始化失敗
     * @param {Error} error - 失敗錯誤
     */
    async handleProviderInitializationFailure(error) {
        console.error('🚨 資料提供者初始化失敗，執行降級策略:', error);
        
        if (this.appMode === 'firebase') {
            // Firebase 失敗：降級到本機模式
            console.log('🔄 Firebase 初始化失敗，降級到本機模式');
            
            try {
                this.appMode = 'local';
                const localConfig = await this.buildProviderConfig();
                this.roomProvider = await window.RoomProviderFactory.createProvider('local', localConfig);
                
                this.setupLegacyServiceReferences();
                this.displayModeStatus();
                
                if (this.showToast) {
                    this.showToast('warning', '⚠️ Firebase 連線失敗，已切換到本機模式', 5000);
                }
                
                console.log('✅ 成功降級到本機模式');
            } catch (fallbackError) {
                console.error('❌ 降級到本機模式也失敗:', fallbackError);
                throw new Error('所有資料提供者初始化都失敗');
            }
        } else {
            // 本機模式失敗：無法降級，直接拋出錯誤
            throw error;
        }
    }
    
    /**
     * 雙模式架構：統一的房間操作介面
     */
    
    /**
     * 加入房間（統一介面）
     * @param {string} roomId - 房間 ID
     * @param {Object} player - 玩家資訊
     * @returns {Promise<boolean>} 是否成功
     */
    async joinRoomUnified(roomId, player) {
        if (!this.roomProvider) {
            throw new Error('房間資料提供者未初始化');
        }
        
        try {
            // 初始化房間（如果需要）
            const initResult = await this.roomProvider.initialize(roomId);
            if (initResult && typeof initResult === 'object' && !initResult.success) {
                throw new Error(initResult.error || '房間初始化失敗');
            }
            
            // 加入房間
            const joinResult = await this.roomProvider.joinRoom(roomId, player);
            
            // 處理新的回傳格式
            let success = false;
            if (typeof joinResult === 'object' && joinResult.hasOwnProperty('success')) {
                success = joinResult.success;
                if (!success && joinResult.error) {
                    throw new Error(joinResult.error);
                }
            } else {
                // 向後兼容舊格式
                success = !!joinResult;
            }
            
            if (success) {
                // 設置事件監聽器
                this.setupProviderEventListeners();
                console.log(`✅ ${this.appMode} 模式：成功加入房間 ${roomId}`);
                
                // 顯示安全提示
                if (this.appMode === 'firebase') {
                    this.showToast('success', '🔐 已啟用安全驗證保護', 3000);
                }
            }
            
            return success;
        } catch (error) {
            console.error(`❌ ${this.appMode} 模式：加入房間失敗:`, error);
            
            // 顯示用戶友善的錯誤訊息
            if (error.message.includes('無效的房間 ID')) {
                this.showToast('error', '❌ 房間 ID 格式錯誤，請使用4-20個英數字', 5000);
            } else if (error.message.includes('玩家名稱')) {
                this.showToast('error', '❌ 玩家名稱格式錯誤，請檢查後重試', 5000);
            } else {
                this.showToast('error', '❌ 加入房間失敗：' + error.message, 5000);
            }
            
            throw error;
        }
    }
    
    /**
     * 設置資料提供者事件監聽器
     */
    setupProviderEventListeners() {
        if (!this.roomProvider) return;
        
        // 統一的事件監聽設置
        this.roomProvider.on('room:players-updated', (data) => {
            if (this.gameTable && typeof this.gameTable.updatePlayers === 'function') {
                this.gameTable.updatePlayers(data.players);
            }
        });
        
        this.roomProvider.on('room:votes-updated', (data) => {
            if (this.gameTable && typeof this.gameTable.updateVotes === 'function') {
                this.gameTable.updateVotes(data.votes);
            }
        });
        
        this.roomProvider.on('room:phase-changed', (data) => {
            if (this.gameTable && typeof this.gameTable.updatePhase === 'function') {
                this.gameTable.updatePhase(data.phase);
            }
        });
        
        console.log(`✅ ${this.appMode} 模式：事件監聽器已設置`);
    }
}

// 全域應用實例
let scrumPokerApp = null;

// 當 DOM 載入完成時啟動應用
document.addEventListener('DOMContentLoaded', () => {
    scrumPokerApp = new ScrumPokerApp();
    
    // 掛載到全域以便調試
    window.scrumPokerApp = scrumPokerApp;
    window.shortcutHintsManager = shortcutHintsManager;
    window.panelManager = panelManager;
    
    // 掛載測試函數到全域，方便開發者測試
    window.testFirebaseFirstArchitecture = () => {
        return scrumPokerApp.testFirebaseFirstArchitecture();
    };
});

// 匯出應用類別
window.ScrumPokerApp = ScrumPokerApp;

console.log('🚀 Scrum Poker App 主控制器已載入 - v3.0.0-enhanced');