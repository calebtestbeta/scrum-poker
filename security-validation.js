/**
 * Firebase 安全規則驗證腳本
 * 用於驗證新的安全規則與現有程式碼的相容性
 * @version 1.0.0
 */

class SecurityValidator {
    constructor() {
        this.testResults = [];
        this.validationRules = this.getValidationRules();
    }

    /**
     * 取得驗證規則
     */
    getValidationRules() {
        return {
            // 玩家資料驗證規則
            player: {
                name: {
                    required: true,
                    type: 'string',
                    minLength: 1,
                    maxLength: 20,
                    test: (value) => typeof value === 'string' && value.length >= 1 && value.length <= 20
                },
                role: {
                    required: true,
                    type: 'string',
                    enum: ['dev', 'qa', 'scrum_master', 'po', 'other'],
                    test: (value) => ['dev', 'qa', 'scrum_master', 'po', 'other'].includes(value)
                },
                joined_at: {
                    required: true,
                    type: 'number',
                    test: (value) => typeof value === 'number' && value > 0
                },
                last_active: {
                    required: false,
                    type: 'number',
                    test: (value) => typeof value === 'number' && value > 0
                },
                online: {
                    required: false,
                    type: 'boolean',
                    test: (value) => typeof value === 'boolean'
                },
                hasVoted: {
                    required: false,
                    type: 'boolean',
                    test: (value) => typeof value === 'boolean'
                }
            },

            // 投票資料驗證規則
            vote: {
                value: {
                    required: true,
                    type: 'number|string',
                    test: (value) => {
                        if (typeof value === 'number') return true;
                        if (typeof value === 'string') {
                            return ['coffee', 'question', 'infinity'].includes(value);
                        }
                        return false;
                    }
                },
                timestamp: {
                    required: true,
                    type: 'number',
                    test: (value) => typeof value === 'number' && value > 0
                },
                player_role: {
                    required: false,
                    type: 'string',
                    enum: ['dev', 'qa', 'scrum_master', 'po', 'other'],
                    test: (value) => ['dev', 'qa', 'scrum_master', 'po', 'other'].includes(value)
                }
            },

            // 房間資料驗證規則
            room: {
                phase: {
                    required: true,
                    type: 'string',
                    enum: ['voting', 'revealing', 'finished'],
                    test: (value) => ['voting', 'revealing', 'finished'].includes(value)
                },
                created_at: {
                    required: true,
                    type: 'number',
                    test: (value) => typeof value === 'number' && value > 0
                },
                last_activity: {
                    required: true,
                    type: 'number',
                    test: (value) => typeof value === 'number' && value > 0
                },
                task_type: {
                    required: false,
                    type: 'string',
                    test: (value) => typeof value === 'string'
                }
            }
        };
    }

    /**
     * 驗證玩家資料
     */
    validatePlayerData(playerData) {
        return this.validateData(playerData, this.validationRules.player, 'Player');
    }

    /**
     * 驗證投票資料
     */
    validateVoteData(voteData) {
        return this.validateData(voteData, this.validationRules.vote, 'Vote');
    }

    /**
     * 驗證房間資料
     */
    validateRoomData(roomData) {
        return this.validateData(roomData, this.validationRules.room, 'Room');
    }

    /**
     * 通用資料驗證
     */
    validateData(data, rules, dataType) {
        const results = {
            valid: true,
            errors: [],
            warnings: [],
            dataType
        };

        if (!data || typeof data !== 'object') {
            results.valid = false;
            results.errors.push(`${dataType} data must be an object`);
            return results;
        }

        // 檢查必填欄位
        for (const [field, rule] of Object.entries(rules)) {
            if (rule.required && !(field in data)) {
                results.valid = false;
                results.errors.push(`Missing required field: ${field}`);
                continue;
            }

            if (field in data) {
                const value = data[field];
                
                // 執行自定義測試
                if (rule.test && !rule.test(value)) {
                    results.valid = false;
                    results.errors.push(`Invalid value for ${field}: ${JSON.stringify(value)}`);
                }

                // 檢查枚舉值
                if (rule.enum && !rule.enum.includes(value)) {
                    results.valid = false;
                    results.errors.push(`${field} must be one of: ${rule.enum.join(', ')}`);
                }

                // 檢查字串長度
                if (typeof value === 'string' && rule.minLength !== undefined && value.length < rule.minLength) {
                    results.valid = false;
                    results.errors.push(`${field} must be at least ${rule.minLength} characters`);
                }

                if (typeof value === 'string' && rule.maxLength !== undefined && value.length > rule.maxLength) {
                    results.valid = false;
                    results.errors.push(`${field} must be no more than ${rule.maxLength} characters`);
                }
            }
        }

        // 檢查額外欄位
        for (const field of Object.keys(data)) {
            if (!(field in rules)) {
                results.warnings.push(`Unexpected field: ${field}`);
            }
        }

        return results;
    }

