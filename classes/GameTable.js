// 遊戲桌面類別 - 管理圓桌和遊戲流程
class GameTable {
    constructor() {
        // 簡化設計 - 移除桌面設計
        this.centerX = GAME_CONFIG.table.centerX;
        this.centerY = GAME_CONFIG.table.centerY;
        
        // 玩家管理
        this.players = [];
        this.maxPlayers = 12;
        this.currentPlayerId = null;
        
        // 卡牌系統
        this.availableCards = [];
        this.selectedCard = null;
        this.cardPositions = [];
        
        // 遊戲狀態
        this.gamePhase = 'waiting'; // waiting, voting, revealing, finished
        this.votingStartTime = 0;
        this.revealStartTime = 0;
        this.allVotesRevealed = false;
        
        // 投票狀態追蹤（用於避免重複 log）
        this.lastVotedCount = -1;
        this.lastTotalPlayers = -1;
        this.lastGamePhase = '';
        
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
        
        // 卡牌水平排列在畫面下方
        const cardWidth = GAME_CONFIG.cards.width;
        const cardHeight = GAME_CONFIG.cards.height;
        const cardSpacing = cardWidth + 12; // 調整間距
        const totalWidth = cardValues.length * cardSpacing - 12;
        const startX = this.centerX - totalWidth / 2;
        
        // 卡牌固定在畫面底部區域
        const screenHeight = height || window.innerHeight || 800;
        const bottomMargin = 30;
        const cardY = screenHeight - cardHeight / 2 - bottomMargin;
        
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
        
        // 重新計算卡牌位置 - 簡化版本
        const cardWidth = GAME_CONFIG.cards.width;
        const cardHeight = GAME_CONFIG.cards.height;
        const cardSpacing = cardWidth + 12;
        const totalWidth = this.availableCards.length * cardSpacing - 12;
        
        const screenWidth = width || window.innerWidth;
        const screenHeight = height || window.innerHeight;
        const margin = 20;
        
        // 根據螢幕尺寸動態調整底部邊距，避免與控制按鈕重疊
        let bottomMargin = 30;
        if (screenWidth <= 480) {
            bottomMargin = 140; // 小螢幕：避免與按鈕重疊
        } else if (screenWidth <= 768) {
            bottomMargin = 160; // 中螢幕：給按鈕留更多空間
        } else if (screenWidth <= 1024) {
            bottomMargin = 180; // 大螢幕：標準間距
        } else {
            bottomMargin = 200; // 桌面：最大間距
        }
        
        // 卡牌位置計算，向上移動避免重疊
        const cardY = screenHeight - cardHeight / 2 - bottomMargin;
        
        // 響應式寬度調整
        const availableWidth = screenWidth - margin * 2;
        let finalSpacing = cardSpacing;
        let finalStartX = this.centerX - totalWidth / 2;
        
        if (totalWidth > availableWidth) {
            finalSpacing = Math.max(cardWidth + 5, availableWidth / this.availableCards.length);
            finalStartX = margin + finalSpacing / 2;
            console.log(`📱 卡牌響應式調整：間距 ${finalSpacing.toFixed(1)}px`);
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
            const totalPlayers = this.players.length;
            
            // 只在投票狀態改變時才更新，避免每幀都調用 log
            if (this.lastVotedCount !== votedCount || 
                this.lastTotalPlayers !== totalPlayers || 
                this.lastGamePhase !== this.gamePhase) {
                
                this.lastVotedCount = votedCount;
                this.lastTotalPlayers = totalPlayers;
                this.lastGamePhase = this.gamePhase;
                
                // 更新投票進度
                if (firebaseManager) {
                    firebaseManager.updateVotingProgress(votedCount, totalPlayers);
                }
                
                console.log(`🎯 投票狀態變化: ${votedCount}/${totalPlayers} 玩家已投票`);
            }
        }
        
        // 檢查開牌狀態
        if (this.gamePhase === 'revealing' && !this.allVotesRevealed) {
            const revealProgress = (currentTime - this.revealStartTime) / 2000; // 2秒動畫
            
            if (revealProgress >= 1) {
                this.allVotesRevealed = true;
                this.gamePhase = 'finished';
                this.lastGamePhase = 'finished'; // 更新追蹤狀態
                
                console.log('🎊 開牌動畫完成，轉換到完成狀態');
                
                // 同步到 Firebase
                if (firebaseManager) {
                    firebaseManager.updateGamePhase('finished');
                }
                
                // 更新所有玩家卡牌的遊戲階段
                this.updatePlayerCardsPhase();
                
                // 觸發慶祝動畫
                for (const player of this.players) {
                    if (player.hasVoted) {
                        player.celebrate();
                    }
                }
                
                // 顯示結果統計
                if (uiManager) {
                    const votes = this.players.filter(p => p.hasVoted).map(p => ({
                        playerId: p.id,
                        playerName: p.name,
                        playerRole: p.role,
                        value: p.vote
                    }));
                    uiManager.updateStatistics(votes);
                }
            }
        }
    }
    
