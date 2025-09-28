// 卡牌類別 - 處理 3D 卡牌顯示和動畫
class Card {
    constructor(value, x, y) {
        this.value = value;
        this.position = new Vector2D(x, y);
        this.targetPosition = new Vector2D(x, y);
        this.size = new Vector2D(GAME_CONFIG.cards.width, GAME_CONFIG.cards.height);
        
        // 動畫屬性
        this.rotation = 0;
        this.targetRotation = 0;
        this.flipProgress = 0;
        this.scale = 1;
        this.targetScale = 1;
        this.opacity = 255;
        
        // 狀態
        this.isFlipped = false;
        this.isRevealed = false;
        this.isSelected = false;
        this.isHovered = false;
        this.isDragging = false;
        this.isAnimating = false;
        
        // 動畫參數
        this.animationSpeed = 0.1;
        this.hoverScale = 1.1;
        this.selectedScale = 1.05;
        
        // 拖拽
        this.dragOffset = new Vector2D(0, 0);
        this.originalPosition = new Vector2D(x, y);
        
        // 飛行動畫
        this.flyAnimation = {
            active: false,
            startPos: new Vector2D(0, 0),
            endPos: new Vector2D(0, 0),
            controlPoint1: new Vector2D(0, 0),
            controlPoint2: new Vector2D(0, 0),
            progress: 0,
            duration: 1000,
            startTime: 0
        };
        
        // 翻牌動畫
        this.flipAnimation = {
            active: false,
            progress: 0,
            duration: 600,
            startTime: 0
        };
    }
    
    // 更新卡牌
    update() {
        this.updateAnimations();
        this.updateTransforms();
    }
    
    // 更新動畫
    updateAnimations() {
        const currentTime = millis();
        
        // 飛行動畫
        if (this.flyAnimation.active) {
            const elapsed = currentTime - this.flyAnimation.startTime;
            this.flyAnimation.progress = Math.min(elapsed / this.flyAnimation.duration, 1);
            
            if (this.flyAnimation.progress >= 1) {
                this.flyAnimation.active = false;
                this.position.set(this.flyAnimation.endPos.x, this.flyAnimation.endPos.y);
                this.targetPosition.set(this.flyAnimation.endPos.x, this.flyAnimation.endPos.y);
            } else {
                // 貝塞爾曲線動畫
                const t = this.easeInOutCubic(this.flyAnimation.progress);
                const x = bezierPoint(t, 
                    this.flyAnimation.startPos.x,
                    this.flyAnimation.controlPoint1.x,
                    this.flyAnimation.controlPoint2.x,
                    this.flyAnimation.endPos.x
                );
                const y = bezierPoint(t,
                    this.flyAnimation.startPos.y,
                    this.flyAnimation.controlPoint1.y,
                    this.flyAnimation.controlPoint2.y,
                    this.flyAnimation.endPos.y
                );
                
                this.position.set(x, y);
                
                // 飛行時的旋轉效果
                this.rotation = sin(this.flyAnimation.progress * PI * 2) * 0.2;
            }
        }
        
        // 翻牌動畫
        if (this.flipAnimation.active) {
            const elapsed = currentTime - this.flipAnimation.startTime;
            this.flipAnimation.progress = Math.min(elapsed / this.flipAnimation.duration, 1);
            
            if (this.flipAnimation.progress >= 1) {
                this.flipAnimation.active = false;
                this.isFlipped = true;
                this.flipProgress = 1;
            } else {
                this.flipProgress = this.easeInOutCubic(this.flipAnimation.progress);
            }
        }
    }
    
    // 更新變換
    updateTransforms() {
        // 平滑移動到目標位置
        if (!this.isDragging && !this.flyAnimation.active) {
            this.position.lerp(this.targetPosition, this.animationSpeed);
        }
        
        // 平滑旋轉
        this.rotation = lerp(this.rotation, this.targetRotation, this.animationSpeed);
        
        // 平滑縮放
        this.scale = lerp(this.scale, this.targetScale, this.animationSpeed);
        
        // 決定目標縮放
        let newTargetScale = 1;
        if (this.isSelected) {
            newTargetScale = this.selectedScale;
        } else if (this.isHovered) {
            newTargetScale = this.hoverScale;
        }
        this.targetScale = newTargetScale;
    }
    
