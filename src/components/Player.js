/**
 * 玩家組件 - Scrum Poker 玩家系統
 * 提供玩家的建立、渲染和狀態管理功能
 * @version 3.0.0-enhanced
 */

/**
 * 玩家類別
 */
class Player {
    constructor(id, name, role, options = {}) {
        this.id = id;
        this.name = name;
        this.role = role;
        this.vote = null;
        this.hasVoted = false;
        this.isRevealed = false; // 新增：是否已開牌
        this.isOnline = true;
        this.isCurrentPlayer = false;
        this.lastSeen = Date.now();
        
        // UI 元素
        this.element = null;
        this.cardElement = null;
        this.statusElement = null;
        
        // 選項
        this.options = {
            showCard: options.showCard !== false,
            showStatus: options.showStatus !== false,
            clickable: options.clickable || false,
            size: options.size || 'normal', // normal, small, large
            ...options
        };
        
        // 建立 DOM 元素
        this.createElement();
        this.updateDisplay();
    }
    
    /**
     * 建立 DOM 元素
     */
    createElement() {
        this.element = Utils.DOM.createElement('div', {
            className: this.getPlayerClasses(),
            dataset: {
                playerId: this.id,
                playerRole: this.role
            },
            attributes: {
                'role': 'gridcell',
                'aria-label': this.getAriaLabel()
            }
        });
        
        // 建立玩家頭像
        this.createAvatar();
        
        // 建立玩家資訊
        this.createPlayerInfo();
        
        // 建立卡牌顯示
        if (this.options.showCard) {
            this.createCardDisplay();
        }
        
        // 建立狀態指示器
        if (this.options.showStatus) {
            this.createStatusIndicator();
        }
        
        // 綁定事件
        this.bindEvents();
    }
    
    /**
     * 建立頭像
     */
    createAvatar() {
        const avatar = Utils.DOM.createElement('div', {
            className: 'player-avatar'
        });
        
        const roleIcon = this.getRoleIcon();
        const avatarIcon = Utils.DOM.createElement('div', {
            className: 'player-avatar-icon',
            innerHTML: roleIcon
        });
        
        const avatarBg = Utils.DOM.createElement('div', {
            className: 'player-avatar-bg'
        });
        
        avatar.appendChild(avatarBg);
        avatar.appendChild(avatarIcon);
        this.element.appendChild(avatar);
    }
    
    /**
     * 建立玩家資訊
     */
    createPlayerInfo() {
        const info = Utils.DOM.createElement('div', {
            className: 'player-info'
        });
        
        const nameElement = Utils.DOM.createElement('div', {
            className: 'player-name',
            textContent: this.name
        });
        
        const roleElement = Utils.DOM.createElement('div', {
            className: 'player-role',
            textContent: Utils.Game.getRoleDisplayName(this.role)
        });
        
        info.appendChild(nameElement);
        info.appendChild(roleElement);
        this.element.appendChild(info);
    }
    
    /**
     * 建立卡牌顯示
     */
    createCardDisplay() {
        this.cardElement = Utils.DOM.createElement('div', {
            className: 'player-card'
        });
        
        const cardInner = Utils.DOM.createElement('div', {
            className: 'player-card-inner'
        });
        
        // 卡牌正面（顯示投票）
        const cardFront = Utils.DOM.createElement('div', {
            className: 'player-card-front'
        });
        
        const voteDisplay = Utils.DOM.createElement('div', {
            className: 'player-vote-display',
            textContent: '?'
        });
        
        cardFront.appendChild(voteDisplay);
        
        // 卡牌背面（未投票狀態）
        const cardBack = Utils.DOM.createElement('div', {
            className: 'player-card-back'
        });
        
        const cardPattern = Utils.DOM.createElement('div', {
            className: 'player-card-pattern',
            innerHTML: '🎮'
        });
        
        cardBack.appendChild(cardPattern);
        
        cardInner.appendChild(cardFront);
        cardInner.appendChild(cardBack);
        this.cardElement.appendChild(cardInner);
        this.element.appendChild(this.cardElement);
    }
    
