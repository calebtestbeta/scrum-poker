/**
 * 卡牌組件 - Scrum Poker 卡牌系統
 * 提供卡牌的建立、渲染和互動功能
 * @version 3.0.0-enhanced
 */

/**
 * 卡牌類別
 */
class Card {
    constructor(value, options = {}) {
        this.value = value;
        this.displayValue = this.formatDisplayValue(value);
        this.element = null;
        this.isSelected = false;
        this.isRevealed = false;
        this.isAnimating = false;
        
        // 卡牌選項
        this.options = {
            size: options.size || 'normal', // normal, small, large
            theme: options.theme || 'default',
            clickable: options.clickable !== false,
            showBack: options.showBack || false,
            ...options
        };
        
        // 事件監聽器
        this.clickHandler = null;
        this.hoverHandler = null;
        
        // 建立DOM元素
        this.createElement();
        this.bindEvents();
    }
    
    /**
     * 格式化顯示值
     * @param {*} value - 卡牌值
     * @returns {string} 格式化後的顯示值
     */
    formatDisplayValue(value) {
        if (value === 'coffee' || value === '☕') return '☕';
        if (value === 'question' || value === '❓') return '❓';
        if (value === 'infinity' || value === '∞') return '∞';
        return value?.toString() || '0';
    }
    
    /**
     * 建立 DOM 元素
     */
    createElement() {
        this.element = Utils.DOM.createElement('div', {
            className: this.getCardClasses(),
            dataset: {
                value: this.value,
                displayValue: this.displayValue
            },
            attributes: {
                'role': 'button',
                'tabindex': this.options.clickable ? '0' : '-1',
                'aria-label': `卡牌 ${this.displayValue}`,
                'aria-pressed': 'false'
            }
        });
        
        // 建立卡牌內容
        this.createCardContent();
        
        // 設置初始狀態
        this.updateVisualState();
    }
    
    /**
     * 建立卡牌內容
     */
    createCardContent() {
        // 卡牌正面
        const front = Utils.DOM.createElement('div', {
            className: 'card-front'
        });
        
        const valueElement = Utils.DOM.createElement('div', {
            className: 'card-value',
            textContent: this.displayValue
        });
        
        front.appendChild(valueElement);
        
        // 卡牌背面
        const back = Utils.DOM.createElement('div', {
            className: 'card-back'
        });
        
        const backPattern = Utils.DOM.createElement('div', {
            className: 'card-back-pattern',
            innerHTML: '🎮'
        });
        
        back.appendChild(backPattern);
        
        // 添加到卡牌元素
        this.element.appendChild(front);
        this.element.appendChild(back);
    }
    
    /**
     * 獲取卡牌CSS類別
     * @returns {string} CSS類別字符串
     */
    getCardClasses() {
        const classes = ['card', `card-${this.options.size}`, `card-theme-${this.options.theme}`];
        
        if (this.isSelected) classes.push('card-selected');
        if (this.isRevealed) classes.push('card-revealed');
        if (this.isAnimating) classes.push('card-animating');
        if (!this.options.clickable) classes.push('card-disabled');
        if (this.options.showBack) classes.push('card-show-back');
        
        // 特殊卡牌類別
        if (this.value === 'coffee' || this.value === '☕') classes.push('card-special-coffee');
        if (this.value === 'question' || this.value === '❓') classes.push('card-special-question');
        if (this.value === 'infinity' || this.value === '∞') classes.push('card-special-infinity');
        
        return classes.join(' ');
    }
    
    /**
     * 綁定事件
     */
    bindEvents() {
        if (!this.options.clickable) return;
        
        // 點擊事件
        this.clickHandler = (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.handleClick();
        };
        
        // 鍵盤事件
        const keyHandler = (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                this.handleClick();
            }
        };
        
        // 滑鼠懸停事件
        this.hoverHandler = {
            enter: () => this.handleHoverEnter(),
            leave: () => this.handleHoverLeave()
        };
        
        // 綁定事件監聽器
        this.element.addEventListener('click', this.clickHandler);
        this.element.addEventListener('keydown', keyHandler);
        this.element.addEventListener('mouseenter', this.hoverHandler.enter);
        this.element.addEventListener('mouseleave', this.hoverHandler.leave);
        
