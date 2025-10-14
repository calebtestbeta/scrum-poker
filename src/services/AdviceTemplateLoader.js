/**
 * AdviceTemplateLoader - 建議模板動態載入器
 * 負責從外部 JSON 檔案載入建議模板，分離內容與程式邏輯
 * @version 1.0.0
 */

class AdviceTemplateLoader {
    constructor() {
        this.version = '1.0.0';
        this.loadedTemplates = new Map();
        this.loadingPromises = new Map();
        
        // 支援的建議類型對應檔案
        this.supportedCategories = {
            'frontend': 'frontend.json',
            'backend': 'backend.json',
            'testing': 'testing.json',
            'manual_testing': 'manual_testing.json',
            'automation_testing': 'automation_testing.json',
            'study': 'study.json',
            'mobile': 'mobile.json',
            'mobile_app': 'mobile.json', // 別名
            'design': 'design.json',
            'ui_ux': 'design.json', // 別名
            'devops': 'devops.json',
            'general': 'general.json'
        };
        
        console.log('📂 AdviceTemplateLoader v' + this.version + ' 已初始化');
    }
    
    /**
     * 載入指定類別的建議模板
     * @param {string} category - 建議類別
     * @returns {Promise<Object>} 建議模板物件
     */
    async loadTemplate(category) {
        try {
            // 正規化類別名稱
            const normalizedCategory = this.normalizeCategory(category);
            
            // 檢查是否已載入
            if (this.loadedTemplates.has(normalizedCategory)) {
                console.log(`📋 使用快取的建議模板: ${normalizedCategory}`);
                return this.loadedTemplates.get(normalizedCategory);
            }
            
            // 檢查是否正在載入中
            if (this.loadingPromises.has(normalizedCategory)) {
                console.log(`⏳ 等待載入中的建議模板: ${normalizedCategory}`);
                return await this.loadingPromises.get(normalizedCategory);
            }
            
            // 開始載入
            const loadingPromise = this.fetchTemplate(normalizedCategory);
            this.loadingPromises.set(normalizedCategory, loadingPromise);
            
            const template = await loadingPromise;
            
            // 快取結果
            this.loadedTemplates.set(normalizedCategory, template);
            this.loadingPromises.delete(normalizedCategory);
            
            console.log(`✅ 建議模板載入成功: ${normalizedCategory}`);
            return template;
            
        } catch (error) {
            console.error(`❌ 載入建議模板失敗 (${category}):`, error);
            this.loadingPromises.delete(category);
            
            // 降級到通用建議
            if (category !== 'general') {
                console.log(`🔄 降級使用通用建議模板`);
                return await this.loadTemplate('general');
            }
            
            // 如果連通用建議都載入失敗，返回預設建議
            return this.getDefaultTemplate();
        }
    }
    
    /**
     * 載入所有支援的建議模板
     * @returns {Promise<Map>} 所有載入的模板
     */
    async loadAllTemplates() {
        console.log('📚 開始載入所有建議模板...');
        
        const loadPromises = Object.keys(this.supportedCategories).map(async (category) => {
            try {
                const template = await this.loadTemplate(category);
                return { category, template, success: true };
            } catch (error) {
                console.warn(`⚠️ 載入 ${category} 模板失敗:`, error);
                return { category, template: null, success: false, error };
            }
        });
        
        const results = await Promise.allSettled(loadPromises);
        const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
        
        console.log(`📚 建議模板載入完成: ${successCount}/${results.length} 個成功`);
        return this.loadedTemplates;
    }
    
    /**
     * 從檔案系統獲取模板
     * @param {string} category - 正規化的類別名稱
     * @returns {Promise<Object>} 模板物件
     */
    async fetchTemplate(category) {
        const filename = this.supportedCategories[category];
        if (!filename) {
            throw new Error(`不支援的建議類別: ${category}`);
        }
        
        const url = `/src/data/advice/${filename}`;
        console.log(`📡 正在載入: ${url}`);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // 驗證模板格式
        this.validateTemplate(data, category);
        
        return data;
    }
    
    /**
     * 正規化類別名稱
     * @param {string} category - 原始類別名稱
     * @returns {string} 正規化後的類別名稱
     */
    normalizeCategory(category) {
        if (!category || typeof category !== 'string') {
            return 'general';
        }
        
        const normalized = category.toLowerCase().trim();
        
        // 處理別名
        if (normalized === 'ui_ux') return 'design';
        if (normalized === 'mobile_app') return 'mobile';
        if (normalized === 'qa') return 'testing';
        
        // 檢查是否為支援的類別
        if (this.supportedCategories[normalized]) {
            return normalized;
        }
        
        // 模糊匹配
        const fuzzyMatch = this.fuzzyMatchCategory(normalized);
        if (fuzzyMatch) {
            console.log(`🔍 模糊匹配: ${category} → ${fuzzyMatch}`);
            return fuzzyMatch;
        }
        
        // 預設返回通用類別
        console.log(`🎯 使用預設類別: ${category} → general`);
        return 'general';
    }
    
