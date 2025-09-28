// 玩家類別 - 處理玩家座位和顯示
class Player {
    constructor(id, name, role, seatIndex) {
        this.id = id;
        this.name = name;
        this.role = role;
        this.seatIndex = seatIndex;
        
        // 計算座位位置（橫向排列在畫面上方）
        const screenWidth = width || window.innerWidth || 1200;
        const playerWidth = 120; // 每個玩家的寬度
        const playerSpacing = Math.min(playerWidth, screenWidth / Math.max(1, 12)); // 最多12個玩家
        const totalWidth = Math.min(screenWidth - 40, playerSpacing * 12);
        const startX = (screenWidth - totalWidth) / 2 + playerSpacing / 2;
        
        this.position = new Vector2D(
            startX + seatIndex * playerSpacing,
            80 // 固定在上方80px處
        );
        
        // 玩家狀態
        this.isConnected = true;
        this.hasVoted = false;
        this.isCurrentPlayer = false;
        this.vote = null;
        
        // 視覺屬性
        this.seatSize = 80;
        this.avatarSize = 60;
        this.scale = 1;
        this.targetScale = 1;
        this.opacity = 255;
        this.pulsePhase = random(TWO_PI);
        
        // 卡牌（顯示在玩家下方）
        this.card = null;
        this.cardPosition = new Vector2D(
            this.position.x,
            this.position.y + 80 // 卡牌在玩家下方80px
        );
        
        // 動畫
        this.joinAnimation = {
            active: true,
            progress: 0,
            duration: 800,
            startTime: millis()
        };
        
        // 思考動畫
        this.thinkingAnimation = {
            active: false,
            bubbles: []
        };
        
        // 慶祝動畫
        this.celebrationAnimation = {
            active: false,
            particles: []
        };
        
        // 刪除按鈕
        this.deleteButton = {
            visible: false,
            hovered: false,
            size: 24,
            position: new Vector2D(
                this.position.x + this.seatSize / 2 - 12,
                this.position.y - this.seatSize / 2 + 12
            )
        };
    }
    
    // 更新玩家
    update() {
        this.updateAnimations();
        this.updateTransforms();
        this.updateCard();
    }
    
    // 更新動畫
    updateAnimations() {
        const currentTime = millis();
        
        // 加入動畫
        if (this.joinAnimation.active) {
            const elapsed = currentTime - this.joinAnimation.startTime;
            this.joinAnimation.progress = Math.min(elapsed / this.joinAnimation.duration, 1);
            
            if (this.joinAnimation.progress >= 1) {
                this.joinAnimation.active = false;
            }
        }
        
        // 思考動畫
        if (this.thinkingAnimation.active && !this.hasVoted) {
            // 更新思考泡泡
            for (let i = this.thinkingAnimation.bubbles.length - 1; i >= 0; i--) {
                const bubble = this.thinkingAnimation.bubbles[i];
                bubble.y -= bubble.speed;
                bubble.opacity -= 2;
                
                if (bubble.opacity <= 0) {
                    this.thinkingAnimation.bubbles.splice(i, 1);
                }
            }
            
            // 新增思考泡泡（機率性）
            if (random() < 0.05) {
                this.thinkingAnimation.bubbles.push({
                    x: this.position.x + random(-10, 10),
                    y: this.position.y - 30,
                    size: random(3, 8),
                    speed: random(0.5, 1.5),
                    opacity: 100
                });
            }
        }
        
        // 慶祝動畫
        if (this.celebrationAnimation.active) {
            // 更新粒子
            for (let i = this.celebrationAnimation.particles.length - 1; i >= 0; i--) {
                const particle = this.celebrationAnimation.particles[i];
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.vy += 0.1; // 重力
                particle.opacity -= 3;
                particle.size *= 0.99;
                
                if (particle.opacity <= 0 || particle.size < 1) {
                    this.celebrationAnimation.particles.splice(i, 1);
                }
            }
            
            // 結束慶祝動畫
            if (this.celebrationAnimation.particles.length === 0) {
                this.celebrationAnimation.active = false;
            }
        }
    }
    
    // 更新變換
    updateTransforms() {
        // 平滑縮放
        this.scale = lerp(this.scale, this.targetScale, 0.1);
        
        // 脈動效果（當前玩家）
        if (this.isCurrentPlayer) {
            this.pulsePhase += 0.05;
            this.targetScale = 1 + sin(this.pulsePhase) * 0.1;
        } else {
            this.targetScale = this.isConnected ? 1 : 0.8;
        }
        
        // 透明度
        this.opacity = this.isConnected ? 255 : 128;
    }
    
    // 更新卡牌
    updateCard() {
        if (this.card) {
            this.card.update();
        }
    }
    