        // 觸控支援
        if (Utils.Device.isTouchDevice()) {
            this.setupTouchEvents();
        }
    }
    
    /**
     * 設置觸控事件
     */
    setupTouchEvents() {
        let touchStartTime = 0;
        
        this.element.addEventListener('touchstart', (event) => {
            touchStartTime = Date.now();
            this.element.classList.add('card-touching');
        });
        
        this.element.addEventListener('touchend', (event) => {
            this.element.classList.remove('card-touching');
            
            const touchDuration = Date.now() - touchStartTime;
            if (touchDuration < 500) { // 短觸控視為點擊
                this.handleClick();
            }
        });
        
        this.element.addEventListener('touchcancel', () => {
            this.element.classList.remove('card-touching');
        });
    }
    
    /**
     * 處理點擊事件
     */
    handleClick() {
        if (!this.options.clickable || this.isAnimating) return;
        
        // 觸發選中動畫
        this.playSelectAnimation();
        
        // 切換選中狀態
        this.setSelected(!this.isSelected);
        
        // 發送事件
        if (window.eventBus) {
            window.eventBus.emit('card:clicked', {
                card: this,
                value: this.value,
                displayValue: this.displayValue,
                isSelected: this.isSelected
            });
        }
        
        // 觸覺反饋（支援的裝置）
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    }
    
    /**
     * 處理滑鼠懸停進入
     */
    handleHoverEnter() {
        if (!this.options.clickable || this.isAnimating) return;
        
        this.element.classList.add('card-hover');
        
        // 播放懸停動畫
        Utils.Animation.animate({
            duration: 200,
            easing: 'easeOutQuad',
            from: 1,
            to: 1.05,
            onUpdate: (scale) => {
                this.element.style.transform = `scale(${scale})`;
            }
        });
    }
    
    /**
     * 處理滑鼠懸停離開
     */
    handleHoverLeave() {
        this.element.classList.remove('card-hover');
        
        // 恢復原始大小
        Utils.Animation.animate({
            duration: 200,
            easing: 'easeOutQuad',
            from: 1.05,
            to: 1,
            onUpdate: (scale) => {
                this.element.style.transform = `scale(${scale})`;
            },
            onComplete: () => {
                this.element.style.transform = '';
            }
        });
    }
    
    /**
     * 播放選中動畫
     */
    playSelectAnimation() {
        this.isAnimating = true;
        this.updateVisualState();
        
        // 彈跳動畫
        Utils.Animation.bounce(this.element, 8);
        
        // 動畫完成後重置狀態
        setTimeout(() => {
            this.isAnimating = false;
            this.updateVisualState();
        }, 600);
    }
    
    /**
     * 播放翻牌動畫
     * @param {boolean} reveal - 是否翻到正面
     * @returns {Promise}
     */
    playFlipAnimation(reveal = true) {
        return new Promise((resolve) => {
            this.isAnimating = true;
            this.updateVisualState();
            
            const element = this.element;
            
            // 第一階段：翻轉到90度
            Utils.Animation.animate({
                duration: 300,
                easing: 'easeInQuad',
                from: 0,
                to: 90,
                onUpdate: (angle) => {
                    element.style.transform = `rotateY(${angle}deg)`;
                },
                onComplete: () => {
                    // 切換顯示狀態
                    this.setRevealed(reveal);
                    
                    // 第二階段：翻轉到0度
                    Utils.Animation.animate({
                        duration: 300,
                        easing: 'easeOutQuad',
                        from: 90,
                        to: 0,
                        onUpdate: (angle) => {
                            element.style.transform = `rotateY(${angle}deg)`;
                        },
                        onComplete: () => {
                            element.style.transform = '';
                            this.isAnimating = false;
                            this.updateVisualState();
                            resolve();
                        }
                    });
                }
            });
        });
    }
    
    /**
     * 設置選中狀態
     * @param {boolean} selected - 是否選中
     */
    setSelected(selected) {
        if (this.isSelected === selected) return;
        
        this.isSelected = selected;
        this.updateVisualState();
        
        // 更新 ARIA 屬性
        this.element.setAttribute('aria-pressed', selected.toString());
        
        // 發送狀態變更事件
        if (window.eventBus) {
            window.eventBus.emit('card:selection-changed', {
                card: this,
                isSelected: selected
            });
        }
    }
    
    /**
     * 設置翻牌狀態
     * @param {boolean} revealed - 是否翻到正面
     */
    setRevealed(revealed) {
        if (this.isRevealed === revealed) return;
        
        this.isRevealed = revealed;
        this.updateVisualState();
        
        // 發送狀態變更事件
        if (window.eventBus) {
            window.eventBus.emit('card:reveal-changed', {
                card: this,
                isRevealed: revealed
            });
        }
    }
    
    /**
     * 更新視覺狀態
     */
    updateVisualState() {
        if (!this.element) return;
        
        this.element.className = this.getCardClasses();
        
        // 更新 ARIA 標籤
        let ariaLabel = `卡牌 ${this.displayValue}`;
        if (this.isSelected) ariaLabel += ' (已選中)';
        if (this.isRevealed) ariaLabel += ' (已翻開)';
        this.element.setAttribute('aria-label', ariaLabel);
    }
    
    /**
     * 設置可點擊狀態
     * @param {boolean} clickable - 是否可點擊
     */
    setClickable(clickable) {
        this.options.clickable = clickable;
        this.element.setAttribute('tabindex', clickable ? '0' : '-1');
        this.updateVisualState();
    }
    
    /**
     * 獲取 DOM 元素
     * @returns {Element} DOM 元素
     */
    getElement() {
        return this.element;
    }
    
    /**
     * 銷毀卡牌
     */
    destroy() {
        if (this.clickHandler) {
            this.element.removeEventListener('click', this.clickHandler);
        }
        
        if (this.hoverHandler) {
            this.element.removeEventListener('mouseenter', this.hoverHandler.enter);
            this.element.removeEventListener('mouseleave', this.hoverHandler.leave);
        }
        
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        
        this.element = null;
        this.clickHandler = null;
        this.hoverHandler = null;
    }
}

