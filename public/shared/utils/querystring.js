/**
 * Scrum Poker - URL 參數解析工具
 * 統一處理 room, name, role 等 URL 參數
 */

class QueryStringUtils {
    /**
     * 解析當前頁面的 URL 參數
     * @returns {Object} 包含 room, name, role 等參數的物件
     */
    static parseParams() {
        const urlParams = new URLSearchParams(window.location.search);
        
        return {
            room: urlParams.get('room') || 'Demo',
            name: urlParams.get('name') || 'Guest',
            role: urlParams.get('role') || 'dev',
            mode: urlParams.get('mode') || null // 強制模式 (desktop/mobile)
        };
    }
    
    /**
     * 取得單一參數值
     * @param {string} key - 參數名稱
     * @param {string} defaultValue - 預設值
     * @returns {string} 參數值
     */
    static getParam(key, defaultValue = '') {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(key) || defaultValue;
    }
    
    /**
     * 取得所有 URL 參數的字串表示
     * @returns {string} 完整的 query string (不含 ?)
     */
    static getQueryString() {
        return window.location.search.substring(1);
    }
    
    /**
     * 建立帶參數的 URL
     * @param {string} basePath - 基礎路徑
     * @param {Object} params - 參數物件
     * @returns {string} 完整的 URL
     */
    static buildUrl(basePath, params = {}) {
        const url = new URL(basePath, window.location.origin);
        
        Object.entries(params).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
                url.searchParams.set(key, value);
            }
        });
        
        return url.toString();
    }
    
    /**
     * 更新當前頁面的 URL 參數 (不重新載入頁面)
     * @param {Object} newParams - 要更新的參數
     */
    static updateParams(newParams) {
        const url = new URL(window.location);
        
        Object.entries(newParams).forEach(([key, value]) => {
            if (value === null || value === undefined || value === '') {
                url.searchParams.delete(key);
            } else {
                url.searchParams.set(key, value);
            }
        });
        
        // 使用 replaceState 更新 URL 不重新載入頁面
        window.history.replaceState({}, '', url);
    }
    
    /**
     * 清理參數 - 移除空白、特殊字符等
     * @param {Object} params - 要清理的參數物件
     * @returns {Object} 清理後的參數物件
     */
    static sanitizeParams(params) {
        const sanitized = {};
        
        Object.entries(params).forEach(([key, value]) => {
            if (typeof value === 'string') {
                // 移除前後空白
                let cleanValue = value.trim();
                
                // 移除潛在的惡意字符
                cleanValue = cleanValue
                    .replace(/[<>"'&]/g, '') // HTML 字符
                    .replace(/javascript:/gi, '') // JavaScript 協議
                    .replace(/[^\w\u4e00-\u9fff\s_-]/g, ''); // 只允許字母、數字、中文、空格、底線、連字符
                
                // 長度限制
                if (cleanValue.length > 50) {
                    cleanValue = cleanValue.substring(0, 50);
                }
                
                sanitized[key] = cleanValue;
            } else {
                sanitized[key] = value;
            }
        });
        
        return sanitized;
    }
    
    /**
     * 驗證必要參數
     * @param {Object} params - 參數物件
     * @param {Array} requiredParams - 必要參數名稱陣列
     * @returns {Object} { valid: boolean, missing: Array }
     */
    static validateParams(params, requiredParams = ['room', 'name']) {
        const missing = [];
        
        requiredParams.forEach(param => {
            if (!params[param] || params[param].trim() === '') {
                missing.push(param);
            }
        });
        
        return {
            valid: missing.length === 0,
            missing: missing
        };
    }
    
    /**
     * 取得角色的顯示名稱
     * @param {string} role - 角色代碼
     * @returns {string} 角色顯示名稱
     */
    static getRoleDisplayName(role) {
        const roleNames = {
            'dev': '開發者',
            'qa': '測試人員',
            'scrum_master': 'Scrum Master',
            'po': 'Product Owner',
            'pm': '專案經理',
            'designer': '設計師',
            'other': '其他'
        };
        
        return roleNames[role] || role;
    }
    
    /**
     * 檢查角色是否有管理權限
     * @param {string} role - 角色代碼
     * @returns {boolean} 是否有管理權限
     */
    static hasManagementRole(role) {
        return ['scrum_master', 'po', 'pm'].includes(role);
    }
    
    /**
     * 產生分享連結
     * @param {Object} params - 當前參數
     * @param {string} targetPath - 目標路徑 (可選)
     * @returns {string} 分享連結
     */
    static generateShareLink(params, targetPath = '/public/redirect.html') {
        // 只包含房間資訊，不包含個人資訊
        const shareParams = {
            room: params.room
        };
        
        return this.buildUrl(targetPath, shareParams);
    }
    
    /**
     * 解析邀請連結並補充使用者資訊
     * @param {string} inviteUrl - 邀請連結
     * @param {Object} userInfo - 使用者資訊 { name, role }
     * @returns {string} 完整的遊戲連結
     */
    static buildGameLink(inviteUrl, userInfo) {
        const url = new URL(inviteUrl);
        const room = url.searchParams.get('room');
        
        return this.buildUrl('/public/redirect.html', {
            room: room,
            name: userInfo.name,
            role: userInfo.role
        });
    }
    
    /**
     * Debug 用 - 輸出當前所有參數
     */
    static debug() {
        const params = this.parseParams();
        const sanitized = this.sanitizeParams(params);
        const validation = this.validateParams(params);
        
        console.group('🔍 QueryString Debug');
        console.log('原始參數:', params);
        console.log('清理後參數:', sanitized);
        console.log('驗證結果:', validation);
        console.log('查詢字串:', this.getQueryString());
        console.log('分享連結:', this.generateShareLink(params));
        console.groupEnd();
        
        return {
            raw: params,
            sanitized: sanitized,
            validation: validation
        };
    }
}

// 全域匯出
window.QueryStringUtils = QueryStringUtils;