    /**
     * 建立狀態指示器
     */
    createStatusIndicator() {
        this.statusElement = Utils.DOM.createElement('div', {
            className: 'player-status'
        });
        
        const onlineIndicator = Utils.DOM.createElement('div', {
            className: 'player-online-indicator'
        });
        
        const voteIndicator = Utils.DOM.createElement('div', {
            className: 'player-vote-indicator'
        });
        
        this.statusElement.appendChild(onlineIndicator);
        this.statusElement.appendChild(voteIndicator);
        this.element.appendChild(this.statusElement);
    }
    
    /**
     * 綁定事件
     */
    bindEvents() {
        if (this.options.clickable) {
            this.element.addEventListener('click', () => {
                this.handleClick();
            });
            
            this.element.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    this.handleClick();
                }
            });
        }
    }
    
    /**
     * 處理點擊事件
     */
    handleClick() {
        if (window.eventBus) {
            window.eventBus.emit('player:clicked', {
                player: this,
                id: this.id,
                name: this.name,
                role: this.role
            });
        }
    }
    
    /**
     * 獲取角色圖示
     * @returns {string} 角色圖示
     */
    getRoleIcon() {
        const roleIcons = {
            'dev': '👨‍💻',
            'qa': '🐛',
            'scrum_master': '👥',
            'po': '👔',
            'other': '👤'
        };
        return roleIcons[this.role] || '👤';
    }
    
    /**
     * 獲取玩家 CSS 類別
     * @returns {string} CSS 類別字符串
     */
    getPlayerClasses() {
        const classes = ['player', `player-${this.options.size}`, `player-role-${this.role}`];
        
        if (this.hasVoted) classes.push('player-voted');
        if (this.isRevealed) classes.push('player-revealed'); // 新增：開牌狀態
        if (this.isOnline) classes.push('player-online');
        else classes.push('player-offline');
        if (this.isCurrentPlayer) classes.push('player-current');
        if (this.options.clickable) classes.push('player-clickable');
        
        return classes.join(' ');
    }
    
    /**
     * 獲取 ARIA 標籤
     * @returns {string} ARIA 標籤
     */
    getAriaLabel() {
        let label = `玩家 ${this.name}, 角色 ${Utils.Game.getRoleDisplayName(this.role)}`;
        
        if (this.hasVoted) {
            label += ', 已投票';
        } else {
            label += ', 未投票';
        }
        
        if (!this.isOnline) {
            label += ', 離線';
        }
        
        return label;
    }
    
    /**
     * 設置投票
     * @param {*} vote - 投票值
     * @param {boolean} animate - 是否播放動畫
     */
    setVote(vote, animate = true) {
        const oldVote = this.vote;
        const wasVoted = this.hasVoted;
        
        this.vote = vote;
        this.hasVoted = vote !== null && vote !== undefined;
        
        // 更新顯示
        this.updateDisplay();
        
        // 播放動畫
        if (animate && this.hasVoted && !wasVoted) {
            this.playVoteAnimation();
        }
        
        // 發送事件
        if (window.eventBus) {
            window.eventBus.emit('player:vote-changed', {
                player: this,
                oldVote,
                newVote: vote,
                hasVoted: this.hasVoted
            });
        }
    }
    
    /**
     * 清除投票
     */
    clearVote() {
        console.log(`🧹 清除投票 - 玩家 ${this.name}`);
        
        // 重置開牌狀態
        this.isRevealed = false;
        
        this.setVote(null, false);
    }
    
    /**
     * 顯示投票（開牌）
     * @param {boolean} animate - 是否播放動畫
     */
    revealVote(animate = true) {
        if (!this.hasVoted) {
            console.warn(`⚠️ 玩家 ${this.name} 尚未投票，無法開牌`);
            return;
        }
        
        console.log(`🎭 開牌 - 玩家 ${this.name}: ${this.vote}`);
        
        // 設置開牌狀態
        this.isRevealed = true;
        
        // 更新顯示（這會包含 player-revealed 類別）
        this.updateDisplay();
        
        // 同時更新卡牌元素的類別（向後相容）
        if (this.cardElement) {
            this.cardElement.classList.add('player-card-revealed');
        }
        
        if (animate) {
            this.playRevealAnimation();
        }
        
        // 發送事件
        if (window.eventBus) {
            window.eventBus.emit('player:vote-revealed', {
                player: this,
                vote: this.vote
            });
        }
    }
    
    /**
     * 隱藏投票（重新開始）
     */
    hideVote() {
        console.log(`🙈 隱藏投票 - 玩家 ${this.name}`);
        
        // 重置開牌狀態
        this.isRevealed = false;
        
        // 更新顯示
        this.updateDisplay();
        
        if (this.cardElement) {
            // 移除舊的 CSS 類別（向後相容）
            this.cardElement.classList.remove('player-card-revealed');
        }
        
        // 發送事件
        if (window.eventBus) {
            window.eventBus.emit('player:vote-hidden', {
                player: this
            });
        }
    }
    
    /**
     * 播放投票動畫
     */
    playVoteAnimation() {
        if (!this.cardElement) return;
        
        // 卡牌翻轉動畫
        this.cardElement.classList.add('player-card-voting');
        
        // 彈跳效果
        Utils.Animation.bounce(this.element, 5);
        
        setTimeout(() => {
            this.cardElement.classList.remove('player-card-voting');
        }, 600);
    }
    
    /**
     * 播放開牌動畫
     */
    playRevealAnimation() {
        if (!this.cardElement) return;
        
        // 翻牌動畫
        Utils.Animation.animate({
            duration: 600,
            easing: 'easeInOutCubic',
            from: 0,
            to: 180,
            onUpdate: (angle) => {
                this.cardElement.style.transform = `rotateY(${angle}deg)`;
            },
            onComplete: () => {
                this.cardElement.style.transform = '';
            }
        });
    }
    
    /**
     * 設置線上狀態
     * @param {boolean} online - 是否線上
     */
    setOnline(online) {
        if (this.isOnline === online) return;
        
        this.isOnline = online;
        this.lastSeen = Date.now();
        this.updateDisplay();
        
        // 發送事件
        if (window.eventBus) {
            window.eventBus.emit('player:online-changed', {
                player: this,
                isOnline: online,
                lastSeen: this.lastSeen
            });
        }
    }
    
    /**
     * 設置為當前玩家
     * @param {boolean} current - 是否為當前玩家
     */
    setCurrentPlayer(current) {
        if (this.isCurrentPlayer === current) return;
        
        this.isCurrentPlayer = current;
        this.updateDisplay();
        
        // 更新 ARIA 標籤
        this.element.setAttribute('aria-label', this.getAriaLabel());
    }
    
    /**
     * 更新顯示
     */
    updateDisplay() {
        if (!this.element) return;
        
        // 更新 CSS 類別
        this.element.className = this.getPlayerClasses();
        
        // 更新卡牌顯示
        if (this.cardElement) {
            const voteDisplay = this.cardElement.querySelector('.player-vote-display');
            if (voteDisplay) {
                if (this.hasVoted) {
                    // 使用 isRevealed 狀態決定顯示內容，同時檢查 CSS 類別作為備援
                    const shouldReveal = this.isRevealed || this.cardElement.classList.contains('player-card-revealed');
                    voteDisplay.textContent = shouldReveal ? 
                        Utils.Game.formatPoints(this.vote) : '?';
                    
                    console.log(`🎯 更新卡牌顯示 - ${this.name}: hasVoted=${this.hasVoted}, isRevealed=${this.isRevealed}, shouldReveal=${shouldReveal}, vote=${this.vote}`);
                } else {
                    voteDisplay.textContent = '';
                }
            }
        }
        
        // 更新狀態指示器
        if (this.statusElement) {
            const onlineIndicator = this.statusElement.querySelector('.player-online-indicator');
            const voteIndicator = this.statusElement.querySelector('.player-vote-indicator');
            
            if (onlineIndicator) {
                onlineIndicator.setAttribute('title', this.isOnline ? '線上' : '離線');
            }
            
            if (voteIndicator) {
                voteIndicator.setAttribute('title', this.hasVoted ? '已投票' : '未投票');
            }
        }
        
        // 更新 ARIA 標籤
        this.element.setAttribute('aria-label', this.getAriaLabel());
        
        // 設置角色顏色
        const roleColor = Utils.Game.getRoleColor(this.role);
        this.element.style.setProperty('--player-role-color', roleColor);
    }
    
    /**
     * 獲取玩家數據
     * @returns {Object} 玩家數據
     */
    getData() {
        return {
            id: this.id,
            name: this.name,
            role: this.role,
            vote: this.vote,
            hasVoted: this.hasVoted,
            isOnline: this.isOnline,
            lastSeen: this.lastSeen
        };
    }
    
    /**
     * 從數據更新玩家
     * @param {Object} data - 玩家數據
     */
    updateFromData(data) {
        let changed = false;
        
        if (data.name !== undefined && data.name !== this.name) {
            this.name = data.name;
            changed = true;
        }
        
        if (data.role !== undefined && data.role !== this.role) {
            this.role = data.role;
            changed = true;
        }
        
        if (data.vote !== this.vote) {
            this.setVote(data.vote, false);
            changed = true;
        }
        
        if (data.isOnline !== undefined && data.isOnline !== this.isOnline) {
            this.setOnline(data.isOnline);
            changed = true;
        }
        
        if (changed) {
            this.updateDisplay();
        }
    }
    
    /**
     * 獲取 DOM 元素
     * @returns {Element} DOM 元素
     */
    getElement() {
        return this.element;
    }
    
    /**
     * 銷毀玩家
     */
    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        
        this.element = null;
        this.cardElement = null;
        this.statusElement = null;
    }
}

