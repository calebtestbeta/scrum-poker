/**
 * 觸控管理器 - 統一觸控事件和手勢識別
 * 提供跨平台觸控支援、手勢識別、響應式適配等功能
 * @version 3.0.0-enhanced
 */

/**
 * 觸控管理器類別
 */
class TouchManager {
    constructor(options = {}) {
        this.version = '3.0.0-enhanced';
        
        // 配置選項
        this.config = {
            // 觸控靈敏度
            tapThreshold: options.tapThreshold || 10, // 像素
            doubleTapTime: options.doubleTapTime || 300, // 毫秒
            longPressTime: options.longPressTime || 500, // 毫秒
            swipeThreshold: options.swipeThreshold || 50, // 像素
            pinchThreshold: options.pinchThreshold || 20, // 像素
            
            // 響應式設定
            scaleFactor: options.scaleFactor || 1,
            enableHapticFeedback: options.enableHapticFeedback !== false,
            enablePrevention: options.enablePrevention !== false,
            
            // 調試模式
            debug: options.debug || false
        };
        
        // 觸控狀態追蹤
        this.touchState = {
            active: false,
            startTime: 0,
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
            lastTapTime: 0,
            lastTapX: 0,
            lastTapY: 0,
            isLongPress: false,
            isPanning: false,
            isPinching: false,
            touchCount: 0,
            touches: new Map() // 多點觸控追蹤
        };
        
        // 手勢識別器
        this.gestureRecognizers = new Map();
        
        // 事件監聽器
        this.eventListeners = new Map();
        
        // 裝置資訊
        this.deviceInfo = this.detectDevice();
        
        // 初始化
        this.initialize();
        
        console.log(`👆 TouchManager ${this.version} 已創建`);
    }
    
    /**
     * 初始化觸控管理器
     */
    initialize() {
        this.setupGestureRecognizers();
        this.setupEventDelegation();
        
        if (this.config.debug) {
            console.log('👆 TouchManager 初始化完成');
            console.log('📱 裝置資訊:', this.deviceInfo);
        }
    }
    
