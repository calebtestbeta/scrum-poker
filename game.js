// 遊戲整合邏輯 - 連接所有管理器和 UI 元素
// 全域函數供 HTML 呼叫

// 版本檢查和錯誤監控
window.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Scrum Poker 遊戲邏輯已載入 - 版本: a1b2c3d4 (無身份驗證)');
    
    // 檢查必要的依賴
    const dependencies = [
        { name: 'p5.js', check: () => typeof p5 !== 'undefined' },
        { name: 'Firebase', check: () => typeof firebase !== 'undefined' },
        { name: 'GAME_CONFIG', check: () => typeof GAME_CONFIG !== 'undefined' }
    ];
    
    dependencies.forEach(dep => {
        if (dep.check()) {
            console.log(`✅ ${dep.name} 已載入`);
        } else {
            console.error(`❌ ${dep.name} 載入失敗`);
        }
    });
});

// 開始遊戲
async function startGame() {
    const playerName = document.getElementById('playerName').value.trim();
    const playerRole = document.getElementById('playerRole').value;
    const roomId = document.getElementById('roomId').value.trim();
    const taskType = document.getElementById('taskType') ? document.getElementById('taskType').value : '';
    
    // 驗證輸入
    if (!playerName) {
        uiManager.showError('請輸入你的名字');
        return;
    }
    
    try {
        // 儲存使用者資訊到 Cookie（如果使用者選擇記住）
        if (typeof saveUserInfoToCookie === 'function') {
            const saved = saveUserInfoToCookie(playerName, playerRole);
            if (saved) {
                console.log('✅ 使用者資訊已儲存到 Cookie');
            }
        }
        
        // 設定載入狀態
        gameState = 'loading';
        
        // 初始化 Firebase 設定
        const config = await getFirebaseConfig();
        
        // 初始化 Firebase Manager
        await firebaseManager.initialize(config);
        
        // 設定 Firebase 回調
        setupFirebaseCallbacks();
        
        // 加入房間
        const result = await firebaseManager.joinRoom(roomId, playerName, playerRole);
        
        if (result) {
            // 儲存遊戲會話資訊到 Cookie
            if (typeof cookieManager !== 'undefined' && cookieManager.saveGameSession) {
                const sessionSaved = cookieManager.saveGameSession({
                    playerId: result.playerId,
                    roomId: result.roomId,
                    playerName: playerName,
                    playerRole: playerRole
                });
                
                if (sessionSaved) {
                    console.log('💾 遊戲會話已儲存到 Cookie');
                } else {
                    console.warn('⚠️ 遊戲會話儲存失敗，但遊戲將繼續進行');
                }
            }
            
            // 建立當前玩家
            currentPlayer = {
                id: result.playerId,
                name: playerName,
                role: playerRole
            };
            
            // 在遊戲桌面新增玩家
            gameTable.addPlayer(result.playerId, playerName, playerRole);
            
            // 設定任務類型到建議系統
            if (taskType && scrumMasterAdvice) {
                scrumMasterAdvice.setTaskType(taskType);
                console.log(`🎯 任務類型已設定: ${taskType}`);
            }
            
            // 啟動 UI
            uiManager.startGame(result.roomId, result.playerId);
            
            console.log('🎮 遊戲啟動成功');
        } else {
            throw new Error('無法加入房間');
        }
        
    } catch (error) {
        console.error('啟動遊戲失敗:', error);
        uiManager.showError('啟動遊戲失敗: ' + error.message);
        gameState = 'login';
    }
}

// 開牌
function revealCards() {
    if (!gameTable || !firebaseManager) {
        console.warn('遊戲未初始化');
        return;
    }
    
    // 觸發動畫效果
    animationManager.flash(color(251, 191, 36), 200);
    animationManager.shake(5, 300);
    
    // 執行開牌
    gameTable.revealCards();
    firebaseManager.revealCards();
    
    uiManager.showSuccess('開牌！');
}

// 清除投票
function clearVotes() {
    if (!gameTable || !firebaseManager) {
        console.warn('遊戲未初始化');
        return;
    }
    
    // 更新遊戲會話活躍時間（標記玩家仍在遊戲中）
    if (typeof cookieManager !== 'undefined' && cookieManager.updateGameSessionActivity) {
        cookieManager.updateGameSessionActivity();
    }
    
    // 執行清除
    gameTable.clearVotes();
    firebaseManager.clearVotes();
    
    // 重設 UI 統計
    uiManager.resetStatistics();
    
    uiManager.showSuccess('重新開始！');
}

// 離開遊戲
function leaveGame() {
    if (firebaseManager) {
        firebaseManager.leaveRoom();
    }
    
    // 清除遊戲會話 Cookie（玩家主動離開）
    if (typeof cookieManager !== 'undefined' && cookieManager.clearGameSession) {
        cookieManager.clearGameSession();
        console.log('🧹 玩家主動離開，遊戲會話已清除');
    }
    
    // 清除遊戲狀態
    currentPlayer = null;
    
    // 重設遊戲桌面
    if (gameTable) {
        gameTable.players = [];
    }
    
    // 清除動畫效果
    animationManager.clearAllEffects();
    
    // 結束 UI
    uiManager.endGame();
    
    console.log('👋 離開遊戲');
}

// 儲存 Firebase 設定
function saveFirebaseConfig() {
    const projectId = document.getElementById('projectId').value.trim();
    const apiKey = document.getElementById('apiKey').value.trim();
    
    if (!projectId || !apiKey) {
        uiManager.showError('請填寫完整的 Firebase 設定');
        return;
    }
    
    // 儲存到 localStorage
    const config = { projectId, apiKey };
    localStorage.setItem('scrumPokerConfig', JSON.stringify(config));
    localStorage.removeItem('scrumPokerMode'); // 清除本地模式標記
    
    // 隱藏設定區域
    const configSection = document.querySelector('.firebase-config');
    if (configSection) {
        configSection.style.display = 'none';
    }
    
    uiManager.showSuccess('Firebase 設定已儲存！');
}

