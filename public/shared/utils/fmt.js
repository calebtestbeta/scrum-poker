/**
 * Scrum Poker - 格式化工具
 * 統一處理數字、時間、文字等格式化需求
 */

class FormatUtils {
    /**
     * 格式化投票值顯示
     * @param {*} vote - 投票值
     * @returns {string} 格式化後的顯示文字
     */
    static formatVote(vote) {
        if (vote === null || vote === undefined) {
            return '—';
        }
        
        if (vote === 'coffee') {
            return '☕';
        }
        
        if (vote === 'question' || vote === '?') {
            return '?';
        }
        
        if (typeof vote === 'number' || !isNaN(vote)) {
            return vote.toString();
        }
        
        return vote.toString();
    }
    
    /**
     * 格式化投票狀態顯示
     * @param {*} vote - 投票值
     * @param {boolean} isRevealed - 是否已開牌
     * @returns {string} 狀態顯示文字
     */
    static formatVoteStatus(vote, isRevealed = false) {
        if (vote === null || vote === undefined) {
            return '未投票';
        }
        
        if (!isRevealed) {
            return '已投票';
        }
        
        return `[${this.formatVote(vote)}]`;
    }
    
    /**
     * 格式化玩家數量
     * @param {number} current - 當前數量
     * @param {number} total - 總數量
     * @returns {string} 格式化文字
     */
    static formatPlayerCount(current, total) {
        return `${current}/${total}`;
    }
    
    /**
     * 格式化百分比
     * @param {number} current - 當前值
     * @param {number} total - 總值
     * @param {number} decimals - 小數位數
     * @returns {string} 百分比文字
     */
    static formatPercentage(current, total, decimals = 0) {
        if (total === 0) return '0%';
        
        const percentage = (current / total * 100).toFixed(decimals);
        return `${percentage}%`;
    }
    
    /**
     * 格式化投票進度
     * @param {number} voted - 已投票人數
     * @param {number} total - 總人數
     * @returns {string} 進度顯示文字
     */
    static formatVotingProgress(voted, total) {
        const count = this.formatPlayerCount(voted, total);
        const percent = this.formatPercentage(voted, total, 0);
        return `${count} (${percent})`;
    }
    
    /**
     * 計算並格式化平均分數
     * @param {Array} votes - 投票陣列
     * @param {number} decimals - 小數位數
     * @returns {string} 平均分數
     */
    static formatAverage(votes, decimals = 1) {
        const numericVotes = votes.filter(vote => {
            const num = parseFloat(vote);
            return !isNaN(num) && isFinite(num);
        }).map(vote => parseFloat(vote));
        
        if (numericVotes.length === 0) {
            return '—';
        }
        
        const sum = numericVotes.reduce((acc, vote) => acc + vote, 0);
        const average = sum / numericVotes.length;
        
        return average.toFixed(decimals);
    }
    
    /**
     * 格式化分數範圍
     * @param {Array} votes - 投票陣列
     * @returns {string} 分數範圍文字
     */
    static formatRange(votes) {
        const numericVotes = votes.filter(vote => {
            const num = parseFloat(vote);
            return !isNaN(num) && isFinite(num);
        }).map(vote => parseFloat(vote));
        
        if (numericVotes.length === 0) {
            return '[min=—, max=—]';
        }
        
        const min = Math.min(...numericVotes);
        const max = Math.max(...numericVotes);
        
        return `[min=${min}, max=${max}]`;
    }
    
