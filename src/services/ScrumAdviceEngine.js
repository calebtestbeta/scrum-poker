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
        this.version = '1.0.0-phase3-multiselect-support';
        this.initialized = false;
        
        // 建議模板載入器 (Phase 3 新增)
        this.templateLoader = null;
        this.adviceTemplates = {};
        
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
        
        // 初始化模板載入器
        this.initializeTemplateLoader();
        
        this.initialized = true;
        console.log('🧠 ScrumAdviceEngine v' + this.version + ' 已初始化 (Phase 3 + Multi-Select Support)');
    }
    
    /**
     * 初始化模板載入器 (Phase 3)
     */
    initializeTemplateLoader() {
        if (typeof AdviceTemplateLoader !== 'undefined') {
            this.templateLoader = new AdviceTemplateLoader();
            console.log('📂 建議模板載入器已初始化');
        } else {
            console.warn('⚠️ AdviceTemplateLoader 未載入，將使用內建預設模板');
            this.adviceTemplates = this.getBuiltinTemplates();
        }
    }
    
    /**
     * 載入建議模板
     * @param {string} category - 建議類別
     * @returns {Promise<Object>} 建議模板
     */
    async loadAdviceTemplate(category) {
        try {
            if (this.templateLoader) {
                const template = await this.templateLoader.loadTemplate(category);
                this.adviceTemplates[category] = template.templates;
                return template.templates;
            } else {
                // 使用內建模板
                const builtinTemplates = this.getBuiltinTemplates();
                return builtinTemplates[category] || builtinTemplates.general;
            }
        } catch (error) {
            console.error(`❌ 載入建議模板失敗 (${category}):`, error);
            // 降級到內建模板
            const builtinTemplates = this.getBuiltinTemplates();
            return builtinTemplates[category] || builtinTemplates.general;
        }
    }
    
    /**
     * 取得內建預設模板 (降級使用)
     * @returns {Object} 內建模板
     */
    getBuiltinTemplates() {
        return {
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
                    '容器化程式配置',
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

    // 硬編碼建議模板已移除，現在使用外部 JSON 檔案載入
    
    /**
     * 根據任務類型和投票統計產生建議 (Phase 2 Enhanced + Multi-Select Support)
     * @param {string|Array} taskType - 任務類型 (單選: 'frontend' 或多選: ['frontend', 'backend'])
     * @param {Object} statistics - 投票統計結果
     * @param {Object} options - 額外選項 (Phase 2)
     * @param {Array} options.playerRoles - 玩家角色分布 (Phase 2)
     * @param {Array} options.votesByRole - 按角色分組的投票 (Phase 2)
     * @returns {Object} 建議物件 { title, content, keywords, techStack, roleAnalysis }
     */
    async generateAdvice(taskType, statistics, options = {}) {
        try {
            console.log('🧠 正在產生建議 (Phase 3 + Multi-Select):', { taskType, statistics, options });
            
            // 驗證輸入參數
            if (!statistics || typeof statistics !== 'object') {
                throw new Error('統計資料無效');
            }
            
            // 處理多選任務類型
            const { primaryTaskType, taskTypeArray, isMultiSelect } = this.normalizeTaskTypes(taskType);
            console.log('🎯 任務類型分析:', { primaryTaskType, taskTypeArray, isMultiSelect });
            
            // 分析投票統計
            const analysis = this.analyzeStatistics(statistics);
            console.log('📊 統計分析結果:', analysis);
            
            // Phase 2: 角色分析 (使用主要任務類型)
            const roleAnalysis = this.analyzeRoleDistribution(options.playerRoles, options.votesByRole, primaryTaskType);
            console.log('👥 角色分析結果:', roleAnalysis);
            
            // Phase 2: 技術堆疊分析 (考慮多選類型)
            const techStackAnalysis = this.analyzeTechStackMultiSelect(taskTypeArray, analysis);
            console.log('🔧 多選技術堆疊分析:', techStackAnalysis);
            
            // Phase 5: 應用學習模型增強建議
            const gameData = { 
                votes: options.votes || {}, 
                taskType: primaryTaskType, // 學習模型使用主要類型
                taskTypes: taskTypeArray, // 新增：多選類型陣列
                players: options.players || {},
                sessionInfo: options.sessionInfo || {}
            };
            const learningEnhancement = this.applyLearningModel(gameData);
            console.log('📚 學習模型增強:', learningEnhancement);
            
            // 選擇適當的建議模板 (使用主要任務類型)
            const adviceCategory = this.selectAdviceCategory(primaryTaskType);
            const adviceType = this.determineAdviceType(analysis, roleAnalysis);
            
            // Phase 3: 載入外部建議模板
            await this.ensureTemplateLoaded(adviceCategory);
            
            // 產生增強建議 (Phase 3)
            const advice = this.buildEnhancedAdvice(adviceCategory, adviceType, analysis, roleAnalysis, techStackAnalysis);
            
            // Phase 5: 整合學習洞察到建議內容
            if (learningEnhancement.enhanced) {
                advice.learningInsights = learningEnhancement.data;
                advice.metadata.modelInfo = learningEnhancement.modelInfo;
                advice.metadata.analysisDepth = 'personalized';
                
                // 將學習洞察融入主要內容
                if (learningEnhancement.data.learningAdvice) {
                    advice.content += `\n\n## 📚 基於團隊歷史的洞察\n${learningEnhancement.data.learningAdvice}`;
                }
                
                // 添加角色洞察
                if (learningEnhancement.data.roleInsights && Object.keys(learningEnhancement.data.roleInsights).length > 0) {
                    advice.content += `\n\n## 👤 角色投票模式分析\n`;
                    Object.entries(learningEnhancement.data.roleInsights).forEach(([role, insight]) => {
                        const roleName = this.getRoleDisplayName(role);
                        advice.content += `**${roleName}**: 歷史平均 ${insight.historicalAverage} 點，本次 ${insight.currentVote} 點`;
                        if (insight.deviation > 2) {
                            advice.content += ` (偏差較大，可能需要討論)`;
                        }
                        advice.content += `\n`;
                    });
                }
                
                // 添加歷史比較關鍵字
                advice.keywords.push('歷史分析', '個人化建議', '學習洞察');
            }
            
            // Phase 5: 記錄此次投票會話到學習模型
            try {
                this.recordVotingSession(gameData);
            } catch (error) {
                console.warn('⚠️ 記錄投票會話失敗:', error);
            }
            
            console.log('💡 產生的增強建議 (Phase 5):', advice);
            return advice;
            
        } catch (error) {
            console.error('❌ 建議產生失敗:', error);
            return this.getErrorAdvice(error.message);
        }
    }
    
    /**
     * 確保指定類別的模板已載入 (Phase 3)
     * @param {string} category - 建議類別
     */
    async ensureTemplateLoaded(category) {
        if (!this.adviceTemplates[category]) {
            console.log(`📂 載入建議模板: ${category}`);
            await this.loadAdviceTemplate(category);
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
     * 標準化任務類型輸入 (支援單選和多選)
     * @param {string|Array} taskType - 任務類型
     * @returns {Object} 標準化結果
     */
    normalizeTaskTypes(taskType) {
        let taskTypeArray = [];
        let isMultiSelect = false;
        
        // 處理輸入格式
        if (Array.isArray(taskType)) {
            taskTypeArray = taskType.filter(t => t && typeof t === 'string').map(t => t.toLowerCase().trim());
            isMultiSelect = taskTypeArray.length > 1;
        } else if (typeof taskType === 'string') {
            const trimmed = taskType.toLowerCase().trim();
            if (trimmed) {
                taskTypeArray = [trimmed];
            }
        }
        
        // 如果沒有有效的任務類型，使用 general
        if (taskTypeArray.length === 0) {
            taskTypeArray = ['general'];
        }
        
        // 主要任務類型：第一個選擇的類型，用於模板選擇
        const primaryTaskType = taskTypeArray[0];
        
        return {
            primaryTaskType,
            taskTypeArray,
            isMultiSelect
        };
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
                suggestedFocus: ['需求分析', '架構設計', '風險評估'],
                estimationGuidance: this.getEstimationGuidance('general', analysis.averagePoints)
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
     * 多選技術堆疊分析 (Multi-Select Support)
     * @param {Array} taskTypeArray - 任務類型陣列
     * @param {Object} analysis - 統計分析結果
     * @returns {Object} 多選技術堆疊分析
     */
    analyzeTechStackMultiSelect(taskTypeArray, analysis) {
        if (!taskTypeArray || taskTypeArray.length === 0) {
            return this.analyzeTechStack('general', analysis);
        }
        
        // 單選情況直接使用原方法
        if (taskTypeArray.length === 1) {
            return this.analyzeTechStack(taskTypeArray[0], analysis);
        }
        
        // 多選情況：合併多個技術堆疊
        const multiStackAnalysis = {
            hasStackData: true,
            isMultiSelect: true,
            categories: [],
            technologies: [],
            complexityFocus: [],
            commonChallenges: [],
            estimationGuidance: null,
            crossDomainChallenges: []
        };
        
        const categoryAnalyses = [];
        const allTechnologies = new Set();
        const allChallenges = new Set();
        const focusAreasMap = new Map();
        
        // 分析每個選擇的任務類型
        taskTypeArray.forEach(taskType => {
            const singleAnalysis = this.analyzeTechStack(taskType, analysis);
            if (singleAnalysis.hasStackData) {
                categoryAnalyses.push({
                    taskType,
                    category: singleAnalysis.category,
                    analysis: singleAnalysis
                });
                
                multiStackAnalysis.categories.push(singleAnalysis.category);
                
                // 合併技術
                singleAnalysis.technologies.forEach(tech => allTechnologies.add(tech));
                
                // 合併挑戰
                singleAnalysis.commonChallenges.forEach(challenge => allChallenges.add(challenge));
                
                // 合併關注領域（按權重）
                singleAnalysis.complexityFocus.forEach(focus => {
                    const key = focus.area;
                    if (!focusAreasMap.has(key) || focusAreasMap.get(key).weight < focus.weight) {
                        focusAreasMap.set(key, {
                            ...focus,
                            sources: [singleAnalysis.category]
                        });
                    } else {
                        focusAreasMap.get(key).sources.push(singleAnalysis.category);
                    }
                });
            }
        });
        
        // 整理結果
        multiStackAnalysis.technologies = Array.from(allTechnologies).slice(0, 8); // 限制數量
        multiStackAnalysis.commonChallenges = Array.from(allChallenges).slice(0, 5);
        
        // 按權重排序關注領域
        multiStackAnalysis.complexityFocus = Array.from(focusAreasMap.values())
            .sort((a, b) => b.weight - a.weight)
            .slice(0, 4)
            .map(focus => ({
                ...focus,
                reason: focus.sources.length > 1 ? 
                    `跨領域重點 (${focus.sources.join('、')})` : 
                    focus.reason
            }));
        
        // 識別跨領域挑戰
        multiStackAnalysis.crossDomainChallenges = this.identifyCrossDomainChallenges(categoryAnalyses);
        
        // 使用主要類型的估點指導
        const primaryCategory = multiStackAnalysis.categories[0] || 'general';
        multiStackAnalysis.estimationGuidance = this.getEstimationGuidance(primaryCategory, analysis.averagePoints);
        
        // 新增多選特有建議
        multiStackAnalysis.multiSelectAdvice = this.generateMultiSelectAdvice(categoryAnalyses, analysis);
        
        console.log('🔗 多選技術堆疊分析完成:', multiStackAnalysis);
        return multiStackAnalysis;
    }
    
    /**
     * 識別跨領域挑戰
     * @param {Array} categoryAnalyses - 各類別分析結果
     * @returns {Array} 跨領域挑戰
     */
    identifyCrossDomainChallenges(categoryAnalyses) {
        const challenges = [];
        const categories = categoryAnalyses.map(ca => ca.category);
        
        // 前端 + 後端
        if (categories.includes('frontend') && categories.includes('backend')) {
            challenges.push({
                type: 'integration',
                description: '前後端 API 介面設計和資料格式統一',
                priority: 'high'
            });
            challenges.push({
                type: 'authentication',
                description: '跨域身份驗證和權限管理',
                priority: 'medium'
            });
        }
        
        // 任何類型 + 測試
        if (categories.includes('testing') && categories.length > 1) {
            challenges.push({
                type: 'test_coordination',
                description: '跨組件整合測試和端對端測試規劃',
                priority: 'high'
            });
        }
        
        // 前端 + Mobile
        if (categories.includes('frontend') && categoryAnalyses.some(ca => ca.taskType.includes('mobile'))) {
            challenges.push({
                type: 'responsive_design',
                description: '響應式設計和多平台相容性',
                priority: 'medium'
            });
        }
        
        return challenges;
    }
    
    /**
     * 產生多選特有建議
     * @param {Array} categoryAnalyses - 各類別分析結果
     * @param {Object} analysis - 統計分析
     * @returns {Object} 多選建議
     */
    generateMultiSelectAdvice(categoryAnalyses, analysis) {
        const advice = {
            coordination: [],
            prioritization: [],
            riskManagement: []
        };
        
        // 協調建議
        if (categoryAnalyses.length >= 2) {
            advice.coordination.push('建立跨領域協作機制，確保不同專業角色間的有效溝通');
            advice.coordination.push('定義清楚的介面和整合點，避免後期整合問題');
        }
        
        // 優先級建議
        if (categoryAnalyses.length >= 3) {
            advice.prioritization.push('考慮任務間的依賴關係，建立合理的開發順序');
            advice.prioritization.push('識別關鍵路徑，優先處理阻塞性任務');
        }
        
        // 風險管理
        if (analysis.isHighVariance && categoryAnalyses.length >= 2) {
            advice.riskManagement.push('多領域任務增加複雜度，建議分階段實作並持續驗證');
            advice.riskManagement.push('預留額外時間處理跨領域整合和測試');
        }
        
        return advice;
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
            } : (techStackAnalysis.estimationGuidance ? {
                category: 'general',
                technologies: [],
                focusAreas: [],
                challenges: [],
                guidance: techStackAnalysis.estimationGuidance
            } : null),
            
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
        
        // 添加技術堆疊指導（支援多選）
        if (techStackAnalysis.hasStackData || techStackAnalysis.estimationGuidance) {
            // 多選技術堆疊
            if (techStackAnalysis.isMultiSelect) {
                enhancedContent += '\n\n🔗 多領域技術分析：';
                enhancedContent += `\n• 涉及領域：${techStackAnalysis.categories.join('、')}`;
                
                if (techStackAnalysis.estimationGuidance) {
                    enhancedContent += `\n• 估點等級：${techStackAnalysis.estimationGuidance.level} - ${techStackAnalysis.estimationGuidance.suggestion}`;
                }
                
                if (techStackAnalysis.complexityFocus && techStackAnalysis.complexityFocus.length > 0) {
                    enhancedContent += '\n• 跨領域關注重點：';
                    techStackAnalysis.complexityFocus.forEach(focus => {
                        enhancedContent += `\n  - ${focus.area} (權重 ${Math.round(focus.weight * 100)}%): ${focus.factors.join('、')} - ${focus.reason}`;
                    });
                }
                
                // 跨領域挑戰
                if (techStackAnalysis.crossDomainChallenges && techStackAnalysis.crossDomainChallenges.length > 0) {
                    enhancedContent += '\n• 跨領域整合挑戰：';
                    techStackAnalysis.crossDomainChallenges.forEach(challenge => {
                        const priorityIcon = challenge.priority === 'high' ? '🔴' : challenge.priority === 'medium' ? '🟡' : '🟢';
                        enhancedContent += `\n  - ${priorityIcon} ${challenge.description}`;
                    });
                }
                
                // 多選特有建議
                if (techStackAnalysis.multiSelectAdvice) {
                    const advice = techStackAnalysis.multiSelectAdvice;
                    
                    if (advice.coordination.length > 0) {
                        enhancedContent += '\n• 協作協調：';
                        advice.coordination.forEach(item => {
                            enhancedContent += `\n  - ${item}`;
                        });
                    }
                    
                    if (advice.prioritization.length > 0) {
                        enhancedContent += '\n• 優先級規劃：';
                        advice.prioritization.forEach(item => {
                            enhancedContent += `\n  - ${item}`;
                        });
                    }
                    
                    if (advice.riskManagement.length > 0) {
                        enhancedContent += '\n• 風險管理：';
                        advice.riskManagement.forEach(item => {
                            enhancedContent += `\n  - ${item}`;
                        });
                    }
                }
                
                if (techStackAnalysis.commonChallenges && techStackAnalysis.commonChallenges.length > 0) {
                    enhancedContent += '\n• 綜合技術挑戰：';
                    techStackAnalysis.commonChallenges.forEach(challenge => {
                        enhancedContent += `\n  - ${challenge}`;
                    });
                }
                
            } else {
                // 單選技術堆疊（原有邏輯）
                enhancedContent += '\n\n🔧 技術重點關注：';
                if (techStackAnalysis.estimationGuidance) {
                    enhancedContent += `\n• 估點等級：${techStackAnalysis.estimationGuidance.level} - ${techStackAnalysis.estimationGuidance.suggestion}`;
                }
                
                if (techStackAnalysis.focusAreas && techStackAnalysis.focusAreas.length > 0) {
                    enhancedContent += '\n• 複雜度關注領域：';
                    techStackAnalysis.focusAreas.forEach(area => {
                        enhancedContent += `\n  - ${area.area} (權重 ${Math.round(area.weight * 100)}%): ${area.factors.join('、')}`;
                    });
                }
                
                if (techStackAnalysis.challenges && techStackAnalysis.challenges.length > 0) {
                    enhancedContent += '\n• 常見挑戰：';
                    techStackAnalysis.challenges.forEach(challenge => {
                        enhancedContent += `\n  - ${challenge}`;
                    });
                }
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
        
        // 添加技術堆疊關鍵字（支援多選）
        if (techStackAnalysis.hasStackData) {
            // 多選技術堆疊
            if (techStackAnalysis.isMultiSelect) {
                // 添加多選特有關鍵字
                enhancedKeywords.push('跨領域整合', '多技術協作');
                
                // 添加所有涉及的技術領域
                if (techStackAnalysis.categories) {
                    enhancedKeywords.push(...techStackAnalysis.categories);
                }
                
                // 添加主要技術（限制數量）
                if (techStackAnalysis.technologies) {
                    enhancedKeywords.push(...techStackAnalysis.technologies.slice(0, 4));
                }
                
                // 添加跨領域挑戰關鍵字
                if (techStackAnalysis.crossDomainChallenges) {
                    techStackAnalysis.crossDomainChallenges.forEach(challenge => {
                        switch(challenge.type) {
                            case 'integration':
                                enhancedKeywords.push('API整合', '前後端協作');
                                break;
                            case 'test_coordination':
                                enhancedKeywords.push('整合測試', '測試協調');
                                break;
                            case 'responsive_design':
                                enhancedKeywords.push('響應式設計', '多平台相容');
                                break;
                        }
                    });
                }
                
                // 添加複雜度領域
                if (techStackAnalysis.complexityFocus) {
                    techStackAnalysis.complexityFocus.forEach(focus => {
                        enhancedKeywords.push(focus.area);
                    });
                }
                
            } else {
                // 單選技術堆疊（原有邏輯）
                // 添加主要技術
                if (techStackAnalysis.technologies) {
                    enhancedKeywords.push(...techStackAnalysis.technologies.slice(0, 3));
                }
                
                // 添加複雜度領域
                if (techStackAnalysis.focusAreas) {
                    techStackAnalysis.focusAreas.forEach(area => {
                        enhancedKeywords.push(area.area);
                    });
                }
            }
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
                name: '多選任務類型測試 - 前端+後端 (Multi-Select)',
                taskType: ['frontend', 'backend'],
                statistics: { averagePoints: 10, consensus: 55, totalVotes: 5, min: 5, max: 13, variance: 0.7 },
                options: {
                    playerRoles: ['dev', 'dev', 'qa', 'po', 'scrum_master'],
                    votesByRole: [
                        { role: 'dev', value: 8 },
                        { role: 'dev', value: 13 },
                        { role: 'qa', value: 13 },
                        { role: 'po', value: 5 },
                        { role: 'scrum_master', value: 8 }
                    ]
                }
            },
            {
                name: '多選任務類型測試 - 前端+測試+DevOps (Multi-Select)',
                taskType: ['frontend', 'testing', 'devops'],
                statistics: { averagePoints: 15, consensus: 40, totalVotes: 4, min: 8, max: 21, variance: 1.0 },
                options: {
                    playerRoles: ['dev', 'qa', 'qa', 'scrum_master'],
                    votesByRole: [
                        { role: 'dev', value: 8 },
                        { role: 'qa', value: 13 },
                        { role: 'qa', value: 21 },
                        { role: 'scrum_master', value: 13 }
                    ]
                }
            },
            {
                name: '多選任務類型測試 - 單一選項陣列 (Multi-Select)',
                taskType: ['backend'],
                statistics: { averagePoints: 8, consensus: 80, totalVotes: 3, min: 5, max: 13, variance: 0.4 },
                options: {
                    playerRoles: ['dev', 'dev', 'dev'],
                    votesByRole: [
                        { role: 'dev', value: 5 },
                        { role: 'dev', value: 8 },
                        { role: 'dev', value: 13 }
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
                    isMultiSelect: Array.isArray(testCase.taskType),
                    advice: {
                        title: advice.title,
                        contentPreview: advice.content.substring(0, 150) + '...',
                        keywordCount: advice.keywords.length,
                        hasRoleAnalysis: !!advice.roleAnalysis,
                        hasTechStack: !!advice.techStack,
                        isMultiSelectTech: advice.techStack?.isMultiSelect || false,
                        crossDomainChallenges: advice.techStack?.crossDomainChallenges?.length || 0,
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
        
        console.log('🧪 Phase 3 + Multi-Select 測試結果:', results);
        return {
            totalTests: testCases.length,
            passedTests: results.filter(r => r.success).length,
            failedTests: results.filter(r => !r.success).length,
            phase2Features: {
                roleAnalysisTests: results.filter(r => r.success && r.advice.hasRoleAnalysis).length,
                techStackTests: results.filter(r => r.success && r.advice.hasTechStack).length,
                enhancedAnalysis: results.filter(r => r.success && r.advice.analysisDepth === 'enhanced').length
            },
            multiSelectFeatures: {
                multiSelectTests: results.filter(r => r.success && r.isMultiSelect).length,
                multiSelectTechTests: results.filter(r => r.success && r.advice.isMultiSelectTech).length,
                crossDomainChallengesDetected: results.filter(r => r.success && r.advice.crossDomainChallenges > 0).length,
                averageCrossDomainChallenges: results
                    .filter(r => r.success && r.advice.crossDomainChallenges > 0)
                    .reduce((sum, r) => sum + r.advice.crossDomainChallenges, 0) / 
                    Math.max(1, results.filter(r => r.success && r.advice.crossDomainChallenges > 0).length)
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
    
    /**
     * Phase 5: 計算投票統計數據
     * @param {Object} votes - 投票資料 (格式: {playerId: {value, timestamp}})
     * @returns {Object} 統計資料
     */
    calculateVotingStatistics(votes) {
        try {
            const voteValues = Object.values(votes || {});
            const numericVotes = voteValues
                .map(vote => typeof vote.value === 'number' ? vote.value : null)
                .filter(value => value !== null);
                
            if (numericVotes.length === 0) {
                return {
                    averagePoints: 0,
                    consensus: 0,
                    totalVotes: 0,
                    min: 0,
                    max: 0,
                    variance: 0
                };
            }
            
            // 計算統計數據
            const total = numericVotes.reduce((sum, vote) => sum + vote, 0);
            const averagePoints = total / numericVotes.length;
            const min = Math.min(...numericVotes);
            const max = Math.max(...numericVotes);
            
            // 計算共識度（變異係數的反向）
            const mean = averagePoints;
            const variance = numericVotes.reduce((sum, vote) => sum + Math.pow(vote - mean, 2), 0) / numericVotes.length;
            const stdDev = Math.sqrt(variance);
            const coefficientOfVariation = mean > 0 ? stdDev / mean : 0;
            const consensus = Math.max(0, Math.min(100, (1 - coefficientOfVariation) * 100));
            
            return {
                averagePoints: Math.round(averagePoints * 10) / 10,
                consensus: Math.round(consensus),
                totalVotes: numericVotes.length,
                min,
                max,
                variance: Math.round(variance * 100) / 100
            };
        } catch (error) {
            console.error('❌ 計算投票統計失敗:', error);
            return {
                averagePoints: 0,
                consensus: 0,
                totalVotes: 0,
                min: 0,
                max: 0,
                variance: 0
            };
        }
    }
    
    /**
     * Phase 5: 學習機制 - 記錄和分析投票歷史
     * @param {Object} gameData - 遊戲資料
     * @param {Object} votingHistory - 投票歷史
     */
    recordVotingSession(gameData, votingHistory = null) {
        try {
            if (!gameData || !gameData.votes) return;
            
            const sessionRecord = {
                timestamp: Date.now(),
                roomId: gameData.sessionInfo?.roomId || 'unknown',
                taskType: gameData.taskType || 'general',
                votes: gameData.votes,
                players: gameData.players || {},
                statistics: this.calculateVotingStatistics(gameData.votes),
                sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            };
            
            // 儲存到本地歷史記錄
            this.saveToVotingHistory(sessionRecord);
            
            // 更新學習模型
            this.updateLearningModel(sessionRecord);
            
            console.log('📚 投票歷史已記錄:', sessionRecord.sessionId);
            
        } catch (error) {
            console.error('❌ 記錄投票歷史失敗:', error);
        }
    }
    
    /**
     * Phase 5: 儲存投票歷史到本地存儲
     * @param {Object} sessionRecord - 會話記錄
     */
    saveToVotingHistory(sessionRecord) {
        try {
            const storageKey = 'scrumPoker_votingHistory';
            let history = [];
            
            try {
                const existingHistory = localStorage.getItem(storageKey);
                if (existingHistory) {
                    history = JSON.parse(existingHistory);
                }
            } catch (parseError) {
                console.warn('解析歷史記錄失敗，使用空陣列:', parseError);
                history = [];
            }
            
            // 添加新記錄
            history.unshift(sessionRecord);
            
            // 只保留最近 50 筆記錄，避免存儲過大
            if (history.length > 50) {
                history = history.slice(0, 50);
            }
            
            localStorage.setItem(storageKey, JSON.stringify(history));
            console.log(`💾 投票歷史已儲存 (${history.length} 筆記錄)`);
            
        } catch (error) {
            console.error('❌ 儲存投票歷史失敗:', error);
        }
    }
    
    /**
     * Phase 5: 更新學習模型
     * @param {Object} sessionRecord - 會話記錄
     */
    updateLearningModel(sessionRecord) {
        try {
            const modelKey = 'scrumPoker_learningModel';
            let model = this.getDefaultLearningModel();
            
            try {
                const existingModel = localStorage.getItem(modelKey);
                if (existingModel) {
                    model = { ...model, ...JSON.parse(existingModel) };
                }
            } catch (parseError) {
                console.warn('解析學習模型失敗，使用預設模型:', parseError);
            }
            
            // 更新任務類型模式
            this.updateTaskTypePatterns(model, sessionRecord);
            
            // 更新角色投票模式
            this.updateRoleVotingPatterns(model, sessionRecord);
            
            // 更新共識度模式
            this.updateConsensusPatterns(model, sessionRecord);
            
            // 更新使用次數
            model.metadata.totalSessions++;
            model.metadata.lastUpdated = Date.now();
            
            localStorage.setItem(modelKey, JSON.stringify(model));
            console.log('🧠 學習模型已更新');
            
        } catch (error) {
            console.error('❌ 更新學習模型失敗:', error);
        }
    }
    
    /**
     * Phase 5: 取得預設學習模型
     * @returns {Object} 預設學習模型
     */
    getDefaultLearningModel() {
        return {
            taskTypePatterns: {},
            roleVotingPatterns: {},
            consensusPatterns: {
                low: { threshold: 30, count: 0, avgRange: 0 },
                medium: { threshold: 70, count: 0, avgRange: 0 },
                high: { threshold: 100, count: 0, avgRange: 0 }
            },
            metadata: {
                version: '1.0',
                totalSessions: 0,
                createdAt: Date.now(),
                lastUpdated: Date.now()
            }
        };
    }
    
    /**
     * Phase 5: 更新任務類型模式
     * @param {Object} model - 學習模型
     * @param {Object} sessionRecord - 會話記錄
     */
    updateTaskTypePatterns(model, sessionRecord) {
        const taskType = sessionRecord.taskType;
        const stats = sessionRecord.statistics;
        
        if (!model.taskTypePatterns[taskType]) {
            model.taskTypePatterns[taskType] = {
                count: 0,
                avgPoints: [],
                avgConsensus: [],
                commonRanges: {}
            };
        }
        
        const pattern = model.taskTypePatterns[taskType];
        pattern.count++;
        pattern.avgPoints.push(stats.averagePoints);
        pattern.avgConsensus.push(stats.consensus);
        
        // 記錄常見範圍
        const range = `${stats.min}-${stats.max}`;
        pattern.commonRanges[range] = (pattern.commonRanges[range] || 0) + 1;
        
        // 只保留最近 20 筆資料
        if (pattern.avgPoints.length > 20) {
            pattern.avgPoints = pattern.avgPoints.slice(-20);
            pattern.avgConsensus = pattern.avgConsensus.slice(-20);
        }
    }
    
    /**
     * Phase 5: 更新角色投票模式
     * @param {Object} model - 學習模型
     * @param {Object} sessionRecord - 會話記錄
     */
    updateRoleVotingPatterns(model, sessionRecord) {
        Object.entries(sessionRecord.votes).forEach(([playerId, vote]) => {
            const playerRole = vote.player_role || 'other';
            
            if (!model.roleVotingPatterns[playerRole]) {
                model.roleVotingPatterns[playerRole] = {
                    count: 0,
                    voteDistribution: {},
                    avgVote: [],
                    tendencies: {}
                };
            }
            
            const rolePattern = model.roleVotingPatterns[playerRole];
            rolePattern.count++;
            
            if (typeof vote.value === 'number') {
                rolePattern.avgVote.push(vote.value);
                rolePattern.voteDistribution[vote.value] = (rolePattern.voteDistribution[vote.value] || 0) + 1;
                
                // 只保留最近 30 筆投票
                if (rolePattern.avgVote.length > 30) {
                    rolePattern.avgVote = rolePattern.avgVote.slice(-30);
                }
            }
        });
    }
    
    /**
     * Phase 5: 更新共識度模式
     * @param {Object} model - 學習模型
     * @param {Object} sessionRecord - 會話記錄
     */
    updateConsensusPatterns(model, sessionRecord) {
        const consensus = sessionRecord.statistics.consensus;
        const range = sessionRecord.statistics.max - sessionRecord.statistics.min;
        
        let category = 'low';
        if (consensus >= 70) category = 'high';
        else if (consensus >= 30) category = 'medium';
        
        const pattern = model.consensusPatterns[category];
        pattern.count++;
        pattern.avgRange = ((pattern.avgRange * (pattern.count - 1)) + range) / pattern.count;
    }
    
    /**
     * Phase 5: 應用學習模型到建議生成
     * @param {Object} gameData - 遊戲資料
     * @returns {Object} 個人化建議增強
     */
    applyLearningModel(gameData) {
        try {
            const modelKey = 'scrumPoker_learningModel';
            const modelData = localStorage.getItem(modelKey);
            
            if (!modelData) {
                return { enhanced: false, reason: 'no_learning_data' };
            }
            
            const model = JSON.parse(modelData);
            const taskType = gameData.taskType || 'general';
            const enhancement = {};
            
            // 基於歷史資料的任務類型洞察
            if (model.taskTypePatterns[taskType]) {
                const pattern = model.taskTypePatterns[taskType];
                const historicalAvg = pattern.avgPoints.reduce((a, b) => a + b, 0) / pattern.avgPoints.length;
                const currentAvg = this.calculateVotingStatistics(gameData.votes).averagePoints;
                
                enhancement.taskTypeInsight = {
                    historicalAverage: Math.round(historicalAvg * 10) / 10,
                    currentAverage: currentAvg,
                    variance: Math.abs(currentAvg - historicalAvg),
                    sessionCount: pattern.count
                };
                
                // 生成基於歷史的建議
                if (currentAvg > historicalAvg + 2) {
                    enhancement.learningAdvice = '當前估點比團隊歷史平均高，可能存在複雜性被低估的情況。';
                } else if (currentAvg < historicalAvg - 2) {
                    enhancement.learningAdvice = '當前估點比團隊歷史平均低，團隊可能對此類任務更有經驗了。';
                }
            }
            
            // 角色模式分析
            enhancement.roleInsights = this.analyzeRolePatterns(model, gameData);
            
            return {
                enhanced: true,
                data: enhancement,
                modelInfo: {
                    totalSessions: model.metadata.totalSessions,
                    lastUpdated: model.metadata.lastUpdated
                }
            };
            
        } catch (error) {
            console.error('❌ 應用學習模型失敗:', error);
            return { enhanced: false, reason: 'error', error: error.message };
        }
    }
    
    /**
     * Phase 5: 分析角色投票模式
     * @param {Object} model - 學習模型
     * @param {Object} gameData - 遊戲資料
     * @returns {Object} 角色洞察
     */
    analyzeRolePatterns(model, gameData) {
        const insights = {};
        
        Object.entries(gameData.votes).forEach(([playerId, vote]) => {
            const playerRole = vote.player_role || 'other';
            const rolePattern = model.roleVotingPatterns[playerRole];
            
            if (rolePattern && rolePattern.avgVote.length > 0) {
                const historicalAvg = rolePattern.avgVote.reduce((a, b) => a + b, 0) / rolePattern.avgVote.length;
                const currentVote = vote.value;
                
                if (typeof currentVote === 'number') {
                    insights[playerRole] = {
                        historicalAverage: Math.round(historicalAvg * 10) / 10,
                        currentVote: currentVote,
                        deviation: Math.abs(currentVote - historicalAvg),
                        sessionCount: rolePattern.count
                    };
                }
            }
        });
        
        return insights;
    }
    
    /**
     * Phase 5: 取得角色顯示名稱
     * @param {string} role - 角色代碼
     * @returns {string} 顯示名稱
     */
    getRoleDisplayName(role) {
        const roleNames = {
            'dev': '開發者',
            'qa': 'QA 測試',
            'scrum_master': 'Scrum Master',
            'po': 'Product Owner',
            'other': '其他角色'
        };
        return roleNames[role] || role;
    }
    
    /**
     * Phase 5: 導出學習數據（用於備份或團隊共享）
     * @returns {Object} 可導出的學習數據
     */
    exportLearningData() {
        try {
            const historyKey = 'scrumPoker_votingHistory';
            const modelKey = 'scrumPoker_learningModel';
            
            const historyData = localStorage.getItem(historyKey);
            const modelData = localStorage.getItem(modelKey);
            
            if (!historyData || !modelData) {
                return { 
                    success: false, 
                    error: 'No learning data available to export',
                    data: null 
                };
            }
            
            const exportData = {
                version: '1.0.0',
                exportedAt: Date.now(),
                exportedBy: 'ScrumAdviceEngine',
                votingHistory: JSON.parse(historyData),
                learningModel: JSON.parse(modelData),
                metadata: {
                    totalSessions: JSON.parse(historyData).length,
                    modelVersion: JSON.parse(modelData).metadata?.version || '1.0',
                    taskTypes: Object.keys(JSON.parse(modelData).taskTypePatterns || {}),
                    roles: Object.keys(JSON.parse(modelData).roleVotingPatterns || {})
                }
            };
            
            return {
                success: true,
                data: exportData,
                filename: `ScrumPoker_LearningData_${new Date().toISOString().slice(0,10).replace(/-/g,'')}.json`
            };
        } catch (error) {
            console.error('❌ 導出學習數據失敗:', error);
            return { 
                success: false, 
                error: error.message,
                data: null 
            };
        }
    }
    
    /**
     * Phase 5: 導入學習數據（從備份或其他團隊成員）
     * @param {Object} importData - 導入的學習數據
     * @param {boolean} mergeMode - 是否合併模式（true=合併，false=覆蓋）
     * @returns {Object} 導入結果
     */
    importLearningData(importData, mergeMode = true) {
        try {
            // 驗證導入數據格式
            if (!importData || !importData.votingHistory || !importData.learningModel) {
                throw new Error('Invalid import data format');
            }
            
            if (!importData.version || !importData.exportedAt) {
                throw new Error('Missing required metadata in import data');
            }
            
            const historyKey = 'scrumPoker_votingHistory';
            const modelKey = 'scrumPoker_learningModel';
            
            if (mergeMode) {
                // 合併模式：保留現有數據並添加新數據
                const existingHistory = JSON.parse(localStorage.getItem(historyKey) || '[]');
                const existingModel = JSON.parse(localStorage.getItem(modelKey) || '{}');
                
                // 合併投票歷史（去重）
                const mergedHistory = [...existingHistory];
                const existingRoomIds = new Set(existingHistory.map(h => h.sessionInfo?.roomId));
                
                importData.votingHistory.forEach(newSession => {
                    if (!existingRoomIds.has(newSession.sessionInfo?.roomId)) {
                        mergedHistory.push(newSession);
                    }
                });
                
                // 限制合併後的總數量
                const finalHistory = mergedHistory.slice(0, 50);
                
                // 合併學習模型（重新訓練）
                const mergedModel = this.getDefaultLearningModel();
                finalHistory.forEach(session => {
                    this.updateTaskTypePatterns(mergedModel, session);
                    this.updateRoleVotingPatterns(mergedModel, session);
                    this.updateConsensusPatterns(mergedModel, session);
                });
                
                localStorage.setItem(historyKey, JSON.stringify(finalHistory));
                localStorage.setItem(modelKey, JSON.stringify(mergedModel));
                
                return {
                    success: true,
                    mode: 'merged',
                    totalSessions: finalHistory.length,
                    newSessions: importData.votingHistory.length,
                    message: `Successfully merged ${importData.votingHistory.length} sessions with existing data`
                };
                
            } else {
                // 覆蓋模式：完全替換現有數據
                localStorage.setItem(historyKey, JSON.stringify(importData.votingHistory));
                localStorage.setItem(modelKey, JSON.stringify(importData.learningModel));
                
                return {
                    success: true,
                    mode: 'replaced',
                    totalSessions: importData.votingHistory.length,
                    message: `Successfully replaced all data with ${importData.votingHistory.length} sessions`
                };
            }
            
        } catch (error) {
            console.error('❌ 導入學習數據失敗:', error);
            return {
                success: false,
                error: error.message,
                message: 'Import failed: ' + error.message
            };
        }
    }
    
    /**
     * Phase 5: 生成可下載的數據備份文件
     * @returns {string} 數據下載 URL
     */
    generateDataDownload() {
        const exportResult = this.exportLearningData();
        
        if (!exportResult.success) {
            throw new Error(exportResult.error);
        }
        
        const dataStr = JSON.stringify(exportResult.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        return {
            url: URL.createObjectURL(dataBlob),
            filename: exportResult.filename,
            size: Math.round(dataBlob.size / 1024) + ' KB'
        };
    }

    /**
     * Phase 5: 取得投票歷史摘要
     * @returns {Object} 歷史摘要
     */
    getVotingHistorySummary() {
        try {
            const historyKey = 'scrumPoker_votingHistory';
            const modelKey = 'scrumPoker_learningModel';
            
            const historyData = localStorage.getItem(historyKey);
            const modelData = localStorage.getItem(modelKey);
            
            if (!historyData || !modelData) {
                return { available: false, reason: 'no_data' };
            }
            
            const history = JSON.parse(historyData);
            const model = JSON.parse(modelData);
            
            return {
                available: true,
                totalSessions: history.length,
                dateRange: {
                    oldest: new Date(history[history.length - 1]?.timestamp).toLocaleDateString(),
                    newest: new Date(history[0]?.timestamp).toLocaleDateString()
                },
                taskTypes: Object.keys(model.taskTypePatterns),
                roles: Object.keys(model.roleVotingPatterns),
                modelVersion: model.metadata.version,
                lastUpdated: new Date(model.metadata.lastUpdated).toLocaleString()
            };
            
        } catch (error) {
            console.error('❌ 取得歷史摘要失敗:', error);
            return { available: false, reason: 'error', error: error.message };
        }
    }
}

// 匯出到全域
window.ScrumAdviceEngine = ScrumAdviceEngine;

console.log('🧠 ScrumAdviceEngine 模組已載入 - Phase 5 Enhanced with Learning + Multi-Select Support');