// 使用本地模式
function useLocalMode() {
    // 清除 Firebase 設定
    localStorage.removeItem('scrumPokerConfig');
    localStorage.setItem('scrumPokerMode', 'local');
    
    // 隱藏設定區域
    const configSection = document.querySelector('.firebase-config');
    if (configSection) {
        configSection.style.display = 'none';
    }
    
    uiManager.showSuccess('已切換到本地模式！');
}

// 取得 Firebase 設定
async function getFirebaseConfig() {
    const savedConfig = localStorage.getItem('scrumPokerConfig');
    const savedMode = localStorage.getItem('scrumPokerMode');
    
    if (savedConfig) {
        return JSON.parse(savedConfig);
    } else if (savedMode === 'local') {
        return null; // 使用本地模式
    } else {
        // 檢查是否有全域設定（從 firebase-config.js）
        if (typeof window.FIREBASE_CONFIG !== 'undefined') {
            return window.FIREBASE_CONFIG;
        }
        return null;
    }
}

// 設定 Firebase 回調函數
function setupFirebaseCallbacks() {
    if (!firebaseManager) return;
    
    firebaseManager.setCallbacks({
        onPlayerJoined: (playerData) => {
            console.log('玩家加入:', playerData.name);
            
            // 在遊戲桌面新增玩家
            if (gameTable && playerData.id !== currentPlayer?.id) {
                gameTable.addPlayer(playerData.id, playerData.name, playerData.role);
            }
            
            // 更新玩家數量
            const totalPlayers = gameTable ? gameTable.players.length : 0;
            uiManager.updatePlayerCount(totalPlayers);
            
            // 觸發加入動畫
            if (animationManager && gameTable) {
                const player = gameTable.players.find(p => p.id === playerData.id);
                if (player) {
                    animationManager.createCelebration(player.position.x, player.position.y);
                }
            }
            
            uiManager.showSuccess(`${playerData.name} 加入了遊戲`);
        },
        
        onPlayerLeft: (playerData) => {
            console.log('玩家離開:', playerData.name);
            
            // 從遊戲桌面移除玩家
            if (gameTable) {
                gameTable.removePlayer(playerData.id);
                
                // 如果有顯示刪除按鈕，則隱藏所有刪除按鈕
                gameTable.hideAllDeleteButtons();
            }
            
            // 更新玩家數量
            const totalPlayers = gameTable ? gameTable.players.length : 0;
            uiManager.updatePlayerCount(totalPlayers);
            
            // 根據是否為被刪除的玩家顯示不同訊息
            const isCurrentPlayer = currentPlayer && currentPlayer.id === playerData.id;
            if (isCurrentPlayer) {
                uiManager.showToast('你已被移除出遊戲', 'error');
                // 自動返回登入畫面
                setTimeout(() => {
                    leaveGame();
                }, 2000);
            } else {
                uiManager.showToast(`${playerData.name} 離開了遊戲`, 'info');
            }
        },
        
        onVoteUpdated: (playerData) => {
            console.log('投票更新:', playerData.name, playerData.vote);
            
            // 更新遊戲桌面的玩家狀態
            if (gameTable) {
                const player = gameTable.players.find(p => p.id === playerData.id);
                if (player && playerData.hasVoted) {
                    player.setVote(playerData.vote);
                    
                    // 觸發投票動畫
                    if (animationManager) {
                        animationManager.createExplosion(player.position.x, player.position.y, 10);
                    }
                }
                
                // 更新投票進度
                const votedCount = gameTable.players.filter(p => p.hasVoted).length;
                const totalCount = gameTable.players.length;
                uiManager.updateVotingProgress(votedCount, totalCount);
            }
        },
        
        onGameStateChanged: (roomData) => {
            console.log('遊戲狀態變更:', roomData.phase);
            
            if (roomData.phase === 'revealing') {
                // 開牌階段
                uiManager.updateGameStatus('revealing');
                
                if (gameTable) {
                    gameTable.gamePhase = 'revealing';
                    gameTable.revealStartTime = millis();
                }
                
                // 觸發開牌動畫
                if (animationManager) {
                    animationManager.flash(color(34, 197, 94), 500);
                    animationManager.shake(8, 400);
                }
            } else if (roomData.phase === 'voting') {
                // 投票階段
                uiManager.updateGameStatus('voting');
                
                if (gameTable) {
                    gameTable.gamePhase = 'voting';
                }
            } else if (roomData.phase === 'finished') {
                // 完成階段
                uiManager.updateGameStatus('finished');
                
                if (gameTable) {
                    gameTable.gamePhase = 'finished';
                }
                
                // 更新統計資料
                if (roomData.votes) {
                    const votes = Object.values(roomData.votes);
                    uiManager.updateStatistics(votes);
                }
                
                // 觸發慶祝動畫
                if (animationManager && gameTable) {
                    for (const player of gameTable.players) {
                        if (player.hasVoted) {
                            setTimeout(() => {
                                animationManager.createCelebration(player.position.x, player.position.y);
                            }, Math.random() * 1000);
                        }
                    }
                }
            }
        },
        
        onError: (errorMessage) => {
            console.error('Firebase 錯誤:', errorMessage);
            uiManager.showError(errorMessage);
        }
    });
}

