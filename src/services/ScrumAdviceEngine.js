/**
 * ScrumAdviceEngine - 智慧估點建議引擎
 * 在投票揭曉後提供幽默但實用的技術建議
 * @version 1.0.0-phase1
 */

/**
 * Scrum 建議引擎類別
 */
class ScrumAdviceEngine {
    constructor() {
        this.version = '1.0.0-phase1';
        this.initialized = false;
        
        // 建議模板資料庫
        this.adviceTemplates = this.initializeAdviceTemplates();
        
        // 統計分析閾值
        this.thresholds = {
            highVariance: 0.7,      // 高分散度閾值
            lowVariance: 0.2,       // 低分散度閾值
            highAverage: 13,        // 高平均值閾值
            lowAverage: 3,          // 低平均值閾值
            strongConsensus: 80,    // 強共識閾值 (%)
            weakConsensus: 40       // 弱共識閾值 (%)
        };
        
        this.initialized = true;
        console.log('🧠 ScrumAdviceEngine v' + this.version + ' 已初始化');
    }
    
    /**
     * 初始化建議模板資料庫
     * @returns {Object} 分類建議模板
     */
    initializeAdviceTemplates() {
        return {
            // 前端開發建議
            frontend: {
                highVariance: {
                    title: "🎨 前端複雜度見解分歧",
                    content: "團隊對前端任務複雜度看法差異較大。建議：\n• 前端架構師分享技術細節\n• 考慮 UI/UX 複雜度vs實作難度\n• 評估第三方套件整合需求\n• 討論瀏覽器相容性要求",
                    keywords: ["前端架構", "UI/UX", "瀏覽器相容性", "套件整合"]
                },
                lowVariance: {
                    title: "💻 前端團隊步調一致",
                    content: "太好了！前端團隊對複雜度有共識。記得：\n• 保持程式碼風格統一\n• 重複使用現有元件\n• 注意響應式設計細節\n• 別忘了無障礙設計 (a11y)",
                    keywords: ["程式碼風格", "元件重用", "響應式設計", "無障礙設計"]
                },
                highEstimate: {
                    title: "🔥 前端挑戰等級：地獄模式",
                    content: "這個前端任務看起來不簡單！建議：\n• 分解成更小的子任務\n• 建立原型驗證可行性\n• 預留時間處理跨瀏覽器問題\n• 考慮使用成熟的 UI 框架",
                    keywords: ["任務分解", "原型驗證", "跨瀏覽器", "UI框架"]
                },
                lowEstimate: {
                    title: "⚡ 前端快速通關",
                    content: "看起來是個輕鬆的前端任務！不過別大意：\n• 確認設計稿完整無誤\n• 檢查是否有隱藏的互動邏輯\n• 測試不同裝置的顯示效果\n• 記得做基本的效能優化",
                    keywords: ["設計稿確認", "互動邏輯", "多裝置測試", "效能優化"]
                }
            },
            
            // 後端開發建議
            backend: {
                highVariance: {
                    title: "⚙️ 後端架構討論時間",
                    content: "後端複雜度評估分歧，需要技術討論：\n• 資料庫設計是否合理\n• API 設計複雜度評估\n• 第三方服務整合難度\n• 效能和擴展性考量",
                    keywords: ["資料庫設計", "API設計", "第三方整合", "效能擴展"]
                },
                lowVariance: {
                    title: "🛠️ 後端團隊心有靈犀",
                    content: "後端團隊評估一致，很棒！記得：\n• 遵循 RESTful API 設計原則\n• 確保適當的錯誤處理\n• 考慮資料驗證和安全性\n• 撰寫充分的單元測試",
                    keywords: ["RESTful API", "錯誤處理", "資料安全", "單元測試"]
                },
                highEstimate: {
                    title: "🚀 後端火箭科學等級",
                    content: "這個後端任務相當有挑戰性！建議：\n• 詳細設計資料庫 schema\n• 考慮使用快取機制\n• 預先規劃 API 版本控制\n• 設計適當的監控和日誌",
                    keywords: ["資料庫設計", "快取機制", "API版本控制", "監控日誌"]
                },
                lowEstimate: {
                    title: "⚡ 後端輕量級任務",
                    content: "看起來是個簡單的後端任務！仍需注意：\n• 確保資料驗證完整\n• 考慮併發處理情況\n• 撰寫基本的整合測試\n• 檢查安全性最佳實務",
                    keywords: ["資料驗證", "併發處理", "整合測試", "安全實務"]
                }
            },
            
            // 測試相關建議
            testing: {
                highVariance: {
                    title: "🧪 測試策略需要對焦",
                    content: "測試複雜度評估差異較大，建議討論：\n• 測試範圍和深度規劃\n• 自動化測試 vs 手動測試比例\n• 測試環境設定複雜度\n• 測試資料準備工作量",
                    keywords: ["測試範圍", "自動化測試", "測試環境", "測試資料"]
                },
                lowVariance: {
                    title: "✅ 測試團隊目標明確",
                    content: "測試評估一致，測試策略清晰！記得：\n• 優先撰寫關鍵路徑測試\n• 確保測試覆蓋率適當\n• 建立可維護的測試程式碼\n• 設定持續整合流程",
                    keywords: ["關鍵路徑", "測試覆蓋率", "可維護性", "持續整合"]
                },
                highEstimate: {
                    title: "🎯 測試任務：精密模式",
                    content: "這個測試任務需要細心規劃！建議：\n• 建立完整的測試計畫\n• 設計邊界條件和異常情況測試\n• 考慮效能和負載測試\n• 準備充分的測試資料集",
                    keywords: ["測試計畫", "邊界測試", "效能測試", "測試資料"]
                },
                lowEstimate: {
                    title: "🚀 測試任務：快速驗證",
                    content: "輕量級測試任務，但品質不打折：\n• 專注於核心功能驗證\n• 確保基本的煙霧測試\n• 檢查錯誤處理路徑\n• 驗證使用者介面互動",
                    keywords: ["核心功能", "煙霧測試", "錯誤處理", "UI互動"]
                }
            },
            
            // 通用建議（當沒有特定 taskType 時使用）
            general: {
                highVariance: {
                    title: "🤔 團隊需要技術對焦",
                    content: "估點分歧較大，建議進行技術討論：\n• 釐清需求和驗收條件\n• 識別技術風險和依賴\n• 評估資源和時間限制\n• 考慮替代方案和降級策略",
                    keywords: ["需求釐清", "技術風險", "資源評估", "替代方案"]
                },
                lowVariance: {
                    title: "🎯 團隊估點高度一致",
                    content: "很好！團隊對任務複雜度有共識：\n• 確保需求文件完整\n• 建立明確的完成定義\n• 設定適當的品質門檻\n• 規劃合理的測試策略",
                    keywords: ["需求文件", "完成定義", "品質門檻", "測試策略"]
                },
                highEstimate: {
                    title: "⚡ 高複雜度任務來襲",
                    content: "這是個有挑戰性的任務！建議：\n• 分解成更小的可管理單元\n• 識別關鍵路徑和依賴關係\n• 預留緩衝時間處理未知問題\n• 建立風險應對預案",
                    keywords: ["任務分解", "關鍵路徑", "緩衝時間", "風險預案"]
                },
                lowEstimate: {
                    title: "🚀 輕量級任務，衝刺模式",
                    content: "看起來是個相對簡單的任務：\n• 確認是否有遺漏的複雜度\n• 保持程式碼品質標準\n• 考慮未來擴展需求\n• 適當投入時間做好文件",
                    keywords: ["複雜度確認", "程式碼品質", "擴展需求", "文件撰寫"]
                }
            }
        };
    }
    