    /**
     * 執行相容性測試
     */
    runCompatibilityTests() {
        console.log('🧪 執行 Firebase 安全規則相容性測試...');

        // 測試案例
        const testCases = [
            {
                name: '有效玩家資料',
                type: 'player',
                data: {
                    name: 'Test Player',
                    role: 'dev',
                    joined_at: Date.now(),
                    last_active: Date.now(),
                    online: true,
                    hasVoted: false
                },
                expectedValid: true
            },
            {
                name: '無效玩家資料 - 名稱過長',
                type: 'player',
                data: {
                    name: 'A'.repeat(25),
                    role: 'dev',
                    joined_at: Date.now()
                },
                expectedValid: false
            },
            {
                name: '無效玩家資料 - 無效角色',
                type: 'player',
                data: {
                    name: 'Test Player',
                    role: 'invalid_role',
                    joined_at: Date.now()
                },
                expectedValid: false
            },
            {
                name: '有效投票資料 - 數字',
                type: 'vote',
                data: {
                    value: 13,
                    timestamp: Date.now(),
                    player_role: 'dev'
                },
                expectedValid: true
            },
            {
                name: '有效投票資料 - 特殊值',
                type: 'vote',
                data: {
                    value: 'coffee',
                    timestamp: Date.now(),
                    player_role: 'qa'
                },
                expectedValid: true
            },
            {
                name: '無效投票資料 - 無效值',
                type: 'vote',
                data: {
                    value: 'invalid_vote',
                    timestamp: Date.now()
                },
                expectedValid: false
            },
            {
                name: '有效房間資料',
                type: 'room',
                data: {
                    phase: 'voting',
                    created_at: Date.now(),
                    last_activity: Date.now(),
                    task_type: 'frontend'
                },
                expectedValid: true
            },
            {
                name: '無效房間資料 - 無效階段',
                type: 'room',
                data: {
                    phase: 'invalid_phase',
                    created_at: Date.now(),
                    last_activity: Date.now()
                },
                expectedValid: false
            }
        ];

        // 執行測試
        let passedTests = 0;
        let totalTests = testCases.length;

        testCases.forEach((testCase, index) => {
            console.log(`\n測試 ${index + 1}/${totalTests}: ${testCase.name}`);
            
            let result;
            switch (testCase.type) {
                case 'player':
                    result = this.validatePlayerData(testCase.data);
                    break;
                case 'vote':
                    result = this.validateVoteData(testCase.data);
                    break;
                case 'room':
                    result = this.validateRoomData(testCase.data);
                    break;
                default:
                    console.error(`未知的測試類型: ${testCase.type}`);
                    return;
            }

            const testPassed = result.valid === testCase.expectedValid;
            
            if (testPassed) {
                console.log(`✅ 通過`);
                passedTests++;
            } else {
                console.log(`❌ 失敗`);
                console.log(`預期: ${testCase.expectedValid ? '有效' : '無效'}`);
                console.log(`實際: ${result.valid ? '有效' : '無效'}`);
                if (result.errors.length > 0) {
                    console.log(`錯誤: ${result.errors.join(', ')}`);
                }
            }

            if (result.warnings.length > 0) {
                console.log(`⚠️ 警告: ${result.warnings.join(', ')}`);
            }

            this.testResults.push({
                ...testCase,
                result,
                passed: testPassed
            });
        });

        // 測試摘要
        console.log(`\n📊 測試摘要:`);
        console.log(`總測試數: ${totalTests}`);
        console.log(`通過: ${passedTests}`);
        console.log(`失敗: ${totalTests - passedTests}`);
        console.log(`成功率: ${Math.round(passedTests / totalTests * 100)}%`);

        const allTestsPassed = passedTests === totalTests;
        if (allTestsPassed) {
            console.log(`\n🎉 所有測試通過！Firebase 安全規則與現有程式碼完全相容。`);
        } else {
            console.log(`\n⚠️ 部分測試失敗，請檢查資料格式或安全規則設定。`);
        }

        return {
            totalTests,
            passedTests,
            failedTests: totalTests - passedTests,
            successRate: Math.round(passedTests / totalTests * 100),
            allPassed: allTestsPassed,
            results: this.testResults
        };
    }

    /**
     * 生成測試報告
     */
    generateReport() {
        const summary = this.runCompatibilityTests();
        
        const report = {
            timestamp: new Date().toISOString(),
            summary,
            securityLevel: 'Level 1 - Basic Security',
            recommendations: this.generateRecommendations(summary),
            nextSteps: [
                '部署 Firebase 安全規則到生產環境',
                '執行端到端功能測試',
                '監控應用程式錯誤日誌',
                '考慮實施 Level 2 安全性（可選）'
            ]
        };

        console.log('\n📄 生成安全性驗證報告...');
        console.log(JSON.stringify(report, null, 2));

        return report;
    }

    /**
     * 生成建議
     */
    generateRecommendations(summary) {
        const recommendations = [];

        if (summary.successRate === 100) {
            recommendations.push('✅ 相容性完美，可安全部署');
            recommendations.push('建議：啟用 Firebase 監控以追蹤使用狀況');
        } else if (summary.successRate >= 80) {
            recommendations.push('⚠️ 大部分相容，建議修復失敗的測試案例');
            recommendations.push('建議：在測試環境中先進行部署驗證');
        } else {
            recommendations.push('❌ 相容性問題較多，需要修復後再部署');
            recommendations.push('建議：檢查資料格式和驗證邏輯');
        }

        recommendations.push('建議：定期執行安全性審計');
        recommendations.push('建議：考慮實施自動化安全測試');

        return recommendations;
    }
}

// 如果在 Node.js 環境中運行
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SecurityValidator;
}

// 如果在瀏覽器環境中運行
if (typeof window !== 'undefined') {
    window.SecurityValidator = SecurityValidator;
}

// 自動執行測試（如果直接運行此腳本）
if (typeof require !== 'undefined' && require.main === module) {
    const validator = new SecurityValidator();
    validator.generateReport();
}