// 任務類型建議資料庫
class TaskTypeAdviceDatabase {
    constructor() {
        this.taskAdviceData = {
            'frontend': {
                name: '前端開發',
                icon: '🖥️',
                suggestions: {
                    'tech_stack': [
                        '建議使用 React 或 Vue.js 等現代前端框架',
                        '考慮使用 TypeScript 提升程式碼品質',
                        '採用 CSS-in-JS 或 Tailwind CSS 解決樣式管理',
                        '整合 Webpack 或 Vite 優化打包流程'
                    ],
                    'resource_allocation': [
                        '需要有經驗的前端工程師主導開發',
                        '配置 UI/UX 設計師協助介面設計',
                        '安排跨瀏覽器相容性測試人員',
                        '預估 2-3 位前端工程師協作開發'
                    ],
                    'potential_risks': [
                        '不同瀏覽器相容性問題',
                        '響應式設計在各裝置的適配',
                        '前端效能優化與載入速度',
                        '第三方套件依賴風險'
                    ],
                    'best_practices': [
                        '建立完整的元件庫和設計系統',
                        '實施程式碼審查和自動化測試',
                        '建立 CI/CD 流程自動部署',
                        '採用 Git Flow 進行版本控制'
                    ]
                }
            },
            'backend': {
                name: '後端開發',
                icon: '⚙️',
                suggestions: {
                    'tech_stack': [
                        '考慮使用 Node.js、Java Spring 或 Python Django',
                        '採用 RESTful API 或 GraphQL 設計',
                        '使用 Docker 容器化部署',
                        '整合 Redis 或 MongoDB 提升效能'
                    ],
                    'resource_allocation': [
                        '需要資深後端工程師負責架構設計',
                        '配置資料庫管理員處理資料結構',
                        '安排 DevOps 工程師協助部署',
                        '預估 2-4 位後端工程師開發'
                    ],
                    'potential_risks': [
                        '資料庫效能與擴展性問題',
                        'API 介面設計與版本管理',
                        '安全性漏洞與權限控制',
                        '第三方服務整合穩定性'
                    ],
                    'best_practices': [
                        '建立完整的 API 文件與測試',
                        '實施資料庫備份與災難復原機制',
                        '採用微服務架構提升可維護性',
                        '建立監控與日誌分析系統'
                    ]
                }
            },
            'fullstack': {
                name: '全端開發',
                icon: '🔄',
                suggestions: {
                    'tech_stack': [
                        '建議使用 MEAN、MERN 或 Django + React 技術棧',
                        '採用統一的 JavaScript/TypeScript 開發',
                        '使用 Next.js 或 Nuxt.js 實現 SSR',
                        '整合 Prisma 或 Sequelize ORM'
                    ],
                    'resource_allocation': [
                        '需要有全端開發經驗的資深工程師',
                        '配置專職前端和後端工程師支援',
                        '安排 UI/UX 設計師協助介面設計',
                        '預估 3-5 位工程師協作開發'
                    ],
                    'potential_risks': [
                        '前後端介面整合複雜度高',
                        '技術棧選擇與學習成本',
                        '效能優化與部署複雜性',
                        '程式碼維護與團隊協作挑戰'
                    ],
                    'best_practices': [
                        '建立統一的程式碼規範與工具',
                        '實施前後端分離與 API 優先設計',
                        '採用 monorepo 管理程式碼庫',
                        '建立完整的端對端測試流程'
                    ]
                }
            },
            'mobile_app': {
                name: '手機應用程式',
                icon: '📱',
                suggestions: {
                    'tech_stack': [
                        '考慮 React Native 或 Flutter 跨平台開發',
                        '原生開發可選擇 Swift (iOS) 或 Kotlin (Android)',
                        '整合 Firebase 或 AWS Amplify 後端服務',
                        '採用 Redux 或 MobX 進行狀態管理'
                    ],
                    'resource_allocation': [
                        '需要移動端開發經驗的工程師',
                        '配置 UI/UX 設計師專精行動介面',
                        '安排 QA 測試各種裝置與系統版本',
                        '預估 2-4 位移動端工程師開發'
                    ],
                    'potential_risks': [
                        '不同裝置尺寸與效能差異',
                        'iOS 和 Android 平台相容性',
                        '應用商店審核與上架流程',
                        '使用者體驗與效能最佳化'
                    ],
                    'best_practices': [
                        '建立完整的裝置測試矩陣',
                        '實施自動化測試與 CI/CD 流程',
                        '採用響應式設計適配各尺寸',
                        '建立使用者回饋與分析機制'
                    ]
                }
            },
            'api_integration': {
                name: 'API 整合',
                icon: '🔌',
                suggestions: {
                    'tech_stack': [
                        '使用 Postman 或 Insomnia 進行 API 測試',
                        '採用 OpenAPI/Swagger 產生文件',
                        '整合 API Gateway 管理流量與安全',
                        '使用 GraphQL 整合多個 API 服務'
                    ],
                    'resource_allocation': [
                        '需要熟悉 API 設計的後端工程師',
                        '配置前端工程師處理資料整合',
                        '安排測試工程師驗證 API 功能',
                        '預估 1-3 位工程師專責整合'
                    ],
                    'potential_risks': [
                        '第三方 API 穩定性與變更風險',
                        '資料格式轉換與驗證複雜',
                        'API 限流與費用控制問題',
                        '網路延遲與錯誤處理機制'
                    ],
                    'best_practices': [
                        '建立完整的錯誤處理與重試機制',
                        '實施 API 快取與效能最佳化',
                        '採用介面抽象層降低耦合度',
                        '建立監控與警報系統'
                    ]
                }
            },
            'database': {
                name: '資料庫相關',
                icon: '🗄️',
                suggestions: {
                    'tech_stack': [
                        '選擇適合的資料庫：MySQL、PostgreSQL、MongoDB',
                        '使用 Redis 或 Memcached 進行快取',
                        '採用 Elasticsearch 實現全文搜尋',
                        '整合 Apache Kafka 處理資料流'
                    ],
                    'resource_allocation': [
                        '需要資料庫架構師設計資料結構',
                        '配置 DBA 負責效能調教與維護',
                        '安排後端工程師實作資料存取層',
                        '預估 1-2 位資料庫專家參與'
                    ],
                    'potential_risks': [
                        '資料遷移與系統相容性問題',
                        '資料庫效能瓶頸與擴展性',
                        '資料安全與備份復原機制',
                        '查詢優化與索引設計複雜'
                    ],
                    'best_practices': [
                        '建立完整的資料模型與正規化',
                        '實施定期備份與災難復原計畫',
                        '採用讀寫分離提升效能',
                        '建立資料庫監控與效能分析'
                    ]
                }
            },
            'testing': {
                name: '測試相關',
                icon: '🧪',
                suggestions: {
                    'tech_stack': [
                        '使用 Jest、Mocha 或 Cypress 進行自動化測試',
                        '採用 Selenium 進行跨瀏覽器測試',
                        '整合 SonarQube 進行程式碼品質檢測',
                        '使用 Postman 或 Newman 進行 API 測試'
                    ],
                    'resource_allocation': [
                        '需要測試架構師設計測試策略',
                        '配置自動化測試工程師撰寫測試案例',
                        '安排手動測試人員執行探索性測試',
                        '預估 2-3 位測試工程師參與'
                    ],
                    'potential_risks': [
                        '測試環境與正式環境差異',
                        '測試資料準備與維護複雜',
                        '自動化測試的穩定性問題',
                        '測試覆蓋率與測試品質平衡'
                    ],
                    'best_practices': [
                        '建立完整的測試金字塔結構',
                        '實施持續整合與自動化測試',
                        '採用行為驅動開發 (BDD) 方法',
                        '建立測試報告與品質指標監控'
                    ]
                }
            },
            'devops': {
                name: 'DevOps/部署',
                icon: '🚀',
                suggestions: {
                    'tech_stack': [
                        '使用 Docker 和 Kubernetes 進行容器化部署',
                        '採用 Jenkins、GitLab CI 或 GitHub Actions',
                        '整合 Terraform 或 Ansible 基礎設施管理',
                        '使用 Prometheus 和 Grafana 監控系統'
                    ],
                    'resource_allocation': [
                        '需要 DevOps 工程師設計部署流程',
                        '配置系統管理員維護伺服器環境',
                        '安排開發工程師配合 CI/CD 整合',
                        '預估 1-2 位 DevOps 專家參與'
                    ],
                    'potential_risks': [
                        '部署流程複雜度與穩定性',
                        '系統擴展性與負載均衡問題',
                        '安全性與權限管理複雜',
                        '監控與告警系統設定複雜'
                    ],
                    'best_practices': [
                        '建立完整的 CI/CD 流程與自動化部署',
                        '實施基礎設施即程式碼 (IaC)',
                        '採用藍綠部署或滾動更新策略',
                        '建立完整的監控與日誌分析系統'
                    ]
                }
            },
            'ui_ux': {
                name: 'UI/UX 設計',
                icon: '🎨',
                suggestions: {
                    'tech_stack': [
                        '使用 Figma、Sketch 或 Adobe XD 設計工具',
                        '採用 Storybook 建立元件庫文件',
                        '整合 Zeplin 或 Avocode 設計交付工具',
                        '使用 Principle 或 Framer 製作互動原型'
                    ],
                    'resource_allocation': [
                        '需要 UI/UX 設計師主導介面設計',
                        '配置使用者研究員進行用戶調研',
                        '安排前端工程師協助設計實現',
                        '預估 1-2 位設計師參與專案'
                    ],
                    'potential_risks': [
                        '設計與開發實現的落差',
                        '使用者需求理解不足',
                        '設計一致性與標準化問題',
                        '跨平台設計適配複雜度'
                    ],
                    'best_practices': [
                        '建立完整的設計系統與元件庫',
                        '實施使用者研究與可用性測試',
                        '採用設計思考與敏捷設計流程',
                        '建立設計與開發協作機制'
                    ]
                }
            },
            'research': {
                name: '技術研究',
                icon: '🔍',
                suggestions: {
                    'tech_stack': [
                        '建立技術評估框架與比較矩陣',
                        '使用 POC (概念驗證) 驗證技術可行性',
                        '採用 A/B 測試驗證技術效果',
                        '整合監控工具量化研究成果'
                    ],
                    'resource_allocation': [
                        '需要資深技術專家主導研究',
                        '配置不同領域工程師提供專業意見',
                        '安排產品經理評估商業價值',
                        '預估 1-3 位研究人員投入'
                    ],
                    'potential_risks': [
                        '研究範圍過大導致時程延誤',
                        '技術可行性與實際應用落差',
                        '研究成果無法量化評估',
                        '研究方向與商業目標偏離'
                    ],
                    'best_practices': [
                        '建立明確的研究目標與成功指標',
                        '實施階段性里程碑與進度檢核',
                        '採用敏捷研究方法快速驗證',
                        '建立研究成果分享與文件化機制'
                    ]
                }
            },
            'maintenance': {
                name: '系統維護',
                icon: '🔧',
                suggestions: {
                    'tech_stack': [
                        '使用日誌分析工具如 ELK Stack',
                        '採用監控系統如 New Relic 或 Datadog',
                        '整合自動化工具處理常見問題',
                        '使用版本管理追蹤變更歷程'
                    ],
                    'resource_allocation': [
                        '需要系統管理員負責日常維護',
                        '配置開發工程師處理錯誤修復',
                        '安排 QA 工程師驗證修復效果',
                        '預估 1-2 位維護人員負責'
                    ],
                    'potential_risks': [
                        '系統停機時間影響使用者體驗',
                        '修復過程可能引入新的問題',
                        '維護文件不完整影響效率',
                        '緊急修復與正常開發衝突'
                    ],
                    'best_practices': [
                        '建立完整的維護計畫與流程',
                        '實施預防性維護與定期檢查',
                        '採用自動化工具減少人為錯誤',
                        '建立完整的維護文件與知識庫'
                    ]
                }
            },
            'security': {
                name: '資安相關',
                icon: '🛡️',
                suggestions: {
                    'tech_stack': [
                        '使用 OWASP ZAP 或 Burp Suite 安全測試',
                        '採用 Vault 或 AWS Secrets Manager 管理金鑰',
                        '整合 WAF (Web Application Firewall)',
                        '使用 SonarQube 進行安全程式碼審查'
                    ],
                    'resource_allocation': [
                        '需要資安專家設計安全架構',
                        '配置滲透測試人員進行安全驗證',
                        '安排開發工程師實作安全機制',
                        '預估 1-2 位資安專家參與'
                    ],
                    'potential_risks': [
                        '安全漏洞可能導致資料外洩',
                        '安全機制影響系統效能',
                        '合規要求與開發進度平衡',
                        '安全意識培訓與執行落差'
                    ],
                    'best_practices': [
                        '建立完整的安全開發生命週期 (SDLC)',
                        '實施多層次防護與縱深防禦策略',
                        '採用零信任架構設計原則',
                        '建立安全事件回應與復原計畫'
                    ]
                }
            }
        };
    }
    