    /**
     * 根據任務類型和投票統計產生建議
     * @param {string} taskType - 任務類型 (frontend|backend|testing|etc.)
     * @param {Object} statistics - 投票統計結果
     * @returns {Object} 建議物件 { title, content, keywords }
     */
    generateAdvice(taskType, statistics) {
        try {
            console.log('🧠 正在產生建議:', { taskType, statistics });
            
            // 驗證輸入參數
            if (!statistics || typeof statistics !== 'object') {
                throw new Error('統計資料無效');
            }
            
            // 分析投票統計
            const analysis = this.analyzeStatistics(statistics);
            console.log('📊 統計分析結果:', analysis);
            
            // 選擇適當的建議模板
            const adviceCategory = this.selectAdviceCategory(taskType);
            const adviceType = this.determineAdviceType(analysis);
            
            // 產生建議
            const advice = this.buildAdvice(adviceCategory, adviceType, analysis);
            
            console.log('💡 產生的建議:', advice);
            return advice;
            
        } catch (error) {
            console.error('❌ 建議產生失敗:', error);
            return this.getErrorAdvice(error.message);
        }
    }
    
    /**
     * 分析投票統計數據
     * @param {Object} statistics - 統計數據
     * @returns {Object} 分析結果
     */
    analyzeStatistics(statistics) {
        const {
            averagePoints = 0,
            consensus = 0,
            totalVotes = 0,
            min = 0,
            max = 0,
            variance = 0
        } = statistics;
        
        // 計算分散度（如果沒有提供 variance）
        const calculatedVariance = variance || this.calculateVariance(statistics);
        
        return {
            averagePoints: parseFloat(averagePoints),
            consensus: parseFloat(consensus),
            totalVotes: parseInt(totalVotes),
            min: parseFloat(min),
            max: parseFloat(max),
            variance: calculatedVariance,
            isHighVariance: calculatedVariance > this.thresholds.highVariance,
            isLowVariance: calculatedVariance < this.thresholds.lowVariance,
            isHighAverage: averagePoints > this.thresholds.highAverage,
            isLowAverage: averagePoints < this.thresholds.lowAverage,
            hasStrongConsensus: consensus > this.thresholds.strongConsensus,
            hasWeakConsensus: consensus < this.thresholds.weakConsensus
        };
    }
    