    // 繪製玩家
    draw() {
        push();
        
        // 加入動畫效果
        if (this.joinAnimation.active) {
            const progress = this.easeOutBounce(this.joinAnimation.progress);
            const currentScale = progress * this.scale;
            scale(currentScale);
            translate(this.position.x / currentScale, this.position.y / currentScale);
        } else {
            translate(this.position.x, this.position.y);
            scale(this.scale);
        }
        
        // 設定透明度
        tint(255, this.opacity);
        
        // 繪製座位
        this.drawSeat();
        
        // 繪製頭像
        this.drawAvatar();
        
        // 繪製角色圖示
        this.drawRoleIcon();
        
        // 繪製名字
        this.drawName();
        
        // 繪製狀態
        this.drawStatus();
        
        pop();
        
        // 繪製思考動畫（在變換外）
        this.drawThinkingAnimation();
        
        // 繪製慶祝動畫（在變換外）
        this.drawCelebrationAnimation();
        
        // 繪製刪除按鈕（在變換外，使用世界座標）
        this.drawDeleteButton();
        
        // 繪製卡牌
        if (this.card) {
            this.card.draw();
        }
    }
    
    // 繪製座位
    drawSeat() {
        // 座位背景
        fill(this.getSeatColor());
        stroke(255, 100);
        strokeWeight(2);
        circle(0, 0, this.seatSize);
        
        // 座位邊框效果
        if (this.isCurrentPlayer) {
            noFill();
            stroke(GAME_CONFIG.colors.accent);
            strokeWeight(3);
            circle(0, 0, this.seatSize + 10);
            
            // 光暈效果
            for (let i = 0; i < 2; i++) {
                stroke(red(color(GAME_CONFIG.colors.accent)), 
                       green(color(GAME_CONFIG.colors.accent)), 
                       blue(color(GAME_CONFIG.colors.accent)), 
                       30 - i * 10);
                strokeWeight(1);
                circle(0, 0, this.seatSize + 15 + i * 5);
            }
        }
    }
    
    // 繪製頭像
    drawAvatar() {
        // 頭像背景
        fill(this.getAvatarColor());
        noStroke();
        circle(0, 0, this.avatarSize);
        
        // 頭像文字（使用名字首字母）
        fill(255);
        textAlign(CENTER, CENTER);
        textSize(24);
        textStyle(BOLD);
        const initial = this.name.charAt(0).toUpperCase();
        text(initial, 0, 0);
    }
    
    // 繪製角色圖示
    drawRoleIcon() {
        const iconY = this.avatarSize / 2 + 12;
        fill(255);
        textAlign(CENTER, CENTER);
        textSize(16);
        text(this.getRoleIcon(), 0, iconY);
    }
    
    // 繪製名字
    drawName() {
        const nameY = this.avatarSize / 2 + 30;
        fill(255);
        textAlign(CENTER, CENTER);
        textSize(12);
        textStyle(NORMAL);
        
        // 限制名字長度
        let displayName = this.name;
        if (displayName.length > 8) {
            displayName = displayName.substring(0, 7) + '...';
        }
        
        text(displayName, 0, nameY);
        
        // 如果是當前玩家，顯示 "(你)"
        if (this.isCurrentPlayer) {
            textSize(10);
            fill(GAME_CONFIG.colors.accent);
            text('(你)', 0, nameY + 15);
        }
    }
    
    // 繪製狀態
    drawStatus() {
        const statusY = -this.avatarSize / 2 - 15;
        
        if (this.hasVoted) {
            // 已投票
            fill(GAME_CONFIG.colors.playerActive);
            textAlign(CENTER, CENTER);
            textSize(16);
            text('✓', 0, statusY);
        } else if (!this.isConnected) {
            // 離線
            fill(255, 100);
            textAlign(CENTER, CENTER);
            textSize(14);
            text('💤', 0, statusY);
        } else {
            // 思考中
            fill(255, 150);
            textAlign(CENTER, CENTER);
            textSize(14);
            text('💭', 0, statusY);
        }
    }
    
    // 繪製思考動畫
    drawThinkingAnimation() {
        if (!this.thinkingAnimation.active) return;
        
        for (const bubble of this.thinkingAnimation.bubbles) {
            push();
            fill(255, bubble.opacity);
            noStroke();
            circle(bubble.x, bubble.y, bubble.size);
            pop();
        }
    }
    
    // 繪製慶祝動畫
    drawCelebrationAnimation() {
        if (!this.celebrationAnimation.active) return;
        
        for (const particle of this.celebrationAnimation.particles) {
            push();
            fill(particle.color.r, particle.color.g, particle.color.b, particle.opacity);
            noStroke();
            circle(particle.x, particle.y, particle.size);
            pop();
        }
    }
    
    // 繪製刪除按鈕
    drawDeleteButton() {
        if (!this.deleteButton.visible || this.isCurrentPlayer) return;
        
        push();
        
        // 按鈕背景
        if (this.deleteButton.hovered) {
            fill(220, 38, 38, 200); // 懸停時更鮮明的紅色
            stroke(255, 255, 255, 150);
            strokeWeight(2);
        } else {
            fill(185, 28, 28, 150); // 半透明紅色
            stroke(255, 255, 255, 100);
            strokeWeight(1);
        }
        
        // 繪製圓形按鈕
        circle(this.deleteButton.position.x, this.deleteButton.position.y, this.deleteButton.size);
        
        // 繪製 X 符號
        stroke(255);
        strokeWeight(2);
        const halfSize = this.deleteButton.size / 4;
        const centerX = this.deleteButton.position.x;
        const centerY = this.deleteButton.position.y;
        
        line(centerX - halfSize, centerY - halfSize, centerX + halfSize, centerY + halfSize);
        line(centerX + halfSize, centerY - halfSize, centerX - halfSize, centerY + halfSize);
        
        pop();
    }
    