/**
 * 玩家列表管理器
 */
class PlayerList {
    constructor(container, options = {}) {
        this.container = container;
        this.players = new Map();
        this.currentPlayerId = null;
        
        // 投票進度節流控制
        this.lastProgressKey = null;
        
        this.options = {
            maxPlayers: options.maxPlayers || 20,
            showCards: options.showCards !== false,
            showStatus: options.showStatus !== false,
            playerClickable: options.playerClickable || false,
            ...options
        };
        
        this.setupContainer();
        this.setupEventListeners();
    }
    
    /**
     * 設置容器
     */
    setupContainer() {
        this.container.className = 'players-list';
        this.container.setAttribute('role', 'grid');
        this.container.setAttribute('aria-label', '遊戲玩家列表');
    }
    
    /**
     * 設置事件監聽器
     */
    setupEventListeners() {
        if (window.eventBus) {
            window.eventBus.on('player:vote-changed', (data) => {
                this.updateVotingProgress();
            });
        }
    }
    
    /**
     * 添加玩家
     * @param {string} id - 玩家 ID
     * @param {string} name - 玩家名稱
     * @param {string} role - 玩家角色
     * @param {Object} data - 額外數據
     * @returns {Player} 建立的玩家物件
     */
    addPlayer(id, name, role, data = {}) {
        if (this.players.has(id)) {
            console.warn(`玩家 ${id} 已存在`);
            return this.players.get(id);
        }
        
        if (this.players.size >= this.options.maxPlayers) {
            console.warn('已達到最大玩家數量');
            return null;
        }
        
        const player = new Player(id, name, role, {
            showCard: this.options.showCards,
            showStatus: this.options.showStatus,
            clickable: this.options.playerClickable
        });
        
        // 更新額外數據
        if (data) {
            player.updateFromData(data);
        }
        
        this.players.set(id, player);
        this.container.appendChild(player.getElement());
        
        // 發送事件
        if (window.eventBus) {
            window.eventBus.emit('players:player-added', {
                player: player,
                totalPlayers: this.players.size
            });
        }
        
        this.updateVotingProgress();
        return player;
    }
    
