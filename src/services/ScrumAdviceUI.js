/**
 * ScrumAdviceUI - 智慧建議 UI 管理器
 * 負責整合 ScrumAdviceEngine 與主遊戲 UI
 * @version 1.0.0-phase3
 */

/**
 * Scrum 建議 UI 管理器類別
 */
class ScrumAdviceUI {
    constructor() {
        this.version = '1.0.0-phase3';
        this.initialized = false;
        this.adviceEngine = null;
        this.currentAdvice = null;
        
        // DOM 元素引用
        this.elements = {
            statsPanel: null,
            smartAdviceSection: null,
            advicePreview: null,
            showFullAdviceBtn: null,
            adviceModal: null,
            adviceModalTitle: null,
            adviceContent: null,
            adviceLoading: null,
            adviceCloseBtn: null,
            adviceModalClose: null,
            adviceTestBtn: null
        };
        
        // 事件處理器綁定
        this.boundHandlers = {
            showFullAdvice: this.showFullAdvice.bind(this),
            closeAdvice: this.closeAdvice.bind(this),
            openTestMode: this.openTestMode.bind(this),
            handleKeyboard: this.handleKeyboard.bind(this)
        };
        
        console.log('🎨 ScrumAdviceUI v' + this.version + ' 建構完成');
    }
    
    /**
     * 初始化 UI 管理器
     * @returns {Promise<boolean>} 初始化是否成功
     */
    async initialize() {
        try {
            console.log('🎨 初始化 ScrumAdviceUI...');
            
            // 等待 ScrumAdviceEngine 載入
            if (typeof ScrumAdviceEngine === 'undefined') {
                console.warn('⚠️ ScrumAdviceEngine 尚未載入，等待中...');
                await this.waitForEngine();
            }
            
            // 初始化建議引擎
            this.adviceEngine = new ScrumAdviceEngine();
            console.log('✅ ScrumAdviceEngine 初始化成功');
            
            // 綁定 DOM 元素
            this.bindDOMElements();
            
            // 設定 DOM 事件監聽
            this.setupDOMEventListeners();
            
            // 設定遊戲狀態監聽器
            this.setupGameStateListeners();
            
            // 設定快捷鍵
            this.setupKeyboardShortcuts();
            
            this.initialized = true;
            console.log('🎨 ScrumAdviceUI 初始化完成');
            
            return true;
            
        } catch (error) {
            console.error('❌ ScrumAdviceUI 初始化失敗:', error);
            return false;
        }
    }
    
    /**
     * 等待 ScrumAdviceEngine 載入
     * @returns {Promise<void>}
     */
    async waitForEngine() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50; // 5 秒超時
            
            const checkEngine = () => {
                if (typeof ScrumAdviceEngine !== 'undefined') {
                    resolve();
                } else if (attempts >= maxAttempts) {
                    reject(new Error('ScrumAdviceEngine 載入超時'));
                } else {
                    attempts++;
                    setTimeout(checkEngine, 100);
                }
            };
            