    // 繪製卡牌
    draw() {
        push();
        
        // 確保重置所有繪製狀態
        noTint();
        fill(255);
        stroke(0);
        strokeWeight(1);
        
        // 套用變換
        translate(this.position.x, this.position.y);
        rotate(this.rotation);
        scale(this.scale);
        
        // 透明度 - 確保不影響顏色
        if (this.opacity < 255) {
            tint(255, this.opacity);
        } else {
            noTint(); // 清除任何色調效果
        }
        
        // 繪製卡牌主體
        // 手牌總是顯示正面，讓玩家清楚看到點數
        this.drawCardFront();
        
        // 繪製選中效果
        if (this.isSelected) {
            this.drawSelectionEffect();
        }
        
        // 繪製懸停效果
        if (this.isHovered && !this.isSelected) {
            this.drawHoverEffect();
        }
        
        pop();
    }
    
    // 繪製卡牌正面
    drawCardFront() {
        // 強制重置所有繪製狀態
        push();
        
        // 確保使用白色背景
        fill(255, 255, 255); // 強制白色背景
        stroke(100, 100, 100); // 灰色邊框
        strokeWeight(2);
        rectMode(CENTER);
        rect(0, 0, this.size.x, this.size.y, GAME_CONFIG.cards.cornerRadius);
        
        // 卡牌數值
        fill(this.getValueColor());
        noStroke();
        textAlign(CENTER, CENTER);
        textSize(this.getValueTextSize());
        textStyle(BOLD);
        text(this.getDisplayValue(), 0, 0);
        
        // 角落小數字
        if (typeof this.value === 'number') {
            textSize(12);
            textAlign(LEFT, TOP);
            text(this.value, -this.size.x/2 + 8, -this.size.y/2 + 8);
            
            push();
            translate(this.size.x/2 - 8, this.size.y/2 - 8);
            rotate(PI);
            text(this.value, 0, 0);
            pop();
        }
        
        pop(); // 結束強制重置
    }
    
