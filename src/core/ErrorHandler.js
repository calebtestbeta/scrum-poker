/**
 * Scrum Poker 全域錯誤處理器
 * 統一處理 JavaScript 錯誤、Promise 拒絕和網路錯誤
 * @version 3.2.0
 */

class GlobalErrorHandler {
    constructor() {
        this.errorCount = 0;
        this.maxErrors = 10; // 最大錯誤數量限制
        this.errorLog = [];
        this.isInitialized = false;
    }

    /**
     * 初始化全域錯誤處理器
     */
    static init() {
        if (typeof window === 'undefined') return;

        const handler = new GlobalErrorHandler();
        window.globalErrorHandler = handler;

        // 綁定全域錯誤事件
        window.addEventListener('error', (event) => {
            handler.handleJavaScriptError(event);
        });

        // 綁定 Promise 拒絕事件
        window.addEventListener('unhandledrejection', (event) => {
            handler.handlePromiseRejection(event);
        });

        // 綁定資源載入錯誤（可選）
        window.addEventListener('error', (event) => {
            if (event.target !== window) {
                handler.handleResourceError(event);
            }
        }, true);

        handler.isInitialized = true;
        console.log('🛡️ 全域錯誤處理器已初始化');

        return handler;
    }

    /**
     * 處理 JavaScript 執行錯誤
     * @param {ErrorEvent} event 錯誤事件
     */
    handleJavaScriptError(event) {
        const errorInfo = {
            type: 'JavaScript Error',
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            error: event.error,
            stack: event.error?.stack,
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        this.reportError(errorInfo);
    }

    /**
     * 處理未捕獲的 Promise 拒絕
     * @param {PromiseRejectionEvent} event Promise 拒絕事件
     */
    handlePromiseRejection(event) {
        const errorInfo = {
            type: 'Promise Rejection',
            message: event.reason?.message || event.reason || 'Unknown promise rejection',
            stack: event.reason?.stack,
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        this.reportError(errorInfo);

        // 防止瀏覽器預設的 unhandled promise rejection 警告
        event.preventDefault();
    }

    /**
     * 處理資源載入錯誤
     * @param {ErrorEvent} event 錯誤事件
     */
    handleResourceError(event) {
        const target = event.target;
        const errorInfo = {
            type: 'Resource Error',
            message: `Failed to load resource: ${target.src || target.href}`,
            resourceType: target.tagName,
            resourceUrl: target.src || target.href,
            timestamp: Date.now(),
            url: window.location.href
        };

        this.reportError(errorInfo);
    }

    /**
     * 統一錯誤報告處理
     * @param {Object} errorInfo 錯誤資訊
     */
    reportError(errorInfo) {
        // 錯誤計數控制
        this.errorCount++;
        if (this.errorCount > this.maxErrors) {
            console.warn(`🚨 錯誤數量已達上限 (${this.maxErrors})，停止記錄新錯誤`);
            return;
        }

        // 記錄到錯誤日誌
        this.errorLog.push(errorInfo);

        // 控制台輸出
        this.logError(errorInfo);

        // 顯示使用者友善的錯誤提示
        this.showUserNotification(errorInfo);

        // 可選：發送錯誤到監控服務
        this.sendErrorToMonitoring(errorInfo);
    }

    /**
     * 在控制台記錄錯誤
     * @param {Object} errorInfo 錯誤資訊
     */
    logError(errorInfo) {
        console.group(`🚨 ${errorInfo.type}`);
        console.error('錯誤訊息:', errorInfo.message);
        
        if (errorInfo.filename) {
            console.error('檔案位置:', `${errorInfo.filename}:${errorInfo.lineno}:${errorInfo.colno}`);
        }
        
        if (errorInfo.stack) {
            console.error('堆疊追蹤:', errorInfo.stack);
        }
        
        if (errorInfo.resourceUrl) {
            console.error('資源 URL:', errorInfo.resourceUrl);
        }
        
        console.error('時間戳:', new Date(errorInfo.timestamp).toLocaleString());
        console.groupEnd();
    }

    /**
     * 顯示使用者友善的錯誤通知
     * @param {Object} errorInfo 錯誤資訊
     */
    showUserNotification(errorInfo) {
        // 檢查是否有 toast 通知系統可用
        if (typeof window.showToast === 'function') {
            let message = '系統發生了一個錯誤';
            
            if (errorInfo.type === 'Resource Error') {
                message = '載入資源時發生錯誤，部分功能可能無法正常使用';
            } else if (errorInfo.type === 'Promise Rejection') {
                message = '系統處理請求時發生錯誤，請稍後重試';
            }

            window.showToast('error', '系統錯誤', message);
        }

        // 如果沒有 toast 系統，可以考慮其他通知方式
        // 但要避免過於干擾使用者體驗
    }

    /**
     * 發送錯誤到監控服務（預留接口）
     * @param {Object} errorInfo 錯誤資訊
     */
    sendErrorToMonitoring(errorInfo) {
        // 這裡可以整合第三方錯誤監控服務
        // 例如：Sentry, LogRocket, Bugsnag 等
        // 目前先預留接口
        
        if (window.VersionManager?.isDevelopment()) {
            console.log('📊 [開發模式] 錯誤已記錄，未發送到監控服務');
        }
    }

    /**
     * 取得錯誤統計資訊
     * @returns {Object} 錯誤統計
     */
    getErrorStats() {
        const typeCount = {};
        this.errorLog.forEach(error => {
            typeCount[error.type] = (typeCount[error.type] || 0) + 1;
        });

        return {
            totalErrors: this.errorCount,
            errorsByType: typeCount,
            recentErrors: this.errorLog.slice(-5) // 最近 5 個錯誤
        };
    }

    /**
     * 清除錯誤日誌（用於測試或重置）
     */
    clearErrorLog() {
        this.errorLog = [];
        this.errorCount = 0;
        console.log('🧹 錯誤日誌已清除');
    }

    /**
     * 手動報告錯誤（供其他模組使用）
     * @param {string} type 錯誤類型
     * @param {string} message 錯誤訊息
     * @param {Object} extra 額外資訊
     */
    reportCustomError(type, message, extra = {}) {
        const errorInfo = {
            type: type,
            message: message,
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            ...extra
        };

        this.reportError(errorInfo);
    }
}

// 自動初始化（如果在瀏覽器環境中）
if (typeof window !== 'undefined') {
    // 等待 DOM 載入完成後初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            GlobalErrorHandler.init();
        });
    } else {
        GlobalErrorHandler.init();
    }
}

// 支援 Node.js 環境
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GlobalErrorHandler;
}