    // 顯示刪除按鈕
    showDeleteButton() {
        if (!this.isCurrentPlayer) {
            this.deleteButton.visible = true;
        }
    }
    
    // 隱藏刪除按鈕
    hideDeleteButton() {
        this.deleteButton.visible = false;
        this.deleteButton.hovered = false;
    }
    
    // 檢查滑鼠是否在刪除按鈕上
    isDeleteButtonHovered(mx, my) {
        if (!this.deleteButton.visible || this.isCurrentPlayer) return false;
        
        const distance = dist(mx, my, this.deleteButton.position.x, this.deleteButton.position.y);
        return distance < this.deleteButton.size / 2;
    }
    
    // 更新刪除按鈕懸停狀態
    updateDeleteButtonHover(mx, my) {
        this.deleteButton.hovered = this.isDeleteButtonHovered(mx, my);
    }
    
    // 取得座位顏色
    getSeatColor() {
        if (!this.isConnected) {
            return color(100, 100, 100);
        } else if (this.hasVoted) {
            return color(16, 185, 129);
        } else {
            return color(GAME_CONFIG.colors.playerSeat);
        }
    }
    
    // 取得頭像顏色
    getAvatarColor() {
        const colors = [
            color(239, 68, 68),   // 紅色
            color(34, 197, 94),   // 綠色
            color(59, 130, 246),  // 藍色
            color(251, 191, 36),  // 黃色
            color(168, 85, 247),  // 紫色
            color(236, 72, 153),  // 粉色
            color(20, 184, 166),  // 青色
            color(245, 101, 101)  // 橘色
        ];
        
        // 根據名字生成一致的顏色
        let hash = 0;
        for (let i = 0; i < this.name.length; i++) {
            hash = this.name.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        return colors[Math.abs(hash) % colors.length];
    }
    
    // 取得角色圖示
    getRoleIcon() {
        const icons = {
            dev: '👨‍💻',
            qa: '🐛',
            scrum_master: '👥',
            po: '👔',
            other: '👤'
        };
        
        return icons[this.role] || icons.other;
    }
    
    // 設定投票
    setVote(value) {
        this.vote = value;
        this.hasVoted = true;
        
        // 停止思考動畫
        this.thinkingAnimation.active = false;
        
        // 建立玩家卡牌（預設顯示背面）
        if (!this.card) {
            this.card = new PlayerCard(value, this.cardPosition.x, this.cardPosition.y);
        } else {
            this.card.value = value;
            this.card.reset();
        }
        
        console.log(`👤 ${this.name} 選擇了卡牌: ${value}`);
    }
    
    // 清除投票
    clearVote() {
        this.vote = null;
        this.hasVoted = false;
        this.card = null;
        
        // 開始思考動畫
        if (this.isConnected) {
            this.startThinking();
        }
    }
    
    // 開始思考
    startThinking() {
        this.thinkingAnimation.active = true;
        this.thinkingAnimation.bubbles = [];
    }
    
    // 停止思考
    stopThinking() {
        this.thinkingAnimation.active = false;
    }
    
    // 開始慶祝
    celebrate() {
        this.celebrationAnimation.active = true;
        this.celebrationAnimation.particles = [];
        
        // 生成慶祝粒子
        for (let i = 0; i < 20; i++) {
            this.celebrationAnimation.particles.push({
                x: this.position.x,
                y: this.position.y,
                vx: random(-5, 5),
                vy: random(-8, -3),
                size: random(3, 8),
                opacity: 255,
                color: {
                    r: random(100, 255),
                    g: random(100, 255),
                    b: random(100, 255)
                }
            });
        }
    }
    
    // 檢查滑鼠是否在玩家上
    isMouseOver(mx, my) {
        const distance = dist(mx, my, this.position.x, this.position.y);
        return distance < this.seatSize / 2;
    }
    
    // 緩動函數
    easeOutBounce(t) {
        const n1 = 7.5625;
        const d1 = 2.75;
        
        if (t < 1 / d1) {
            return n1 * t * t;
        } else if (t < 2 / d1) {
            return n1 * (t -= 1.5 / d1) * t + 0.75;
        } else if (t < 2.5 / d1) {
            return n1 * (t -= 2.25 / d1) * t + 0.9375;
        } else {
            return n1 * (t -= 2.625 / d1) * t + 0.984375;
        }
    }
    
    // 移除玩家動畫
    leave() {
        this.isConnected = false;
        this.stopThinking();
        
        // 可以加入離開動畫
        this.targetScale = 0;
    }
}