    // 根據任務類型獲取建議
    getAdviceByTaskType(taskType) {
        return this.taskAdviceData[taskType] || null;
    }
    
    // 獲取所有支援的任務類型
    getSupportedTaskTypes() {
        return Object.keys(this.taskAdviceData);
    }
}

// Scrum Master 建議系統
class ScrumMasterAdvice {
    constructor() {
        this.suggestions = [];
        this.isVisible = false;
        this.taskAdviceDB = new TaskTypeAdviceDatabase();
        this.selectedTaskType = null;
        this.feedback = [];
    }
    
    // 設定任務類型
    setTaskType(taskType) {
        this.selectedTaskType = taskType;
        console.log(`🎯 任務類型已設定為: ${taskType}`);
    }
    
    // 分析投票結果並產生建議
    analyzeVotes(votes) {
        this.suggestions = [];
        
        if (votes.length === 0) return;
        
        // 首先添加任務類型相關的建議
        this.generateTaskTypeAdvice();
        
        const numericVotes = votes.filter(v => typeof v.value === 'number');
        const devVotes = numericVotes.filter(v => v.playerRole === 'dev');
        const qaVotes = numericVotes.filter(v => v.playerRole === 'qa');
        
        // 計算統計數據
        const allAverage = numericVotes.reduce((sum, v) => sum + v.value, 0) / numericVotes.length;
        const devAverage = devVotes.length > 0 ? devVotes.reduce((sum, v) => sum + v.value, 0) / devVotes.length : 0;
        const qaAverage = qaVotes.length > 0 ? qaVotes.reduce((sum, v) => sum + v.value, 0) / qaVotes.length : 0;
        
        const variance = numericVotes.reduce((sum, v) => sum + Math.pow(v.value - allAverage, 2), 0) / numericVotes.length;
        const isHighVariance = variance > 4;
        
        // 產生分組建議
        if (devVotes.length > 0 && qaVotes.length > 0) {
            const devQaDiff = Math.abs(devAverage - qaAverage);
            
            if (devQaDiff > 5) {
                if (devAverage > qaAverage) {
                    this.suggestions.push({
                        type: 'major_dev_gap',
                        title: '🚨 開發複雜度遠高於測試評估',
                        message: `開發組評估為 ${devAverage} 點，測試組為 ${qaAverage} 點。建議檢討技術架構複雜度，或考慮技術重構以降低開發成本。`,
                        icon: '⚠️'
                    });
                } else {
                    this.suggestions.push({
                        type: 'major_qa_gap',
                        title: '🚨 測試複雜度遠高於開發評估',
                        message: `測試組評估為 ${qaAverage} 點，開發組為 ${devAverage} 點。建議深入討論測試策略，考慮自動化測試工具或簡化測試流程。`,
                        icon: '🔍'
                    });
                }
            } else if (devQaDiff > 3) {
                if (devAverage > qaAverage) {
                    this.suggestions.push({
                        type: 'moderate_dev_gap',
                        title: '⚖️ 開發複雜度高於測試評估',
                        message: `開發組認為技術實作較複雜，建議與測試組討論開發階段的潛在風險點。`,
                        icon: '💭'
                    });
                } else {
                    this.suggestions.push({
                        type: 'moderate_qa_gap',
                        title: '⚖️ 測試複雜度高於開發評估',
                        message: `測試組預期測試工作較複雜，建議討論測試範圍與驗收標準。`,
                        icon: '🎯'
                    });
                }
            } else if (devQaDiff <= 1) {
                this.suggestions.push({
                    type: 'perfect_alignment',
                    title: '✨ 開發與測試評估一致',
                    message: `兩組評估差異僅 ${devQaDiff.toFixed(1)} 點，顯示對功能複雜度認知一致，可放心進行開發。`,
                    icon: '🎉'
                });
            }
        } else if (devVotes.length > 0 && qaVotes.length === 0) {
            this.suggestions.push({
                type: 'missing_qa',
                title: '❓ 缺少測試組評估',
                message: '建議邀請 QA 成員參與估點，以獲得完整的複雜度評估。',
                icon: '👥'
            });
        } else if (devVotes.length === 0 && qaVotes.length > 0) {
            this.suggestions.push({
                type: 'missing_dev',
                title: '❓ 缺少開發組評估',
                message: '建議邀請開發成員參與估點，以獲得技術複雜度評估。',
                icon: '👨‍💻'
            });
        }
        
        if (isHighVariance) {
            this.suggestions.push({
                type: 'high_variance',
                title: '估點分歧較大',
                message: '團隊對此功能的複雜度認知差異較大，建議進一步討論需求細節和實作方式。',
                icon: '💭'
            });
        }
        
        if (allAverage > 8) {
            this.suggestions.push({
                type: 'high_complexity',
                title: '高複雜度功能',
                message: '此功能複雜度較高，建議考慮拆分成較小的 User Story，或分階段實作。',
                icon: '🔨'
            });
        }
        
        if (numericVotes.length > 0 && variance < 1) {
            this.suggestions.push({
                type: 'good_consensus',
                title: '團隊共識良好',
                message: '團隊對此功能的複雜度認知一致，可以放心進行開發規劃。',
                icon: '✅'
            });
        }
        
        // 特殊卡牌建議
        const coffeeVotes = votes.filter(v => v.value === 'coffee');
        const questionVotes = votes.filter(v => v.value === 'question');
        
        if (coffeeVotes.length > 0) {
            this.suggestions.push({
                type: 'break_needed',
                title: '休息時間',
                message: `${coffeeVotes.length} 位成員建議休息，考慮安排短暫休息後再繼續討論。`,
                icon: '☕'
            });
        }
        
        if (questionVotes.length > 0) {
            this.suggestions.push({
                type: 'unclear_requirements',
                title: '需求不明確',
                message: `${questionVotes.length} 位成員對需求有疑問，建議先澄清需求細節再重新估點。`,
                icon: '❓'
            });
        }
    }
    