    /**
     * 計算變異數（簡化版本）
     * @param {Object} statistics - 統計數據
     * @returns {number} 變異數
     */
    calculateVariance(statistics) {
        const { min = 0, max = 0, averagePoints = 0 } = statistics;
        
        // 簡化的變異數計算：使用範圍相對於平均值的比例
        if (averagePoints === 0) return 0;
        
        const range = max - min;
        return range / averagePoints;
    }
    
    /**
     * 選擇建議類別
     * @param {string} taskType - 任務類型
     * @returns {string} 建議類別
     */
    selectAdviceCategory(taskType) {
        if (!taskType || typeof taskType !== 'string') {
            return 'general';
        }
        
        const normalizedType = taskType.toLowerCase().trim();
        
        // 前端相關
        if (['frontend', 'ui_ux', 'mobile_app'].includes(normalizedType)) {
            return 'frontend';
        }
        
        // 後端相關
        if (['backend', 'api_integration', 'database', 'devops'].includes(normalizedType)) {
            return 'backend';
        }
        
        // 測試相關
        if (['testing', 'qa'].includes(normalizedType)) {
            return 'testing';
        }
        
        // 其他類型使用通用建議
        return 'general';
    }
    
    /**
     * 決定建議類型
     * @param {Object} analysis - 分析結果
     * @returns {string} 建議類型
     */
    determineAdviceType(analysis) {
        // 優先考慮變異數（分歧程度）
        if (analysis.isHighVariance || analysis.hasWeakConsensus) {
            return 'highVariance';
        }
        
        if (analysis.isLowVariance || analysis.hasStrongConsensus) {
            return 'lowVariance';
        }
        
        // 其次考慮估點大小
        if (analysis.isHighAverage) {
            return 'highEstimate';
        }
        
        if (analysis.isLowAverage) {
            return 'lowEstimate';
        }
        
        // 預設使用低變異數建議
        return 'lowVariance';
    }
    
    /**
     * 建構建議物件
     * @param {string} category - 建議類別
     * @param {string} type - 建議類型
     * @param {Object} analysis - 分析結果
     * @returns {Object} 建議物件
     */
    buildAdvice(category, type, analysis) {
        const template = this.adviceTemplates[category]?.[type] || 
                        this.adviceTemplates.general[type];
        
        if (!template) {
            return this.getDefaultAdvice();
        }
        
        // 複製模板以避免修改原始資料
        const advice = {
            title: template.title,
            content: template.content,
            keywords: [...template.keywords],
            metadata: {
                category,
                type,
                analysis: {
                    averagePoints: analysis.averagePoints,
                    consensus: analysis.consensus,
                    variance: Math.round(analysis.variance * 100) / 100,
                    totalVotes: analysis.totalVotes
                },
                generatedAt: new Date().toISOString(),
                version: this.version
            }
        };
        
        // 動態添加統計資訊到內容中
        advice.content += this.buildStatisticsSummary(analysis);
        
        return advice;
    }
    
