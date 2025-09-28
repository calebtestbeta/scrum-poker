// Cookie 管理器 - 安全地處理使用者資訊的儲存和讀取
class CookieManager {
    constructor() {
        // Cookie 配置
        this.config = {
            cookieName: 'scrum_poker_user',
            expireDays: 30, // 30 天過期
            sameSite: 'Strict', // 防止 CSRF 攻擊
            secure: location.protocol === 'https:', // HTTPS 環境下啟用 Secure 標誌
            path: '/' // Cookie 可用路徑
        };
        
        // 資料結構版本，用於向後相容性
        this.dataVersion = '1.0';
    }
    
    /**
     * 設定 Cookie 值
     * @param {string} name Cookie 名稱
     * @param {string} value Cookie 值
     * @param {number} days 過期天數
     */
    setCookie(name, value, days = this.config.expireDays) {
        try {
            const expires = new Date();
            expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
            
            // 構建 Cookie 字串
            let cookieString = `${name}=${encodeURIComponent(value)}`;
            cookieString += `; expires=${expires.toUTCString()}`;
            cookieString += `; path=${this.config.path}`;
            cookieString += `; SameSite=${this.config.sameSite}`;
            
            // 在 HTTPS 環境下添加 Secure 標誌
            if (this.config.secure) {
                cookieString += '; Secure';
            }
            
            document.cookie = cookieString;
            console.log(`🍪 Cookie 已設定: ${name}`);
            return true;
        } catch (error) {
            console.error('設定 Cookie 失敗:', error);
            return false;
        }
    }
    
    /**
     * 讀取 Cookie 值
     * @param {string} name Cookie 名稱
     * @returns {string|null} Cookie 值或 null
     */
    getCookie(name) {
        try {
            const nameEQ = name + "=";
            const cookies = document.cookie.split(';');
            
            for (let cookie of cookies) {
                cookie = cookie.trim();
                if (cookie.indexOf(nameEQ) === 0) {
                    const value = cookie.substring(nameEQ.length);
                    return decodeURIComponent(value);
                }
            }
            return null;
        } catch (error) {
            console.error('讀取 Cookie 失敗:', error);
            return null;
        }
    }
    