    /**
     * 移除玩家
     * @param {string} id - 玩家 ID
     */
    removePlayer(id) {
        const player = this.players.get(id);
        if (!player) return;
        
        player.destroy();
        this.players.delete(id);
        
        // 發送事件
        if (window.eventBus) {
            window.eventBus.emit('players:player-removed', {
                playerId: id,
                totalPlayers: this.players.size
            });
        }
        
        this.updateVotingProgress();
    }
    
    /**
     * 獲取玩家
     * @param {string} id - 玩家 ID
     * @returns {Player|null} 玩家物件
     */
    getPlayer(id) {
        return this.players.get(id) || null;
    }
    
    /**
     * 獲取所有玩家
     * @returns {Array<Player>} 玩家陣列
     */
    getAllPlayers() {
        return Array.from(this.players.values());
    }
    
    /**
     * 設置當前玩家
     * @param {string} id - 玩家 ID
     */
    setCurrentPlayer(id) {
        // 清除舊的當前玩家標記
        if (this.currentPlayerId) {
            const oldPlayer = this.players.get(this.currentPlayerId);
            if (oldPlayer) {
                oldPlayer.setCurrentPlayer(false);
            }
        }
        
        // 設置新的當前玩家
        this.currentPlayerId = id;
        if (id) {
            const newPlayer = this.players.get(id);
            if (newPlayer) {
                newPlayer.setCurrentPlayer(true);
            }
        }
    }
    