    /**
     * 建構統計摘要文字
     * @param {Object} analysis - 分析結果
     * @returns {string} 統計摘要
     */
    buildStatisticsSummary(analysis) {
        return `\n\n📈 統計摘要：\n` +
               `• 平均估點：${analysis.averagePoints} 點\n` +
               `• 共識度：${analysis.consensus}%\n` +
               `• 參與投票：${analysis.totalVotes} 人\n` +
               `• 估點範圍：${analysis.min} - ${analysis.max} 點`;
    }
    
    /**
     * 取得錯誤情況的預設建議
     * @param {string} errorMessage - 錯誤訊息
     * @returns {Object} 預設建議
     */
    getErrorAdvice(errorMessage) {
        return {
            title: "🤖 建議引擎暫時休息中",
            content: `抱歉，無法產生專屬建議。\n錯誤資訊：${errorMessage}\n\n不過還是給你一個通用建議：\n• 保持開放的心態討論技術細節\n• 確保所有團隊成員都理解需求\n• 適當分解任務降低複雜度\n• 記住：估點是為了更好的計畫，不是為了完美的預測 😊`,
            keywords: ["錯誤處理", "通用建議", "團隊協作"],
            metadata: {
                isError: true,
                errorMessage,
                generatedAt: new Date().toISOString(),
                version: this.version
            }
        };
    }
    
    /**
     * 取得預設建議
     * @returns {Object} 預設建議
     */
    getDefaultAdvice() {
        return {
            title: "🎯 通用估點建議",
            content: "團隊完成了投票！以下是一些通用建議：\n• 確保所有人對需求有相同理解\n• 討論技術實作方向和潛在風險\n• 考慮任務的優先級和依賴關係\n• 記住估點是相對的，不是絕對時間",
            keywords: ["通用建議", "需求理解", "技術討論", "任務規劃"],
            metadata: {
                isDefault: true,
                generatedAt: new Date().toISOString(),
                version: this.version
            }
        };
    }
    
    /**
     * 取得引擎狀態資訊
     * @returns {Object} 狀態資訊
     */
    getEngineInfo() {
        return {
            version: this.version,
            initialized: this.initialized,
            templateCategories: Object.keys(this.adviceTemplates),
            thresholds: this.thresholds,
            supportedTaskTypes: [
                'frontend', 'backend', 'testing', 'fullstack',
                'ui_ux', 'mobile_app', 'api_integration', 
                'database', 'devops', 'qa', 'general'
            ]
        };
    }
    
    /**
     * 測試建議引擎功能
     * @returns {Object} 測試結果
     */
    testEngine() {
        console.log('🧪 開始測試 ScrumAdviceEngine...');
        
        const testCases = [
            {
                name: '前端高分歧測試',
                taskType: 'frontend',
                statistics: { averagePoints: 8, consensus: 30, totalVotes: 5, min: 2, max: 21, variance: 1.2 }
            },
            {
                name: '後端低分歧測試',
                taskType: 'backend',
                statistics: { averagePoints: 5, consensus: 85, totalVotes: 4, min: 3, max: 8, variance: 0.3 }
            },
            {
                name: '測試高估點測試',
                taskType: 'testing',
                statistics: { averagePoints: 18, consensus: 60, totalVotes: 6, min: 13, max: 21, variance: 0.4 }
            },
            {
                name: '通用低估點測試',
                taskType: 'general',
                statistics: { averagePoints: 2, consensus: 90, totalVotes: 5, min: 1, max: 3, variance: 0.15 }
            },
            {
                name: '錯誤處理測試',
                taskType: 'frontend',
                statistics: null
            }
        ];
        
        const results = testCases.map(testCase => {
            try {
                const advice = this.generateAdvice(testCase.taskType, testCase.statistics);
                return {
                    testName: testCase.name,
                    success: true,
                    advice: {
                        title: advice.title,
                        contentPreview: advice.content.substring(0, 100) + '...',
                        keywordCount: advice.keywords.length
                    }
                };
            } catch (error) {
                return {
                    testName: testCase.name,
                    success: false,
                    error: error.message
                };
            }
        });
        
        console.log('🧪 測試結果:', results);
        return {
            totalTests: testCases.length,
            passedTests: results.filter(r => r.success).length,
            failedTests: results.filter(r => !r.success).length,
            results
        };
    }
}

// 匯出到全域
window.ScrumAdviceEngine = ScrumAdviceEngine;

console.log('🧠 ScrumAdviceEngine 模組已載入 - Phase 1 Implementation');