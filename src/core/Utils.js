/**
 * 工具函數庫 - 通用工具函數集合
 * 提供常用的工具函數，包括 DOM 操作、資料處理、動畫等
 * @version 3.0.0-enhanced
 * @enhanced 架構審查後優化版本
 */

/**
 * DOM 操作相關工具
 */
const DOMUtils = {
    /**
     * 安全的元素選取器
     * @param {string} selector - CSS 選取器
     * @param {Element} parent - 父元素（可選）
     * @returns {Element|null} DOM 元素
     */
    $(selector, parent = document) {
        try {
            if (!selector || typeof selector !== 'string') {
                console.warn('DOMUtils.$: 選取器必須為非空字串');
                return null;
            }
            return parent.querySelector(selector);
        } catch (error) {
            console.warn(`DOMUtils.$: 無效的選取器 '${selector}'`, error);
            return null;
        }
    },

    /**
     * 安全的多元素選取器
     * @param {string} selector - CSS 選取器
     * @param {Element} parent - 父元素（可選）
     * @returns {NodeList} DOM 元素列表
     */
    $$(selector, parent = document) {
        try {
            if (!selector || typeof selector !== 'string') {
                console.warn('DOMUtils.$$: 選取器必須為非空字串');
                return [];
            }
            return parent.querySelectorAll(selector);
        } catch (error) {
            console.warn(`DOMUtils.$$: 無效的選取器 '${selector}'`, error);
            return [];
        }
    },

    /**
     * 創建 DOM 元素
     * @param {string} tag - 標籤名稱
     * @param {Object} options - 元素選項
     * @returns {Element} 創建的 DOM 元素
     */
    createElement(tag, options = {}) {
        const element = document.createElement(tag);
        
        if (options.className) element.className = options.className;
        if (options.id) element.id = options.id;
        if (options.innerHTML) element.innerHTML = options.innerHTML;
        if (options.textContent) element.textContent = options.textContent;
        
        if (options.attributes) {
            Object.entries(options.attributes).forEach(([key, value]) => {
                element.setAttribute(key, value);
            });
        }
        
        if (options.style) {
            Object.entries(options.style).forEach(([key, value]) => {
                element.style[key] = value;
            });
        }
        
        if (options.events) {
            Object.entries(options.events).forEach(([event, handler]) => {
                element.addEventListener(event, handler);
            });
        }
        
        return element;
    },

    /**
     * 安全移除元素
     * @param {Element|string} element - DOM 元素或選取器
     */
    remove(element) {
        if (typeof element === 'string') {
            element = this.$(element);
        }
        if (element && element.parentNode) {
            element.parentNode.removeChild(element);
        }
    },

    /**
     * 切換元素類別
     * @param {Element|string} element - DOM 元素或選取器
     * @param {string|Array} classNames - 類別名稱
     */
    toggleClass(element, classNames) {
        if (typeof element === 'string') {
            element = this.$(element);
        }
        if (!element) return;
        
        const classes = Array.isArray(classNames) ? classNames : [classNames];
        classes.forEach(className => {
            element.classList.toggle(className);
        });
    },

    /**
     * 檢查元素是否包含類別
     * @param {Element|string} element - DOM 元素或選取器
     * @param {string} className - 類別名稱
     * @returns {boolean} 是否包含類別
     */
    hasClass(element, className) {
        if (typeof element === 'string') {
            element = this.$(element);
        }
        return element ? element.classList.contains(className) : false;
    },

    /**
     * 獲取元素位置資訊
     * @param {Element|string} element - DOM 元素或選取器
     * @returns {Object} 位置資訊
     */
    getElementPosition(element) {
        if (typeof element === 'string') {
            element = this.$(element);
        }
        if (!element) return null;
        
        const rect = element.getBoundingClientRect();
        return {
            top: rect.top + window.scrollY,
            left: rect.left + window.scrollX,
            width: rect.width,
            height: rect.height,
            centerX: rect.left + rect.width / 2,
            centerY: rect.top + rect.height / 2
        };
    },

    /**
     * 等待元素出現在 DOM 中
     * @param {string} selector - CSS 選取器
     * @param {number} timeout - 超時時間（毫秒）
     * @returns {Promise<Element>}
     */
    waitForElement(selector, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const element = this.$(selector);
            if (element) {
                resolve(element);
                return;
            }

            const observer = new MutationObserver(() => {
                const element = this.$(selector);
                if (element) {
                    observer.disconnect();
                    resolve(element);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Element ${selector} not found within ${timeout}ms`));
            }, timeout);
        });
    },

    /**
     * 批量設置元素樣式
     * @param {Element} element - 目標元素
     * @param {Object} styles - 樣式物件
     */
    setStyles(element, styles) {
        if (!element || !styles) return;
        
        Object.entries(styles).forEach(([property, value]) => {
            try {
                element.style[property] = value;
            } catch (error) {
                console.warn('DOMUtils.setStyles: 無效樣式屬性', property, value);
            }
        });
    },

    /**
     * 一次性事件監聽器
     * @param {Element} element - 目標元素
     * @param {string} event - 事件名稱
     * @param {Function} handler - 事件處理器
     */
    once(element, event, handler) {
        const onceHandler = (e) => {
            handler(e);
            element.removeEventListener(event, onceHandler);
        };
        element.addEventListener(event, onceHandler);
    }
};

/**
 * 數據處理相關工具
 */
const DataUtils = {
    /**
     * 生成唯一 ID
     * @param {string} prefix - ID 前綴
     * @returns {string} 唯一 ID
     */
    generateId(prefix = 'id') {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return `${prefix}_${timestamp}_${random}`;
    },

    /**
     * 深度複製物件
     * @param {*} obj - 要複製的物件
     * @returns {*} 複製的物件
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj);
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === 'object') {
            const cloned = {};
            Object.keys(obj).forEach(key => {
                cloned[key] = this.deepClone(obj[key]);
            });
            return cloned;
        }
    },

    /**
     * 深度合併物件
     * @param {Object} target - 目標物件
     * @param {...Object} sources - 來源物件
     * @returns {Object} 合併後的物件
     */
    deepMerge(target, ...sources) {
        if (!sources.length) return target;
        const source = sources.shift();

        if (this.isObject(target) && this.isObject(source)) {
            for (const key in source) {
                if (this.isObject(source[key])) {
                    if (!target[key]) Object.assign(target, { [key]: {} });
                    this.deepMerge(target[key], source[key]);
                } else {
                    Object.assign(target, { [key]: source[key] });
                }
            }
        }

        return this.deepMerge(target, ...sources);
    },

    /**
     * 檢查是否為物件
     * @param {*} item - 檢查項目
     * @returns {boolean}
     */
    isObject(item) {
        return item && typeof item === 'object' && !Array.isArray(item);
    },

    /**
     * 陣列去重
     * @param {Array} array - 原始陣列
     * @param {string|Function} key - 去重鍵或函數
     * @returns {Array} 去重後的陣列
     */
    unique(array, key = null) {
        if (!Array.isArray(array)) return [];
        
        if (!key) {
            return [...new Set(array)];
        }
        
        const seen = new Set();
        return array.filter(item => {
            const keyValue = typeof key === 'function' ? key(item) : item[key];
            if (seen.has(keyValue)) {
                return false;
            }
            seen.add(keyValue);
            return true;
        });
    },

    /**
     * 格式化數字
     * @param {number} num - 數字
     * @param {number} decimals - 小數位數
     * @returns {string} 格式化後的數字
     */
    formatNumber(num, decimals = 1) {
        if (typeof num !== 'number') return '0';
        return num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },

    /**
     * 格式化百分比
     * @param {number} value - 數值 (0-1)
     * @param {number} decimals - 小數位數
     * @returns {string} 格式化後的百分比
     */
    formatPercentage(value, decimals = 1) {
        return `${(value * 100).toFixed(decimals)}%`;
    },

    /**
     * 產生指定範圍內的隨機數
     * @param {number} min - 最小值
     * @param {number} max - 最大值
     * @returns {number} 隨機數
     */
    randomBetween(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    /**
     * 檢查物件是否為空
     * @param {*} obj - 要檢查的物件
     * @returns {boolean} 是否為空
     */
    isEmpty(obj) {
        if (obj == null) return true;
        if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0;
        if (typeof obj === 'object') return Object.keys(obj).length === 0;
        return false;
    },

    /**
     * 陣列分組
     * @param {Array} array - 原始陣列
     * @param {string|Function} key - 分組鍵或函數
     * @returns {Object} 分組結果
     */
    groupBy(array, key) {
        if (!Array.isArray(array)) return {};
        
        return array.reduce((groups, item) => {
            const groupKey = typeof key === 'function' ? key(item) : item[key];
            if (!groups[groupKey]) {
                groups[groupKey] = [];
            }
            groups[groupKey].push(item);
            return groups;
        }, {});
    },

    /**
     * 陣列隨機排序
     * @param {Array} array - 原始陣列
     * @returns {Array} 隨機排序後的陣列
     */
    shuffle(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    },

    /**
     * 排序陣列
     * @param {Array} array - 原始陣列
     * @param {string|Function} key - 排序鍵或函數
     * @param {boolean} ascending - 是否遞增排序
     * @returns {Array} 排序後的陣列
     */
    sortBy(array, key, ascending = true) {
        if (!Array.isArray(array)) return [];
        
        return array.sort((a, b) => {
            const valueA = typeof key === 'function' ? key(a) : a[key];
            const valueB = typeof key === 'function' ? key(b) : b[key];
            
            if (valueA < valueB) return ascending ? -1 : 1;
            if (valueA > valueB) return ascending ? 1 : -1;
            return 0;
        });
    },

    /**
     * 為字串產生哈希值
     * @param {string} str - 輸入字串
     * @returns {number} 哈希值
     */
    hashCode(str) {
        let hash = 0;
        if (str.length === 0) return hash;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 32-bit integer
        }
        return hash;
    }
};

/**
 * 動畫相關工具
 */
const AnimationUtils = {
    /**
     * 緩動函數
     */
    easing: {
        linear: t => t,
        easeInQuad: t => t * t,
        easeOutQuad: t => t * (2 - t),
        easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
        easeInCubic: t => t * t * t,
        easeOutCubic: t => (--t) * t * t + 1,
        easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1
    },

    /**
     * 動畫執行器
     * @param {Object} options - 動畫選項
     */
    animate(options) {
        const {
            duration = 300,
            easing = 'easeOutQuad',
            from = 0,
            to = 1,
            onUpdate = () => {},
            onComplete = () => {}
        } = options;

        const startTime = performance.now();
        const easingFn = this.easing[easing] || this.easing.linear;

        const step = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easingFn(progress);
            const currentValue = from + (to - from) * easedProgress;

            onUpdate(currentValue, progress);

            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                onComplete();
            }
        };

        requestAnimationFrame(step);
    },

    /**
     * 數值動畫
     * @param {number} from - 起始值
     * @param {number} to - 結束值
     * @param {Object} options - 動畫選項
     */
    animateValue(from, to, options) {
        const {
            duration = 300,
            easing = 'easeOutQuad',
            onUpdate = () => {},
            onComplete = () => {}
        } = options;

        this.animate({
            duration,
            easing,
            onUpdate: (progress) => {
                const currentValue = from + (to - from) * progress;
                onUpdate(currentValue, progress);
            },
            onComplete
        });
    },

    /**
     * 淡入動畫
     * @param {Element} element - 目標元素
     * @param {number} duration - 持續時間
     * @returns {Promise}
     */
    fadeIn(element, duration = 300) {
        return new Promise(resolve => {
            element.style.opacity = '0';
            element.style.display = 'block';
            
            this.animate({
                duration,
                from: 0,
                to: 1,
                onUpdate: value => {
                    element.style.opacity = value;
                },
                onComplete: resolve
            });
        });
    },

    /**
     * 淡出動畫
     * @param {Element} element - 目標元素
     * @param {number} duration - 持續時間
     * @returns {Promise}
     */
    fadeOut(element, duration = 300) {
        return new Promise(resolve => {
            this.animate({
                duration,
                from: 1,
                to: 0,
                onUpdate: value => {
                    element.style.opacity = value;
                },
                onComplete: () => {
                    element.style.display = 'none';
                    resolve();
                }
            });
        });
    },

    /**
     * 滑動顯示
     * @param {Element} element - 目標元素
     * @param {number} duration - 持續時間
     * @returns {Promise}
     */
    slideDown(element, duration = 300) {
        return new Promise(resolve => {
            const height = element.scrollHeight;
            element.style.height = '0';
            element.style.overflow = 'hidden';
            element.style.display = 'block';
            
            this.animate({
                duration,
                from: 0,
                to: height,
                onUpdate: value => {
                    element.style.height = `${value}px`;
                },
                onComplete: () => {
                    element.style.height = '';
                    element.style.overflow = '';
                    resolve();
                }
            });
        });
    },

    /**
     * 滑動隱藏
     * @param {Element} element - 目標元素
     * @param {number} duration - 持續時間
     * @returns {Promise}
     */
    slideUp(element, duration = 300) {
        return new Promise(resolve => {
            const height = element.scrollHeight;
            element.style.height = `${height}px`;
            element.style.overflow = 'hidden';
            
            this.animate({
                duration,
                from: height,
                to: 0,
                onUpdate: value => {
                    element.style.height = `${value}px`;
                },
                onComplete: () => {
                    element.style.display = 'none';
                    element.style.height = '';
                    element.style.overflow = '';
                    resolve();
                }
            });
        });
    },

    /**
     * 彈跳動畫
     * @param {Element} element - 目標元素
     * @param {number} intensity - 彈跳強度
     */
    bounce(element, intensity = 10) {
        const originalTransform = element.style.transform;
        
        this.animate({
            duration: 600,
            easing: 'easeOutCubic',
            onUpdate: progress => {
                const bounce = Math.sin(progress * Math.PI * 3) * intensity * (1 - progress);
                element.style.transform = `${originalTransform} translateY(${bounce}px)`;
            },
            onComplete: () => {
                element.style.transform = originalTransform;
            }
        });
    },

    /**
     * 脈動動畫
     * @param {Element} element - 目標元素
     * @param {number} scale - 縮放比例
     */
    pulse(element, scale = 1.1) {
        const originalTransform = element.style.transform;
        
        this.animate({
            duration: 1000,
            easing: 'easeInOutQuad',
            onUpdate: progress => {
                const currentScale = 1 + (scale - 1) * Math.sin(progress * Math.PI);
                element.style.transform = `${originalTransform} scale(${currentScale})`;
            },
            onComplete: () => {
                element.style.transform = originalTransform;
            }
        });
    }
};

/**
 * 遊戲相關工具
 */
const GameUtils = {
    /**
     * Fibonacci 數列
     */
    fibonacciSequence: [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89],
    
    /**
     * 特殊卡牌
     */
    specialCards: ['☕', '❓', '∞'],

    /**
     * 所有卡牌值
     */
    get allCardValues() {
        return [...this.fibonacciSequence, ...this.specialCards];
    },

    /**
     * 格式化點數顯示
     * @param {*} points - 點數值
     * @returns {string} 格式化後的顯示文字
     */
    formatPoints(points) {
        if (points === 'coffee' || points === '☕') return '☕';
        if (points === 'question' || points === '❓') return '❓';
        if (points === 'infinity' || points === '∞') return '∞';
        return points?.toString() || '0';
    },

    /**
     * 計算投票統計
     * @param {Array} votes - 投票陣列
     * @returns {Object} 統計結果
     */
    calculateVoteStatistics(votes) {
        const numericVotes = votes
            .map(v => typeof v === 'object' ? v.value : v)
            .filter(v => typeof v === 'number');

        if (numericVotes.length === 0) {
            return {
                totalVotes: votes.length,
                averagePoints: 0,
                consensus: 0,
                variance: 0,
                min: 0,
                max: 0
            };
        }

        const total = numericVotes.reduce((sum, vote) => sum + vote, 0);
        const average = total / numericVotes.length;
        const min = Math.min(...numericVotes);
        const max = Math.max(...numericVotes);

        // 計算變異數和共識度
        const variance = numericVotes.reduce((sum, vote) => 
            sum + Math.pow(vote - average, 2), 0) / numericVotes.length;
        const maxVariance = Math.pow(max - min, 2) / 4 || 1;
        const consensus = Math.round((1 - (variance / maxVariance)) * 100);

        return {
            totalVotes: votes.length,
            averagePoints: Math.round(average * 10) / 10,
            consensus: Math.max(0, Math.min(100, consensus)),
            variance: Math.round(variance * 100) / 100,
            min,
            max
        };
    },

    /**
     * 生成房間 ID
     * @returns {string} 房間 ID
     */
    generateRoomId() {
        const timestamp = Date.now().toString(36).substring(-4);
        const random = Math.random().toString(36).substring(2, 6);
        return (timestamp + random).toUpperCase();
    },

    /**
     * 驗證房間 ID 格式
     * @param {string} roomId - 房間 ID
     * @returns {boolean} 是否有效
     */
    validateRoomId(roomId) {
        if (!roomId || typeof roomId !== 'string') return false;
        // 支援多種格式：8位大寫數字或 4-20 位字母數字和連字符
        return /^[A-Z0-9]{8}$/.test(roomId) || /^[a-zA-Z0-9-]{4,20}$/.test(roomId);
    },

    /**
     * 獲取角色顯示名稱
     * @param {string} role - 角色代碼
     * @returns {string} 顯示名稱
     */
    getRoleDisplayName(role) {
        const roleNames = {
            'dev': '👨‍💻 開發者',
            'qa': '🐛 測試者',
            'scrum_master': '👥 Scrum Master',
            'po': '👔 Product Owner',
            'other': '👤 其他'
        };
        return roleNames[role] || role;
    },

    /**
     * 獲取角色簡短名稱
     * @param {string} role - 角色代碼
     * @returns {string} 簡短名稱
     */
    getRoleShortName(role) {
        const shortNames = {
            'dev': 'Dev',
            'qa': 'QA',
            'scrum_master': 'SM',
            'po': 'PO',
            'other': 'Other'
        };
        return shortNames[role] || role;
    },

    /**
     * 獲取角色顏色
     * @param {string} role - 角色代碼
     * @returns {string} CSS 顏色值
     */
    getRoleColor(role) {
        const colorMap = {
            'dev': '#10b981',
            'qa': '#f59e0b',
            'scrum_master': '#8b5cf6',
            'po': '#06b6d4',
            'other': '#6b7280'
        };
        return colorMap[role] || '#6b7280';
    },

    /**
     * 格式化玩家名稱
     * @param {string} name - 原始名稱
     * @returns {string} 格式化後的名稱
     */
    formatPlayerName(name) {
        if (!name || typeof name !== 'string') return '匿名玩家';
        return name.trim().substring(0, 20);
    },

    /**
     * 驗證玩家名稱
     * @param {string} name - 玩家名稱
     * @returns {boolean} 是否有效
     */
    validatePlayerName(name) {
        if (!name || typeof name !== 'string') return false;
        const trimmed = name.trim();
        return trimmed.length >= 1 && trimmed.length <= 20;
    },

    /**
     * 計算角色分佈統計
     * @param {Array} players - 玩家陣列
     * @returns {Object} 角色統計
     */
    calculateRoleStatistics(players) {
        if (!Array.isArray(players)) return {};
        
        const roleStats = {};
        
        players.forEach(player => {
            const role = player.role || 'other';
            if (!roleStats[role]) {
                roleStats[role] = {
                    count: 0,
                    voted: 0,
                    averageVote: 0,
                    displayName: this.getRoleDisplayName(role),
                    color: this.getRoleColor(role)
                };
            }
            roleStats[role].count++;
            if (player.hasVoted) {
                roleStats[role].voted++;
            }
        });
        
        // 計算各角色平均投票
        Object.keys(roleStats).forEach(role => {
            const roleVotes = players
                .filter(p => p.role === role && p.hasVoted && typeof p.vote === 'number')
                .map(p => p.vote);
            
            if (roleVotes.length > 0) {
                roleStats[role].averageVote = 
                    roleVotes.reduce((sum, vote) => sum + vote, 0) / roleVotes.length;
            }
        });
        
        return roleStats;
    }
};

/**
 * 裝置檢測工具
 */
const DeviceUtils = {
    /**
     * 檢測裝置類型
     * @returns {Object} 裝置資訊
     */
    getDeviceInfo() {
        const userAgent = navigator.userAgent.toLowerCase();
        const windowWidth = window.innerWidth;
        
        return {
            isMobile: windowWidth <= 768 || /mobile|android|iphone/.test(userAgent),
            isTablet: (windowWidth > 768 && windowWidth <= 1024) || /tablet|ipad/.test(userAgent),
            isDesktop: windowWidth > 1024 && !/mobile|tablet|android|iphone|ipad/.test(userAgent),
            isTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
            isSafari: /safari/.test(userAgent) && !/chrome/.test(userAgent),
            isIOS: /iphone|ipad|ipod/.test(userAgent),
            isAndroid: /android/.test(userAgent),
            pixelRatio: window.devicePixelRatio || 1,
            windowWidth,
            windowHeight: window.innerHeight,
            orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
            deviceMemory: navigator.deviceMemory || 4,
            hardwareConcurrency: navigator.hardwareConcurrency || 4,
            connectionType: navigator.connection ? navigator.connection.effectiveType : 'unknown'
        };
    },

    /**
     * 檢測是否支援觸控
     * @returns {boolean} 是否支援觸控
     */
    isTouchDevice() {
        return 'ontouchstart' in window || 
               navigator.maxTouchPoints > 0 || 
               navigator.msMaxTouchPoints > 0;
    },

    /**
     * 獲取視窗尺寸
     * @returns {Object} 視窗尺寸
     */
    getViewportSize() {
        return {
            width: window.innerWidth,
            height: window.innerHeight,
            aspectRatio: window.innerWidth / window.innerHeight
        };
    },

    /**
     * 獲取螢幕尺寸類別
     * @returns {string} 螢幕尺寸類別
     */
    getScreenSize() {
        const width = window.innerWidth;
        if (width < 640) return 'mobile';
        if (width < 1024) return 'tablet';
        return 'desktop';
    },

    /**
     * 檢測瀏覽器類型
     * @returns {string} 瀏覽器類型
     */
    getBrowser() {
        const userAgent = navigator.userAgent;
        if (userAgent.includes('Chrome')) return 'chrome';
        if (userAgent.includes('Firefox')) return 'firefox';
        if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'safari';
        if (userAgent.includes('Edge')) return 'edge';
        return 'other';
    },

    /**
     * 檢測是否支援某個 CSS 屬性
     * @param {string} property - CSS 屬性名
     * @returns {boolean} 是否支援
     */
    supportsCSSProperty(property) {
        const testElement = document.createElement('div');
        return property in testElement.style;
    },

    /**
     * 檢測是否支援 WebGL
     * @returns {boolean} 是否支援
     */
    supportsWebGL() {
        try {
            const canvas = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && 
                     (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
        } catch (e) {
            return false;
        }
    },

    /**
     * 獲取裝置性能等級
     * @returns {string} 性能等級
     */
    getPerformanceTier() {
        const { deviceMemory, hardwareConcurrency } = navigator;
        const pixelRatio = window.devicePixelRatio || 1;
        
        // 簡單的性能評估
        let score = 0;
        if (hardwareConcurrency >= 8) score += 3;
        else if (hardwareConcurrency >= 4) score += 2;
        else score += 1;
        
        if (deviceMemory >= 8) score += 3;
        else if (deviceMemory >= 4) score += 2;
        else score += 1;
        
        if (pixelRatio <= 1.5) score += 1;
        
        if (score >= 6) return 'high';
        if (score >= 4) return 'medium';
        return 'low';
    }
};

/**
 * Cookie 工具
 */
const CookieUtils = {
    /**
     * 設定 Cookie
     * @param {string} name - Cookie 名稱
     * @param {*} value - Cookie 值
     * @param {Object} options - 選項
     * @param {number} [options.days] - 過期天數（預設 30 天）
     * @param {string} [options.path] - 路徑（預設 '/'）
     * @param {boolean} [options.secure] - 是否僅 HTTPS（預設 false）
     * @param {string} [options.sameSite] - SameSite 屬性（預設 'Lax'）
     * @param {boolean} [options.httpOnly] - 是否僅 HTTP（無法透過 JS 設定，預設 false）
     * @returns {boolean} 是否設定成功
     */
    setCookie(name, value, options = {}) {
        try {
            const {
                days = 30,
                path = '/',
                secure = false,
                sameSite = 'Lax'
            } = options;
            
            // 序列化值
            let cookieValue;
            if (typeof value === 'string') {
                cookieValue = encodeURIComponent(value);
            } else {
                cookieValue = encodeURIComponent(JSON.stringify(value));
            }
            
            // 計算過期時間
            const expirationDate = new Date();
            expirationDate.setTime(expirationDate.getTime() + (days * 24 * 60 * 60 * 1000));
            
            // 建構 Cookie 字串
            let cookieString = `${encodeURIComponent(name)}=${cookieValue}`;
            cookieString += `; expires=${expirationDate.toUTCString()}`;
            cookieString += `; path=${path}`;
            cookieString += `; SameSite=${sameSite}`;
            
            if (secure || window.location.protocol === 'https:') {
                cookieString += '; Secure';
            }
            
            document.cookie = cookieString;
            
            console.log(`🍪 Cookie 已設定: ${name}`);
            return true;
        } catch (error) {
            console.error('CookieUtils.setCookie: 設定 Cookie 失敗', {
                name,
                error: error.message,
                stack: error.stack
            });
            return false;
        }
    },

    /**
     * 取得 Cookie
     * @param {string} name - Cookie 名稱
     * @param {*} defaultValue - 預設值
     * @returns {*} Cookie 值
     */
    getCookie(name, defaultValue = null) {
        try {
            const encodedName = encodeURIComponent(name) + '=';
            const cookies = document.cookie.split(';');
            
            for (let cookie of cookies) {
                cookie = cookie.trim();
                if (cookie.indexOf(encodedName) === 0) {
                    const cookieValue = cookie.substring(encodedName.length);
                    const decodedValue = decodeURIComponent(cookieValue);
                    
                    // 嘗試解析 JSON
                    try {
                        return JSON.parse(decodedValue);
                    } catch (parseError) {
                        // 如果不是 JSON，返回字串
                        return decodedValue;
                    }
                }
            }
            
            return defaultValue;
        } catch (error) {
            console.error('CookieUtils.getCookie: 讀取 Cookie 失敗', {
                name,
                error: error.message
            });
            return defaultValue;
        }
    },

    /**
     * 刪除 Cookie
     * @param {string} name - Cookie 名稱
     * @param {string} [path] - 路徑（預設 '/'）
     * @returns {boolean} 是否刪除成功
     */
    deleteCookie(name, path = '/') {
        try {
            document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path};`;
            console.log(`🗑️ Cookie 已刪除: ${name}`);
            return true;
        } catch (error) {
            console.error('CookieUtils.deleteCookie: 刪除 Cookie 失敗', {
                name,
                error: error.message
            });
            return false;
        }
    },

    /**
     * 檢查 Cookie 是否存在
     * @param {string} name - Cookie 名稱
     * @returns {boolean} 是否存在
     */
    exists(name) {
        return this.getCookie(name) !== null;
    },

    /**
     * 取得所有 Cookie
     * @returns {Object} 所有 Cookie 的鍵值對
     */
    getAllCookies() {
        try {
            const cookies = {};
            const cookieArray = document.cookie.split(';');
            
            for (let cookie of cookieArray) {
                cookie = cookie.trim();
                const [name, value] = cookie.split('=');
                if (name && value) {
                    const decodedName = decodeURIComponent(name);
                    const decodedValue = decodeURIComponent(value);
                    
                    try {
                        cookies[decodedName] = JSON.parse(decodedValue);
                    } catch (parseError) {
                        cookies[decodedName] = decodedValue;
                    }
                }
            }
            
            return cookies;
        } catch (error) {
            console.error('CookieUtils.getAllCookies: 取得所有 Cookie 失敗', error);
            return {};
        }
    },

    /**
     * 清除所有 Cookie（僅限當前路徑）
     * @param {string} [path] - 路徑（預設 '/'）
     */
    clearAll(path = '/') {
        try {
            const cookies = this.getAllCookies();
            let clearedCount = 0;
            
            for (const name in cookies) {
                if (this.deleteCookie(name, path)) {
                    clearedCount++;
                }
            }
            
            console.log(`🧹 已清除 ${clearedCount} 個 Cookie`);
            return clearedCount;
        } catch (error) {
            console.error('CookieUtils.clearAll: 清除所有 Cookie 失敗', error);
            return 0;
        }
    }
};

/**
 * 本地儲存工具
 */
const StorageUtils = {
    /**
     * 安全的 localStorage 設定
     * @param {string} key - 鍵
     * @param {*} value - 值
     * @param {Object} options - 選項 { encrypt: boolean, compress: boolean }
     * @returns {boolean} 是否成功
     */
    setItem(key, value, options = {}) {
        try {
            let dataToStore;
            
            // 序列化資料
            if (typeof value === 'string') {
                dataToStore = value;
            } else {
                try {
                    dataToStore = JSON.stringify(value);
                } catch (stringifyError) {
                    console.error('StorageUtils.setItem: 序列化失敗', {
                        key,
                        error: stringifyError.message,
                        valueType: typeof value
                    });
                    return false;
                }
            }
            
            // 壓縮處理
            if (options.compress && dataToStore.length > 100) {
                try {
                    dataToStore = 'COMPRESSED:' + btoa(dataToStore);
                } catch (compressError) {
                    console.warn('StorageUtils.setItem: 壓縮失敗，使用原始資料', {
                        key,
                        error: compressError.message
                    });
                }
            }
            
            // 加密處理
            if (options.encrypt && window.StorageService) {
                try {
                    const storageService = new window.StorageService();
                    dataToStore = storageService.encryptData(dataToStore);
                } catch (encryptError) {
                    console.warn('StorageUtils.setItem: 加密失敗，使用原始資料', {
                        key,
                        error: encryptError.message
                    });
                }
            }
            
            localStorage.setItem(key, dataToStore);
            return true;
        } catch (error) {
            console.error('StorageUtils.setItem: 存儲失敗', {
                key,
                error: error.message,
                stack: error.stack,
                name: error.name
            });
            
            // 檢查是否因為空間不足
            if (error.name === 'QuotaExceededError') {
                console.warn('StorageUtils.setItem: localStorage 空間不足');
                
                // 嘗試清理過期資料（如果有相關功能）
                try {
                    this.cleanup();
                } catch (cleanupError) {
                    console.error('StorageUtils.setItem: 清理失敗', cleanupError);
                }
            }
            
            return false;
        }
    },

    /**
     * 安全的 localStorage 讀取
     * @param {string} key - 鍵
     * @param {*} defaultValue - 預設值
     * @returns {*} 讀取的值
     */
    getItem(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            if (!item) return defaultValue;
            
            // 檢查是否為加密資料
            if (item.startsWith('ENCRYPTED:')) {
                try {
                    // 如果存在 StorageService，使用它的解密方法
                    if (window.StorageService) {
                        const storageService = new window.StorageService();
                        const decryptedData = storageService.decryptData(item);
                        
                        // 如果解密返回 null，表示資料損壞，清除它
                        if (decryptedData === null) {
                            console.warn(`StorageUtils.getItem: 加密資料損壞，清除鍵值 "${key}"`);
                            try {
                                localStorage.removeItem(key);
                            } catch (removeError) {
                                console.error('無法清除損壞的加密資料', removeError);
                            }
                            return defaultValue;
                        }
                        
                        return decryptedData;
                    } else {
                        console.warn('StorageUtils.getItem: 發現加密資料但 StorageService 不可用');
                        return defaultValue;
                    }
                } catch (decryptError) {
                    console.error('StorageUtils.getItem: 解密失敗', {
                        key,
                        error: decryptError.message,
                        stack: decryptError.stack
                    });
                    
                    // 解密失敗時也清除損壞的資料
                    try {
                        localStorage.removeItem(key);
                        console.warn(`StorageUtils.getItem: 解密失敗，已清除損壞的鍵值 "${key}"`);
                    } catch (removeError) {
                        console.error('無法清除解密失敗的資料', removeError);
                    }
                    
                    return defaultValue;
                }
            }
            
            // 檢查是否為壓縮資料
            if (item.startsWith('COMPRESSED:')) {
                try {
                    const decompressed = atob(item.substring(11));
                    return JSON.parse(decompressed);
                } catch (decompressError) {
                    console.error('StorageUtils.getItem: 解壓縮失敗', {
                        key,
                        error: decompressError.message
                    });
                    return defaultValue;
                }
            }
            
            // 嘗試解析 JSON
            try {
                return JSON.parse(item);
            } catch (parseError) {
                // 如果不是 JSON，檢查是否是簡單字串
                if (typeof item === 'string' && item.length > 0) {
                    // 嘗試判斷是否為數字
                    const numValue = Number(item);
                    if (!isNaN(numValue) && isFinite(numValue)) {
                        return numValue;
                    }
                    
                    // 嘗試判斷是否為布林值
                    if (item.toLowerCase() === 'true') return true;
                    if (item.toLowerCase() === 'false') return false;
                    
                    // 返回原始字串
                    return item;
                }
                
                console.error('StorageUtils.getItem: JSON 解析失敗', {
                    key,
                    value: item.substring(0, 100) + (item.length > 100 ? '...' : ''),
                    error: parseError.message,
                    type: typeof item
                });
                
                return defaultValue;
            }
        } catch (error) {
            console.error('StorageUtils.getItem: 存取 localStorage 失敗', {
                key,
                error: error.message,
                stack: error.stack,
                name: error.name
            });
            
            // 嘗試清除損壞的資料
            try {
                localStorage.removeItem(key);
                console.warn(`StorageUtils.getItem: 已清除損壞的鍵值 "${key}"`);
            } catch (removeError) {
                console.error('StorageUtils.getItem: 無法清除損壞的資料', removeError);
            }
            
            return defaultValue;
        }
    },

    /**
     * 移除 localStorage 項目
     * @param {string} key - 鍵
     */
    removeItem(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.warn('StorageUtils.removeItem: 無法從 localStorage 移除', error);
        }
    },

    /**
     * 檢查 localStorage 是否可用
     * @returns {boolean} 是否可用
     */
    isAvailable() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, 'test');
            localStorage.removeItem(test);
            return true;
        } catch (error) {
            return false;
        }
    },

    /**
     * 清理損壞或過期的資料
     */
    cleanup() {
        try {
            const keysToRemove = [];
            
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (!key) continue;
                
                try {
                    // 嘗試讀取每個項目
                    this.getItem(key);
                } catch (error) {
                    // 如果讀取失敗，標記為需要清除
                    keysToRemove.push(key);
                    console.warn(`StorageUtils.cleanup: 發現損壞的資料 "${key}"`, error.message);
                }
            }
            
            // 移除損壞的項目
            keysToRemove.forEach(key => {
                try {
                    localStorage.removeItem(key);
                    console.log(`StorageUtils.cleanup: 已清除損壞的項目 "${key}"`);
                } catch (removeError) {
                    console.error(`StorageUtils.cleanup: 無法清除項目 "${key}"`, removeError);
                }
            });
            
            console.log(`StorageUtils.cleanup: 清理完成，共清除 ${keysToRemove.length} 個項目`);
            return keysToRemove.length;
            
        } catch (error) {
            console.error('StorageUtils.cleanup: 清理過程中發生錯誤', error);
            return 0;
        }
    },

    /**
     * 獲取存儲統計資訊
     * @returns {Object} 統計資訊
     */
    getStats() {
        try {
            const stats = {
                totalItems: localStorage.length,
                totalSize: 0,
                availableSpace: null,
                corrupted: 0,
                encrypted: 0,
                compressed: 0
            };
            
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (!key) continue;
                
                try {
                    const value = localStorage.getItem(key);
                    if (value) {
                        stats.totalSize += value.length;
                        
                        if (value.startsWith('ENCRYPTED:')) {
                            stats.encrypted++;
                        } else if (value.startsWith('COMPRESSED:')) {
                            stats.compressed++;
                        }
                    }
                } catch (error) {
                    stats.corrupted++;
                }
            }
            
            // 嘗試獲取可用空間資訊
            try {
                if ('storage' in navigator && 'estimate' in navigator.storage) {
                    navigator.storage.estimate().then(estimate => {
                        stats.availableSpace = {
                            quota: estimate.quota,
                            usage: estimate.usage,
                            usagePercentage: Math.round((estimate.usage / estimate.quota) * 100)
                        };
                    });
                }
            } catch (spaceError) {
                console.warn('StorageUtils.getStats: 無法獲取空間資訊', spaceError);
            }
            
            return stats;
        } catch (error) {
            console.error('StorageUtils.getStats: 統計資訊獲取失敗', error);
            return {
                totalItems: 0,
                totalSize: 0,
                availableSpace: null,
                corrupted: 0,
                encrypted: 0,
                compressed: 0
            };
        }
    }
};

