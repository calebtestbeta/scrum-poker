// 遊戲桌面類別 - 管理圓桌和遊戲流程
class GameTable {
    constructor() {
        // 桌面屬性
        this.centerX = GAME_CONFIG.table.centerX;
        this.centerY = GAME_CONFIG.table.centerY;
        this.radius = GAME_CONFIG.table.radius;
        this.innerRadius = GAME_CONFIG.table.innerRadius;
        
        // 玩家管理
        this.players = [];
        this.maxPlayers = 12;
        this.currentPlayerId = null;
        
        // 卡牌系統
        this.availableCards = [];
        this.selectedCard = null;
        this.cardPositions = [];
        this.deckPosition = new Vector2D(this.centerX, this.centerY + this.innerRadius + 60);
        
        // 遊戲狀態
        this.gamePhase = 'waiting'; // waiting, voting, revealing, finished
        this.votingStartTime = 0;
        this.revealStartTime = 0;
        this.allVotesRevealed = false;
        
        // 視覺效果
        this.tableRotation = 0;
        this.glowIntensity = 0;
        this.pulsePhase = 0;
        
        // 初始化
        this.initializeCards();
        this.calculateCardPositions();
    }
    
    // 初始化卡牌
    initializeCards() {
        this.availableCards = [];
        const cardValues = GAME_CONFIG.fibonacci;
        
        // 計算卡牌排列位置（扇形排列在桌面下方）
        const startAngle = PI / 6; // 30度
        const endAngle = PI - PI / 6; // 150度
        const angleStep = (endAngle - startAngle) / (cardValues.length - 1);
        const cardRadius = this.innerRadius + 120;
        
        for (let i = 0; i < cardValues.length; i++) {
            const angle = startAngle + i * angleStep;
            const x = this.centerX + cos(angle) * cardRadius;
            const y = this.centerY + sin(angle) * cardRadius;
            
            const card = new Card(cardValues[i], x, y);
            card.targetPosition.set(x, y);
            this.availableCards.push(card);
        }
    }
    
    // 計算卡牌位置
    calculateCardPositions() {
        this.cardPositions = [];
        const cardCount = this.availableCards.length;
        
        for (let i = 0; i < cardCount; i++) {
            const angle = (i / cardCount) * TWO_PI - PI / 2;
            const x = this.centerX + cos(angle) * (this.innerRadius + 80);
            const y = this.centerY + sin(angle) * (this.innerRadius + 80);
            this.cardPositions.push(new Vector2D(x, y));
        }
    }
    
    // 更新遊戲桌面
    update() {
        // 更新視覺效果
        this.updateVisualEffects();
        
        // 更新玩家
        for (const player of this.players) {
            player.update();
        }
        
        // 更新卡牌
        for (const card of this.availableCards) {
            card.update();
        }
        
        // 更新遊戲狀態
        this.updateGameState();
    }
    
    // 更新視覺效果
    updateVisualEffects() {
        // 桌面旋轉
        this.tableRotation += 0.001;
        
        // 光暈效果
        this.pulsePhase += 0.03;
        this.glowIntensity = 0.5 + sin(this.pulsePhase) * 0.3;
        
        // 根據遊戲狀態調整效果
        if (this.gamePhase === 'voting') {
            this.glowIntensity *= 1.5;
        }
    }
    
    // 更新遊戲狀態
    updateGameState() {
        const currentTime = millis();
        
        // 檢查投票狀態
        if (this.gamePhase === 'voting') {
            const votedCount = this.players.filter(p => p.hasVoted).length;
            
            // 更新投票進度
            if (firebaseManager) {
                firebaseManager.updateVotingProgress(votedCount, this.players.length);
            }
        }
        
        // 檢查開牌狀態
        if (this.gamePhase === 'revealing' && !this.allVotesRevealed) {
            const revealProgress = (currentTime - this.revealStartTime) / 2000; // 2秒動畫
            
            if (revealProgress >= 1) {
                this.allVotesRevealed = true;
                this.gamePhase = 'finished';
                
                // 觸發慶祝動畫
                for (const player of this.players) {
                    if (player.hasVoted) {
                        player.celebrate();
                    }
                }
            }
        }
    }
    
    // 繪製遊戲桌面
    draw() {
        this.update();
        
        // 繪製桌面
        this.drawTable();
        
        // 繪製卡牌區域
        this.drawCardArea();
        
        // 繪製玩家
        this.drawPlayers();
        
        // 繪製中央資訊
        this.drawCenterInfo();
        
        // 繪製遊戲狀態
        this.drawGameStatus();
    }
    
    // 繪製桌面
    drawTable() {
        push();
        translate(this.centerX, this.centerY);
        rotate(this.tableRotation);
        
        // 外圈桌面
        fill(color(GAME_CONFIG.colors.table));
        stroke(color(GAME_CONFIG.colors.tableHighlight));
        strokeWeight(4);
        circle(0, 0, this.radius * 2);
        
        // 內圈桌面（稍亮）
        fill(red(color(GAME_CONFIG.colors.table)) + 20,
             green(color(GAME_CONFIG.colors.table)) + 15,
             blue(color(GAME_CONFIG.colors.table)) + 10);
        noStroke();
        circle(0, 0, this.innerRadius * 2);
        
        // 桌面紋理
        this.drawTableTexture();
        
        // 光暈效果
        if (this.gamePhase === 'voting' || this.gamePhase === 'revealing') {
            this.drawTableGlow();
        }
        
        pop();
    }
    