    /**
     * 刪除 Cookie
     * @param {string} name Cookie 名稱
     */
    deleteCookie(name) {
        try {
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${this.config.path}; SameSite=${this.config.sameSite}`;
            console.log(`🗑️ Cookie 已刪除: ${name}`);
            return true;
        } catch (error) {
            console.error('刪除 Cookie 失敗:', error);
            return false;
        }
    }
    
    /**
     * 儲存使用者資訊到 Cookie
     * @param {Object} userInfo 使用者資訊
     * @param {string} userInfo.name 使用者名稱
     * @param {string} userInfo.role 使用者角色
     */
    saveUserInfo(userInfo) {
        try {
            // 驗證輸入資料
            if (!this.validateUserInfo(userInfo)) {
                throw new Error('無效的使用者資訊');
            }
            
            // 建立儲存物件
            const userData = {
                version: this.dataVersion,
                name: this.sanitizeString(userInfo.name),
                role: userInfo.role,
                savedAt: new Date().toISOString(),
                lastUsed: new Date().toISOString()
            };
            
            // 轉換為 JSON 並儲存
            const jsonData = JSON.stringify(userData);
            const success = this.setCookie(this.config.cookieName, jsonData);
            
            if (success) {
                console.log(`✅ 使用者資訊已儲存: ${userData.name} (${userData.role})`);
                return true;
            } else {
                throw new Error('Cookie 儲存失敗');
            }
        } catch (error) {
            console.error('儲存使用者資訊失敗:', error);
            return false;
        }
    }
    
    /**
     * 從 Cookie 讀取使用者資訊
     * @returns {Object|null} 使用者資訊或 null
     */
    getUserInfo() {
        try {
            const cookieValue = this.getCookie(this.config.cookieName);
            if (!cookieValue) {
                console.log('🔍 未找到儲存的使用者資訊');
                return null;
            }
            
            // 解析 JSON 資料
            const userData = JSON.parse(cookieValue);
            
            // 驗證資料結構
            if (!this.validateStoredUserData(userData)) {
                console.warn('⚠️ 儲存的使用者資料格式無效，清除 Cookie');
                this.clearUserInfo();
                return null;
            }
            
            // 檢查資料是否過期（額外的過期檢查）
            if (this.isDataExpired(userData)) {
                console.log('⏰ 使用者資料已過期，清除 Cookie');
                this.clearUserInfo();
                return null;
            }
            
            // 更新最後使用時間
            userData.lastUsed = new Date().toISOString();
            this.setCookie(this.config.cookieName, JSON.stringify(userData));
            
            console.log(`🔓 已讀取使用者資訊: ${userData.name} (${userData.role})`);
            return {
                name: userData.name,
                role: userData.role,
                savedAt: userData.savedAt,
                lastUsed: userData.lastUsed
            };
        } catch (error) {
            console.error('讀取使用者資訊失敗:', error);
            this.clearUserInfo(); // 清除損壞的 Cookie
            return null;
        }
    }
    
    /**
     * 清除使用者資訊 Cookie
     */
    clearUserInfo() {
        this.deleteCookie(this.config.cookieName);
        console.log('🧹 使用者資訊 Cookie 已清除');
    }
    
    /**
     * 驗證使用者資訊格式
     * @param {Object} userInfo 使用者資訊
     * @returns {boolean} 是否有效
     */
    validateUserInfo(userInfo) {
        if (!userInfo || typeof userInfo !== 'object') {
            return false;
        }
        
        // 檢查必要欄位
        if (!userInfo.name || typeof userInfo.name !== 'string') {
            return false;
        }
        
        if (!userInfo.role || typeof userInfo.role !== 'string') {
            return false;
        }
        
        // 檢查名稱長度（1-50 字元）
        if (userInfo.name.trim().length === 0 || userInfo.name.length > 50) {
            return false;
        }
        
        // 檢查角色是否為有效值
        const validRoles = ['dev', 'qa', 'scrum_master', 'po', 'other'];
        if (!validRoles.includes(userInfo.role)) {
            return false;
        }
        
        return true;
    }
    
    /**
     * 驗證儲存的使用者資料格式
     * @param {Object} userData 儲存的使用者資料
     * @returns {boolean} 是否有效
     */
    validateStoredUserData(userData) {
        if (!userData || typeof userData !== 'object') {
            return false;
        }
        
        // 檢查必要欄位
        const requiredFields = ['version', 'name', 'role', 'savedAt'];
        for (const field of requiredFields) {
            if (!userData[field]) {
                return false;
            }
        }
        
        // 檢查版本相容性
        if (userData.version !== this.dataVersion) {
            console.log(`📦 資料版本不符: ${userData.version} != ${this.dataVersion}`);
            return false;
        }
        
        return this.validateUserInfo({
            name: userData.name,
            role: userData.role
        });
    }
    
    /**
     * 檢查資料是否過期
     * @param {Object} userData 使用者資料
     * @returns {boolean} 是否過期
     */
    isDataExpired(userData) {
        if (!userData.savedAt) {
            return true;
        }
        
        try {
            const savedDate = new Date(userData.savedAt);
            const now = new Date();
            const daysDiff = (now - savedDate) / (1000 * 60 * 60 * 24);
            
            return daysDiff > this.config.expireDays;
        } catch (error) {
            console.error('檢查過期時間失敗:', error);
            return true;
        }
    }
    
    /**
     * 清理字串，防止 XSS 攻擊
     * @param {string} str 輸入字串
     * @returns {string} 清理後的字串
     */
    sanitizeString(str) {
        if (typeof str !== 'string') {
            return '';
        }
        
        // 移除 HTML 標籤和特殊字元
        return str
            .trim()
            .replace(/[<>\"'&]/g, '') // 移除可能的 HTML 字元
            .substring(0, 50); // 限制長度
    }
    
    /**
     * 取得 Cookie 管理狀態資訊
     * @returns {Object} 狀態資訊
     */
    getStatus() {
        const userInfo = this.getUserInfo();
        return {
            hasUserInfo: !!userInfo,
            userInfo: userInfo,
            cookieEnabled: this.isCookieEnabled(),
            secureMode: this.config.secure,
            sameSite: this.config.sameSite
        };
    }
    
    /**
     * 檢查瀏覽器是否支援 Cookie
     * @returns {boolean} 是否支援
     */
    isCookieEnabled() {
        try {
            // 測試設定和讀取 Cookie
            const testName = 'cookie_test';
            const testValue = 'test';
            
            document.cookie = `${testName}=${testValue}; path=/; SameSite=Strict`;
            const result = document.cookie.indexOf(`${testName}=${testValue}`) !== -1;
            
            // 清除測試 Cookie
            document.cookie = `${testName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
            
            return result;
        } catch (error) {
            return false;
        }
    }
    
    /**
     * 匯出使用者資料（用於偵錯）
     * @returns {Object} 匯出資料
     */
    exportUserData() {
        const cookieValue = this.getCookie(this.config.cookieName);
        if (!cookieValue) {
            return null;
        }
        
        try {
            return JSON.parse(cookieValue);
        } catch (error) {
            return null;
        }
    }
    
    // ========== 遊戲會話管理功能 ==========
    
    /**
     * 儲存遊戲會話資訊到 Cookie
     * @param {Object} sessionData 會話資料
     * @param {string} sessionData.playerId 玩家ID
     * @param {string} sessionData.roomId 房間ID
     * @param {string} sessionData.playerName 玩家名稱
     * @param {string} sessionData.playerRole 玩家角色
     * @returns {boolean} 是否儲存成功
     */
    saveGameSession(sessionData) {
        try {
            // 驗證會話資料
            if (!this.validateGameSession(sessionData)) {
                console.error('❌ 無效的遊戲會話資料');
                return false;
            }
            
            // 建立會話物件
            const gameSession = {
                version: '1.0',
                playerId: sessionData.playerId,
                roomId: this.sanitizeString(sessionData.roomId),
                playerName: this.sanitizeString(sessionData.playerName),
                playerRole: sessionData.playerRole,
                joinedAt: new Date().toISOString(),
                lastActive: new Date().toISOString()
            };
            
            // 儲存到 Cookie，設定較短的過期時間（2小時）
            const sessionCookieName = 'scrum_poker_session';
            const jsonData = JSON.stringify(gameSession);
            const success = this.setCookie(sessionCookieName, jsonData, 0.083); // 2小時 = 0.083天
            
            if (success) {
                console.log(`💾 遊戲會話已儲存: 房間 ${sessionData.roomId}, 玩家 ${sessionData.playerName}`);
                return true;
            } else {
                throw new Error('Cookie 儲存失敗');
            }
        } catch (error) {
            console.error('儲存遊戲會話失敗:', error);
            return false;
        }
    }
    
    /**
     * 從 Cookie 讀取遊戲會話資訊
     * @returns {Object|null} 會話資料或 null
     */
    getGameSession() {
        try {
            const sessionCookieName = 'scrum_poker_session';
            const cookieValue = this.getCookie(sessionCookieName);
            
            if (!cookieValue) {
                console.log('🔍 未找到遊戲會話');
                return null;
            }
            
            // 解析會話資料
            const sessionData = JSON.parse(cookieValue);
            
            // 驗證會話資料結構
            if (!this.validateStoredGameSession(sessionData)) {
                console.warn('⚠️ 儲存的會話資料格式無效，清除會話');
                this.clearGameSession();
                return null;
            }
            
            // 檢查會話是否過期（2小時內有效）
            if (this.isGameSessionExpired(sessionData)) {
                console.log('⏰ 遊戲會話已過期，清除會話');
                this.clearGameSession();
                return null;
            }
            
            console.log(`🔓 已讀取遊戲會話: 房間 ${sessionData.roomId}, 玩家 ${sessionData.playerName}`);
            return sessionData;
        } catch (error) {
            console.error('讀取遊戲會話失敗:', error);
            this.clearGameSession(); // 清除損壞的會話
            return null;
        }
    }
    
    /**
     * 更新遊戲會話的最後活躍時間
     * @returns {boolean} 是否更新成功
     */
    updateGameSessionActivity() {
        try {
            const currentSession = this.getGameSession();
            if (!currentSession) {
                return false;
            }
            
            // 更新最後活躍時間
            currentSession.lastActive = new Date().toISOString();
            
            // 重新儲存會話
            const sessionCookieName = 'scrum_poker_session';
            const jsonData = JSON.stringify(currentSession);
            const success = this.setCookie(sessionCookieName, jsonData, 0.083); // 2小時
            
            if (success) {
                console.log('🔄 遊戲會話活躍時間已更新');
                return true;
            }
        } catch (error) {
            console.error('更新會話活躍時間失敗:', error);
        }
        return false;
    }
    
    /**
     * 清除遊戲會話 Cookie
     */
    clearGameSession() {
        const sessionCookieName = 'scrum_poker_session';
        this.deleteCookie(sessionCookieName);
        console.log('🧹 遊戲會話已清除');
    }
    
    /**
     * 檢查是否有有效的遊戲會話
     * @returns {boolean} 是否有有效會話
     */
    hasActiveGameSession() {
        return this.getGameSession() !== null;
    }
    
    /**
     * 驗證遊戲會話資料格式
     * @param {Object} sessionData 會話資料
     * @returns {boolean} 是否有效
     */
    validateGameSession(sessionData) {
        if (!sessionData || typeof sessionData !== 'object') {
            return false;
        }
        
        // 檢查必要欄位
        const requiredFields = ['playerId', 'roomId', 'playerName', 'playerRole'];
        for (const field of requiredFields) {
            if (!sessionData[field] || typeof sessionData[field] !== 'string') {
                return false;
            }
        }
        
        // 檢查名稱和房間ID長度
        if (sessionData.playerName.trim().length === 0 || sessionData.playerName.length > 50) {
            return false;
        }
        
        if (sessionData.roomId.trim().length === 0 || sessionData.roomId.length > 20) {
            return false;
        }
        
        // 檢查角色是否為有效值
        const validRoles = ['dev', 'qa', 'scrum_master', 'po', 'other'];
        if (!validRoles.includes(sessionData.playerRole)) {
            return false;
        }
        
        return true;
    }
    
    /**
     * 驗證儲存的會話資料格式
     * @param {Object} sessionData 儲存的會話資料
     * @returns {boolean} 是否有效
     */
    validateStoredGameSession(sessionData) {
        if (!sessionData || typeof sessionData !== 'object') {
            return false;
        }
        
        // 檢查必要欄位
        const requiredFields = ['version', 'playerId', 'roomId', 'playerName', 'playerRole', 'joinedAt', 'lastActive'];
        for (const field of requiredFields) {
            if (!sessionData[field]) {
                return false;
            }
        }
        
        // 檢查版本相容性
        if (sessionData.version !== '1.0') {
            console.log(`📦 會話版本不符: ${sessionData.version} != 1.0`);
            return false;
        }
        
        return this.validateGameSession({
            playerId: sessionData.playerId,
            roomId: sessionData.roomId,
            playerName: sessionData.playerName,
            playerRole: sessionData.playerRole
        });
    }
    
    /**
     * 檢查遊戲會話是否過期
     * @param {Object} sessionData 會話資料
     * @returns {boolean} 是否過期
     */
    isGameSessionExpired(sessionData) {
        if (!sessionData.lastActive) {
            return true;
        }
        
        try {
            const lastActiveDate = new Date(sessionData.lastActive);
            const now = new Date();
            const hoursDiff = (now - lastActiveDate) / (1000 * 60 * 60);
            
            // 2小時內有效
            return hoursDiff > 2;
        } catch (error) {
            console.error('檢查會話過期時間失敗:', error);
            return true;
        }
    }
}

// 建立全域實例
window.cookieManager = new CookieManager();

// 匯出供其他模組使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CookieManager;
}

console.log('🍪 Cookie 管理器已初始化');