    /**
     * 清除所有投票
     */
    clearAllVotes() {
        this.players.forEach(player => {
            player.clearVote();
            player.hideVote();
        });
        
        this.updateVotingProgress();
    }
    
    /**
     * 顯示所有投票
     */
    revealAllVotes() {
        this.players.forEach(player => {
            if (player.hasVoted) {
                player.revealVote(true);
            }
        });
        
        // 發送事件
        if (window.eventBus) {
            window.eventBus.emit('players:votes-revealed');
        }
    }
    
    /**
     * 更新投票進度（使用節流避免重複 log）
     */
    updateVotingProgress() {
        const totalPlayers = this.players.size;
        const votedPlayers = Array.from(this.players.values()).filter(p => p.hasVoted).length;
        const percentage = totalPlayers > 0 ? Math.round((votedPlayers / totalPlayers) * 100) : 0;
        
        const progress = {
            voted: votedPlayers,
            total: totalPlayers,
            percentage: percentage
        };
        
        // 檢查是否與上次進度相同，避免重複事件
        const progressKey = `${progress.voted}_${progress.total}`;
        if (this.lastProgressKey !== progressKey) {
            this.lastProgressKey = progressKey;
            
            // 發送事件
            if (window.eventBus) {
                window.eventBus.emit('players:voting-progress', progress);
            }
            
            // 只在進度真正變化時記錄 log
            console.log(`📊 投票進度更新: ${progress.voted}/${progress.total} (${progress.percentage}%)`);
        }
        
        return progress;
    }
    
    /**
     * 獲取投票統計
     * @returns {Object} 統計數據
     */
    getVotingStatistics() {
        const players = this.getAllPlayers();
        const votes = players.filter(p => p.hasVoted).map(p => p.vote);
        
        return Utils.Game.calculateVoteStatistics(votes);
    }
    
    /**
     * 銷毀玩家列表
     */
    destroy() {
        this.players.forEach(player => player.destroy());
        this.players.clear();
        this.container.innerHTML = '';
    }
}

// 匯出到全域
window.Player = Player;
window.PlayerList = PlayerList;

console.log('👥 Player 玩家系統已載入 - v3.0.0-enhanced');