/**
 * 卡牌組管理器
 */
class CardDeck {
    constructor(values = null) {
        this.values = values || this.getDefaultValues();
        this.cards = [];
        this.container = null;
        this.selectedCard = null;
        
        this.createCards();
        this.setupEventListeners();
    }
    
    /**
     * 獲取預設卡牌值
     * @returns {Array} 卡牌值陣列
     */
    getDefaultValues() {
        return [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, '☕', '❓', '∞'];
    }
    
    /**
     * 建立卡牌
     */
    createCards() {
        this.values.forEach(value => {
            const card = new Card(value, {
                clickable: true,
                size: 'normal'
            });
            this.cards.push(card);
        });
    }
    
    /**
     * 設置事件監聽器
     */
    setupEventListeners() {
        if (window.eventBus) {
            window.eventBus.on('card:clicked', (data) => {
                this.handleCardClick(data.card);
            });
        }
    }
    
    /**
     * 處理卡牌點擊
     * @param {Card} clickedCard - 被點擊的卡牌
     */
    handleCardClick(clickedCard) {
        // 取消選中其他卡牌
        this.cards.forEach(card => {
            if (card !== clickedCard && card.isSelected) {
                card.setSelected(false);
            }
        });
        
        // 更新選中的卡牌
        this.selectedCard = clickedCard.isSelected ? clickedCard : null;
        
        // 發送選擇事件
        if (window.eventBus) {
            window.eventBus.emit('deck:card-selected', {
                card: this.selectedCard,
                value: this.selectedCard ? this.selectedCard.value : null
            });
        }
    }
    
    /**
     * 渲染到容器
     * @param {Element} container - 容器元素
     */
    renderTo(container) {
        this.container = container;
        container.innerHTML = '';
        
        this.cards.forEach(card => {
            container.appendChild(card.getElement());
        });
    }
    
    /**
     * 獲取選中的卡牌
     * @returns {Card|null} 選中的卡牌
     */
    getSelectedCard() {
        return this.selectedCard;
    }
    
    /**
     * 清除選擇
     */
    clearSelection() {
        if (this.selectedCard) {
            this.selectedCard.setSelected(false);
            this.selectedCard = null;
        }
    }
    
    /**
     * 設置所有卡牌的可點擊狀態
     * @param {boolean} clickable - 是否可點擊
     */
    setClickable(clickable) {
        this.cards.forEach(card => {
            card.setClickable(clickable);
        });
    }
    
    /**
     * 銷毀卡牌組
     */
    destroy() {
        this.cards.forEach(card => card.destroy());
        this.cards = [];
        this.selectedCard = null;
        this.container = null;
    }
}

// 匯出到全域
window.Card = Card;
window.CardDeck = CardDeck;

console.log('🃏 Card 卡牌系統已載入 - v3.0.0-enhanced');