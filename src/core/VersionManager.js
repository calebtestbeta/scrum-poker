/**
 * Scrum Poker 版本管理器
 * 統一管理專案版本資訊和建置詳情
 * @version 3.2.0
 */

class VersionManager {
    static VERSION = '3.2.0';
    static BUILD_DATE = '2025-01-14';
    static BUILD_TYPE = 'production';
    static BUILD_NUMBER = 'bc474aa'; // Git commit hash prefix

    /**
     * 取得完整版本資訊
     * @returns {Object} 版本資訊物件
     */
    static getVersionInfo() {
        return {
            version: this.VERSION,
            buildDate: this.BUILD_DATE,
            buildType: this.BUILD_TYPE,
            buildNumber: this.BUILD_NUMBER,
            userAgent: navigator.userAgent,
            timestamp: Date.now()
        };
    }

    /**
     * 取得簡短版本字串
     * @returns {string} 版本字串
     */
    static getVersionString() {
        return `v${this.VERSION} (${this.BUILD_DATE})`;
    }

    /**
     * 檢查是否為開發模式
     * @returns {boolean} 是否為開發模式
     */
    static isDevelopment() {
        return this.BUILD_TYPE === 'development' || 
               window.location.hostname === 'localhost' ||
               window.location.hostname === '127.0.0.1';
    }

    /**
     * 檢查是否為生產模式
     * @returns {boolean} 是否為生產模式
     */
    static isProduction() {
        return this.BUILD_TYPE === 'production' && !this.isDevelopment();
    }

    /**
     * 在控制台輸出版本資訊
     */
    static logVersionInfo() {
        if (this.isDevelopment()) {
            console.group('🎯 Scrum Poker 版本資訊');
            console.log(`版本: ${this.VERSION}`);
            console.log(`建置日期: ${this.BUILD_DATE}`);
            console.log(`建置類型: ${this.BUILD_TYPE}`);
            console.log(`建置編號: ${this.BUILD_NUMBER}`);
            console.log(`環境: ${this.isDevelopment() ? '開發' : '生產'}`);
            console.groupEnd();
        }
    }

    /**
     * 取得適合顯示的版本字串（給使用者看）
     * @returns {string} 使用者友善的版本字串
     */
    static getDisplayVersion() {
        if (this.isDevelopment()) {
            return `${this.VERSION}-dev`;
        }
        return this.VERSION;
    }
}

// 自動初始化並記錄版本資訊
if (typeof window !== 'undefined') {
    window.VersionManager = VersionManager;
    
    // 在開發模式下自動記錄版本資訊
    if (VersionManager.isDevelopment()) {
        document.addEventListener('DOMContentLoaded', () => {
            VersionManager.logVersionInfo();
        });
    }
}

// 支援 Node.js 環境
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VersionManager;
}