            checkEngine();
        });
    }
    
    /**
     * 綁定 DOM 元素
     */
    bindDOMElements() {
        this.elements.statsPanel = document.getElementById('statsPanel');
        this.elements.smartAdviceSection = document.getElementById('smartAdviceSection');
        this.elements.advicePreview = document.getElementById('advicePreview');
        this.elements.showFullAdviceBtn = document.getElementById('showFullAdviceBtn');
        this.elements.adviceModal = document.getElementById('adviceModal');
        this.elements.adviceModalTitle = document.getElementById('adviceModalTitle');
        this.elements.adviceContent = document.getElementById('adviceContent');
        this.elements.adviceLoading = document.getElementById('adviceLoading');
        this.elements.adviceCloseBtn = document.getElementById('adviceCloseBtn');
        this.elements.adviceModalClose = document.getElementById('adviceModalClose');
        this.elements.adviceTestBtn = document.getElementById('adviceTestBtn');
        
        // 檢查必要元素
        const missingElements = Object.entries(this.elements)
            .filter(([key, element]) => !element)
            .map(([key]) => key);
            
        if (missingElements.length > 0) {
            console.warn('⚠️ 部分 DOM 元素未找到:', missingElements);
        }
    }
    
    /**
     * 設定遊戲狀態監聽器 - 確保所有玩家同步看到統計
     */
    setupGameStateListeners() {
        if (!window.eventBus) {
            console.warn('⚠️ EventBus 不存在，無法設定遊戲狀態監聽');
            return;
        }
        
        // 監聽開牌事件 - 所有玩家都會收到這個事件
        window.eventBus.on('game:votes-revealed', (data) => {
            console.log('🎨 ScrumAdviceUI 接收到開牌事件:', data);
            this.handleVotesRevealed(data);
        });
        
        // 監聽遊戲階段變更
        window.eventBus.on('phase:changed', (data) => {
            if (data.newPhase === 'revealing' || data.newPhase === 'finished') {
                console.log('🎨 ScrumAdviceUI 检測到開牌階段:', data.newPhase);
                // 如果進入開牌階段但沒有統計資料，顯示載入狀態
                if (!this.currentAdvice) {
                    this.showLoadingState();
                    this.showSmartAdviceSection();
                }
            } else if (data.newPhase === 'voting') {
                // 重新開始投票時重置建議
                this.resetAdvice();
            }
        });
        
        // 監聽 GameState 的統計更新
        if (window.gameState) {
            window.gameState.subscribe('stateChanged', (data) => {
                if (data.updates.statistics) {
                    console.log('🎨 ScrumAdviceUI 接收到統計更新:', data.updates.statistics);
                    // 如果有統計更新但沒有建議，嘗試生成建議
                    if (!this.currentAdvice && data.newState.phase === 'finished') {
                        this.generateAdviceFromGameState(data.newState);
                    }
                }
            });
        }
        
        console.log('🎨 ScrumAdviceUI 遊戲狀態監聽器已設定');
    }
    
    /**
     * 設定 DOM 事件監聽
     */
    setupDOMEventListeners() {
        // 顯示完整建議按鈕
        if (this.elements.showFullAdviceBtn) {
            this.elements.showFullAdviceBtn.addEventListener('click', this.boundHandlers.showFullAdvice);
        }
        
        // 關閉建議按鈕
        if (this.elements.adviceCloseBtn) {
            this.elements.adviceCloseBtn.addEventListener('click', this.boundHandlers.closeAdvice);
        }
        
        if (this.elements.adviceModalClose) {
            this.elements.adviceModalClose.addEventListener('click', this.boundHandlers.closeAdvice);
        }
        
        // 測試模式按鈕
        if (this.elements.adviceTestBtn) {
            this.elements.adviceTestBtn.addEventListener('click', this.boundHandlers.openTestMode);
        }
        
        // 模態框背景點擊關閉
        if (this.elements.adviceModal) {
            this.elements.adviceModal.addEventListener('click', (e) => {
                if (e.target === this.elements.adviceModal) {
                    this.closeAdvice();
                }
            });
        }
        
        console.log('🎨 ScrumAdviceUI DOM 事件監聽器已設定');
    }
    
    /**
     * 設定鍵盤快捷鍵
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', this.boundHandlers.handleKeyboard);
    }
    
    /**
     * 處理鍵盤事件
     * @param {KeyboardEvent} event 鍵盤事件
     */
    handleKeyboard(event) {
        // ESC 關閉建議
        if (event.key === 'Escape' && this.isAdviceModalOpen()) {
            this.closeAdvice();
            event.preventDefault();
        }
        
        // Ctrl/Cmd + Shift + A 顯示建議
        if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'A') {
            if (this.currentAdvice) {
                this.showFullAdvice();
            }
            event.preventDefault();
        }
        
        // Ctrl/Cmd + Shift + T 開啟測試模式
        if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'T') {
            this.openTestMode();
            event.preventDefault();
        }
    }
    
    /**
     * 根據投票結果生成並顯示建議
     * @param {Object} voteData 投票資料
     * @param {Object} gameState 遊戲狀態
     */
    async generateAdviceFromVotes(voteData, gameState = {}) {
        try {
            if (!this.initialized || !this.adviceEngine) {
                console.warn('⚠️ ScrumAdviceUI 未初始化');
                return;
            }
            
            console.log('🧠 開始分析投票結果...', voteData);
            
            // 顯示載入狀態
            this.showLoadingState();
            
            // 處理投票資料
            const statistics = this.processVoteData(voteData);
            const options = this.extractAdviceOptions(voteData, gameState);
            
            // 生成建議
            const advice = this.adviceEngine.generateAdvice(
                gameState.taskType || 'general',
                statistics,
                options
            );
            
            this.currentAdvice = advice;
            
            // 更新 UI
            this.updateAdvicePreview(advice);
            this.showSmartAdviceSection();
            
            console.log('✅ 建議生成完成:', advice.title);
            
        } catch (error) {
            console.error('❌ 建議生成失敗:', error);
            this.showErrorState(error.message);
        }
    }
    
    /**
     * 處理投票資料
     * @param {Object} voteData 原始投票資料
     * @returns {Object} 統計資料
     */
    processVoteData(voteData) {
        const votes = Object.values(voteData.votes || {});
        const numericVotes = votes
            .map(vote => typeof vote.value === 'number' ? vote.value : null)
            .filter(value => value !== null);
            
        if (numericVotes.length === 0) {
            throw new Error('沒有有效的數字投票');
        }
        
        // 計算統計數據
        const total = numericVotes.reduce((sum, vote) => sum + vote, 0);
        const averagePoints = total / numericVotes.length;
        const min = Math.min(...numericVotes);
        const max = Math.max(...numericVotes);
        
        // 計算共識度（變異係數的反向）
        const mean = averagePoints;
        const variance = numericVotes.reduce((sum, vote) => sum + Math.pow(vote - mean, 2), 0) / numericVotes.length;
        const stdDev = Math.sqrt(variance);
        const coefficientOfVariation = mean > 0 ? stdDev / mean : 0;
        const consensus = Math.max(0, Math.min(100, (1 - coefficientOfVariation) * 100));
        
        return {
            averagePoints: Math.round(averagePoints * 10) / 10,
            consensus: Math.round(consensus),
            totalVotes: numericVotes.length,
            min,
            max,
            variance: Math.round(variance * 100) / 100
        };
    }
    
    /**
     * 提取建議選項
     * @param {Object} voteData 投票資料
     * @param {Object} gameState 遊戲狀態
     * @returns {Object} 建議選項
     */
    extractAdviceOptions(voteData, gameState) {
        const players = gameState.players || {};
        const votes = voteData.votes || {};
        
        // 提取玩家角色
        const playerRoles = Object.keys(votes).map(playerId => {
            const player = players[playerId];
            return player?.role || 'other';
        });
        
        // 按角色分組投票
        const votesByRole = Object.entries(votes).map(([playerId, vote]) => {
            const player = players[playerId];
            return {
                role: player?.role || 'other',
                value: typeof vote.value === 'number' ? vote.value : null
            };
        }).filter(vote => vote.value !== null);
        
        return {
            playerRoles,
            votesByRole
        };
    }
    
    /**
     * 顯示載入狀態
     */
    showLoadingState() {
        if (this.elements.advicePreview) {
            this.elements.advicePreview.innerHTML = `
                <div class="advice-preview-title">🧠 正在分析...</div>
                <div class="advice-preview-snippet">分析投票結果並生成智慧建議中...</div>
            `;
        }
    }
    
    /**
     * 顯示錯誤狀態
     * @param {string} errorMessage 錯誤訊息
     */
    showErrorState(errorMessage) {
        if (this.elements.advicePreview) {
            this.elements.advicePreview.innerHTML = `
                <div class="advice-preview-title">❌ 建議生成失敗</div>
                <div class="advice-preview-snippet">${errorMessage}</div>
            `;
        }
    }
    
    /**
     * 更新建議預覽
     * @param {Object} advice 建議物件
     */
    updateAdvicePreview(advice) {
        if (!this.elements.advicePreview) return;
        
        // 增加錯誤處理：檢查 advice 參數是否存在且有 content 屬性
        if (!advice || !advice.content) {
            console.warn('⚠️ updateAdvicePreview: 建議物件不完整', advice);
            return;
        }
        
        const snippet = advice.content.split('\n')[0]; // 取第一行作為預覽
        
        this.elements.advicePreview.innerHTML = `
            <div class="advice-preview-title">${advice.title || '智慧建議'}</div>
            <div class="advice-preview-snippet">${snippet}</div>
        `;
    }
    
    /**
     * 顯示智慧建議區域
     */
    showSmartAdviceSection() {
        if (this.elements.smartAdviceSection) {
            this.elements.smartAdviceSection.classList.remove('hidden');
        }
        
        // 如果有標籤管理器且建議有內容，自動切換到建議標籤
        if (window.railTabManager && this.currentAdvice) {
            setTimeout(() => {
                window.railTabManager.showTab('advice');
                console.log('🧠 自動切換到建議標籤');
            }, 500);
        }
    }
    
    /**
     * 隱藏智慧建議區域
     */
    hideSmartAdviceSection() {
        if (this.elements.smartAdviceSection) {
            this.elements.smartAdviceSection.classList.add('hidden');
        }
    }
    
    /**
     * 顯示完整建議
     */
    showFullAdvice() {
        if (!this.currentAdvice) {
            console.warn('⚠️ 沒有可顯示的建議');
            return;
        }
        
        // 更新模態框標題
        if (this.elements.adviceModalTitle) {
            this.elements.adviceModalTitle.textContent = this.currentAdvice.title;
        }
        
        // 渲染建議內容
        this.renderAdviceContent(this.currentAdvice);
        
        // 顯示模態框
        if (this.elements.adviceModal) {
            this.elements.adviceModal.classList.remove('hidden');
            
            // 聚焦到關閉按鈕以改善無障礙體驗
            setTimeout(() => {
                if (this.elements.adviceCloseBtn) {
                    this.elements.adviceCloseBtn.focus();
                }
            }, 100);
        }
    }
    
    /**
     * 渲染建議內容
     * @param {Object} advice 建議物件
     */
    renderAdviceContent(advice) {
        if (!this.elements.adviceContent) return;
        
        let html = `<div class="advice-content">`;
        
        // 主要內容
        html += `<div>${advice.content.replace(/\n/g, '<br>')}</div>`;
        
        // 關鍵字
        if (advice.keywords && advice.keywords.length > 0) {
            html += `<div class="advice-keywords">`;
            advice.keywords.forEach(keyword => {
                html += `<span class="advice-keyword">${keyword}</span>`;
            });
            html += `</div>`;
        }
        
        // 元資料
        if (advice.metadata) {
            html += `<div class="advice-metadata">`;
            html += `<strong>建議資訊:</strong><br>`;
            html += `類型: ${advice.metadata.type} | `;
            html += `分析深度: ${advice.metadata.analysisDepth || 'basic'}<br>`;
            html += `生成時間: ${new Date(advice.metadata.generatedAt).toLocaleString('zh-TW')}`;
            if (advice.metadata.hasRoleData) {
                html += ` | 包含角色分析`;
            }
            if (advice.metadata.hasTechStack) {
                html += ` | 包含技術建議`;
            }
            // Phase 5: 學習機制資訊
            if (advice.metadata.modelInfo) {
                html += ` | 基於 ${advice.metadata.modelInfo.totalSessions} 次歷史投票`;
            }
            if (advice.metadata.analysisDepth === 'personalized') {
                html += ` | 個人化建議`;
            }
            html += `</div>`;
        }
        
        html += `</div>`;
        
        // 添加快捷鍵提示
        html += `<div class="advice-shortcut-hint">ESC 關閉</div>`;
        
        this.elements.adviceContent.innerHTML = html;
    }
    
    /**
     * 關閉建議
     */
    closeAdvice() {
        if (this.elements.adviceModal) {
            this.elements.adviceModal.classList.add('hidden');
        }
    }
    
    /**
     * 檢查建議模態框是否開啟
     * @returns {boolean}
     */
    isAdviceModalOpen() {
        return this.elements.adviceModal && 
               !this.elements.adviceModal.classList.contains('hidden');
    }
    
    /**
     * 開啟測試模式
     */
    openTestMode() {
        window.open('test-advice-engine.html', '_blank');
    }
    
    /**
     * 處理開牌事件 - 所有玩家同步觸發
     * @param {Object} data - 開牌事件數據
     */
    async handleVotesRevealed(data) {
        try {
            console.log('🎨 處理開牌事件 - 所有玩家同步觸發');
            
            // 檢查是否有統計資料
            if (!data.statistics) {
                console.warn('⚠️ 開牌事件缺少統計資料');
                return;
            }
            
            // 顯示載入狀態
            this.showLoadingState();
            this.showSmartAdviceSection();
            
            // 嘗試從事件數據生成建議
            const voteData = {
                statistics: data.statistics,
                votes: this.convertPlayersToVotes(data.players || []),
                players: data.players || []
            };
            
            // 獲取遊戲狀態
            const gameState = window.gameState ? window.gameState.getState() : {};
            
            // 生成建議（所有玩家都執行，但只有觸發者保存到 Firebase）
            await this.generateAdviceFromVotes(voteData, gameState);
            
            console.log('✅ ScrumAdviceUI 開牌事件處理完成');
            
        } catch (error) {
            console.error('❌ ScrumAdviceUI 處理開牌事件失敗:', error);
            this.showErrorState('建議生成失敗，請稍後再試');
        }
    }
    
    /**
     * 從 GameState 生成建議
     * @param {Object} gameState - 遊戲狀態
     */
    async generateAdviceFromGameState(gameState) {
        try {
            if (!gameState.statistics || !gameState.players) {
                console.warn('⚠️ GameState 缺少必要資料');
                return;
            }
            
            const voteData = {
                statistics: gameState.statistics,
                votes: this.convertPlayersToVotes(gameState.players),
                players: gameState.players
            };
            
            await this.generateAdviceFromVotes(voteData, gameState);
            
        } catch (error) {
            console.error('❌ 從 GameState 生成建議失敗:', error);
        }
    }
    
    /**
     * 轉換玩家資料為投票資料格式
     * @param {Array} players - 玩家陣列
     * @returns {Object} 投票資料物件
     */
    convertPlayersToVotes(players) {
        const votes = {};
        
        if (Array.isArray(players)) {
            players.forEach(player => {
                if (player.hasVoted && player.vote !== null && player.vote !== undefined) {
                    votes[player.id] = {
                        value: player.vote,
                        timestamp: Date.now(),
                        player_role: player.role || 'other'
                    };
                }
            });
        }
        
        return votes;
    }
    
    /**
     * 重置建議狀態
     */
    resetAdvice() {
        this.currentAdvice = null;
        this.hideSmartAdviceSection();
        this.closeAdvice();
        
        if (this.elements.advicePreview) {
            this.elements.advicePreview.innerHTML = '<p class="text-muted">點擊「開牌」後查看建議</p>';
        }
        
        console.log('🎨 ScrumAdviceUI 已重置');
    }
    
    /**
     * 取得引擎資訊
     * @returns {Object} 引擎資訊
     */
    getEngineInfo() {
        return {
            version: this.version,
            initialized: this.initialized,
            hasAdviceEngine: !!this.adviceEngine,
            hasCurrentAdvice: !!this.currentAdvice,
            domElementsReady: Object.values(this.elements).filter(el => el).length
        };
    }
    
    /**
     * 銷毀 UI 管理器
     */
    destroy() {
        // 移除事件監聽
        document.removeEventListener('keydown', this.boundHandlers.handleKeyboard);
        
        // 清理 DOM 事件
        Object.entries(this.boundHandlers).forEach(([key, handler]) => {
            const element = this.elements[key.replace('bound', '').toLowerCase()];
            if (element) {
                element.removeEventListener('click', handler);
            }
        });
        
        // 重置狀態
        this.resetAdvice();
        this.initialized = false;
        
        console.log('🎨 ScrumAdviceUI 已銷毀');
    }
    
    /**
     * Phase 5: 取得學習模型摘要資訊
     * @returns {Object} 學習模型資訊
     */
    getLearningModelSummary() {
        if (!this.adviceEngine) {
            return { available: false, reason: 'engine_not_initialized' };
        }
        
        return this.adviceEngine.getVotingHistorySummary();
    }
    
    /**
     * Phase 5: 清除學習模型資料
     * @returns {boolean} 清除是否成功
     */
    clearLearningData() {
        try {
            localStorage.removeItem('scrumPoker_votingHistory');
            localStorage.removeItem('scrumPoker_learningModel');
            console.log('🧹 學習模型資料已清除');
            return true;
        } catch (error) {
            console.error('❌ 清除學習模型資料失敗:', error);
            return false;
        }
    }
    
    /**
     * Phase 5: 取得增強的引擎資訊（包含學習機制）
     * @returns {Object} 增強的引擎資訊
     */
    getEnhancedEngineInfo() {
        const basicInfo = this.getEngineInfo();
        const learningInfo = this.getLearningModelSummary();
        
        return {
            ...basicInfo,
            learning: {
                available: learningInfo.available,
                totalSessions: learningInfo.totalSessions || 0,
                taskTypes: learningInfo.taskTypes || [],
                roles: learningInfo.roles || [],
                lastUpdated: learningInfo.lastUpdated || 'never'
            }
        };
    }
}

// 匯出到全域
window.ScrumAdviceUI = ScrumAdviceUI;

console.log('🎨 ScrumAdviceUI 模組已載入 - Phase 5 Enhanced with Learning');