    // 繪製卡牌背面
    drawCardBack() {
        // 卡牌背景
        fill(GAME_CONFIG.colors.cardBack);
        stroke(150);
        strokeWeight(2);
        rectMode(CENTER);
        rect(0, 0, this.size.x, this.size.y, GAME_CONFIG.cards.cornerRadius);
        
        // 背面圖案
        fill(255, 100);
        noStroke();
        
        // 繪製菱形圖案
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 4; j++) {
                const x = (i - 1) * 20;
                const y = (j - 1.5) * 25;
                
                push();
                translate(x, y);
                rotate(PI / 4);
                rect(0, 0, 12, 12);
                pop();
            }
        }
        
        // 中央 Logo
        fill(255, 150);
        textAlign(CENTER, CENTER);
        textSize(24);
        text('🎮', 0, 0);
    }
    
    // 繪製選中效果
    drawSelectionEffect() {
        noFill();
        stroke(GAME_CONFIG.colors.accent);
        strokeWeight(3);
        rectMode(CENTER);
        
        const margin = 5;
        rect(0, 0, this.size.x + margin, this.size.y + margin, GAME_CONFIG.cards.cornerRadius + 2);
        
        // 光暈效果
        for (let i = 0; i < 3; i++) {
            stroke(red(color(GAME_CONFIG.colors.accent)), 
                   green(color(GAME_CONFIG.colors.accent)), 
                   blue(color(GAME_CONFIG.colors.accent)), 
                   50 - i * 15);
            strokeWeight(1);
            rect(0, 0, this.size.x + margin + i * 2, this.size.y + margin + i * 2, 
                 GAME_CONFIG.cards.cornerRadius + 2 + i);
        }
    }
    
    // 繪製懸停效果
    drawHoverEffect() {
        fill(255, 255, 255, 20);
        noStroke();
        rectMode(CENTER);
        rect(0, 0, this.size.x, this.size.y, GAME_CONFIG.cards.cornerRadius);
    }
    
    // 取得顯示值
    getDisplayValue() {
        if (this.value === 'coffee') return '☕';
        if (this.value === 'question') return '❓';
        if (this.value === 'infinity') return '∞';
        return this.value.toString();
    }
    
    // 取得數值顏色
    getValueColor() {
        if (typeof this.value === 'number') {
            if (this.value <= 3) return color(34, 197, 94); // 綠色
            if (this.value <= 8) return color(251, 191, 36); // 黃色
            return color(239, 68, 68); // 紅色
        } else {
            return color(107, 114, 128); // 灰色
        }
    }
    
    // 取得文字大小
    getValueTextSize() {
        if (typeof this.value === 'number' && this.value >= 10) {
            return 28;
        }
        return 32;
    }
    
    // 檢查滑鼠是否在卡牌上
    isMouseOver(mx, my) {
        const dx = mx - this.position.x;
        const dy = my - this.position.y;
        
        return abs(dx) < (this.size.x * this.scale) / 2 && 
               abs(dy) < (this.size.y * this.scale) / 2;
    }
    
    // 開始飛行動畫
    flyTo(targetX, targetY, duration = 1000) {
        this.flyAnimation = {
            active: true,
            startPos: this.position.copy(),
            endPos: new Vector2D(targetX, targetY),
            controlPoint1: new Vector2D(
                this.position.x + (targetX - this.position.x) * 0.3,
                this.position.y - 100
            ),
            controlPoint2: new Vector2D(
                this.position.x + (targetX - this.position.x) * 0.7,
                targetY - 50
            ),
            progress: 0,
            duration: duration,
            startTime: millis()
        };
    }
    
    // 開始翻牌動畫
    flip(duration = 600) {
        this.flipAnimation = {
            active: true,
            progress: 0,
            duration: duration,
            startTime: millis()
        };
    }
    
    // 設定拖拽
    startDrag(mx, my) {
        this.isDragging = true;
        this.dragOffset.set(mx - this.position.x, my - this.position.y);
        this.originalPosition = this.position.copy();
        this.targetScale = 1.2;
    }
    
    // 更新拖拽
    updateDrag(mx, my) {
        if (this.isDragging) {
            this.position.set(mx - this.dragOffset.x, my - this.dragOffset.y);
        }
    }
    
    // 結束拖拽
    endDrag() {
        this.isDragging = false;
        this.targetScale = 1;
    }
    
    // 回到原位置
    returnToOriginalPosition() {
        this.targetPosition = this.originalPosition.copy();
        this.endDrag();
    }
    
    // 緩動函數
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    
    // 重設卡牌狀態
    reset() {
        this.isFlipped = false;
        this.isRevealed = false;
        this.isSelected = false;
        this.flipProgress = 0;
        this.rotation = 0;
        this.targetRotation = 0;
        this.scale = 1;
        this.targetScale = 1;
        this.flyAnimation.active = false;
        this.flipAnimation.active = false;
    }
}

// 玩家卡牌類別 - 繼承自 Card，但顯示邏輯不同
class PlayerCard extends Card {
    constructor(value, x, y) {
        super(value, x, y);
        this.gamePhase = 'voting'; // 追蹤遊戲階段
    }
    
    // 設定遊戲階段
    setGamePhase(phase) {
        this.gamePhase = phase;
    }
    
    // 覆寫繪製方法
    draw() {
        push();
        
        // 確保重置所有繪製狀態
        noTint();
        fill(255);
        stroke(0);
        strokeWeight(1);
        
        // 套用變換
        translate(this.position.x, this.position.y);
        rotate(this.rotation);
        scale(this.scale);
        
        // 透明度 - 確保不影響顏色
        if (this.opacity < 255) {
            tint(255, this.opacity);
        } else {
            noTint(); // 清除任何色調效果
        }
        
        // 繪製卡牌主體
        // 玩家卡牌在投票階段顯示背面，開牌後顯示正面
        if (this.gamePhase === 'revealing' || this.gamePhase === 'finished' || this.isRevealed || this.flipProgress > 0.5) {
            this.drawCardFront();
        } else {
            this.drawCardBack();
        }
        
        // 繪製選中效果
        if (this.isSelected) {
            this.drawSelectionEffect();
        }
        
        // 繪製懸停效果
        if (this.isHovered && !this.isSelected) {
            this.drawHoverEffect();
        }
        
        pop();
    }
}

console.log('🃏 Card 和 PlayerCard 類別已載入');