// 將工具函數匯出為模組化結構
window.Utils = {
    DOM: DOMUtils,
    Data: DataUtils,
    Animation: AnimationUtils,
    Game: GameUtils,
    Device: DeviceUtils,
    Cookie: CookieUtils,
    Storage: StorageUtils
};

// 為了向後相容，保留舊的全域匯出
window.DOMUtils = DOMUtils;
window.DataUtils = DataUtils;
window.AnimationUtils = AnimationUtils;
window.GameUtils = GameUtils;
window.DeviceUtils = DeviceUtils;
window.CookieUtils = CookieUtils;
window.StorageUtils = StorageUtils;

// 輸出增強版本資訊
console.log('🛠️ Utils 工具函數庫已載入 - v3.0.0-enhanced');
console.log('📊 模組統計:', {
    DOM: Object.keys(DOMUtils).length + ' 個方法',
    Data: Object.keys(DataUtils).length + ' 個方法',
    Animation: Object.keys(AnimationUtils).length + ' 個方法',
    Game: Object.keys(GameUtils).length + ' 個方法',
    Device: Object.keys(DeviceUtils).length + ' 個方法',
    Cookie: Object.keys(CookieUtils).length + ' 個方法',
    Storage: Object.keys(StorageUtils).length + ' 個方法'
});