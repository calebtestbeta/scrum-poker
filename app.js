// Scrum Poker 應用程式主邏輯
class ScrumPoker {
    constructor() {
        this.currentPlayer = null;
        this.currentRoom = null;
        this.database = null;
        this.roomRef = null;
        this.selectedPoints = null;
        this.isLocalMode = false;
        
        this.initializeElements();
        this.bindEvents();
        this.checkUrlParams();
        this.checkFirebaseConfig();
    }

    initializeElements() {
        // DOM 元素引用
        this.elements = {
            configSection: document.getElementById('configSection'),
            projectId: document.getElementById('projectId'),
            apiKey: document.getElementById('apiKey'),
            saveConfigBtn: document.getElementById('saveConfigBtn'),
            useLocalModeBtn: document.getElementById('useLocalModeBtn'),
            clearConfigBtn: document.getElementById('clearConfigBtn'),
            currentMode: document.getElementById('currentMode'),
            joinSection: document.getElementById('joinSection'),
            gameSection: document.getElementById('gameSection'),
            playerName: document.getElementById('playerName'),
            playerRole: document.getElementById('playerRole'),
            roomId: document.getElementById('roomId'),
            joinRoomBtn: document.getElementById('joinRoomBtn'),
            currentRoomId: document.getElementById('currentRoomId'),
            shareRoomBtn: document.getElementById('shareRoomBtn'),
            gameStatus: document.getElementById('gameStatus'),
            votingProgress: document.getElementById('votingProgress'),
            playersList: document.getElementById('playersList'),
            pointsSelection: document.getElementById('pointsSelection'),
            revealBtn: document.getElementById('revealBtn'),
            clearBtn: document.getElementById('clearBtn'),
            resultsSection: document.getElementById('resultsSection'),
            averagePoints: document.getElementById('averagePoints'),
            medianPoints: document.getElementById('medianPoints'),
            suggestedPoints: document.getElementById('suggestedPoints'),
            devAverage: document.getElementById('devAverage'),
            devMedian: document.getElementById('devMedian'),
            devCount: document.getElementById('devCount'),
            qaAverage: document.getElementById('qaAverage'),
            qaMedian: document.getElementById('qaMedian'),
            qaCount: document.getElementById('qaCount'),
            consensusLevel: document.getElementById('consensusLevel'),
            adviceContent: document.getElementById('adviceContent'),
            discussionPoints: document.getElementById('discussionPoints'),
            discussionList: document.getElementById('discussionList'),
            toast: document.getElementById('toast'),
            toastMessage: document.getElementById('toastMessage')
        };
    }