    /**
     * 檢測裝置資訊
     */
    detectDevice() {
        const userAgent = navigator.userAgent.toLowerCase();
        const isTouch = 'ontouchstart' in window || 
                       'ontouchstart' in document.documentElement ||
                       navigator.maxTouchPoints > 0 ||
                       navigator.msMaxTouchPoints > 0;
        
        return {
            isMobile: /mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent),
            isTablet: /ipad|android(?!.*mobile)|tablet|kindle|silk|playbook/i.test(userAgent),
            isTouch: isTouch,
            isIOS: /iphone|ipad|ipod/i.test(userAgent),
            isAndroid: /android/i.test(userAgent),
            pixelRatio: window.devicePixelRatio || 1,
            screenWidth: window.screen.width,
            screenHeight: window.screen.height,
            supportedEvents: {
                touch: isTouch,
                pointer: 'onpointerdown' in window,
                mouse: 'onmousedown' in window
            }
        };
    }
    
    /**
     * 設置手勢識別器
     */
    setupGestureRecognizers() {
        // 點擊手勢
        this.gestureRecognizers.set('tap', {
            name: 'tap',
            handler: this.recognizeTap.bind(this),
            enabled: true
        });
        
        // 雙擊手勢
        this.gestureRecognizers.set('doubletap', {
            name: 'doubletap',
            handler: this.recognizeDoubleTap.bind(this),
            enabled: true
        });
        
        // 長按手勢
        this.gestureRecognizers.set('longpress', {
            name: 'longpress',
            handler: this.recognizeLongPress.bind(this),
            enabled: true
        });
        
        // 滑動手勢
        this.gestureRecognizers.set('swipe', {
            name: 'swipe',
            handler: this.recognizeSwipe.bind(this),
            enabled: true
        });
        
        // 拖拽手勢
        this.gestureRecognizers.set('pan', {
            name: 'pan',
            handler: this.recognizePan.bind(this),
            enabled: true
        });
        
        // 縮放手勢
        this.gestureRecognizers.set('pinch', {
            name: 'pinch',
            handler: this.recognizePinch.bind(this),
            enabled: true
        });
        
        // 旋轉手勢
        this.gestureRecognizers.set('rotate', {
            name: 'rotate',
            handler: this.recognizeRotate.bind(this),
            enabled: true
        });
    }
    
    /**
     * 設置事件委派
     */
    setupEventDelegation() {
        const eventTypes = this.getSupportedEventTypes();
        
        eventTypes.forEach(({ start, move, end }) => {
            document.addEventListener(start, this.handleStart.bind(this), { passive: false });
            document.addEventListener(move, this.handleMove.bind(this), { passive: false });
            document.addEventListener(end, this.handleEnd.bind(this), { passive: false });
        });
    }
    
    /**
     * 取得支援的事件類型
     */
    getSupportedEventTypes() {
        const types = [];
        
        if (this.deviceInfo.supportedEvents.touch) {
            types.push({
                start: 'touchstart',
                move: 'touchmove',
                end: 'touchend'
            });
        }
        
        if (this.deviceInfo.supportedEvents.pointer) {
            types.push({
                start: 'pointerdown',
                move: 'pointermove',
                end: 'pointerup'
            });
        }
        
        if (this.deviceInfo.supportedEvents.mouse) {
            types.push({
                start: 'mousedown',
                move: 'mousemove',
                end: 'mouseup'
            });
        }
        
        return types;
    }
    
    /**
     * 處理開始事件
     */
    handleStart(event) {
        const touches = this.extractTouches(event);
        
        if (touches.length === 0) return;
        
        // 更新觸控狀態
        this.touchState.active = true;
        this.touchState.startTime = Date.now();
        this.touchState.touchCount = touches.length;
        
        // 記錄觸控點
        touches.forEach(touch => {
            this.touchState.touches.set(touch.identifier, {
                id: touch.identifier,
                startX: touch.clientX,
                startY: touch.clientY,
                currentX: touch.clientX,
                currentY: touch.clientY,
                startTime: Date.now()
            });
        });
        
        // 主要觸控點
        const primaryTouch = touches[0];
        this.touchState.startX = primaryTouch.clientX;
        this.touchState.startY = primaryTouch.clientY;
        this.touchState.currentX = primaryTouch.clientX;
        this.touchState.currentY = primaryTouch.clientY;
        
        // 觸發手勢識別
        this.processGestures('start', event, touches);
        
        // 防止預設行為
        if (this.config.enablePrevention && this.shouldPreventDefault(event)) {
            event.preventDefault();
        }
        
        if (this.config.debug) {
            console.log('👆 觸控開始:', touches.length, '個觸控點');
        }
    }
    
    /**
     * 處理移動事件
     */
    handleMove(event) {
        if (!this.touchState.active) return;
        
        const touches = this.extractTouches(event);
        
        if (touches.length === 0) return;
        
        // 更新觸控點位置
        touches.forEach(touch => {
            const storedTouch = this.touchState.touches.get(touch.identifier);
            if (storedTouch) {
                storedTouch.currentX = touch.clientX;
                storedTouch.currentY = touch.clientY;
            }
        });
        
        // 更新主要觸控點
        const primaryTouch = touches[0];
        this.touchState.currentX = primaryTouch.clientX;
        this.touchState.currentY = primaryTouch.clientY;
        
        // 觸發手勢識別
        this.processGestures('move', event, touches);
        
        // 防止預設行為
        if (this.config.enablePrevention && this.shouldPreventDefault(event)) {
            event.preventDefault();
        }
    }
    
    /**
     * 處理結束事件
     */
    handleEnd(event) {
        if (!this.touchState.active) return;
        
        const touches = this.extractTouches(event);
        const endTime = Date.now();
        const duration = endTime - this.touchState.startTime;
        
        // 觸發手勢識別
        this.processGestures('end', event, touches);
        
        // 清理觸控狀態
        if (touches.length === 0) {
            this.touchState.active = false;
            this.touchState.isPanning = false;
            this.touchState.isPinching = false;
            this.touchState.isLongPress = false;
            this.touchState.touches.clear();
        }
        
        if (this.config.debug) {
            console.log('👆 觸控結束，持續時間:', duration, 'ms');
        }
    }
    
    /**
     * 提取觸控點資訊
     */
    extractTouches(event) {
        const touches = [];
        
        if (event.touches) {
            // Touch 事件
            Array.from(event.touches).forEach((touch, index) => {
                touches.push({
                    identifier: touch.identifier || index,
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                    pageX: touch.pageX,
                    pageY: touch.pageY,
                    screenX: touch.screenX,
                    screenY: touch.screenY,
                    force: touch.force || 1
                });
            });
        } else if (event.pointerId !== undefined) {
            // Pointer 事件
            touches.push({
                identifier: event.pointerId,
                clientX: event.clientX,
                clientY: event.clientY,
                pageX: event.pageX,
                pageY: event.pageY,
                screenX: event.screenX,
                screenY: event.screenY,
                force: event.pressure || 1
            });
        } else if (event.clientX !== undefined) {
            // Mouse 事件
            touches.push({
                identifier: 0,
                clientX: event.clientX,
                clientY: event.clientY,
                pageX: event.pageX,
                pageY: event.pageY,
                screenX: event.screenX,
                screenY: event.screenY,
                force: 1
            });
        }
        
        return touches;
    }
    
    /**
     * 處理手勢識別
     */
    processGestures(phase, event, touches) {
        this.gestureRecognizers.forEach((recognizer, name) => {
            if (recognizer.enabled) {
                recognizer.handler(phase, event, touches);
            }
        });
    }
    
    /**
     * 識別點擊手勢
     */
    recognizeTap(phase, event, touches) {
        if (phase === 'end' && touches.length === 0) {
            const distance = this.calculateDistance(
                this.touchState.startX, this.touchState.startY,
                this.touchState.currentX, this.touchState.currentY
            );
            
            const duration = Date.now() - this.touchState.startTime;
            
            if (distance <= this.config.tapThreshold && 
                duration < this.config.longPressTime) {
                
                this.emitGesture('tap', {
                    x: this.touchState.currentX,
                    y: this.touchState.currentY,
                    duration: duration,
                    target: event.target
                });
                
                // 觸控回饋
                this.triggerHapticFeedback('light');
            }
        }
    }
    
    /**
     * 識別雙擊手勢
     */
    recognizeDoubleTap(phase, event, touches) {
        if (phase === 'end' && touches.length === 0) {
            const currentTime = Date.now();
            const timeSinceLastTap = currentTime - this.touchState.lastTapTime;
            
            const distance = this.calculateDistance(
                this.touchState.startX, this.touchState.startY,
                this.touchState.lastTapX, this.touchState.lastTapY
            );
            
            if (timeSinceLastTap < this.config.doubleTapTime && 
                distance <= this.config.tapThreshold) {
                
                this.emitGesture('doubletap', {
                    x: this.touchState.currentX,
                    y: this.touchState.currentY,
                    target: event.target
                });
                
                // 觸控回饋
                this.triggerHapticFeedback('medium');
                
                // 重設雙擊狀態
                this.touchState.lastTapTime = 0;
            } else {
                // 記錄這次點擊
                this.touchState.lastTapTime = currentTime;
                this.touchState.lastTapX = this.touchState.currentX;
                this.touchState.lastTapY = this.touchState.currentY;
            }
        }
    }
    
    /**
     * 識別長按手勢
     */
    recognizeLongPress(phase, event, touches) {
        if (phase === 'start') {
            // 設定長按計時器
            this.longPressTimer = setTimeout(() => {
                if (this.touchState.active && !this.touchState.isPanning) {
                    const distance = this.calculateDistance(
                        this.touchState.startX, this.touchState.startY,
                        this.touchState.currentX, this.touchState.currentY
                    );
                    
                    if (distance <= this.config.tapThreshold) {
                        this.touchState.isLongPress = true;
                        
                        this.emitGesture('longpress', {
                            x: this.touchState.currentX,
                            y: this.touchState.currentY,
                            target: event.target
                        });
                        
                        // 觸控回饋
                        this.triggerHapticFeedback('heavy');
                    }
                }
            }, this.config.longPressTime);
        } else if (phase === 'end') {
            // 清除長按計時器
            if (this.longPressTimer) {
                clearTimeout(this.longPressTimer);
                this.longPressTimer = null;
            }
        }
    }
    
    /**
     * 識別滑動手勢
     */
    recognizeSwipe(phase, event, touches) {
        if (phase === 'end' && touches.length === 0) {
            const deltaX = this.touchState.currentX - this.touchState.startX;
            const deltaY = this.touchState.currentY - this.touchState.startY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            const duration = Date.now() - this.touchState.startTime;
            
            if (distance >= this.config.swipeThreshold && duration < 500) {
                const direction = this.getSwipeDirection(deltaX, deltaY);
                const velocity = distance / duration;
                
                this.emitGesture('swipe', {
                    direction: direction,
                    distance: distance,
                    velocity: velocity,
                    deltaX: deltaX,
                    deltaY: deltaY,
                    startX: this.touchState.startX,
                    startY: this.touchState.startY,
                    endX: this.touchState.currentX,
                    endY: this.touchState.currentY,
                    target: event.target
                });
                
                // 觸控回饋
                this.triggerHapticFeedback('light');
            }
        }
    }
    
    /**
     * 識別拖拽手勢
     */
    recognizePan(phase, event, touches) {
        if (phase === 'move' && touches.length === 1) {
            const deltaX = this.touchState.currentX - this.touchState.startX;
            const deltaY = this.touchState.currentY - this.touchState.startY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            
            if (distance > this.config.tapThreshold && !this.touchState.isLongPress) {
                if (!this.touchState.isPanning) {
                    this.touchState.isPanning = true;
                    this.emitGesture('panstart', {
                        x: this.touchState.currentX,
                        y: this.touchState.currentY,
                        target: event.target
                    });
                }
                
                this.emitGesture('panmove', {
                    x: this.touchState.currentX,
                    y: this.touchState.currentY,
                    deltaX: deltaX,
                    deltaY: deltaY,
                    target: event.target
                });
            }
        } else if (phase === 'end' && this.touchState.isPanning) {
            this.emitGesture('panend', {
                x: this.touchState.currentX,
                y: this.touchState.currentY,
                target: event.target
            });
        }
    }
    
    /**
     * 識別縮放手勢
     */
    recognizePinch(phase, event, touches) {
        if (touches.length === 2) {
            const touch1 = touches[0];
            const touch2 = touches[1];
            
            const currentDistance = this.calculateDistance(
                touch1.clientX, touch1.clientY,
                touch2.clientX, touch2.clientY
            );
            
            if (phase === 'start') {
                this.pinchStartDistance = currentDistance;
                this.touchState.isPinching = true;
                
                this.emitGesture('pinchstart', {
                    scale: 1,
                    distance: currentDistance,
                    centerX: (touch1.clientX + touch2.clientX) / 2,
                    centerY: (touch1.clientY + touch2.clientY) / 2,
                    target: event.target
                });
            } else if (phase === 'move' && this.touchState.isPinching) {
                const scale = currentDistance / this.pinchStartDistance;
                
                this.emitGesture('pinchmove', {
                    scale: scale,
                    distance: currentDistance,
                    centerX: (touch1.clientX + touch2.clientX) / 2,
                    centerY: (touch1.clientY + touch2.clientY) / 2,
                    target: event.target
                });
            }
        } else if (phase === 'end' && this.touchState.isPinching) {
            this.emitGesture('pinchend', {
                target: event.target
            });
        }
    }
    
    /**
     * 識別旋轉手勢
     */
    recognizeRotate(phase, event, touches) {
        if (touches.length === 2) {
            const touch1 = touches[0];
            const touch2 = touches[1];
            
            const angle = Math.atan2(
                touch2.clientY - touch1.clientY,
                touch2.clientX - touch1.clientX
            ) * 180 / Math.PI;
            
            if (phase === 'start') {
                this.rotateStartAngle = angle;
            } else if (phase === 'move' && this.rotateStartAngle !== undefined) {
                const rotation = angle - this.rotateStartAngle;
                
                this.emitGesture('rotate', {
                    rotation: rotation,
                    angle: angle,
                    centerX: (touch1.clientX + touch2.clientX) / 2,
                    centerY: (touch1.clientY + touch2.clientY) / 2,
                    target: event.target
                });
            }
        }
    }
    
    /**
     * 發送手勢事件
     */
    emitGesture(type, data) {
        const gestureEvent = new CustomEvent(`gesture:${type}`, {
            detail: data,
            bubbles: true,
            cancelable: true
        });
        
        // 通過事件匯流排發送
        if (window.eventBus) {
            window.eventBus.emit(`gesture:${type}`, data);
        }
        
        // 通過 DOM 事件發送
        if (data.target) {
            data.target.dispatchEvent(gestureEvent);
        } else {
            document.dispatchEvent(gestureEvent);
        }
        
        if (this.config.debug) {
            console.log(`👆 手勢識別: ${type}`, data);
        }
    }
    
    /**
     * 計算兩點間距離
     */
    calculateDistance(x1, y1, x2, y2) {
        const deltaX = x2 - x1;
        const deltaY = y2 - y1;
        return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    }
    
    /**
     * 取得滑動方向
     */
    getSwipeDirection(deltaX, deltaY) {
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);
        
        if (absDeltaX > absDeltaY) {
            return deltaX > 0 ? 'right' : 'left';
        } else {
            return deltaY > 0 ? 'down' : 'up';
        }
    }
    
    /**
     * 觸發觸控回饋
     */
    triggerHapticFeedback(type = 'light') {
        if (!this.config.enableHapticFeedback) return;
        
        try {
            if (navigator.vibrate) {
                const patterns = {
                    light: [10],
                    medium: [20],
                    heavy: [30]
                };
                
                const pattern = patterns[type] || patterns.light;
                navigator.vibrate(pattern);
            }
        } catch (error) {
            if (this.config.debug) {
                console.warn('⚠️ 觸控回饋不支援:', error);
            }
        }
    }
    
    /**
     * 檢查是否應該防止預設行為
     */
    shouldPreventDefault(event) {
        // 在遊戲區域內防止滾動和縮放
        const gameContainer = document.getElementById('gameContainer');
        if (gameContainer && gameContainer.contains(event.target)) {
            return true;
        }
        
        // 在卡牌區域防止預設行為
        if (event.target.closest('.cards-area') || 
            event.target.closest('.card') ||
            event.target.closest('.game-area')) {
            return true;
        }
        
        return false;
    }
    
    /**
     * 註冊手勢監聽器
     */
    on(gestureType, callback, options = {}) {
        const key = `gesture:${gestureType}`;
        
        if (!this.eventListeners.has(key)) {
            this.eventListeners.set(key, []);
        }
        
        const listener = {
            callback,
            options,
            id: `listener_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
        };
        
        this.eventListeners.get(key).push(listener);
        
        // 通過事件匯流排註冊
        if (window.eventBus) {
            return window.eventBus.on(key, callback, null, 'TouchManager');
        }
        
        return () => this.off(gestureType, callback);
    }
    
    /**
     * 移除手勢監聽器
     */
    off(gestureType, callback = null) {
        const key = `gesture:${gestureType}`;
        
        if (callback === null) {
            // 移除所有監聽器
            this.eventListeners.delete(key);
            if (window.eventBus) {
                window.eventBus.off(key);
            }
        } else {
            // 移除特定監聽器
            const listeners = this.eventListeners.get(key);
            if (listeners) {
                const index = listeners.findIndex(l => l.callback === callback);
                if (index !== -1) {
                    listeners.splice(index, 1);
                    if (listeners.length === 0) {
                        this.eventListeners.delete(key);
                    }
                }
            }
            
            if (window.eventBus) {
                window.eventBus.off(key, callback);
            }
        }
    }
    
    /**
     * 啟用/停用手勢識別器
     */
    setGestureEnabled(gestureName, enabled) {
        const recognizer = this.gestureRecognizers.get(gestureName);
        if (recognizer) {
            recognizer.enabled = enabled;
            
            if (this.config.debug) {
                console.log(`👆 手勢 ${gestureName} ${enabled ? '已啟用' : '已停用'}`);
            }
        }
    }
    
    /**
     * 取得觸控狀態
     */
    getTouchState() {
        return { ...this.touchState };
    }
    
    /**
     * 取得裝置資訊
     */
    getDeviceInfo() {
        return { ...this.deviceInfo };
    }
    
    /**
     * 銷毀觸控管理器
     */
    destroy() {
        // 清除計時器
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
        }
        
        // 移除所有監聽器
        this.eventListeners.clear();
        
        // 清理組件監聽器
        if (window.eventBus) {
            window.eventBus.removeComponentListeners('TouchManager');
        }
        
        if (this.config.debug) {
            console.log('👆 TouchManager 已銷毀');
        }
    }
}

// 匯出 TouchManager
window.TouchManager = TouchManager;

console.log('👆 TouchManager 已載入 - v3.0.0-enhanced');