    // 生成任務類型相關建議
    generateTaskTypeAdvice() {
        if (!this.selectedTaskType) return;
        
        const taskAdvice = this.taskAdviceDB.getAdviceByTaskType(this.selectedTaskType);
        if (!taskAdvice) return;
        
        // 技術選型建議
        if (taskAdvice.suggestions.tech_stack.length > 0) {
            this.suggestions.push({
                type: 'task_tech_stack',
                title: `${taskAdvice.icon} ${taskAdvice.name} - 技術選型建議`,
                message: `建議技術棧：${taskAdvice.suggestions.tech_stack.slice(0, 2).join('；')}`,
                icon: '🛠️',
                category: 'tech_stack',
                taskType: this.selectedTaskType,
                fullAdvice: taskAdvice.suggestions.tech_stack
            });
        }
        
        // 資源配置建議
        if (taskAdvice.suggestions.resource_allocation.length > 0) {
            this.suggestions.push({
                type: 'task_resource',
                title: `${taskAdvice.icon} ${taskAdvice.name} - 資源配置建議`,
                message: `人力配置：${taskAdvice.suggestions.resource_allocation.slice(0, 2).join('；')}`,
                icon: '👥',
                category: 'resource_allocation',
                taskType: this.selectedTaskType,
                fullAdvice: taskAdvice.suggestions.resource_allocation
            });
        }
        
        // 潛在風險提醒
        if (taskAdvice.suggestions.potential_risks.length > 0) {
            this.suggestions.push({
                type: 'task_risks',
                title: `${taskAdvice.icon} ${taskAdvice.name} - 潛在風險提醒`,
                message: `注意風險：${taskAdvice.suggestions.potential_risks.slice(0, 2).join('；')}`,
                icon: '⚠️',
                category: 'potential_risks',
                taskType: this.selectedTaskType,
                fullAdvice: taskAdvice.suggestions.potential_risks
            });
        }
        
        // 最佳實踐建議
        if (taskAdvice.suggestions.best_practices.length > 0) {
            this.suggestions.push({
                type: 'task_best_practices',
                title: `${taskAdvice.icon} ${taskAdvice.name} - 最佳實踐建議`,
                message: `推薦做法：${taskAdvice.suggestions.best_practices.slice(0, 2).join('；')}`,
                icon: '✨',
                category: 'best_practices',
                taskType: this.selectedTaskType,
                fullAdvice: taskAdvice.suggestions.best_practices
            });
        }
        
        console.log(`📋 已生成 ${this.selectedTaskType} 任務類型的 ${this.suggestions.length} 項建議`);
    }
    