    bindEvents() {
        // 設定相關事件
        this.elements.saveConfigBtn.addEventListener('click', () => this.saveFirebaseConfig());
        this.elements.useLocalModeBtn.addEventListener('click', () => this.useLocalMode());
        this.elements.clearConfigBtn.addEventListener('click', () => this.clearFirebaseConfig());
        
        // 遊戲相關事件
        this.elements.joinRoomBtn.addEventListener('click', () => this.joinRoom());
        this.elements.shareRoomBtn.addEventListener('click', () => this.shareRoom());
        this.elements.revealBtn.addEventListener('click', () => this.revealVotes());
        this.elements.clearBtn.addEventListener('click', () => this.clearVotes());
        
        // 點數選擇事件
        this.elements.pointsSelection.addEventListener('click', (e) => {
            if (e.target.classList.contains('point-btn')) {
                this.selectPoints(e.target.dataset.points);
            }
        });

        // Enter 鍵支援
        this.elements.playerName.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.joinRoom();
        });
        
        this.elements.roomId.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.joinRoom();
        });
        
        this.elements.projectId.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.saveFirebaseConfig();
        });
        
        this.elements.apiKey.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.saveFirebaseConfig();
        });
    }

    checkUrlParams() {
        // 檢查 URL 參數中是否有房間 ID
        const urlParams = new URLSearchParams(window.location.search);
        const roomId = urlParams.get('room');
        if (roomId) {
            this.elements.roomId.value = roomId;
        }
    }

    checkFirebaseConfig() {
        // 檢查是否已有儲存的 Firebase 設定
        const savedConfig = this.getStoredConfig();
        const savedMode = localStorage.getItem('scrumPokerMode');
        
        if (savedConfig) {
            // 載入已儲存的設定
            this.elements.projectId.value = savedConfig.projectId;
            this.elements.apiKey.value = savedConfig.apiKey;
            this.showJoinSection('Firebase 模式（已設定）');
        } else if (savedMode === 'local') {
            // 使用本地模式
            this.useLocalMode();
        } else {
            // 顯示設定區域
            this.elements.configSection.classList.remove('hidden');
        }
    }

    saveFirebaseConfig() {
        const projectId = this.elements.projectId.value.trim();
        const apiKey = this.elements.apiKey.value.trim();
        
        if (!projectId || !apiKey) {
            this.showToast('請填入 Project ID 和 API Key', 'error');
            return;
        }

        // 儲存設定到 localStorage
        const config = {
            projectId,
            apiKey,
            authDomain: `${projectId}.firebaseapp.com`,
            databaseURL: `https://${projectId}-default-rtdb.firebaseio.com/`,
            storageBucket: `${projectId}.appspot.com`
        };

        localStorage.setItem('scrumPokerConfig', JSON.stringify(config));
        localStorage.removeItem('scrumPokerMode'); // 清除本地模式標記
        
        this.showToast('Firebase 設定已儲存！', 'success');
        this.showJoinSection('Firebase 模式');
    }

    useLocalMode() {
        // 使用本地模擬模式
        localStorage.setItem('scrumPokerMode', 'local');
        localStorage.removeItem('scrumPokerConfig'); // 清除 Firebase 設定
        this.isLocalMode = true;
        
        this.showToast('已切換到本地模擬模式', 'success');
        this.showJoinSection('本地模擬模式');
    }

    clearFirebaseConfig() {
        if (confirm('確定要清除所有設定嗎？')) {
            localStorage.removeItem('scrumPokerConfig');
            localStorage.removeItem('scrumPokerMode');
            
            this.elements.projectId.value = '';
            this.elements.apiKey.value = '';
            
            // 顯示設定區域
            this.elements.configSection.classList.remove('hidden');
            this.elements.joinSection.classList.add('hidden');
            
            this.showToast('設定已清除', 'success');
        }
    }

    getStoredConfig() {
        const configStr = localStorage.getItem('scrumPokerConfig');
        return configStr ? JSON.parse(configStr) : null;
    }

    showJoinSection(mode) {
        this.elements.configSection.classList.add('hidden');
        this.elements.joinSection.classList.remove('hidden');
        this.elements.currentMode.textContent = mode;
    }

    async joinRoom() {
        const playerName = this.elements.playerName.value.trim();
        const playerRole = this.elements.playerRole.value;
        
        if (!playerName) {
            this.showToast('請輸入你的名字', 'error');
            return;
        }

        let roomId = this.elements.roomId.value.trim();
        if (!roomId) {
            // 產生新的房間 ID
            roomId = this.generateRoomId();
        }

        try {
            await this.initializeFirebase();
            await this.joinGameRoom(roomId, playerName, playerRole);
            this.showGameSection();
            this.showToast('成功加入房間！', 'success');
        } catch (error) {
            console.error('加入房間失敗:', error);
            this.showToast('加入房間失敗，請稍後再試', 'error');
        }
    }

    async initializeFirebase() {
        console.log('初始化 Firebase...');
        
        try {
            if (this.isLocalMode || localStorage.getItem('scrumPokerMode') === 'local') {
                // 使用本地模擬模式
                this.database = this.createMockDatabase();
                console.log('使用本地模擬模式');
                this.isLocalMode = true;
            } else {
                // 嘗試使用儲存的 Firebase 設定
                const config = this.getStoredConfig();
                if (config) {
                    const { app, database } = await initializeFirebaseApp(config);
                    this.database = database;
                    console.log('Firebase 初始化完成');
                } else {
                    // 回退到本地模擬模式
                    this.database = this.createMockDatabase();
                    console.log('無 Firebase 設定，使用本地模擬模式');
                    this.isLocalMode = true;
                }
            }
        } catch (error) {
            console.error('Firebase 初始化失敗，切換到本地模擬模式:', error);
            this.database = this.createMockDatabase();
            this.isLocalMode = true;
        }
    }

    createMockDatabase() {
        // 複製 firebase-config.js 中的模擬資料庫邏輯
        const mockData = {};
        
        return {
            ref: (path) => ({
                set: async (data) => {
                    console.log(`模擬設定 ${path}:`, data);
                    this.setNestedProperty(mockData, path, data);
                    
                    setTimeout(() => {
                        this.triggerListeners(path, data, mockData);
                    }, 100);
                    
                    return Promise.resolve();
                },
                
                child: (childPath) => {
                    const fullPath = `${path}/${childPath}`;
                    return {
                        set: async (data) => {
                            console.log(`模擬設定 ${fullPath}:`, data);
                            this.setNestedProperty(mockData, fullPath, data);
                            
                            setTimeout(() => {
                                const parentData = this.getNestedProperty(mockData, path);
                                if (parentData) {
                                    this.triggerListeners(path, parentData, mockData);
                                }
                            }, 100);
                            
                            return Promise.resolve();
                        },
                        
                        update: async (updates) => {
                            console.log(`模擬更新 ${fullPath}:`, updates);
                            Object.entries(updates).forEach(([key, value]) => {
                                this.setNestedProperty(mockData, `${fullPath}/${key}`, value);
                            });
                            
                            setTimeout(() => {
                                const parentData = this.getNestedProperty(mockData, path);
                                if (parentData) {
                                    this.triggerListeners(path, parentData, mockData);
                                }
                            }, 100);
                            
                            return Promise.resolve();
                        }
                    };
                },
                
                on: (event, callback) => {
                    console.log(`模擬監聽 ${path} 的 ${event} 事件`);
                    
                    if (!window.mockListeners) window.mockListeners = {};
                    if (!window.mockListeners[path]) window.mockListeners[path] = [];
                    window.mockListeners[path].push(callback);
                    
                    setTimeout(() => {
                        const data = this.getNestedProperty(mockData, path);
                        callback({
                            val: () => data || null
                        });
                    }, 50);
                },
                
                off: (event, callback) => {
                    console.log(`移除 ${path} 的監聽器`);
                    if (window.mockListeners && window.mockListeners[path]) {
                        const index = window.mockListeners[path].indexOf(callback);
                        if (index > -1) {
                            window.mockListeners[path].splice(index, 1);
                        }
                    }
                },
                
                once: async (event) => {
                    const data = this.getNestedProperty(mockData, path);
                    return Promise.resolve({
                        val: () => data || {}
                    });
                }
            })
        };
    }

    setNestedProperty(obj, path, value) {
        const keys = path.split('/').filter(key => key);
        let current = obj;
        
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }
        
        if (keys.length > 0) {
            current[keys[keys.length - 1]] = value;
        }
    }

    getNestedProperty(obj, path) {
        const keys = path.split('/').filter(key => key);
        let current = obj;
        
        for (const key of keys) {
            if (current && typeof current === 'object' && key in current) {
                current = current[key];
            } else {
                return null;
            }
        }
        
        return current;
    }

    triggerListeners(path, data, mockData) {
        if (!window.mockListeners) return;
        
        Object.keys(window.mockListeners).forEach(listenerPath => {
            if (path.startsWith(listenerPath) || listenerPath.startsWith(path)) {
                const listeners = window.mockListeners[listenerPath];
                const relevantData = listenerPath === path ? data : this.getNestedProperty(mockData, listenerPath);
                
                listeners.forEach(callback => {
                    callback({
                        val: () => relevantData
                    });
                });
            }
        });
    }

    getMockRoomData() {
        // 模擬房間資料
        return {
            gameState: 'voting',
            members: {
                [this.currentPlayer.id]: {
                    name: this.currentPlayer.name,
                    voted: false,
                    connected: true
                }
            },
            votes: {},
            createdAt: Date.now()
        };
    }

    async joinGameRoom(roomId, playerName, playerRole) {
        this.currentPlayer = {
            id: this.generatePlayerId(),
            name: playerName,
            role: playerRole
        };
        
        this.currentRoom = roomId;
        this.elements.currentRoomId.textContent = roomId;

        // 設定房間引用
        this.roomRef = this.database.ref(`rooms/${roomId}`);

        // 檢查房間是否存在
        const existingRoom = await this.roomRef.once('value');
        const roomData = existingRoom.val();

        if (roomData) {
            // 加入現有房間
            await this.roomRef.child('members').child(this.currentPlayer.id).set({
                name: playerName,
                role: playerRole,
                voted: false,
                connected: true,
                joinedAt: Date.now()
            });
        } else {
            // 建立新房間
            await this.roomRef.set({
                gameState: 'voting',
                members: {
                    [this.currentPlayer.id]: {
                        name: playerName,
                        role: playerRole,
                        voted: false,
                        connected: true,
                        joinedAt: Date.now()
                    }
                },
                votes: {},
                createdAt: Date.now()
            });
        }

        // 監聽房間變化
        this.roomRef.on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                this.updateGameState(data);
            }
        });

        // 離開頁面時清理
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });

        // 更新 URL
        const newUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
        window.history.pushState({}, '', newUrl);
    }

    updateGameState(roomData) {
        this.updatePlayersList(roomData.members || {}, roomData.votes || {}, roomData.gameState);
        this.updateVotingProgress(roomData.members || {}, roomData.votes || {});
        this.updateGameStatus(roomData.gameState);
        
        if (roomData.gameState === 'revealed') {
            this.showResults(roomData.votes || {}, roomData.members || {});
        } else {
            this.elements.resultsSection.classList.add('hidden');
        }
    }

    updatePlayersList(members, votes, gameState) {
        const roleIcons = {
            dev: '<i class="fas fa-code text-blue-500"></i>',
            qa: '<i class="fas fa-bug text-green-500"></i>',
            scrum_master: '<i class="fas fa-users text-purple-500"></i>',
            po: '<i class="fas fa-user-tie text-orange-500"></i>',
            other: '<i class="fas fa-user text-gray-500"></i>'
        };

        const roleLabels = {
            dev: 'Dev',
            qa: 'QA',
            scrum_master: 'SM',
            po: 'PO',
            other: 'Other'
        };

        const playersHtml = Object.entries(members).map(([playerId, player]) => {
            const isCurrentPlayer = this.currentPlayer && playerId === this.currentPlayer.id;
            const votedClass = player.voted ? 'voted' : '';
            const selfClass = isCurrentPlayer ? 'self' : '';
            const roleIcon = roleIcons[player.role] || roleIcons.other;
            const roleLabel = roleLabels[player.role] || 'Other';
            
            // 決定要顯示的投票狀態
            let votingStatus = '';
            let votedIcon = '';
            
            if (player.voted) {
                const playerVote = votes[playerId];
                
                if (gameState === 'revealed' && playerVote) {
                    // 開牌後顯示所有人的點數
                    votingStatus = `已投票 - ${this.formatPoints(playerVote.points)}`;
                    votedIcon = '<i class="fas fa-check-circle text-green-500 text-lg"></i>';
                } else if (isCurrentPlayer && playerVote) {
                    // 投票階段只顯示自己的點數
                    votingStatus = `已投票 - ${this.formatPoints(playerVote.points)}`;
                    votedIcon = '<i class="fas fa-check-circle text-blue-500 text-lg"></i>';
                } else {
                    // 其他人的投票狀態（隱藏點數）
                    votingStatus = '已投票';
                    votedIcon = '<i class="fas fa-check text-green-500"></i>';
                }
            } else {
                votingStatus = '等待中';
                votedIcon = '<i class="fas fa-clock text-gray-400"></i>';
            }
            
            return `
                <div class="player-card ${votedClass} ${selfClass}" data-player-id="${playerId}">
                    <div class="font-semibold text-gray-800">
                        ${player.name}
                        ${isCurrentPlayer ? '<span class="text-blue-500 text-xs ml-1">(你)</span>' : ''}
                    </div>
                    <div class="flex items-center justify-center mt-1">
                        ${roleIcon}
                        <span class="text-xs text-gray-600 ml-1">${roleLabel}</span>
                    </div>
                    <div class="mt-2">${votedIcon}</div>
                    <div class="text-xs ${isCurrentPlayer && player.voted ? 'text-blue-600 font-medium' : 'text-gray-500'} mt-1">
                        ${votingStatus}
                    </div>
                    <button class="remove-player-btn hidden mt-2 px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors" 
                            onclick="window.scrumPoker.removePlayer('${playerId}', '${player.name}')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        }).join('');
        
        this.elements.playersList.innerHTML = playersHtml;
        
        // 顯示移除按鈕（如果有多於一個玩家）
        if (Object.keys(members).length > 1) {
            document.querySelectorAll('.remove-player-btn').forEach(btn => {
                btn.classList.remove('hidden');
            });
        }
    }

    formatPoints(points) {
        // 格式化點數顯示
        if (points === 'coffee') return '☕';
        if (points === 'question') return '❓';
        if (points === 'infinity') return '∞';
        return points;
    }

    updateVotingProgress(members, votes) {
        const totalPlayers = Object.keys(members).length;
        const votedPlayers = Object.values(members).filter(player => player.voted).length;
        
        this.elements.votingProgress.textContent = `${votedPlayers}/${totalPlayers} 已投票`;
        
        // 更新開牌按鈕狀態 - 任何時候都可以開牌
        const canReveal = totalPlayers > 0;
        this.elements.revealBtn.disabled = !canReveal;
        
        // 更新開牌按鈕文字顯示投票進度
        if (votedPlayers === totalPlayers && totalPlayers > 0) {
            this.elements.revealBtn.innerHTML = '<i class="fas fa-eye mr-2"></i>開牌';
        } else {
            this.elements.revealBtn.innerHTML = `<i class="fas fa-eye mr-2"></i>開牌 (${votedPlayers}/${totalPlayers})`;
        }
    }

    updateGameStatus(gameState) {
        const statusMap = {
            'voting': { text: '投票中...', class: 'bg-yellow-100 text-yellow-800' },
            'revealed': { text: '已開牌', class: 'bg-green-100 text-green-800' }
        };
        
        const status = statusMap[gameState] || statusMap['voting'];
        this.elements.gameStatus.textContent = status.text;
        this.elements.gameStatus.className = `px-3 py-1 rounded-full text-sm ${status.class}`;
    }

    selectPoints(points) {
        this.selectedPoints = points;
        
        // 更新 UI
        document.querySelectorAll('.point-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        const selectedBtn = document.querySelector(`[data-points="${points}"]`);
        if (selectedBtn) {
            selectedBtn.classList.add('selected');
        }

        // 提交投票
        this.submitVote(points);
    }

    async submitVote(points) {
        if (!this.roomRef || !this.currentPlayer) return;

        try {
            // 更新投票
            await this.roomRef.child('votes').child(this.currentPlayer.id).set({
                points: points,
                submittedAt: Date.now()
            });

            // 更新成員狀態
            await this.roomRef.child('members').child(this.currentPlayer.id).child('voted').set(true);

            this.showToast('投票已提交！', 'success');
        } catch (error) {
            console.error('提交投票失敗:', error);
            this.showToast('投票提交失敗', 'error');
        }
    }

    async revealVotes() {
        if (!this.roomRef) return;

        try {
            await this.roomRef.child('gameState').set('revealed');
            this.showToast('開牌成功！', 'success');
        } catch (error) {
            console.error('開牌失敗:', error);
            this.showToast('開牌失敗', 'error');
        }
    }

    async clearVotes() {
        if (!this.roomRef) return;

        try {
            // 重置遊戲狀態
            await this.roomRef.child('gameState').set('voting');
            await this.roomRef.child('votes').set({});
            
            // 重置所有成員投票狀態
            const membersSnapshot = await this.roomRef.child('members').once('value');
            const members = membersSnapshot.val() || {};
            const membersUpdate = {};
            
            Object.keys(members).forEach(playerId => {
                membersUpdate[`${playerId}/voted`] = false;
            });
            
            if (Object.keys(membersUpdate).length > 0) {
                await this.roomRef.child('members').update(membersUpdate);
            }

            // 重置本地狀態
            this.selectedPoints = null;
            document.querySelectorAll('.point-btn').forEach(btn => {
                btn.classList.remove('selected');
            });

            this.showToast('已重新開始！', 'success');
        } catch (error) {
            console.error('重新開始失敗:', error);
            this.showToast('重新開始失敗', 'error');
        }
    }

    showResults(votes, members) {
        // 分析投票結果
        const analysis = this.analyzeVotingResults(votes, members);
        
        if (!analysis) {
            this.elements.resultsSection.classList.add('hidden');
            return;
        }

        // 更新整體統計
        this.elements.averagePoints.textContent = analysis.overall.average.toFixed(1);
        this.elements.suggestedPoints.textContent = analysis.overall.suggested;
        this.elements.consensusLevel.textContent = analysis.consensus.level;

        // 更新 Dev 統計
        if (analysis.dev.count > 0) {
            this.elements.devAverage.textContent = analysis.dev.average.toFixed(1);
            this.elements.devMedian.textContent = analysis.dev.median;
            this.elements.devCount.textContent = analysis.dev.count;
        } else {
            this.elements.devAverage.textContent = '-';
            this.elements.devMedian.textContent = '-';
            this.elements.devCount.textContent = '0';
        }

        // 更新 QA 統計
        if (analysis.qa.count > 0) {
            this.elements.qaAverage.textContent = analysis.qa.average.toFixed(1);
            this.elements.qaMedian.textContent = analysis.qa.median;
            this.elements.qaCount.textContent = analysis.qa.count;
        } else {
            this.elements.qaAverage.textContent = '-';
            this.elements.qaMedian.textContent = '-';
            this.elements.qaCount.textContent = '0';
        }

        // 生成 Scrum Master 建議
        this.generateScrumMasterAdvice(analysis);

        this.elements.resultsSection.classList.remove('hidden');
    }

    analyzeVotingResults(votes, members) {
        const memberVotes = Object.entries(votes).map(([playerId, vote]) => ({
            playerId,
            points: vote.points,
            role: members[playerId]?.role || 'other',
            name: members[playerId]?.name || 'Unknown'
        }));

        // 過濾數字點數
        const numericVotes = memberVotes.filter(vote => !isNaN(vote.points)).map(vote => ({
            ...vote,
            points: parseInt(vote.points)
        }));

        if (numericVotes.length === 0) {
            return null;
        }

        // 分角色統計
        const devVotes = numericVotes.filter(vote => vote.role === 'dev');
        const qaVotes = numericVotes.filter(vote => vote.role === 'qa');
        const allPoints = numericVotes.map(vote => vote.points);

        // 計算統計資料
        const overall = this.calculateStats(allPoints);
        const dev = devVotes.length > 0 ? this.calculateStats(devVotes.map(v => v.points)) : { average: 0, median: 0, count: 0 };
        const qa = qaVotes.length > 0 ? this.calculateStats(qaVotes.map(v => v.points)) : { average: 0, median: 0, count: 0 };

        // 共識度分析
        const consensus = this.analyzeConsensus(allPoints, devVotes.map(v => v.points), qaVotes.map(v => v.points));

        return {
            overall,
            dev: { ...dev, count: devVotes.length },
            qa: { ...qa, count: qaVotes.length },
            consensus,
            votes: memberVotes,
            numericVotes
        };
    }

    calculateStats(points) {
        if (points.length === 0) return { average: 0, median: 0, suggested: 0 };

        const average = points.reduce((a, b) => a + b, 0) / points.length;
        const sorted = [...points].sort((a, b) => a - b);
        const median = sorted.length % 2 === 0
            ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
            : sorted[Math.floor(sorted.length / 2)];

        // 建議點數（最接近的 Fibonacci 數）
        const fibSequence = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89];
        const suggested = fibSequence.reduce((prev, curr) => 
            Math.abs(curr - average) < Math.abs(prev - average) ? curr : prev
        );

        return { average, median, suggested };
    }

    analyzeConsensus(allPoints, devPoints, qaPoints) {
        const allStdDev = this.calculateStandardDeviation(allPoints);
        const devQaGap = devPoints.length > 0 && qaPoints.length > 0 
            ? Math.abs(devPoints.reduce((a, b) => a + b, 0) / devPoints.length - 
                      qaPoints.reduce((a, b) => a + b, 0) / qaPoints.length)
            : 0;

        let level, description;
        
        if (allStdDev <= 1) {
            level = '高';
            description = '團隊對工作複雜度有很好的共識';
        } else if (allStdDev <= 2.5) {
            level = '中';
            description = '團隊意見相對一致，有小幅分歧';
        } else {
            level = '低';
            description = '團隊對工作複雜度存在明顯分歧';
        }

        return {
            level,
            description,
            standardDeviation: allStdDev,
            devQaGap
        };
    }

    calculateStandardDeviation(points) {
        if (points.length <= 1) return 0;
        
        const mean = points.reduce((a, b) => a + b, 0) / points.length;
        const variance = points.reduce((sum, point) => sum + Math.pow(point - mean, 2), 0) / points.length;
        return Math.sqrt(variance);
    }

    generateScrumMasterAdvice(analysis) {
        const advice = this.getScrumMasterAdvice(analysis);
        
        this.elements.adviceContent.innerHTML = advice.message;
        
        if (advice.discussionPoints.length > 0) {
            this.elements.discussionPoints.classList.remove('hidden');
            this.elements.discussionList.innerHTML = advice.discussionPoints
                .map(point => `<li>${point}</li>`)
                .join('');
        } else {
            this.elements.discussionPoints.classList.add('hidden');
        }
    }

    getScrumMasterAdvice(analysis) {
        const { overall, dev, qa, consensus } = analysis;
        const devQaGap = Math.abs(dev.average - qa.average);
        
        let message = '';
        let discussionPoints = [];

        // 情境 1: Dev 和 QA 估點差異大
        if (dev.count > 0 && qa.count > 0 && devQaGap >= 3) {
            if (dev.average > qa.average) {
                message = `<strong>⚠️ 開發複雜度高於測試複雜度</strong><br>
                    開發團隊平均 ${dev.average.toFixed(1)} 點，測試團隊平均 ${qa.average.toFixed(1)} 點，差距 ${devQaGap.toFixed(1)} 點。
                    可能存在技術挑戰或實作細節未充分溝通。`;
                discussionPoints = [
                    '開發團隊認為複雜的技術點是什麼？',
                    '是否有架構或技術選型上的考量？',
                    '測試團隊是否了解實作的技術細節？',
                    '是否需要更詳細的技術設計討論？'
                ];
            } else {
                message = `<strong>⚠️ 測試複雜度高於開發複雜度</strong><br>
                    測試團隊平均 ${qa.average.toFixed(1)} 點，開發團隊平均 ${dev.average.toFixed(1)} 點，差距 ${devQaGap.toFixed(1)} 點。
                    可能存在測試挑戰或邊界情況考量不足。`;
                discussionPoints = [
                    '測試團隊預見了哪些複雜的測試場景？',
                    '是否有特殊的邊界條件需要考慮？',
                    '測試環境或資料準備是否複雜？',
                    '開發團隊是否了解完整的測試需求？'
                ];
            }
        }
        
        // 情境 2: 整體共識度低
        else if (consensus.level === '低') {
            message = `<strong>🤔 團隊共識度偏低</strong><br>
                標準差 ${consensus.standardDeviation.toFixed(1)}，團隊對需求複雜度的理解差異較大。
                建議深入討論需求細節和實作方式。`;
            discussionPoints = [
                '大家對需求的理解是否一致？',
                '是否有隱藏的技術債務或依賴？',
                '需求的接受標準是否清楚？',
                '是否需要拆分成更小的任務？'
            ];
        }
        
        // 情境 3: 高估點（> 13）
        else if (overall.average > 13) {
            message = `<strong>📊 工作項目複雜度較高</strong><br>
                平均估點 ${overall.average.toFixed(1)}，超過理想的 Sprint 規模。
                建議考慮拆分或詳細分析風險點。`;
            discussionPoints = [
                '這個工作項目是否可以拆分？',
                '是否存在不確定性或風險點？',
                '是否需要先做技術調研或 Spike？',
                '有沒有可以預先準備的依賴項？'
            ];
        }
        
        // 情境 4: 共識良好
        else if (consensus.level === '高' && devQaGap < 2) {
            message = `<strong>✅ 團隊共識度良好</strong><br>
                建議點數 ${overall.suggested}，團隊對工作複雜度有一致的理解。
                可以進入開發階段。`;
            discussionPoints = [
                '確認 Definition of Done',
                '識別潛在的阻礙因素',
                '確認優先級和交付時間'
            ];
        }
        
        // 情境 5: 中等共識
        else {
            message = `<strong>🎯 建議進一步討論</strong><br>
                建議點數 ${overall.suggested}，團隊大致有共識但仍有分歧點需要澄清。`;
            discussionPoints = [
                '哪些部分的理解還不夠一致？',
                '是否需要更多的需求澄清？',
                '技術實作方式是否已經確定？'
            ];
        }

        return { message, discussionPoints };
    }

    shareRoom() {
        const url = `${window.location.origin}${window.location.pathname}?room=${this.currentRoom}`;
        
        if (navigator.share) {
            navigator.share({
                title: 'Scrum Poker - 加入估點房間',
                text: `加入我們的敏捷估點房間 (${this.currentRoom})`,
                url: url
            });
        } else {
            // 複製到剪貼板
            navigator.clipboard.writeText(url).then(() => {
                this.showToast('房間連結已複製到剪貼板！', 'success');
            }).catch(() => {
                this.showToast(`房間連結: ${url}`, 'info');
            });
        }
    }

    showGameSection() {
        this.elements.joinSection.classList.add('hidden');
        this.elements.gameSection.classList.remove('hidden');
    }

    showToast(message, type = 'info') {
        const typeClasses = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            info: 'bg-blue-500'
        };

        this.elements.toastMessage.textContent = message;
        this.elements.toast.querySelector('div').className = `${typeClasses[type]} text-white px-6 py-3 rounded-lg shadow-lg`;
        this.elements.toast.classList.remove('hidden');

        setTimeout(() => {
            this.elements.toast.classList.add('hidden');
        }, 3000);
    }

    generateRoomId() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    generatePlayerId() {
        return `player_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    }

    async removePlayer(playerId, playerName) {
        if (!this.roomRef) return;

        // 確認對話框
        if (!confirm(`確定要移除玩家 "${playerName}" 嗎？`)) {
            return;
        }

        try {
            // 從 members 中移除玩家
            await this.roomRef.child('members').child(playerId).remove();
            
            // 從 votes 中移除玩家的投票
            await this.roomRef.child('votes').child(playerId).remove();

            this.showToast(`已移除玩家 ${playerName}`, 'success');
        } catch (error) {
            console.error('移除玩家失敗:', error);
            this.showToast('移除玩家失敗', 'error');
        }
    }

    cleanup() {
        if (this.roomRef && this.currentPlayer) {
            // 標記玩家離線
            this.roomRef.child('members').child(this.currentPlayer.id).child('connected').set(false);
            // 移除監聽器
            this.roomRef.off();
        }
    }
}

// 初始化應用程式
document.addEventListener('DOMContentLoaded', () => {
    window.scrumPoker = new ScrumPoker();
});