    /**
     * 模糊匹配類別名稱
     * @param {string} category - 類別名稱
     * @returns {string|null} 匹配的類別或 null
     */
    fuzzyMatchCategory(category) {
        const mappings = {
            'front': 'frontend',
            'front-end': 'frontend',
            'back': 'backend',
            'back-end': 'backend',
            'test': 'testing',
            'manual': 'manual_testing',
            'automation': 'automation_testing',
            'auto': 'automation_testing',
            'learn': 'study',
            'research': 'study',
            'mobile': 'mobile',
            'app': 'mobile',
            'ui': 'design',
            'ux': 'design',
            'ops': 'devops',
            'deploy': 'devops'
        };
        
        for (const [key, value] of Object.entries(mappings)) {
            if (category.includes(key)) {
                return value;
            }
        }
        
        return null;
    }
    
    /**
     * 驗證模板格式
     * @param {Object} template - 模板物件
     * @param {string} category - 類別名稱
     */
    validateTemplate(template, category) {
        if (!template || typeof template !== 'object') {
            throw new Error(`模板格式錯誤: 不是有效的物件`);
        }
        
        // 檢查必要欄位
        const requiredFields = ['category', 'displayName', 'templates'];
        for (const field of requiredFields) {
            if (!template[field]) {
                throw new Error(`模板格式錯誤: 缺少必要欄位 ${field}`);
            }
        }
        
        // 檢查模板結構
        const templates = template.templates;
        const requiredTemplateTypes = ['highVariance', 'lowVariance', 'highEstimate', 'lowEstimate'];
        
        for (const templateType of requiredTemplateTypes) {
            if (!templates[templateType]) {
                console.warn(`⚠️ 模板 ${category} 缺少 ${templateType} 類型`);
                continue;
            }
            
            const tmpl = templates[templateType];
            if (!tmpl.title || !tmpl.content) {
                throw new Error(`模板格式錯誤: ${templateType} 缺少 title 或 content`);
            }
        }
        
        console.log(`✅ 模板 ${category} 格式驗證通過`);
    }
    
    /**
     * 取得預設模板（當所有載入都失敗時使用）
     * @returns {Object} 預設模板
     */
    getDefaultTemplate() {
        return {
            category: 'general',
            displayName: '預設建議',
            icon: '🤖',
            description: '當無法載入外部建議時的預設建議',
            templates: {
                highVariance: {
                    title: '🤔 團隊需要技術對焦',
                    content: '估點分歧較大，建議進行技術討論：\n• 釐清需求和驗收條件\n• 識別技術風險和依賴\n• 評估資源和時間限制\n• 考慮替代方案和降級策略',
                    keywords: ['需求釐清', '技術風險', '資源評估', '替代方案']
                },
                lowVariance: {
                    title: '🎯 團隊估點高度一致',
                    content: '很好！團隊對任務複雜度有共識：\n• 確保需求文件完整\n• 建立明確的完成定義\n• 設定適當的品質門檻\n• 規劃合理的測試策略',
                    keywords: ['需求文件', '完成定義', '品質門檻', '測試策略']
                },
                highEstimate: {
                    title: '⚡ 高複雜度任務來襲',
                    content: '這是個有挑戰性的任務！建議：\n• 分解成更小的可管理單元\n• 識別關鍵路徑和依賴關係\n• 預留緩衝時間處理未知問題\n• 建立風險應對預案',
                    keywords: ['任務分解', '關鍵路徑', '緩衝時間', '風險預案']
                },
                lowEstimate: {
                    title: '🚀 輕量級任務，衝刺模式',
                    content: '看起來是個相對簡單的任務：\n• 確認是否有遺漏的複雜度\n• 保持程式碼品質標準\n• 考慮未來擴展需求\n• 適當投入時間做好文件',
                    keywords: ['複雜度確認', '程式碼品質', '擴展需求', '文件撰寫']
                }
            },
            technologies: ['通用開發工具'],
            commonChallenges: ['需求理解', '技術選型', '團隊協作']
        };
    }
    
    /**
     * 清除快取
     */
    clearCache() {
        this.loadedTemplates.clear();
        this.loadingPromises.clear();
        console.log('🧹 建議模板快取已清除');
    }
    
    /**
     * 取得載入狀態資訊
     * @returns {Object} 狀態資訊
     */
    getStatus() {
        return {
            version: this.version,
            supportedCategories: Object.keys(this.supportedCategories),
            loadedTemplates: Array.from(this.loadedTemplates.keys()),
            loadingInProgress: Array.from(this.loadingPromises.keys()),
            cacheSize: this.loadedTemplates.size
        };
    }
}

// 匯出到全域
window.AdviceTemplateLoader = AdviceTemplateLoader;

console.log('📂 AdviceTemplateLoader 模組已載入');