    // 繪製建議面板
    draw() {
        if (!this.isVisible || this.suggestions.length === 0) return;
        
        push();
        
        // 響應式計算面板尺寸和位置
        const isMobile = width < 768;
        const isTablet = width < 1024 && width >= 768;
        const margin = 20;
        
        // 根據螢幕尺寸調整面板寬度和高度
        let panelWidth, maxHeight, itemHeight;
        if (isMobile) {
            panelWidth = Math.min(280, width - margin * 2); // 行動裝置較小寬度
            maxHeight = height * 0.5; // 行動裝置限制更小高度
            itemHeight = 70; // 較小的項目高度
        } else if (isTablet) {
            panelWidth = Math.min(320, width * 0.35); // 平板中等寬度
            maxHeight = height * 0.55;
            itemHeight = 80;
        } else {
            panelWidth = Math.min(380, width * 0.4); // 桌面原始寬度
            maxHeight = height * 0.6;
            itemHeight = 85;
        }
        
        // 動態計算高度
        const suggestionsHeight = this.suggestions.length * itemHeight + 20;
        const panelHeight = Math.min(suggestionsHeight + 80, maxHeight);
        
        // 計算位置，避免與統計面板和控制按鈕重疊
        let panelX;
        if (isMobile && width < 600) {
            // 極小螢幕時，面板顯示在左側以避免與右側按鈕重疊
            panelX = margin;
        } else {
            // 其他情況顯示在右側
            panelX = width - panelWidth - margin;
        }
        
        // 根據螢幕尺寸調整控制按鈕預留空間
        let controlButtonsSpace;
        if (isMobile) {
            controlButtonsSpace = 140; // 行動裝置按鈕橫向排列，需要較少垂直空間
        } else if (isTablet) {
            controlButtonsSpace = 180; // 平板需要中等空間
        } else {
            controlButtonsSpace = 200; // 桌面需要最多空間
        }
        
        let panelY = height - panelHeight - controlButtonsSpace;
        
        // 如果有統計面板，調整位置避免重疊
        if (uiManager && uiManager.gamePhase === 'finished') {
            const statisticsHeight = height * 0.4;
            if (panelY < 20 + statisticsHeight + 10) {
                panelY = Math.max(20 + statisticsHeight + 10, height - panelHeight - controlButtonsSpace);
            }
        }
        
        // 確保面板不會超出畫面頂部
        panelY = Math.max(20, panelY);
        
        // 背景面板陰影效果
        fill(0, 0, 0, 60); // 陰影
        noStroke();
        rectMode(CORNER);
        rect(panelX + 3, panelY + 3, panelWidth, panelHeight, 12);
        
        // 背景面板（與統計面板統一樣式）
        fill(30, 35, 42, 220); // 稍微增加不透明度以改善對比
        stroke(255, 255, 255, 100); // 稍微增亮邊框
        strokeWeight(1);
        rectMode(CORNER);
        rect(panelX, panelY, panelWidth, panelHeight, 12);
        
        // 內容區域
        const contentX = panelX + 15;
        let currentY = panelY + 20;
        
        // 標題區域（改善視覺層次）
        fill(255, 255, 255, 250); // 稍微增加不透明度
        noStroke();
        rectMode(CORNER);
        rect(contentX - 5, currentY - 5, panelWidth - 20, 30, 6);
        
        // 標題區域邊框強調
        stroke(30, 35, 42, 60);
        strokeWeight(1);
        noFill();
        rect(contentX - 5, currentY - 5, panelWidth - 20, 30, 6);
        
        fill(30, 35, 42);
        textAlign(LEFT, CENTER);
        textSize(isMobile ? 14 : 16); // 響應式標題字體大小
        textStyle(BOLD);
        text('🎯 Scrum Master 建議', contentX + 5, currentY + 10);
        currentY += 40;
        
        // 建議列表
        for (let i = 0; i < this.suggestions.length; i++) {
            const suggestion = this.suggestions[i];
            
            // 建議項目背景（使用響應式高度）
            const suggestionItemHeight = itemHeight - 10; // 比間距稍小以留出空間
            const itemY = currentY - 5;
            
            // 根據建議類型設定背景色
            let bgColor;
            if (suggestion.type === 'warning') {
                bgColor = color(239, 68, 68, 120); // 紅色警告
            } else if (suggestion.type === 'info') {
                bgColor = color(59, 130, 246, 120); // 藍色資訊
            } else {
                bgColor = color(34, 197, 94, 120); // 綠色建議
            }
            
            fill(bgColor);
            noStroke();
            rectMode(CORNER);
            rect(contentX - 5, itemY, panelWidth - 20, suggestionItemHeight, 8);
            
            // 圖示
            fill(255, 255, 255, 240);
            textAlign(LEFT, TOP);
            textSize(isMobile ? 16 : 18); // 響應式圖示大小
            text(suggestion.icon, contentX + 5, currentY + 5);
            
            // 標題
            fill(255);
            textSize(isMobile ? 12 : 13); // 響應式標題大小
            textStyle(BOLD);
            text(suggestion.title, contentX + 35, currentY + 5);
            
            // 訊息
            fill(255, 255, 255, 220);
            textSize(isMobile ? 10 : 11); // 響應式內容大小
            textStyle(NORMAL);
            const messageLines = this.wrapText(suggestion.message, panelWidth - 60);
            const maxLines = isMobile ? 2 : 3; // 行動裝置顯示較少行數
            const lineHeight = isMobile ? 12 : 14; // 響應式行高
            for (let j = 0; j < Math.min(messageLines.length, maxLines); j++) {
                text(messageLines[j], contentX + 35, currentY + 25 + j * lineHeight);
            }
            
            currentY += itemHeight;
        }
        
        pop();
    }
    