    // 繪製遊戲桌面
    draw() {
        this.update();
        
        // 繪製背景
        this.drawBackground();
        
        // 繪製玩家（上方橫向排列）
        this.drawPlayers();
        
        // 繪製遊戲資訊
        this.drawGameInfo();
        
        // 繪製中央操作區域
        this.drawCenterControls();
        
        // 繪製卡牌區域（下方）
        this.drawCardArea();
    }
    
    // 繪製簡單背景
    drawBackground() {
        // 簡單的漸層背景
        push();
        noStroke();
        
        // 背景漸層效果
        for (let y = 0; y < height; y += 5) {
            const alpha = map(y, 0, height, 50, 20);
            fill(255, 255, 255, alpha);
            rect(0, y, width, 5);
        }
        
        pop();
    }
    
    // 繪製中央操作區域
    drawCenterControls() {
        push();
        
        // 初始化按鈕陣列（每次重新繪製時清空）
        this.buttons = [];
        
        // 中央區域背景
        const centerY = height * 0.4;
        const buttonWidth = 150;
        const buttonHeight = 50;
        const buttonSpacing = 20;
        
        // 根據遊戲狀態顯示不同的控制按鈕
        if (this.gamePhase === 'voting') {
            const totalVoted = this.players.filter(p => p.hasVoted).length;
            const totalPlayers = this.players.length;
            
            // 開牌按鈕
            if (totalVoted > 0) {
                this.drawButton('🎭 開牌', this.centerX, centerY, buttonWidth, buttonHeight, 
                               color(52, 211, 153), () => this.revealCards());
            }
        } else if (this.gamePhase === 'finished') {
            // 重新開始按鈕
            console.log('🔄 繪製重新開始按鈕 (finished 階段)');
            this.drawButton('🔄 重新開始', this.centerX, centerY, buttonWidth, buttonHeight,
                           color(59, 130, 246), () => {
                               console.log('🔄 重新開始按鈕回調被調用');
                               this.clearVotes();
                           });
        }
        
        pop();
    }
    