    // 繪製桌面紋理
    drawTableTexture() {
        stroke(255, 255, 255, 20);
        strokeWeight(1);
        noFill();
        
        // 同心圓紋理
        for (let r = 20; r < this.innerRadius; r += 15) {
            circle(0, 0, r * 2);
        }
        
        // 放射線紋理
        for (let i = 0; i < 16; i++) {
            const angle = (i / 16) * TWO_PI;
            const x1 = cos(angle) * 30;
            const y1 = sin(angle) * 30;
            const x2 = cos(angle) * (this.innerRadius - 10);
            const y2 = sin(angle) * (this.innerRadius - 10);
            line(x1, y1, x2, y2);
        }
    }
    
    // 繪製桌面光暈
    drawTableGlow() {
        const glowColor = color(GAME_CONFIG.colors.accent);
        
        for (let i = 0; i < 3; i++) {
            stroke(red(glowColor), green(glowColor), blue(glowColor), 
                   (50 - i * 15) * this.glowIntensity);
            strokeWeight(2 - i * 0.5);
            noFill();
            circle(0, 0, (this.innerRadius + i * 10) * 2);
        }
    }
    
    // 繪製卡牌區域
    drawCardArea() {
        // 繪製可選卡牌
        for (const card of this.availableCards) {
            card.draw();
        }
        
        // 繪製選中卡牌的特效
        if (this.selectedCard) {
            this.drawSelectedCardEffect();
        }
    }
    
    // 繪製選中卡牌特效
    drawSelectedCardEffect() {
        if (!this.selectedCard) return;
        
        push();
        translate(this.selectedCard.position.x, this.selectedCard.position.y);
        
        // 脈動光環
        const pulseSize = 20 + sin(this.pulsePhase * 2) * 5;
        noFill();
        stroke(GAME_CONFIG.colors.accent);
        strokeWeight(3);
        circle(0, 0, this.selectedCard.size.x + pulseSize);
        
        // 粒子效果
        for (let i = 0; i < 8; i++) {
            const angle = (millis() * 0.01 + i * PI / 4) % TWO_PI;
            const radius = 50 + sin(millis() * 0.005 + i) * 10;
            const x = cos(angle) * radius;
            const y = sin(angle) * radius;
            
            fill(GAME_CONFIG.colors.accent);
            noStroke();
            circle(x, y, 4);
        }
        
        pop();
    }
    
    // 繪製玩家
    drawPlayers() {
        for (const player of this.players) {
            player.draw();
        }
    }
    
    // 繪製中央資訊
    drawCenterInfo() {
        push();
        textAlign(CENTER, CENTER);
        fill(255, 200);
        
        if (this.gamePhase === 'waiting') {
            textSize(24);
            text('🎮', this.centerX, this.centerY - 20);
            textSize(16);
            text('等待玩家加入...', this.centerX, this.centerY + 10);
        } else if (this.gamePhase === 'voting') {
            const votedCount = this.players.filter(p => p.hasVoted).length;
            textSize(20);
            text('投票中...', this.centerX, this.centerY - 10);
            textSize(14);
            text(`${votedCount}/${this.players.length} 已投票`, this.centerX, this.centerY + 15);
        } else if (this.gamePhase === 'revealing') {
            textSize(20);
            text('🎭 開牌中...', this.centerX, this.centerY);
        } else if (this.gamePhase === 'finished') {
            textSize(20);
            text('🎉 投票完成！', this.centerX, this.centerY - 10);
            
            // 顯示統計資訊
            const votes = this.players.filter(p => p.hasVoted).map(p => p.vote);
            if (votes.length > 0) {
                const consensus = this.calculateConsensus(votes);
                textSize(14);
                text(`共識度: ${consensus}%`, this.centerX, this.centerY + 15);
            }
        }
        
        pop();
    }
    
    // 繪製遊戲狀態
    drawGameStatus() {
        // 在左上角顯示詳細狀態
        push();
        fill(255, 255, 255, 200);
        textAlign(LEFT, TOP);
        textSize(12);
        
        const statusY = 60;
        text(`遊戲階段: ${this.getPhaseText()}`, 20, statusY);
        text(`玩家數量: ${this.players.length}`, 20, statusY + 20);
        
        if (this.gamePhase === 'voting') {
            const votedCount = this.players.filter(p => p.hasVoted).length;
            text(`投票進度: ${votedCount}/${this.players.length}`, 20, statusY + 40);
        }
        
        pop();
    }
    
    // 取得階段文字
    getPhaseText() {
        const phases = {
            'waiting': '等待中',
            'voting': '投票中',
            'revealing': '開牌中',
            'finished': '已完成'
        };
        return phases[this.gamePhase] || '未知';
    }
    
