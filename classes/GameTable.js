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
        const originalValues = GAME_CONFIG.fibonacci;
        
        // 將卡牌按數值大小排序（數字在前，特殊符號在後）
        const cardValues = [...originalValues].sort((a, b) => {
            // 處理數字排序
            if (typeof a === 'number' && typeof b === 'number') {
                return a - b;
            }
            // 數字排在前面
            if (typeof a === 'number' && typeof b !== 'number') {
                return -1;
            }
            if (typeof a !== 'number' && typeof b === 'number') {
                return 1;
            }
            // 特殊符號按固定順序：☕, ❓, ∞
            const specialOrder = ['☕', '❓', '∞'];
            return specialOrder.indexOf(a) - specialOrder.indexOf(b);
        });
        
        // 改為水平排列，從左到右按順序顯示
        const cardWidth = GAME_CONFIG.cards.width;
        const cardHeight = GAME_CONFIG.cards.height;
        const cardSpacing = cardWidth + 15; // 調整間距為 15px
        const totalWidth = cardValues.length * cardSpacing - 15; // 總寬度
        const startX = this.centerX - totalWidth / 2; // 起始 X 座標（置中）
        
        // 響應式計算卡牌 Y 位置，確保不會超出螢幕
        const screenHeight = height || window.innerHeight || 800;
        const bottomMargin = 20;
        const maxCardY = screenHeight - cardHeight / 2 - bottomMargin;
        const idealCardY = this.centerY + this.radius + cardHeight / 2 + 30;
        const cardY = Math.min(idealCardY, maxCardY);
        
        for (let i = 0; i < cardValues.length; i++) {
            const x = startX + i * cardSpacing;
            const y = cardY;
            
            const card = new Card(cardValues[i], x, y);
            card.targetPosition.set(x, y);
            this.availableCards.push(card);
        }
        
        console.log(`🃏 初始化了 ${this.availableCards.length} 張手牌，按順序排列:`, 
                   cardValues.map(v => `${v}`).join(', '));
        console.log(`🎯 遊戲狀態: ${this.gamePhase}`);
        console.log(`📏 卡牌間距: ${cardSpacing}px，總寬度: ${totalWidth}px`);
        console.log(`✅ 手牌修復完成：強制白色背景、正面顯示、順序排列、無重疊`);
    }
    
    // 計算卡牌位置（響應式處理）
    calculateCardPositions() {
        this.cardPositions = [];
        
        if (this.availableCards.length === 0) return;
        
        // 重新計算卡牌位置，確保適應不同螢幕尺寸
        const cardWidth = GAME_CONFIG.cards.width;
        const cardHeight = GAME_CONFIG.cards.height;
        const cardSpacing = cardWidth + 15; // 調整間距為 15px
        const totalWidth = this.availableCards.length * cardSpacing - 15;
        const startX = this.centerX - totalWidth / 2;
        
        // 響應式計算卡牌 Y 位置，確保不會超出螢幕
        const screenWidth = width || window.innerWidth;
        const screenHeight = height || window.innerHeight;
        const margin = 30; // 邊距
        const bottomMargin = 20; // 底部邊距
        
        // 計算最大可用 Y 位置
        const maxCardY = screenHeight - cardHeight / 2 - bottomMargin;
        const idealCardY = this.centerY + this.radius + cardHeight / 2 + 30;
        const cardY = Math.min(idealCardY, maxCardY);
        
        // 檢查是否超出螢幕寬度，如果超出則調整間距
        const availableWidth = screenWidth - margin * 2;
        
        let finalSpacing = cardSpacing;
        let finalStartX = startX;
        
        if (totalWidth > availableWidth) {
            // 如果總寬度超出螢幕，調整間距
            finalSpacing = Math.max(cardWidth + 5, availableWidth / this.availableCards.length); // 最小間距為卡片寬度+5px
            finalStartX = margin + finalSpacing / 2;
            console.log(`📱 響應式調整：螢幕寬度 ${screenWidth}px，調整間距至 ${finalSpacing.toFixed(1)}px`);
        }
        
        // 如果卡牌太多導致間距過小，考慮縮小卡牌
        if (finalSpacing < cardWidth + 10) {
            const scale = Math.min(1, (finalSpacing - 5) / cardWidth);
            console.log(`📱 卡牌縮放：${(scale * 100).toFixed(1)}%`);
        }
        
        // 更新所有卡牌位置
        for (let i = 0; i < this.availableCards.length; i++) {
            const x = finalStartX + i * finalSpacing;
            const y = cardY;
            
            this.cardPositions.push(new Vector2D(x, y));
            
            // 同時更新卡牌的目標位置
            if (this.availableCards[i]) {
                this.availableCards[i].targetPosition.set(x, y);
            }
        }
        
        console.log(`📐 重新計算 ${this.availableCards.length} 張卡牌位置，間距: ${finalSpacing.toFixed(1)}px`);
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
                
                // 更新所有玩家卡牌的遊戲階段
                this.updatePlayerCardsPhase();
                
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
            text('🎮', this.centerX, this.centerY - 30);
            textSize(18);
            text('客製化 Scrum Poker', this.centerX, this.centerY - 5);
            textSize(12);
            text('Dev 與 QA 分組估點', this.centerX, this.centerY + 15);
            textSize(10);
            text('點擊下方卡牌進行估點', this.centerX, this.centerY + 30);
        } else if (this.gamePhase === 'voting') {
            // 計算各組投票狀況
            const devPlayers = this.players.filter(p => p.role === 'dev');
            const qaPlayers = this.players.filter(p => p.role === 'qa');
            const devVoted = devPlayers.filter(p => p.hasVoted).length;
            const qaVoted = qaPlayers.filter(p => p.hasVoted).length;
            
            textSize(18);
            text('🗳️ 分組估點進行中', this.centerX, this.centerY - 30);
            
            // Dev 組狀態
            if (devPlayers.length > 0) {
                const devColor = devVoted === devPlayers.length ? color(34, 197, 94) : color(251, 191, 36);
                fill(devColor);
                textSize(12);
                text(`👨‍💻 Dev: ${devVoted}/${devPlayers.length}`, this.centerX - 50, this.centerY);
            }
            
            // QA 組狀態
            if (qaPlayers.length > 0) {
                const qaColor = qaVoted === qaPlayers.length ? color(34, 197, 94) : color(251, 191, 36);
                fill(qaColor);
                textSize(12);
                text(`🐛 QA: ${qaVoted}/${qaPlayers.length}`, this.centerX + 50, this.centerY);
            }
            
            // 總體狀態
            fill(255, 200);
            textSize(10);
            const totalVoted = this.players.filter(p => p.hasVoted).length;
            text(`總進度: ${totalVoted}/${this.players.length}`, this.centerX, this.centerY + 20);
            
        } else if (this.gamePhase === 'revealing') {
            textSize(20);
            text('🎭 開牌中...', this.centerX, this.centerY - 10);
            textSize(12);
            text('即將顯示分組結果', this.centerX, this.centerY + 10);
        } else if (this.gamePhase === 'finished') {
            textSize(20);
            text('🎉 估點完成！', this.centerX, this.centerY - 20);
            
            // 顯示分組結果摘要
            const devPlayers = this.players.filter(p => p.role === 'dev' && p.hasVoted);
            const qaPlayers = this.players.filter(p => p.role === 'qa' && p.hasVoted);
            
            if (devPlayers.length > 0) {
                const devAvg = devPlayers.reduce((sum, p) => sum + p.vote, 0) / devPlayers.length;
                fill(color(52, 211, 153));
                textSize(12);
                text(`👨‍💻 Dev: ${devAvg.toFixed(1)} 點`, this.centerX - 50, this.centerY + 5);
            }
            
            if (qaPlayers.length > 0) {
                const qaAvg = qaPlayers.reduce((sum, p) => sum + p.vote, 0) / qaPlayers.length;
                fill(color(251, 146, 60));
                textSize(12);
                text(`🐛 QA: ${qaAvg.toFixed(1)} 點`, this.centerX + 50, this.centerY + 5);
            }
            
            fill(255, 200);
            textSize(10);
            text('按 H 鍵查看 Scrum Master 建議', this.centerX, this.centerY + 25);
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
        
        // 開始遊戲（需要至少 1 個玩家，但允許立即開始投票）
        if (this.gamePhase === 'waiting' && this.players.length >= 1) {
            console.log(`🎮 有 ${this.players.length} 位玩家，開始投票階段`);
            console.log(`🔍 當前遊戲狀態變更: waiting -> voting`);
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
        
        // 更新所有玩家卡牌的遊戲階段
        this.updatePlayerCardsPhase();
        
        console.log('📊 投票開始！');
        console.log(`🔍 遊戲狀態已設為: ${this.gamePhase}`);
        console.log(`👥 目前玩家數: ${this.players.length}`);
        console.log(`🃏 可用卡牌數: ${this.availableCards.length}`);
    }
    
    // 更新所有玩家卡牌的遊戲階段
    updatePlayerCardsPhase() {
        for (const player of this.players) {
            if (player.card && typeof player.card.setGamePhase === 'function') {
                player.card.setGamePhase(this.gamePhase);
            }
        }
        console.log(`🔄 更新卡牌階段至: ${this.gamePhase}`);
    }
    
    // 選擇卡牌
    selectCard(value) {
        // 檢查遊戲狀態
        if (this.gamePhase !== 'voting') {
            console.warn(`⚠️ 無法選擇卡牌，目前狀態: ${this.gamePhase}`);
            return;
        }
        
        // 找到對應的卡牌
        const card = this.availableCards.find(c => c.value === value);
        if (!card) {
            console.warn(`⚠️ 找不到卡牌: ${value}`);
            return;
        }
        
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
            
            // 同步到 Firebase
            if (firebaseManager) {
                firebaseManager.vote(value);
            }
            
            console.log(`✅ ${currentPlayer.name} 選擇了 ${value}`);
            
            // 檢查是否所有玩家都已投票，自動開牌
            this.checkAutoReveal();
        } else {
            console.warn('⚠️ 找不到當前玩家');
        }
    }
    
    // 檢查是否自動開牌
    checkAutoReveal() {
        if (this.gamePhase !== 'voting') return;
        
        const votedCount = this.players.filter(p => p.hasVoted).length;
        const totalPlayers = this.players.length;
        
        console.log(`📊 投票進度: ${votedCount}/${totalPlayers}`);
        
        // 當所有玩家都投票完成時，延遲 1 秒自動開牌
        // 但至少需要有一個玩家實際投票
        if (votedCount === totalPlayers && totalPlayers > 0 && votedCount > 0) {
            console.log('🎯 所有玩家已投票，準備自動開牌');
            setTimeout(() => {
                if (this.gamePhase === 'voting') { // 再次檢查狀態，避免重複執行
                    this.revealCards();
                }
            }, 1000);
        }
    }
    
    // 開牌
    revealCards() {
        if (this.gamePhase !== 'voting') return;
        
        this.gamePhase = 'revealing';
        this.revealStartTime = millis();
        
        // 更新所有玩家卡牌的遊戲階段
        this.updatePlayerCardsPhase();
        
        // 開始翻牌動畫
        for (const player of this.players) {
            if (player.card) {
                player.card.flip();
            }
        }
        
        console.log('🎭 開始開牌！');
    }
    
    // 清除投票
    clearVotes() {
        this.startVoting();
        console.log('重新開始投票！');
    }
    
    // 滑鼠按下處理
    handleMousePressed(mx, my) {
        // 首先檢查是否有確認對話框需要處理
        if (uiManager && uiManager.confirmDialog.visible) {
            const handled = uiManager.handleConfirmDialogClick(mx, my);
            if (handled) return; // 如果對話框處理了點擊，就停止其他處理
        }
        
        console.log(`🖱️ 點擊檢測: (${mx}, ${my}) - 遊戲階段: ${this.gamePhase}`);
        
        // 檢查是否點擊了卡牌（僅在投票階段）
        if (this.gamePhase === 'voting') {
            for (const card of this.availableCards) {
                if (card.isMouseOver(mx, my)) {
                    console.log(`🃏 點擊了卡牌: ${card.value}`);
                    this.selectCard(card.value);
                    return; // 避免重複處理
                }
            }
        }
        
        // 檢查是否點擊了玩家刪除按鈕
        for (const player of this.players) {
            if (player.isDeleteButtonHovered(mx, my)) {
                console.log(`🗑️ 點擊了刪除按鈕: ${player.name}`);
                this.handlePlayerDelete(player);
                return; // 避免重複處理
            }
        }
        
        // 檢查是否點擊了玩家
        for (const player of this.players) {
            if (player.isMouseOver(mx, my)) {
                console.log(`👤 點擊了玩家: ${player.name}`);
                // 切換刪除按鈕顯示
                this.togglePlayerDeleteButtons(player);
                return; // 避免重複處理
            }
        }
        
        console.log(`❌ 點擊位置無有效目標`);
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
        
        // 更新玩家刪除按鈕懸停狀態
        for (const player of this.players) {
            player.updateDeleteButtonHover(mx, my);
        }
    }
    
    // 滑鼠拖拽處理
    handleMouseDragged(mx, my) {
        // 目前不需要特殊處理
    }
    
    // 切換玩家刪除按鈕顯示
    togglePlayerDeleteButtons(clickedPlayer) {
        // 如果點擊的是當前玩家，則顯示/隱藏其他玩家的刪除按鈕
        if (clickedPlayer.isCurrentPlayer) {
            const anyButtonVisible = this.players.some(p => p.deleteButton.visible);
            
            for (const player of this.players) {
                if (!player.isCurrentPlayer) {
                    if (anyButtonVisible) {
                        player.hideDeleteButton();
                    } else {
                        player.showDeleteButton();
                    }
                }
            }
        }
    }
    
    // 隱藏所有刪除按鈕
    hideAllDeleteButtons() {
        for (const player of this.players) {
            player.hideDeleteButton();
        }
    }
    
    // 處理玩家刪除
    handlePlayerDelete(player) {
        console.log(`🚨 準備刪除玩家: ${player.name}`);
        
        // 呼叫確認對話框 (下一步實現)
        this.confirmPlayerDelete(player);
    }
    
    // 確認刪除玩家
    confirmPlayerDelete(player) {
        if (uiManager) {
            uiManager.showDeleteConfirmation(
                player.name,
                player.id,
                () => {
                    // 確認回調
                    this.deletePlayer(player.id);
                },
                () => {
                    // 取消回調
                    console.log(`❌ 取消刪除玩家: ${player.name}`);
                }
            );
        } else {
            // 後備方案，使用瀏覽器原生對話框
            const confirmed = confirm(`確定要移除玩家 "${player.name}" 嗎？\n\n這個操作無法復原。`);
            if (confirmed) {
                this.deletePlayer(player.id);
            }
        }
    }
    
    // 刪除玩家
    deletePlayer(playerId) {
        const playerIndex = this.players.findIndex(p => p.id === playerId);
        
        if (playerIndex !== -1) {
            const player = this.players[playerIndex];
            console.log(`🗑️ 開始刪除玩家: ${player.name} (ID: ${playerId})`);
            
            // 驗證不能刪除自己
            if (player.isCurrentPlayer) {
                console.error('❌ 無法刪除自己');
                if (uiManager) {
                    uiManager.showError('無法刪除自己');
                }
                return;
            }
            
            // 播放離開動畫
            player.leave();
            
            // 延遲移除以顯示動畫
            setTimeout(() => {
                // 再次驗證玩家仍然存在
                const stillExists = this.players.find(p => p.id === playerId);
                if (!stillExists) {
                    console.log('⚠️ 玩家已被其他方式移除');
                    return;
                }
                
                this.removePlayer(playerId);
                
                // 隱藏所有刪除按鈕
                this.hideAllDeleteButtons();
                
                // 同步到 Firebase
                if (firebaseManager) {
                    firebaseManager.removePlayer(playerId).then((success) => {
                        if (success) {
                            console.log(`🔄 Firebase 同步成功: 移除玩家 ${player.name}`);
                        } else {
                            console.error(`❌ Firebase 同步失敗: 移除玩家 ${player.name}`);
                        }
                    }).catch((error) => {
                        console.error('Firebase 移除玩家時發生錯誤:', error);
                    });
                } else {
                    console.log('⚠️ 本地模式: 未同步到 Firebase');
                }
                
                console.log(`✅ 玩家 ${player.name} 已被成功移除`);
            }, 300);
        } else {
            console.warn(`⚠️ 找不到要刪除的玩家: ${playerId}`);
        }
    }
    
    // 驗證刪除功能狀態 (用於測試)
    validateDeleteFeature() {
        const report = {
            totalPlayers: this.players.length,
            currentPlayer: null,
            otherPlayers: [],
            deleteButtonsVisible: 0,
            errors: []
        };
        
        const currentPlayer = this.players.find(p => p.isCurrentPlayer);
        if (currentPlayer) {
            report.currentPlayer = {
                name: currentPlayer.name,
                id: currentPlayer.id,
                hasDeleteButton: currentPlayer.deleteButton.visible
            };
            
            if (currentPlayer.deleteButton.visible) {
                report.errors.push('當前玩家不應該有刪除按鈕');
            }
        } else {
            report.errors.push('找不到當前玩家');
        }
        
        for (const player of this.players) {
            if (!player.isCurrentPlayer) {
                report.otherPlayers.push({
                    name: player.name,
                    id: player.id,
                    hasDeleteButton: player.deleteButton.visible
                });
                
                if (player.deleteButton.visible) {
                    report.deleteButtonsVisible++;
                }
            }
        }
        
        console.log('🔍 刪除功能驗證報告:', report);
        return report;
    }
    
    // 測試刪除功能
    testDeleteFeature() {
        console.log('🧪 開始測試刪除功能...');
        
        // 測試 1：初始狀態檢查
        const initialReport = this.validateDeleteFeature();
        console.log('測試 1 - 初始狀態:', initialReport.deleteButtonsVisible === 0 ? '✅ 通過' : '❌ 失敗');
        
        // 測試 2：D 鍵切換
        const currentPlayer = this.players.find(p => p.isCurrentPlayer);
        if (currentPlayer) {
            this.togglePlayerDeleteButtons(currentPlayer);
            const afterToggleReport = this.validateDeleteFeature();
            const expectedVisible = this.players.length - 1; // 除了當前玩家外的所有玩家
            console.log('測試 2 - D 鍵切換:', afterToggleReport.deleteButtonsVisible === expectedVisible ? '✅ 通過' : '❌ 失敗');
            
            // 測試 3：再次切換應該隱藏
            this.togglePlayerDeleteButtons(currentPlayer);
            const afterSecondToggleReport = this.validateDeleteFeature();
            console.log('測試 3 - 再次切換:', afterSecondToggleReport.deleteButtonsVisible === 0 ? '✅ 通過' : '❌ 失敗');
        }
        
        console.log('🧪 刪除功能測試完成');
        return true;
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