    // 繪製按鈕
    drawButton(buttonText, x, y, w, h, bgColor, onClick) {
        push();
        
        // 檢查滑鼠懸停
        const isHovered = mouseX >= x - w/2 && mouseX <= x + w/2 && 
                         mouseY >= y - h/2 && mouseY <= y + h/2;
        
        // 按鈕背景
        if (isHovered) {
            fill(red(bgColor) + 20, green(bgColor) + 20, blue(bgColor) + 20);
        } else {
            fill(bgColor);
        }
        
        stroke(255, 255, 255, 100);
        strokeWeight(2);
        rectMode(CENTER);
        rect(x, y, w, h, 10);
        
        // 按鈕文字
        fill(255);
        textAlign(CENTER, CENTER);
        textSize(16);
        textStyle(BOLD);
        text(buttonText, x, y);
        
        // 儲存點擊區域（用於後續點擊檢測）
        this.buttons.push({x, y, w, h, onClick, text: buttonText});
        
        pop();
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
    
    // 繪製遊戲資訊（整合到中央區域）
    drawGameInfo() {
        push();
        textAlign(CENTER, CENTER);
        fill(255, 200);
        
        const infoY = height * 0.25;
        
        if (this.gamePhase === 'waiting') {
            textSize(28);
            text('🎮 Scrum Poker', this.centerX, infoY);
            textSize(16);
            text('等待玩家加入遊戲...', this.centerX, infoY + 40);
        } else if (this.gamePhase === 'finished') {
            textSize(24);
            text('🎉 估點完成！', this.centerX, infoY);
            
            // 顯示結果統計
            const devPlayers = this.players.filter(p => p.role === 'dev' && p.hasVoted);
            const qaPlayers = this.players.filter(p => p.role === 'qa' && p.hasVoted);
            
            let resultY = infoY + 30;
            if (devPlayers.length > 0) {
                const devAvg = devPlayers.reduce((sum, p) => sum + (typeof p.vote === 'number' ? p.vote : 0), 0) / devPlayers.length;
                fill(color(52, 211, 153));
                textSize(14);
                text(`👨‍💻 開發組平均: ${devAvg.toFixed(1)} 點`, this.centerX - 100, resultY);
            }
            
            if (qaPlayers.length > 0) {
                const qaAvg = qaPlayers.reduce((sum, p) => sum + (typeof p.vote === 'number' ? p.vote : 0), 0) / qaPlayers.length;
                fill(color(251, 146, 60));
                textSize(14);
                text(`🐛 測試組平均: ${qaAvg.toFixed(1)} 點`, this.centerX + 100, resultY);
            }
        }
        
        pop();
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
    
    // 重新安排座位（橫向排列，置中對齊）
    rearrangeSeats() {
        if (this.players.length === 0) return;
        
        const screenWidth = width || window.innerWidth || 1200;
        const playerWidth = 100; // 玩家顯示區域寬度
        const fixedSpacing = 130; // 固定間距
        const margin = 40; // 左右邊距
        
        // 計算所需總寬度
        const totalWidth = this.players.length * fixedSpacing - (fixedSpacing - playerWidth);
        const availableWidth = screenWidth - margin * 2;
        
        let finalSpacing = fixedSpacing;
        let startX = (screenWidth - totalWidth) / 2;
        
        // 只有在超出畫面範圍時才調整間距
        if (totalWidth > availableWidth) {
            finalSpacing = Math.max(playerWidth + 10, availableWidth / this.players.length);
            startX = margin + finalSpacing / 2;
            console.log(`📱 玩家間距調整: ${finalSpacing.toFixed(1)}px (螢幕寬度: ${screenWidth}px)`);
        }
        
        // 重新排列所有玩家位置
        for (let i = 0; i < this.players.length; i++) {
            const player = this.players[i];
            player.seatIndex = i;
            
            const newX = startX + i * finalSpacing;
            const newY = 80;
            
            // 更新玩家位置
            player.position.set(newX, newY);
            
            // 同步更新刪除按鈕位置
            player.updateDeleteButtonPosition();
            
            console.log(`🔄 玩家 ${player.name} 重新定位: (${newX.toFixed(1)}, ${newY})`);
        }
        
        console.log(`📐 座位重新排列完成: ${this.players.length} 位玩家，間距: ${finalSpacing.toFixed(1)}px`);
    }
    
    // 開始投票
    startVoting() {
        this.gamePhase = 'voting';
        this.lastGamePhase = 'voting'; // 更新追蹤狀態
        this.votingStartTime = millis();
        this.selectedCard = null;
        this.allVotesRevealed = false;
        
        // 重設投票狀態追蹤
        this.lastVotedCount = -1;
        this.lastTotalPlayers = -1;
        
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
        this.lastGamePhase = 'revealing'; // 更新追蹤狀態
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
            if (handled) return;
        }
        
        console.log(`🖱️ 點擊檢測: (${mx}, ${my}) - 遊戲階段: ${this.gamePhase}`);
        
        // 檢查是否點擊了中央按鈕
        if (this.buttons && this.buttons.length > 0) {
            for (const button of this.buttons) {
                if (mx >= button.x - button.w/2 && mx <= button.x + button.w/2 && 
                    my >= button.y - button.h/2 && my <= button.y + button.h/2) {
                    console.log(`🔘 點擊了按鈕: ${button.text}`);
                    button.onClick();
                    // 清除按鈕列表（在點擊處理完成後）
                    this.buttons = [];
                    return;
                }
            }
        }
        
        // 檢查是否點擊了卡牌（僅在投票階段）
        if (this.gamePhase === 'voting') {
            for (const card of this.availableCards) {
                if (card.isMouseOver(mx, my)) {
                    console.log(`🃏 點擊了卡牌: ${card.value}`);
                    this.selectCard(card.value);
                    return;
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
    
    // 切換玩家刪除按鈕顯示（修改為只顯示被點擊玩家的按鈕）
    togglePlayerDeleteButtons(clickedPlayer) {
        // 先隱藏所有刪除按鈕
        this.hideAllDeleteButtons();
        
        // 如果點擊的不是當前玩家，則顯示該玩家的刪除按鈕
        if (!clickedPlayer.isCurrentPlayer) {
            clickedPlayer.showDeleteButton();
            console.log(`🎯 顯示 ${clickedPlayer.name} 的刪除按鈕`);
        } else {
            console.log(`⚠️ 無法刪除自己 (當前玩家: ${clickedPlayer.name})`);
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
    
    // 驗證刪除按鈕位置同步
    validateDeleteButtonPositions() {
        const report = {
            totalPlayers: this.players.length,
            positionErrors: [],
            alignmentCheck: true
        };
        
        for (const player of this.players) {
            const expectedX = player.position.x + 35; // 預期的按鈕 X 位置
            const expectedY = player.position.y - 35; // 預期的按鈕 Y 位置
            const actualX = player.deleteButton.position.x;
            const actualY = player.deleteButton.position.y;
            
            const xDiff = Math.abs(expectedX - actualX);
            const yDiff = Math.abs(expectedY - actualY);
            
            if (xDiff > 0.1 || yDiff > 0.1) { // 允許0.1像素的誤差
                report.positionErrors.push({
                    playerId: player.id,
                    playerName: player.name,
                    playerPos: { x: player.position.x, y: player.position.y },
                    expectedButtonPos: { x: expectedX, y: expectedY },
                    actualButtonPos: { x: actualX, y: actualY },
                    xDiff: xDiff,
                    yDiff: yDiff
                });
                report.alignmentCheck = false;
            }
        }
        
        console.log('🔍 刪除按鈕位置驗證報告:', report);
        return report;
    }
    
    // 測試位置同步功能
    testPositionSync() {
        console.log('🧪 開始測試刪除按鈕位置同步...');
        
        // 測試 1：初始位置檢查
        const initialReport = this.validateDeleteButtonPositions();
        console.log('測試 1 - 初始位置:', initialReport.alignmentCheck ? '✅ 通過' : '❌ 失敗');
        
        // 測試 2：重新排列後位置檢查
        this.rearrangeSeats();
        const afterRearrangeReport = this.validateDeleteButtonPositions();
        console.log('測試 2 - 重新排列後:', afterRearrangeReport.alignmentCheck ? '✅ 通過' : '❌ 失敗');
        
        console.log('🧪 位置同步測試完成');
        return {
            initialCheck: initialReport.alignmentCheck,
            afterRearrangeCheck: afterRearrangeReport.alignmentCheck,
            overallResult: initialReport.alignmentCheck && afterRearrangeReport.alignmentCheck
        };
    }
    
    // 測試重新開始按鈕功能
    testRestartButton() {
        console.log('🧪 開始測試重新開始按鈕功能...');
        
        const testResults = {
            gamePhaseCheck: false,
            buttonArrayCheck: false,
            functionCallCheck: false,
            overallResult: false
        };
        
        // 測試 1：檢查遊戲狀態
        console.log(`當前遊戲階段: ${this.gamePhase}`);
        testResults.gamePhaseCheck = (this.gamePhase === 'finished');
        console.log('測試 1 - 遊戲階段:', testResults.gamePhaseCheck ? '✅ 通過 (finished)' : '❌ 失敗 (不是 finished)');
        
        // 測試 2：檢查按鈕陣列
        if (this.buttons && this.buttons.length > 0) {
            console.log(`找到 ${this.buttons.length} 個按鈕:`, this.buttons.map(b => b.text));
            const restartButton = this.buttons.find(b => b.text.includes('重新開始'));
            testResults.buttonArrayCheck = !!restartButton;
            console.log('測試 2 - 按鈕陣列:', testResults.buttonArrayCheck ? '✅ 通過 (找到重新開始按鈕)' : '❌ 失敗 (未找到重新開始按鈕)');
        } else {
            console.log('測試 2 - 按鈕陣列: ❌ 失敗 (按鈕陣列為空)');
        }
        
        // 測試 3：測試函數調用
        try {
            console.log('測試 clearVotes 函數調用...');
            const originalPhase = this.gamePhase;
            this.clearVotes();
            testResults.functionCallCheck = (this.gamePhase === 'voting'); // clearVotes 應該轉到 voting 階段
            console.log('測試 3 - 函數調用:', testResults.functionCallCheck ? '✅ 通過 (狀態轉換正確)' : '❌ 失敗 (狀態未轉換)');
            
            // 還原狀態進行完整測試
            this.gamePhase = originalPhase;
        } catch (error) {
            console.error('測試 3 - 函數調用: ❌ 失敗 (拋出異常)', error);
        }
        
        testResults.overallResult = testResults.gamePhaseCheck && testResults.buttonArrayCheck && testResults.functionCallCheck;
        console.log('🧪 重新開始按鈕測試完成');
        console.log('整體結果:', testResults.overallResult ? '✅ 通過' : '❌ 失敗');
        
        return testResults;
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