    // 計算共識度
    calculateConsensus(votes) {
        if (votes.length === 0) return 0;
        
        const numericVotes = votes.filter(v => typeof v === 'number');
        if (numericVotes.length < 2) return 100;
        
        const avg = numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length;
        const variance = numericVotes.reduce((sum, vote) => sum + Math.pow(vote - avg, 2), 0) / numericVotes.length;
        const maxVariance = Math.pow(Math.max(...numericVotes) - Math.min(...numericVotes), 2) / 4;
        
        return Math.round((1 - (variance / (maxVariance || 1))) * 100);
    }
    
    // 新增玩家
    addPlayer(id, name, role) {
        if (this.players.length >= this.maxPlayers) {
            console.warn('桌子已滿，無法新增更多玩家');
            return null;
        }
        
        const seatIndex = this.players.length;
        const player = new Player(id, name, role, seatIndex);
        this.players.push(player);
        
        // 如果是第一個玩家，設為當前玩家
        if (this.players.length === 1) {
            this.currentPlayerId = id;
            player.isCurrentPlayer = true;
        }
        
        // 開始遊戲
        if (this.gamePhase === 'waiting' && this.players.length > 0) {
            this.startVoting();
        }
        
        return player;
    }
    
    // 移除玩家
    removePlayer(id) {
        const index = this.players.findIndex(p => p.id === id);
        if (index !== -1) {
            this.players[index].leave();
            this.players.splice(index, 1);
            
            // 重新安排座位
            this.rearrangeSeats();
            
            // 如果沒有玩家了，回到等待狀態
            if (this.players.length === 0) {
                this.gamePhase = 'waiting';
            }
        }
    }
    
    // 重新安排座位
    rearrangeSeats() {
        for (let i = 0; i < this.players.length; i++) {
            this.players[i].seatIndex = i;
            
            // 重新計算位置
            const angle = (i / 12) * TWO_PI - PI / 2;
            const radius = GAME_CONFIG.table.radius;
            this.players[i].position.set(
                GAME_CONFIG.table.centerX + cos(angle) * radius,
                GAME_CONFIG.table.centerY + sin(angle) * radius
            );
        }
    }
    
    // 開始投票
    startVoting() {
        this.gamePhase = 'voting';
        this.votingStartTime = millis();
        this.selectedCard = null;
        this.allVotesRevealed = false;
        
        // 重設所有玩家狀態
        for (const player of this.players) {
            player.clearVote();
        }
        
        console.log('投票開始！');
    }
    
    // 選擇卡牌
    selectCard(value) {
        // 找到對應的卡牌
        const card = this.availableCards.find(c => c.value === value);
        if (!card) return;
        
        // 設定選中的卡牌
        this.selectedCard = card;
        card.isSelected = true;
        
        // 清除其他卡牌的選中狀態
        for (const otherCard of this.availableCards) {
            if (otherCard !== card) {
                otherCard.isSelected = false;
            }
        }
        
        // 為當前玩家投票
        const currentPlayer = this.players.find(p => p.isCurrentPlayer);
        if (currentPlayer) {
            currentPlayer.setVote(value);
            console.log(`${currentPlayer.name} 選擇了 ${value}`);
        }
    }
    
    // 開牌
    revealCards() {
        if (this.gamePhase !== 'voting') return;
        
        this.gamePhase = 'revealing';
        this.revealStartTime = millis();
        
        // 開始翻牌動畫
        for (const player of this.players) {
            if (player.card) {
                player.card.flip();
            }
        }
        
        console.log('開始開牌！');
    }
    
    // 清除投票
    clearVotes() {
        this.startVoting();
        console.log('重新開始投票！');
    }
    
    // 滑鼠按下處理
    handleMousePressed(mx, my) {
        if (this.gamePhase !== 'voting') return;
        
        // 檢查是否點擊了卡牌
        for (const card of this.availableCards) {
            if (card.isMouseOver(mx, my)) {
                this.selectCard(card.value);
                break;
            }
        }
        
        // 檢查是否點擊了玩家
        for (const player of this.players) {
            if (player.isMouseOver(mx, my)) {
                console.log(`點擊了玩家: ${player.name}`);
                break;
            }
        }
    }
    
    // 滑鼠釋放處理
    handleMouseReleased(mx, my) {
        // 目前不需要特殊處理
    }
    
    // 滑鼠移動處理
    handleMouseMoved(mx, my) {
        // 更新卡牌懸停狀態
        for (const card of this.availableCards) {
            card.isHovered = card.isMouseOver(mx, my);
        }
    }
    
    // 滑鼠拖拽處理
    handleMouseDragged(mx, my) {
        // 目前不需要特殊處理
    }
    
    // 取得遊戲狀態
    getGameState() {
        return {
            phase: this.gamePhase,
            players: this.players.map(p => ({
                id: p.id,
                name: p.name,
                role: p.role,
                hasVoted: p.hasVoted,
                vote: p.vote,
                isCurrentPlayer: p.isCurrentPlayer
            })),
            selectedCard: this.selectedCard ? this.selectedCard.value : null
        };
    }
}