    // 文字換行
    wrapText(text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        
        for (const word of words) {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            if (textWidth(testLine) <= maxWidth) {
                currentLine = testLine;
            } else {
                if (currentLine) {
                    lines.push(currentLine);
                }
                currentLine = word;
            }
        }
        
        if (currentLine) {
            lines.push(currentLine);
        }
        
        return lines;
    }
    
    // 顯示建議
    show() {
        this.isVisible = true;
    }
    
    // 隱藏建議
    hide() {
        this.isVisible = false;
    }
    
    // 切換顯示狀態
    toggle() {
        this.isVisible = !this.isVisible;
    }
    
    // 新增反饋
    addFeedback(suggestionId, rating, comment = '') {
        const feedback = {
            id: Date.now(),
            suggestionId: suggestionId,
            rating: rating, // 1-5 星級評分
            comment: comment,
            timestamp: new Date().toISOString(),
            playerId: currentPlayer ? currentPlayer.id : 'anonymous',
            playerName: currentPlayer ? currentPlayer.name : '匿名'
        };
        
        this.feedback.push(feedback);
        console.log(`📝 已新增建議反饋: ${rating}星 - ${comment}`);
        
        // 儲存反饋到本地儲存
        this.saveFeedbackToStorage();
        
        return feedback;
    }
    
    // 獲取特定建議的反饋
    getFeedbackForSuggestion(suggestionId) {
        return this.feedback.filter(f => f.suggestionId === suggestionId);
    }
    
    // 計算建議平均評分
    getAverageRating(suggestionId) {
        const feedbacks = this.getFeedbackForSuggestion(suggestionId);
        if (feedbacks.length === 0) return 0;
        
        const totalRating = feedbacks.reduce((sum, f) => sum + f.rating, 0);
        return (totalRating / feedbacks.length).toFixed(1);
    }
    
    // 儲存反饋到本地儲存
    saveFeedbackToStorage() {
        try {
            const feedbackData = {
                feedback: this.feedback,
                lastUpdated: new Date().toISOString()
            };
            localStorage.setItem('scrumPokerAdviceFeedback', JSON.stringify(feedbackData));
        } catch (error) {
            console.warn('⚠️ 無法儲存反饋資料:', error);
        }
    }
    
    // 從本地儲存載入反饋
    loadFeedbackFromStorage() {
        try {
            const savedData = localStorage.getItem('scrumPokerAdviceFeedback');
            if (savedData) {
                const feedbackData = JSON.parse(savedData);
                this.feedback = feedbackData.feedback || [];
                console.log(`📚 已載入 ${this.feedback.length} 筆反饋資料`);
            }
        } catch (error) {
            console.warn('⚠️ 無法載入反饋資料:', error);
            this.feedback = [];
        }
    }
    
    // 顯示反饋統計
    showFeedbackStats() {
        if (this.feedback.length === 0) {
            console.log('📊 尚無反饋資料');
            return;
        }
        
        const stats = {
            totalFeedback: this.feedback.length,
            averageRating: (this.feedback.reduce((sum, f) => sum + f.rating, 0) / this.feedback.length).toFixed(1),
            ratingDistribution: {}
        };
        
        // 計算評分分佈
        for (let i = 1; i <= 5; i++) {
            stats.ratingDistribution[`${i}星`] = this.feedback.filter(f => f.rating === i).length;
        }
        
        console.log('📊 建議反饋統計:');
        console.table(stats);
        
        return stats;
    }
}

// 建立 Scrum Master 建議系統實例
let scrumMasterAdvice;

// 當頁面載入完成時初始化
window.addEventListener('DOMContentLoaded', () => {
    scrumMasterAdvice = new ScrumMasterAdvice();
    scrumMasterAdvice.loadFeedbackFromStorage();
    console.log('🎯 Scrum Master 建議系統已初始化');
});

// 在 UIManager 的 draw 方法中新增建議面板繪製
if (typeof UIManager !== 'undefined') {
    const originalDraw = UIManager.prototype.draw;
    UIManager.prototype.draw = function() {
        originalDraw.call(this);
        
        // 繪製 Scrum Master 建議
        if (scrumMasterAdvice && this.gamePhase === 'finished') {
            scrumMasterAdvice.draw();
        }
    };
    
    // 覆寫統計更新方法以包含建議分析
    const originalUpdateStatistics = UIManager.prototype.updateStatistics;
    UIManager.prototype.updateStatistics = function(votes) {
        originalUpdateStatistics.call(this, votes);
        
        // 分析投票並產生建議
        if (scrumMasterAdvice) {
            scrumMasterAdvice.analyzeVotes(votes);
            scrumMasterAdvice.show();
        }
    };
}