    /**
     * 格式化時間戳
     * @param {number|Date} timestamp - 時間戳或 Date 物件
     * @param {string} format - 格式 ('time', 'date', 'datetime', 'relative')
     * @returns {string} 格式化時間
     */
    static formatTimestamp(timestamp, format = 'time') {
        const date = typeof timestamp === 'number' ? new Date(timestamp) : timestamp;
        
        if (!(date instanceof Date) || isNaN(date)) {
            return '—';
        }
        
        switch (format) {
            case 'time':
                return date.toLocaleTimeString('zh-TW', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
                
            case 'date':
                return date.toLocaleDateString('zh-TW');
                
            case 'datetime':
                return date.toLocaleString('zh-TW');
                
            case 'relative':
                return this.formatRelativeTime(date);
                
            default:
                return date.toLocaleTimeString('zh-TW');
        }
    }
    
    /**
     * 格式化相對時間
     * @param {Date} date - 日期物件
     * @returns {string} 相對時間文字
     */
    static formatRelativeTime(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffMinutes < 1) {
            return '剛剛';
        } else if (diffMinutes < 60) {
            return `${diffMinutes} 分鐘前`;
        } else if (diffHours < 24) {
            return `${diffHours} 小時前`;
        } else {
            return `${diffDays} 天前`;
        }
    }
    
    /**
     * 格式化房間 ID
     * @param {string} roomId - 房間 ID
     * @param {number} maxLength - 最大長度
     * @returns {string} 格式化的房間 ID
     */
    static formatRoomId(roomId, maxLength = 10) {
        if (!roomId) return '—';
        
        if (roomId.length <= maxLength) {
            return roomId;
        }
        
        return roomId.substring(0, maxLength - 3) + '...';
    }
    
    /**
     * 格式化玩家名稱
     * @param {string} name - 玩家名稱
     * @param {number} maxLength - 最大長度
     * @returns {string} 格式化的玩家名稱
     */
    static formatPlayerName(name, maxLength = 15) {
        if (!name) return 'Anonymous';
        
        if (name.length <= maxLength) {
            return name;
        }
        
        return name.substring(0, maxLength - 3) + '...';
    }
    
    /**
     * 格式化角色顯示
     * @param {string} role - 角色代碼
     * @returns {string} 角色顯示文字
     */
    static formatRole(role) {
        const roleMap = {
            'dev': 'DEV',
            'qa': 'QA',
            'scrum_master': 'SM',
            'po': 'PO',
            'pm': 'PM',
            'designer': 'UI',
            'other': 'Other'
        };
        
        return roleMap[role] || role.toUpperCase();
    }
    
    /**
     * 產生統計摘要文字
     * @param {Array} votes - 投票陣列
     * @returns {Object} 統計摘要物件
     */
    static generateStatsSummary(votes) {
        const total = votes.length;
        const validVotes = votes.filter(v => v !== null && v !== undefined);
        const voted = validVotes.length;
        
        return {
            total: total,
            voted: voted,
            progress: this.formatVotingProgress(voted, total),
            average: this.formatAverage(validVotes),
            range: this.formatRange(validVotes),
            percentage: this.formatPercentage(voted, total)
        };
    }
    
    /**
     * 格式化文件大小
     * @param {number} bytes - 位元組數
     * @returns {string} 格式化的檔案大小
     */
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
    
    /**
     * 安全的 HTML 轉義
     * @param {string} text - 要轉義的文字
     * @returns {string} 轉義後的文字
     */
    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * 截斷文字並添加省略號
     * @param {string} text - 原始文字
     * @param {number} maxLength - 最大長度
     * @param {string} suffix - 後綴 (預設為 '...')
     * @returns {string} 截斷後的文字
     */
    static truncate(text, maxLength, suffix = '...') {
        if (!text || text.length <= maxLength) {
            return text || '';
        }
        
        return text.substring(0, maxLength - suffix.length) + suffix;
    }
    
    /**
     * Debug 用 - 格式化物件為可讀的字串
     * @param {*} obj - 要格式化的物件
     * @param {number} indent - 縮排層級
     * @returns {string} 格式化的字串
     */
    static debugFormat(obj, indent = 2) {
        try {
            return JSON.stringify(obj, null, indent);
        } catch (error) {
            return String(obj);
        }
    }
}

// 全域匯出
window.FormatUtils = FormatUtils;