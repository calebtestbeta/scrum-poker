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
        this.version = '1.0.0-phase2';
        this.initialized = false;
        
        // 建議模板資料庫
        this.adviceTemplates = this.initializeAdviceTemplates();
        
        // 技術堆疊對應表 (Phase 2 新增)
        this.technologyStacks = this.initializeTechnologyStacks();
        
        // 角色權重配置 (Phase 2 新增)
        this.roleWeights = this.initializeRoleWeights();
        
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
        console.log('🧠 ScrumAdviceEngine v' + this.version + ' 已初始化 (Phase 2 Enhanced)');
    }
    
    /**
     * 初始化技術堆疊對應表 (Phase 2)
     * @returns {Object} 技術堆疊配置
     */
    initializeTechnologyStacks() {
        return {
            frontend: {
                technologies: ['React', 'Vue.js', 'Angular', 'TypeScript', 'Sass/SCSS', 'Webpack'],
                complexity: {
                    ui_framework: { weight: 0.3, factors: ['組件架構', '狀態管理', '路由設計'] },
                    styling: { weight: 0.2, factors: ['響應式設計', 'CSS-in-JS', '主題系統'] },
                    bundling: { weight: 0.15, factors: ['模組打包', '效能優化', '程式碼分割'] },
                    testing: { weight: 0.2, factors: ['單元測試', 'E2E測試', '視覺回歸'] },
                    deployment: { weight: 0.15, factors: ['CDN部署', '靜態化', 'CI/CD'] }
                },
                commonChallenges: [
                    '跨瀏覽器相容性問題',
                    'Mobile-first 響應式設計',
                    '第三方套件整合衝突',
                    '效能優化和Bundle大小控制',
                    '無障礙設計(a11y)實作'
                ]
            },
            
            backend: {
                technologies: ['Node.js', 'Python/Django', 'Java/Spring', 'Go', 'PostgreSQL', 'Redis'],
                complexity: {
                    api_design: { weight: 0.25, factors: ['RESTful設計', 'GraphQL', 'API版本控制'] },
                    database: { weight: 0.25, factors: ['Schema設計', '查詢優化', '資料遷移'] },
                    authentication: { weight: 0.2, factors: ['JWT', 'OAuth2', '權限控制'] },
                    performance: { weight: 0.15, factors: ['快取策略', '負載均衡', '資料庫索引'] },
                    monitoring: { weight: 0.15, factors: ['日誌系統', '錯誤追蹤', '效能監控'] }
                },
                commonChallenges: [
                    'API設計和版本控制',
                    '資料庫效能優化',
                    '併發處理和競態條件',
                    '微服務架構整合',
                    '安全性和資料保護'
                ]
            },
            
            testing: {
                technologies: ['Jest', 'Cypress', 'Selenium', 'JUnit', 'Postman', 'k6'],
                complexity: {
                    unit_testing: { weight: 0.3, factors: ['Mock設計', '覆蓋率', '測試隔離'] },
                    integration_testing: { weight: 0.25, factors: ['API測試', '資料庫測試', '第三方整合'] },
                    e2e_testing: { weight: 0.2, factors: ['使用者流程', '跨瀏覽器', '行動裝置'] },
                    performance_testing: { weight: 0.15, factors: ['負載測試', '壓力測試', '記憶體洩漏'] },
                    automation: { weight: 0.1, factors: ['CI/CD整合', '測試報告', '自動回歸'] }
                },
                commonChallenges: [
                    '測試資料管理和清理',
                    '非同步操作測試',
                    '測試環境一致性',
                    '測試執行時間優化',
                    '測試程式碼可維護性'
                ]
            },
            
            devops: {
                technologies: ['Docker', 'Kubernetes', 'AWS/GCP', 'Terraform', 'Jenkins', 'Prometheus'],
                complexity: {
                    containerization: { weight: 0.25, factors: ['Docker設定', 'Multi-stage builds', '容器安全'] },
                    orchestration: { weight: 0.25, factors: ['K8s部署', 'Service mesh', '自動擴展'] },
                    infrastructure: { weight: 0.2, factors: ['IaC', '網路設定', '安全群組'] },
                    monitoring: { weight: 0.15, factors: ['指標收集', '告警設定', '日誌聚合'] },
                    cicd: { weight: 0.15, factors: ['管道設計', '自動部署', '回滾策略'] }
                },
                commonChallenges: [
                    '容器化應用程式配置',
                    '微服務部署和服務發現',
                    '監控和告警系統設計',
                    '自動化部署管道',
                    '災難恢復和備份策略'
                ]
            }
        };
    }
    
    /**
     * 初始化角色權重配置 (Phase 2)
     * @returns {Object} 角色權重配置
     */
    initializeRoleWeights() {
        return {
            dev: {
                expertise: {
                    frontend: 0.8,
                    backend: 0.9,
                    testing: 0.6,
                    devops: 0.5,
                    database: 0.7,
                    api_integration: 0.8
                },
                estimationBias: {
                    tendency: 'optimistic',
                    factor: 0.9,
                    description: '開發者往往低估實作複雜度'
                },
                focusAreas: ['程式碼品質', '技術債務', '重構機會', '效能優化']
            },
            
            qa: {
                expertise: {
                    frontend: 0.7,
                    backend: 0.6,
                    testing: 0.95,
                    devops: 0.4,
                    database: 0.5,
                    api_integration: 0.7
                },
                estimationBias: {
                    tendency: 'realistic',
                    factor: 1.1,
                    description: 'QA 通常更準確評估測試複雜度'
                },
                focusAreas: ['測試覆蓋率', '邊界條件', '使用者體驗', '錯誤處理']
            },
            
            scrum_master: {
                expertise: {
                    frontend: 0.6,
                    backend: 0.6,
                    testing: 0.7,
                    devops: 0.6,
                    database: 0.5,
                    api_integration: 0.6
                },
                estimationBias: {
                    tendency: 'process_focused',
                    factor: 1.15,
                    description: 'Scrum Master 考慮更多流程和協作成本'
                },
                focusAreas: ['團隊協作', '風險識別', '依賴管理', '時程規劃']
            },
            
            po: {
                expertise: {
                    frontend: 0.5,
                    backend: 0.4,
                    testing: 0.6,
                    devops: 0.3,
                    database: 0.4,
                    api_integration: 0.5
                },
                estimationBias: {
                    tendency: 'business_focused',
                    factor: 0.8,
                    description: 'PO 可能低估技術實作難度'
                },
                focusAreas: ['商業價值', '使用者需求', '功能優先級', '市場時機']
            },
            
            other: {
                expertise: {
                    frontend: 0.5,
                    backend: 0.5,
                    testing: 0.5,
                    devops: 0.5,
                    database: 0.5,
                    api_integration: 0.5
                },
                estimationBias: {
                    tendency: 'neutral',
                    factor: 1.0,
                    description: '其他角色保持中性估點觀點'
                },
                focusAreas: ['整體協調', '跨領域整合', '風險平衡', '資源協調']
            }
        };
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
     * 根據任務類型和投票統計產生建議 (Phase 2 Enhanced)
     * @param {string} taskType - 任務類型 (frontend|backend|testing|etc.)
     * @param {Object} statistics - 投票統計結果
     * @param {Object} options - 額外選項 (Phase 2)
     * @param {Array} options.playerRoles - 玩家角色分布 (Phase 2)
     * @param {Array} options.votesByRole - 按角色分組的投票 (Phase 2)
     * @returns {Object} 建議物件 { title, content, keywords, techStack, roleAnalysis }
     */
    generateAdvice(taskType, statistics, options = {}) {
        try {
            console.log('🧠 正在產生建議 (Phase 2):', { taskType, statistics, options });
            
            // 驗證輸入參數
            if (!statistics || typeof statistics !== 'object') {
                throw new Error('統計資料無效');
            }
            
            // 分析投票統計
            const analysis = this.analyzeStatistics(statistics);
            console.log('📊 統計分析結果:', analysis);
            
            // Phase 2: 角色分析
            const roleAnalysis = this.analyzeRoleDistribution(options.playerRoles, options.votesByRole, taskType);
            console.log('👥 角色分析結果:', roleAnalysis);
            
            // Phase 2: 技術堆疊分析
            const techStackAnalysis = this.analyzeTechStack(taskType, analysis);
            console.log('🔧 技術堆疊分析:', techStackAnalysis);
            
            // 選擇適當的建議模板
            const adviceCategory = this.selectAdviceCategory(taskType);
            const adviceType = this.determineAdviceType(analysis, roleAnalysis);
            
            // 產生增強建議 (Phase 2)
            const advice = this.buildEnhancedAdvice(adviceCategory, adviceType, analysis, roleAnalysis, techStackAnalysis);
            
            console.log('💡 產生的增強建議:', advice);
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
     * 分析角色分布和估點偏差 (Phase 2)
     * @param {Array} playerRoles - 玩家角色列表
     * @param {Array} votesByRole - 按角色分組的投票
     * @param {string} taskType - 任務類型
     * @returns {Object} 角色分析結果
     */
    analyzeRoleDistribution(playerRoles = [], votesByRole = [], taskType) {
        if (!playerRoles.length) {
            return { hasRoleData: false, message: '無角色資料可供分析' };
        }
        
        // 統計角色分布
        const roleCount = {};
        playerRoles.forEach(role => {
            roleCount[role] = (roleCount[role] || 0) + 1;
        });
        
        // 分析角色專業度匹配
        const taskCategory = this.selectAdviceCategory(taskType);
        const expertiseAnalysis = this.analyzeRoleExpertise(roleCount, taskCategory);
        
        // 分析投票偏差（如果有按角色的投票資料）
        const biasAnalysis = this.analyzeEstimationBias(votesByRole, taskType);
        
        // 提出角色建議
        const roleRecommendations = this.generateRoleRecommendations(roleCount, taskCategory, expertiseAnalysis);
        
        return {
            hasRoleData: true,
            roleDistribution: roleCount,
            totalPlayers: playerRoles.length,
            expertiseMatch: expertiseAnalysis,
            estimationBias: biasAnalysis,
            recommendations: roleRecommendations
        };
    }
    
    /**
     * 分析角色專業度匹配 (Phase 2)
     * @param {Object} roleCount - 角色計數
     * @param {string} taskCategory - 任務類別
     * @returns {Object} 專業度分析
     */
    analyzeRoleExpertise(roleCount, taskCategory) {
        const relevantRoles = {
            frontend: ['dev', 'qa'],
            backend: ['dev'],
            testing: ['qa', 'dev'],
            general: ['dev', 'qa', 'scrum_master', 'po']
        };
        
        const expectedRoles = relevantRoles[taskCategory] || relevantRoles.general;
        const totalPlayers = Object.values(roleCount).reduce((sum, count) => sum + count, 0);
        
        // 計算專業角色覆蓋率
        const expertPlayers = expectedRoles.reduce((sum, role) => sum + (roleCount[role] || 0), 0);
        const expertiseRate = totalPlayers > 0 ? expertPlayers / totalPlayers : 0;
        
        // 識別潛在盲點
        const missingExpertise = expectedRoles.filter(role => !roleCount[role]);
        
        return {
            expertiseRate: Math.round(expertiseRate * 100),
            hasAdequateExpertise: expertiseRate >= 0.5,
            strongDomains: expectedRoles.filter(role => (roleCount[role] || 0) >= 2),
            missingExpertise,
            dominantRole: Object.entries(roleCount).reduce((a, b) => roleCount[a[0]] > roleCount[b[0]] ? a : b)[0]
        };
    }
    
    /**
     * 分析估點偏差 (Phase 2)
     * @param {Array} votesByRole - 按角色的投票
     * @param {string} taskType - 任務類型
     * @returns {Object} 偏差分析
     */
    analyzeEstimationBias(votesByRole, taskType) {
        if (!votesByRole || !votesByRole.length) {
            return { hasBiasData: false, message: '無投票偏差資料' };
        }
        
        // 計算各角色的平均估點
        const roleAverages = {};
        const roleVotes = {};
        
        votesByRole.forEach(vote => {
            const { role, value } = vote;
            if (typeof value === 'number') {
                if (!roleVotes[role]) roleVotes[role] = [];
                roleVotes[role].push(value);
            }
        });
        
        // 計算平均值和識別偏差模式
        Object.entries(roleVotes).forEach(([role, votes]) => {
            const average = votes.reduce((sum, vote) => sum + vote, 0) / votes.length;
            const expectedBias = this.roleWeights[role]?.estimationBias?.factor || 1.0;
            
            roleAverages[role] = {
                average: Math.round(average * 10) / 10,
                count: votes.length,
                expectedBias,
                tendency: this.roleWeights[role]?.estimationBias?.tendency || 'neutral'
            };
        });
        
        // 識別極端偏差
        const overallAverage = Object.values(roleAverages)
            .reduce((sum, data) => sum + data.average * data.count, 0) /
            Object.values(roleAverages).reduce((sum, data) => sum + data.count, 0);
        
        const significantBias = Object.entries(roleAverages)
            .filter(([role, data]) => Math.abs(data.average - overallAverage) > overallAverage * 0.3)
            .map(([role, data]) => ({
                role,
                type: data.average > overallAverage ? 'pessimistic' : 'optimistic',
                deviation: Math.round((data.average - overallAverage) * 10) / 10
            }));
        
        return {
            hasBiasData: true,
            roleAverages,
            overallAverage: Math.round(overallAverage * 10) / 10,
            significantBias,
            hasConsistentBias: significantBias.length > 0
        };
    }
    
    /**
     * 產生角色建議 (Phase 2)
     * @param {Object} roleCount - 角色分布
     * @param {string} taskCategory - 任務類別
     * @param {Object} expertiseAnalysis - 專業度分析
     * @returns {Array} 角色建議列表
     */
    generateRoleRecommendations(roleCount, taskCategory, expertiseAnalysis) {
        const recommendations = [];
        
        // 專業度不足警告
        if (!expertiseAnalysis.hasAdequateExpertise) {
            recommendations.push({
                type: 'warning',
                message: `建議增加 ${taskCategory} 相關專業角色參與估點`,
                priority: 'high'
            });
        }
        
        // 缺失專業領域提醒
        if (expertiseAnalysis.missingExpertise.length > 0) {
            recommendations.push({
                type: 'suggestion',
                message: `考慮邀請 ${expertiseAnalysis.missingExpertise.join('、')} 角色提供專業觀點`,
                priority: 'medium'
            });
        }
        
        // 角色多樣性建議
        const totalRoles = Object.keys(roleCount).length;
        if (totalRoles === 1) {
            recommendations.push({
                type: 'diversity',
                message: '單一角色估點可能缺乏多元觀點，建議增加不同角色參與',
                priority: 'medium'
            });
        }
        
        return recommendations;
    }
    
    /**
     * 技術堆疊分析 (Phase 2)
     * @param {string} taskType - 任務類型
     * @param {Object} analysis - 統計分析結果
     * @returns {Object} 技術堆疊分析
     */
    analyzeTechStack(taskType, analysis) {
        const taskCategory = this.selectAdviceCategory(taskType);
        const stackInfo = this.technologyStacks[taskCategory];
        
        if (!stackInfo) {
            return { 
                hasStackData: false, 
                message: '無對應技術堆疊資料',
                suggestedFocus: ['需求分析', '架構設計', '風險評估']
            };
        }
        
        // 根據估點大小推薦關注領域
        const complexityAreas = Object.entries(stackInfo.complexity)
            .sort((a, b) => b[1].weight - a[1].weight)
            .slice(0, 3);
        
        // 根據變異數程度選擇建議
        const focusAreas = analysis.isHighVariance ? 
            complexityAreas.map(([area, config]) => ({
                area: area.replace('_', ' '),
                factors: config.factors,
                weight: config.weight,
                reason: '高分歧需重點討論'
            })) :
            complexityAreas.slice(0, 2).map(([area, config]) => ({
                area: area.replace('_', ' '),
                factors: config.factors.slice(0, 2),
                weight: config.weight,
                reason: '核心複雜度關注點'
            }));
        
        return {
            hasStackData: true,
            category: taskCategory,
            technologies: stackInfo.technologies,
            complexityFocus: focusAreas,
            commonChallenges: stackInfo.commonChallenges.slice(0, 3),
            estimationGuidance: this.getEstimationGuidance(taskCategory, analysis.averagePoints)
        };
    }
    
    /**
     * 取得估點指導建議 (Phase 2)
     * @param {string} category - 任務類別
     * @param {number} averagePoints - 平均估點
     * @returns {Object} 估點指導
     */
    getEstimationGuidance(category, averagePoints) {
        const guidance = {
            frontend: {
                low: '確認設計稿完整度和互動複雜度',
                medium: '評估響應式設計和第三方整合需求',
                high: '考慮效能優化、無障礙設計和跨瀏覽器測試'
            },
            backend: {
                low: '檢查 API 設計和基本驗證邏輯',
                medium: '評估資料庫查詢優化和快取策略',
                high: '考慮併發處理、安全性和監控機制'
            },
            testing: {
                low: '聚焦核心功能的單元測試',
                medium: '包含整合測試和基本自動化',
                high: '完整的測試金字塔和效能測試'
            },
            general: {
                low: '確保需求明確和技術方案清晰',
                medium: '評估跨領域依賴和整合複雜度',
                high: '全面考慮架構、效能、安全和維護性'
            }
        };
        
        const level = averagePoints <= 5 ? 'low' : 
                     averagePoints <= 13 ? 'medium' : 'high';
        
        return {
            level,
            suggestion: guidance[category]?.[level] || guidance.general[level]
        };
    }

    /**
     * 決定建議類型 (Phase 2 Enhanced)
     * @param {Object} analysis - 統計分析結果
     * @param {Object} roleAnalysis - 角色分析結果
     * @returns {string} 建議類型
     */
    determineAdviceType(analysis, roleAnalysis = null) {
        // Phase 2: 考慮角色因素
        if (roleAnalysis?.hasRoleData) {
            // 如果專業度不足，優先提醒分歧風險
            if (!roleAnalysis.expertiseMatch.hasAdequateExpertise && analysis.isHighVariance) {
                return 'highVariance';
            }
            
            // 如果有顯著偏差，考慮特殊處理
            if (roleAnalysis.estimationBias?.hasConsistentBias) {
                return analysis.isHighAverage ? 'highEstimate' : 'lowEstimate';
            }
        }
        
        // 原有邏輯
        if (analysis.isHighVariance || analysis.hasWeakConsensus) {
            return 'highVariance';
        }
        
        if (analysis.isLowVariance || analysis.hasStrongConsensus) {
            return 'lowVariance';
        }
        
        if (analysis.isHighAverage) {
            return 'highEstimate';
        }
        
        if (analysis.isLowAverage) {
            return 'lowEstimate';
        }
        
        return 'lowVariance';
    }
    
    /**
     * 建構增強建議物件 (Phase 2)
     * @param {string} category - 建議類別
     * @param {string} type - 建議類型
     * @param {Object} analysis - 統計分析結果
     * @param {Object} roleAnalysis - 角色分析結果
     * @param {Object} techStackAnalysis - 技術堆疊分析
     * @returns {Object} 增強建議物件
     */
    buildEnhancedAdvice(category, type, analysis, roleAnalysis, techStackAnalysis) {
        const template = this.adviceTemplates[category]?.[type] || 
                        this.adviceTemplates.general[type];
        
        if (!template) {
            return this.getDefaultAdvice();
        }
        
        // 基礎建議結構
        const advice = {
            title: template.title,
            content: template.content,
            keywords: [...template.keywords],
            
            // Phase 2 新增欄位
            roleAnalysis: roleAnalysis.hasRoleData ? {
                expertiseRate: roleAnalysis.expertiseMatch.expertiseRate,
                missingExpertise: roleAnalysis.expertiseMatch.missingExpertise,
                recommendations: roleAnalysis.recommendations,
                estimationBias: roleAnalysis.estimationBias
            } : null,
            
            techStack: techStackAnalysis.hasStackData ? {
                category: techStackAnalysis.category,
                technologies: techStackAnalysis.technologies,
                focusAreas: techStackAnalysis.complexityFocus,
                challenges: techStackAnalysis.commonChallenges,
                guidance: techStackAnalysis.estimationGuidance
            } : null,
            
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
                version: this.version,
                
                // Phase 2 metadata
                hasRoleData: roleAnalysis.hasRoleData,
                hasTechStack: techStackAnalysis.hasStackData,
                analysisDepth: 'enhanced'
            }
        };
        
        // 動態增強內容
        advice.content = this.enhanceAdviceContent(advice.content, analysis, roleAnalysis, techStackAnalysis);
        
        // 動態增強關鍵字
        advice.keywords = this.enhanceKeywords(advice.keywords, roleAnalysis, techStackAnalysis);
        
        return advice;
    }
    
    /**
     * 增強建議內容 (Phase 2)
     * @param {string} baseContent - 基礎內容
     * @param {Object} analysis - 統計分析
     * @param {Object} roleAnalysis - 角色分析
     * @param {Object} techStackAnalysis - 技術堆疊分析
     * @returns {string} 增強後的內容
     */
    enhanceAdviceContent(baseContent, analysis, roleAnalysis, techStackAnalysis) {
        let enhancedContent = baseContent;
        
        // 添加角色分析洞察
        if (roleAnalysis.hasRoleData) {
            enhancedContent += '\n\n👥 團隊組成分析：';
            
            if (roleAnalysis.expertiseMatch.expertiseRate < 50) {
                enhancedContent += `\n• 專業覆蓋率偏低 (${roleAnalysis.expertiseMatch.expertiseRate}%)，建議增加相關專業角色`;
            } else {
                enhancedContent += `\n• 專業覆蓋率良好 (${roleAnalysis.expertiseMatch.expertiseRate}%)`;
            }
            
            if (roleAnalysis.estimationBias.hasConsistentBias) {
                enhancedContent += '\n• 檢測到角色估點偏差，建議關注不同觀點的討論';
                roleAnalysis.estimationBias.significantBias.forEach(bias => {
                    const tendency = bias.type === 'optimistic' ? '偏樂觀' : '偏保守';
                    enhancedContent += `\n  - ${bias.role} 角色估點${tendency} (偏差 ${bias.deviation} 點)`;
                });
            }
            
            // 添加角色建議
            if (roleAnalysis.recommendations.length > 0) {
                enhancedContent += '\n• 建議事項：';
                roleAnalysis.recommendations.forEach(rec => {
                    enhancedContent += `\n  - ${rec.message}`;
                });
            }
        }
        
        // 添加技術堆疊指導
        if (techStackAnalysis.hasStackData) {
            enhancedContent += '\n\n🔧 技術重點關注：';
            enhancedContent += `\n• 估點等級：${techStackAnalysis.guidance.level} - ${techStackAnalysis.guidance.suggestion}`;
            
            if (techStackAnalysis.focusAreas.length > 0) {
                enhancedContent += '\n• 複雜度關注領域：';
                techStackAnalysis.focusAreas.forEach(area => {
                    enhancedContent += `\n  - ${area.area} (權重 ${Math.round(area.weight * 100)}%): ${area.factors.join('、')}`;
                });
            }
            
            if (techStackAnalysis.challenges.length > 0) {
                enhancedContent += '\n• 常見挑戰：';
                techStackAnalysis.challenges.forEach(challenge => {
                    enhancedContent += `\n  - ${challenge}`;
                });
            }
        }
        
        // 添加統計摘要
        enhancedContent += this.buildStatisticsSummary(analysis);
        
        return enhancedContent;
    }
    
    /**
     * 增強關鍵字列表 (Phase 2)
     * @param {Array} baseKeywords - 基礎關鍵字
     * @param {Object} roleAnalysis - 角色分析
     * @param {Object} techStackAnalysis - 技術堆疊分析
     * @returns {Array} 增強後的關鍵字
     */
    enhanceKeywords(baseKeywords, roleAnalysis, techStackAnalysis) {
        const enhancedKeywords = [...baseKeywords];
        
        // 添加角色相關關鍵字
        if (roleAnalysis.hasRoleData) {
            if (roleAnalysis.expertiseMatch.expertiseRate < 50) {
                enhancedKeywords.push('專業度不足', '角色多樣性');
            }
            
            if (roleAnalysis.estimationBias.hasConsistentBias) {
                enhancedKeywords.push('估點偏差', '角色觀點');
            }
            
            // 添加角色聚焦領域
            const dominantRole = roleAnalysis.expertiseMatch.dominantRole;
            if (dominantRole && this.roleWeights[dominantRole]) {
                enhancedKeywords.push(...this.roleWeights[dominantRole].focusAreas.slice(0, 2));
            }
        }
        
        // 添加技術堆疊關鍵字
        if (techStackAnalysis.hasStackData) {
            // 添加主要技術
            enhancedKeywords.push(...techStackAnalysis.technologies.slice(0, 3));
            
            // 添加複雜度領域
            techStackAnalysis.focusAreas.forEach(area => {
                enhancedKeywords.push(area.area);
            });
        }
        
        // 去重並限制數量
        return [...new Set(enhancedKeywords)].slice(0, 12);
    }

    /**
     * 建構建議物件 (保留向後相容)
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
     * 測試建議引擎功能 (Phase 2 Enhanced)
     * @returns {Object} 測試結果
     */
    testEngine() {
        console.log('🧪 開始測試 ScrumAdviceEngine Phase 2...');
        
        const testCases = [
            {
                name: '前端高分歧測試 (基礎)',
                taskType: 'frontend',
                statistics: { averagePoints: 8, consensus: 30, totalVotes: 5, min: 2, max: 21, variance: 1.2 }
            },
            {
                name: '後端低分歧測試 (基礎)',
                taskType: 'backend',
                statistics: { averagePoints: 5, consensus: 85, totalVotes: 4, min: 3, max: 8, variance: 0.3 }
            },
            {
                name: '前端角色分析測試 (Phase 2)',
                taskType: 'frontend',
                statistics: { averagePoints: 8, consensus: 45, totalVotes: 6, min: 3, max: 13, variance: 0.8 },
                options: {
                    playerRoles: ['dev', 'dev', 'qa', 'po', 'scrum_master', 'other'],
                    votesByRole: [
                        { role: 'dev', value: 5 },
                        { role: 'dev', value: 8 },
                        { role: 'qa', value: 13 },
                        { role: 'po', value: 3 },
                        { role: 'scrum_master', value: 8 },
                        { role: 'other', value: 5 }
                    ]
                }
            },
            {
                name: '後端專業度不足測試 (Phase 2)',
                taskType: 'backend',
                statistics: { averagePoints: 12, consensus: 25, totalVotes: 4, min: 5, max: 21, variance: 1.1 },
                options: {
                    playerRoles: ['po', 'po', 'scrum_master', 'other'],
                    votesByRole: [
                        { role: 'po', value: 5 },
                        { role: 'po', value: 8 },
                        { role: 'scrum_master', value: 13 },
                        { role: 'other', value: 21 }
                    ]
                }
            },
            {
                name: '測試角色偏差分析 (Phase 2)',
                taskType: 'testing',
                statistics: { averagePoints: 9, consensus: 55, totalVotes: 5, min: 5, max: 13, variance: 0.6 },
                options: {
                    playerRoles: ['qa', 'qa', 'dev', 'dev', 'scrum_master'],
                    votesByRole: [
                        { role: 'qa', value: 13 },
                        { role: 'qa', value: 13 },
                        { role: 'dev', value: 5 },
                        { role: 'dev', value: 8 },
                        { role: 'scrum_master', value: 8 }
                    ]
                }
            },
            {
                name: 'DevOps 技術堆疊測試 (Phase 2)',
                taskType: 'devops',
                statistics: { averagePoints: 16, consensus: 70, totalVotes: 3, min: 13, max: 21, variance: 0.4 },
                options: {
                    playerRoles: ['dev', 'dev', 'scrum_master'],
                    votesByRole: [
                        { role: 'dev', value: 13 },
                        { role: 'dev', value: 21 },
                        { role: 'scrum_master', value: 13 }
                    ]
                }
            },
            {
                name: '錯誤處理測試',
                taskType: 'frontend',
                statistics: null
            }
        ];
        
        const results = testCases.map(testCase => {
            try {
                const advice = this.generateAdvice(testCase.taskType, testCase.statistics, testCase.options);
                return {
                    testName: testCase.name,
                    success: true,
                    advice: {
                        title: advice.title,
                        contentPreview: advice.content.substring(0, 150) + '...',
                        keywordCount: advice.keywords.length,
                        hasRoleAnalysis: !!advice.roleAnalysis,
                        hasTechStack: !!advice.techStack,
                        analysisDepth: advice.metadata.analysisDepth || 'basic'
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
        
        console.log('🧪 Phase 2 測試結果:', results);
        return {
            totalTests: testCases.length,
            passedTests: results.filter(r => r.success).length,
            failedTests: results.filter(r => !r.success).length,
            phase2Features: {
                roleAnalysisTests: results.filter(r => r.success && r.advice.hasRoleAnalysis).length,
                techStackTests: results.filter(r => r.success && r.advice.hasTechStack).length,
                enhancedAnalysis: results.filter(r => r.success && r.advice.analysisDepth === 'enhanced').length
            },
            results
        };
    }
    
    /**
     * Phase 2 專用測試方法
     * @returns {Object} Phase 2 功能測試結果
     */
    testPhase2Features() {
        console.log('🧪 測試 Phase 2 專用功能...');
        
        const testResults = {
            roleAnalysis: this.testRoleAnalysis(),
            techStackAnalysis: this.testTechStackAnalysis(),
            enhancedAdvice: this.testEnhancedAdviceGeneration()
        };
        
        console.log('🧪 Phase 2 功能測試完成:', testResults);
        return testResults;
    }
    
    /**
     * 測試角色分析功能
     * @returns {Object} 角色分析測試結果
     */
    testRoleAnalysis() {
        const testCases = [
            {
                name: '平衡團隊',
                playerRoles: ['dev', 'dev', 'qa', 'scrum_master', 'po'],
                votesByRole: [
                    { role: 'dev', value: 8 },
                    { role: 'dev', value: 5 },
                    { role: 'qa', value: 13 },
                    { role: 'scrum_master', value: 8 },
                    { role: 'po', value: 5 }
                ]
            },
            {
                name: '專業度不足',
                playerRoles: ['po', 'po', 'other'],
                votesByRole: [
                    { role: 'po', value: 3 },
                    { role: 'po', value: 5 },
                    { role: 'other', value: 8 }
                ]
            },
            {
                name: '單一角色',
                playerRoles: ['dev', 'dev', 'dev'],
                votesByRole: [
                    { role: 'dev', value: 5 },
                    { role: 'dev', value: 8 },
                    { role: 'dev', value: 13 }
                ]
            }
        ];
        
        return testCases.map(testCase => {
            try {
                const analysis = this.analyzeRoleDistribution(testCase.playerRoles, testCase.votesByRole, 'frontend');
                return {
                    testName: testCase.name,
                    success: true,
                    result: {
                        expertiseRate: analysis.expertiseMatch?.expertiseRate,
                        recommendationCount: analysis.recommendations?.length || 0,
                        hasBiasData: analysis.estimationBias?.hasBiasData
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
    }
    
    /**
     * 測試技術堆疊分析功能
     * @returns {Object} 技術堆疊分析測試結果
     */
    testTechStackAnalysis() {
        const testCases = [
            { taskType: 'frontend', averagePoints: 8 },
            { taskType: 'backend', averagePoints: 13 },
            { taskType: 'testing', averagePoints: 5 },
            { taskType: 'devops', averagePoints: 21 },
            { taskType: 'unknown', averagePoints: 8 }
        ];
        
        return testCases.map(testCase => {
            try {
                const analysis = { averagePoints: testCase.averagePoints, isHighVariance: false };
                const techStack = this.analyzeTechStack(testCase.taskType, analysis);
                return {
                    testName: `${testCase.taskType} 技術堆疊`,
                    success: true,
                    result: {
                        hasStackData: techStack.hasStackData,
                        techCount: techStack.technologies?.length || 0,
                        challengeCount: techStack.commonChallenges?.length || 0,
                        guidanceLevel: techStack.estimationGuidance?.level
                    }
                };
            } catch (error) {
                return {
                    testName: `${testCase.taskType} 技術堆疊`,
                    success: false,
                    error: error.message
                };
            }
        });
    }
    
    /**
     * 測試增強建議生成
     * @returns {Object} 增強建議測試結果
     */
    testEnhancedAdviceGeneration() {
        try {
            const statistics = { averagePoints: 10, consensus: 60, totalVotes: 5, min: 5, max: 13, variance: 0.6 };
            const options = {
                playerRoles: ['dev', 'dev', 'qa', 'po', 'scrum_master'],
                votesByRole: [
                    { role: 'dev', value: 8 },
                    { role: 'dev', value: 13 },
                    { role: 'qa', value: 13 },
                    { role: 'po', value: 5 },
                    { role: 'scrum_master', value: 8 }
                ]
            };
            
            const advice = this.generateAdvice('frontend', statistics, options);
            
            return {
                success: true,
                result: {
                    hasRoleAnalysis: !!advice.roleAnalysis,
                    hasTechStack: !!advice.techStack,
                    contentLength: advice.content.length,
                    keywordCount: advice.keywords.length,
                    analysisDepth: advice.metadata.analysisDepth
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// 匯出到全域
window.ScrumAdviceEngine = ScrumAdviceEngine;

console.log('🧠 ScrumAdviceEngine 模組已載入 - Phase 1 Implementation');