// 鍵盤快捷鍵處理
document.addEventListener('keydown', (event) => {
    if (gameState === 'game') {
        // H 鍵切換建議面板
        if (event.code === 'KeyH' && scrumMasterAdvice) {
            scrumMasterAdvice.toggle();
        }
        
        // 空白鍵開牌
        if (event.code === 'Space') {
            event.preventDefault();
            revealCards();
        }
        
        // D 鍵切換刪除按鈕顯示
        if (event.code === 'KeyD' && gameTable) {
            const anyButtonVisible = gameTable.players.some(p => p.deleteButton.visible);
            const currentPlayer = gameTable.players.find(p => p.isCurrentPlayer);
            
            if (currentPlayer) {
                gameTable.togglePlayerDeleteButtons(currentPlayer);
                
                if (uiManager) {
                    if (anyButtonVisible) {
                        uiManager.showToast('隱藏刪除按鈕', 'info');
                    } else {
                        uiManager.showToast('顯示刪除按鈕 - 點擊紅色 X 移除玩家', 'info');
                    }
                }
            }
        }
        
        // V 鍵驗證刪除功能 (調試用)
        if (event.code === 'KeyV' && gameTable && event.ctrlKey) {
            event.preventDefault();
            const report = gameTable.validateDeleteFeature();
            
            if (uiManager) {
                if (report.errors.length === 0) {
                    uiManager.showToast(`✅ 刪除功能正常 (${report.deleteButtonsVisible}/${report.otherPlayers.length} 按鈕顯示)`, 'success');
                } else {
                    uiManager.showToast(`⚠️ 發現 ${report.errors.length} 個問題`, 'error');
                }
            }
        }
        
        // F 鍵顯示反饋統計
        if (event.code === 'KeyF' && scrumMasterAdvice && event.ctrlKey) {
            event.preventDefault();
            scrumMasterAdvice.showFeedbackStats();
        }
    }
});

// 全域房間創建診斷功能
window.diagnoseRoomCreation = async function() {
    console.log('🔍 開始全域房間創建診斷...');
    
    if (!firebaseManager) {
        console.error('❌ FirebaseManager 未初始化');
        return { error: 'FirebaseManager 未初始化' };
    }
    
    try {
        const result = await firebaseManager.diagnoseRoomCreation();
        
        // 在控制台中以表格形式顯示結果
        console.table({
            '使用 Firebase': result.useFirebase ? '是' : '否',
            '連線狀態': result.isConnected ? '已連線' : '未連線',
            '錯誤數量': result.errors.length,
            '測試通過': Object.keys(result.tests).length
        });
        
        if (result.errors.length > 0) {
            console.group('❌ 發現的問題：');
            result.errors.forEach((error, index) => {
                console.error(`${index + 1}. ${error}`);
            });
            console.groupEnd();
        }
        
        if (result.recommendations.length > 0) {
            console.group('💡 建議：');
            result.recommendations.forEach((rec, index) => {
                console.log(`${index + 1}. ${rec}`);
            });
            console.groupEnd();
        }
        
        return result;
    } catch (error) {
        console.error('🚨 診斷過程發生錯誤:', error);
        return { error: error.message };
    }
};

// 快速測試房間創建功能
window.testRoomCreation = async function(playerName = 'TestUser') {
    console.log(`🧪 快速測試房間創建功能 (玩家: ${playerName})...`);
    
    if (!firebaseManager) {
        console.error('❌ FirebaseManager 未初始化');
        return false;
    }
    
    try {
        // 測試自動房間創建
        const result = await firebaseManager.joinRoom('', playerName, 'dev');
        
        if (result && result.roomId) {
            console.log(`✅ 房間創建測試成功！`);
            console.log(`🏠 房間 ID: ${result.roomId}`);
            console.log(`👤 玩家 ID: ${result.playerId}`);
            console.log(`🆕 是新房間: ${result.isNewRoom ? '是' : '否'}`);
            
            // 清除測試資料（僅在模擬模式下）
            if (!firebaseManager.useFirebase) {
                await firebaseManager.leaveRoom();
                console.log('🧹 已清除測試資料');
            }
            
            return true;
        } else {
            console.error('❌ 房間創建測試失敗：未返回有效結果');
            return false;
        }
    } catch (error) {
        console.error('❌ 房間創建測試失敗:', error);
        console.error('🔍 錯誤詳情:', {
            code: error.code,
            message: error.message
        });
        return false;
    }
};

// 全域反饋函數
window.addAdviceFeedback = function(rating, comment = '') {
    if (!scrumMasterAdvice) {
        console.error('❌ Scrum Master 建議系統尚未初始化');
        return false;
    }
    
    if (scrumMasterAdvice.suggestions.length === 0) {
        console.error('❌ 目前沒有建議可以評分');
        return false;
    }
    
    // 對最新的建議進行評分
    const latestSuggestion = scrumMasterAdvice.suggestions[scrumMasterAdvice.suggestions.length - 1];
    const suggestionId = latestSuggestion.type;
    
    const feedback = scrumMasterAdvice.addFeedback(suggestionId, rating, comment);
    console.log(`✅ 已新增反饋: ${rating}/5 星`);
    
    return true;
};

window.showAdviceFeedbackStats = function() {
    if (!scrumMasterAdvice) {
        console.error('❌ Scrum Master 建議系統尚未初始化');
        return;
    }
    
    return scrumMasterAdvice.showFeedbackStats();
};

window.clearAdviceFeedback = function() {
    if (!scrumMasterAdvice) {
        console.error('❌ Scrum Master 建議系統尚未初始化');
        return false;
    }
    
    scrumMasterAdvice.feedback = [];
    scrumMasterAdvice.saveFeedbackToStorage();
    console.log('🧹 已清除所有反饋資料');
    
    return true;
};

console.log('🎮 遊戲整合邏輯已載入');
console.log('💡 使用 diagnoseRoomCreation() 進行房間創建診斷');
console.log('💡 使用 testRoomCreation() 進行快速測試');
console.log('💡 使用 addAdviceFeedback(rating, comment) 新增建議反饋');
console.log('💡 使用 showAdviceFeedbackStats() 查看反饋統計');
console.log('💡 使用 clearAdviceFeedback() 清除反饋資料');