// Firebase 管理器 - 處理資料同步和即時更新
class FirebaseManager {
    constructor() {
        this.db = null;
        this.auth = null;
        this.currentRoom = null;
        this.currentPlayer = null;
        this.isConnected = false;
        this.useFirebase = false;
        this.mockData = {
            rooms: {},
            players: {}
        };
        
        // 回調函數
        this.onPlayerJoined = null;
        this.onPlayerLeft = null;
        this.onVoteUpdated = null;
        this.onGameStateChanged = null;
        this.onError = null;
        
        // 連線狀態
        this.connectionAttempts = 0;
        this.maxConnectionAttempts = 3;
        
        console.log('🔥 FirebaseManager 已初始化');
    }
    
    // 初始化 Firebase
    async initialize(config) {
        try {
            console.log('🚀 初始化 Firebase Manager...');
            
            // 檢查是否已經由 firebase-config.js 初始化過
            if (firebase.apps.length > 0) {
                console.log('🔍 Firebase 已由 firebase-config.js 初始化，重用現有實例');
                this.db = firebase.database();
                
                console.log('⚠️ 跳過身份驗證，直接使用資料庫');
                this.auth = null;
                
                this.useFirebase = true;
                this.isConnected = true;
                
                console.log('✅ Firebase Manager 初始化成功 (無身份驗證模式)');
                return true;
            }
            
            // 如果沒有配置，直接進入本地模式
            if (!config || !config.projectId || !config.apiKey) {
                console.log('📍 無 Firebase 配置，使用本地模式');
                this.useFirebase = false;
                this.isConnected = true;
                this.initializeMockData();
                console.log('🏠 本地模式初始化完成');
                return true;
            }
            
            // 建立完整的 Firebase 配置（只有在沒有現有實例時）
            const firebaseConfig = {
                apiKey: config.apiKey,
                authDomain: `${config.projectId}.firebaseapp.com`,
                databaseURL: `https://${config.projectId}-default-rtdb.firebaseio.com/`,
                projectId: config.projectId,
                storageBucket: `${config.projectId}.appspot.com`,
                messagingSenderId: '123456789012',
                appId: '1:123456789012:web:abcdef123456'
            };
            
            // 初始化 Firebase
            firebase.initializeApp(firebaseConfig);
            
            this.db = firebase.database();
            
            console.log('⚠️ 跳過身份驗證初始化');
            this.auth = null;
            
            this.useFirebase = true;
            this.isConnected = true;
            
            console.log('🔥 Firebase 初始化成功（無身份驗證模式）');
            return true;
            
        } catch (error) {
            console.error('Firebase 初始化失敗:', error);
            this.useFirebase = false;
            this.isConnected = false;
            
            let errorMessage = 'Firebase 初始化失敗: ' + error.message;
            
            // 特定錯誤處理
            if (error.message.includes('匿名驗證未啟用')) {
                errorMessage = '⚠️ Firebase 匿名驗證未啟用。請在 Firebase Console 中啟用匿名身份驗證。';
            } else if (error.code === 'auth/operation-not-allowed') {
                errorMessage = '⚠️ Firebase 身份驗證未正確配置。請檢查 Firebase Console 中的身份驗證設定。';
            }
            
            if (this.onError) {
                this.onError(errorMessage);
            }
            
            return false;
        }
    }
    
    // 跳過身份驗證（已移除）
    async authenticateAnonymously() {
        console.log('⚠️ 身份驗證已跳過，直接返回 null');
        return null;
    }
    
    // 初始化模擬資料
    initializeMockData() {
        if (!this.mockData) {
            this.mockData = {
                rooms: {},
                currentUser: null
            };
        }
        console.log('🏠 模擬資料已初始化');
    }
    
    // 加入房間
    async joinRoom(roomId, playerName, playerRole) {
        try {
            if (this.useFirebase) {
                return await this.joinFirebaseRoom(roomId, playerName, playerRole);
            } else {
                return await this.joinMockRoom(roomId, playerName, playerRole);
            }
        } catch (error) {
            console.error('加入房間失敗:', error);
            if (this.onError) {
                this.onError('加入房間失敗: ' + error.message);
            }
            return null;
        }
    }
    
    // 加入 Firebase 房間
    async joinFirebaseRoom(roomId, playerName, playerRole) {
        if (!roomId) {
            roomId = this.generateRoomId();
        }
        
        const playerId = this.generatePlayerId();
        
        // 建立玩家資料（無需身份驗證）
        const playerData = {
            id: playerId,
            name: playerName,
            role: playerRole,
            joined: firebase.database.ServerValue.TIMESTAMP,
            connected: true,
            hasVoted: false,
            vote: null
        };
        
        // 加入房間
        const roomRef = this.db.ref(`rooms/${roomId}`);
        const playerRef = roomRef.child(`players/${playerId}`);
        
        // 檢查房間是否存在，如果不存在則創建
        const roomSnapshot = await roomRef.once('value');
        if (!roomSnapshot.exists()) {
            console.log(`🏠 創建新房間: ${roomId}`);
            await roomRef.set({
                id: roomId,
                created: firebase.database.ServerValue.TIMESTAMP,
                phase: 'waiting',
                players: {},
                votes: {},
                settings: {
                    maxPlayers: 12,
                    autoReveal: false
                }
            });
            console.log(`✅ 房間 ${roomId} 創建成功`);
        } else {
            console.log(`🏠 加入existing房間: ${roomId}`);
        }
        
        // 加入玩家
        console.log(`👤 添加玩家到房間: ${playerName} -> ${roomId}`);
        await playerRef.set(playerData);
        console.log(`✅ 玩家 ${playerName} 成功加入房間 ${roomId}`);
        
        this.currentRoom = roomId;
        this.currentPlayer = playerData;
        
        // 設定監聽器
        this.setupRoomListener(roomId);
        this.setupPlayersListener(roomId);
        this.setupVotesListener(roomId);
        
        console.log(`✅ Firebase 房間 ${roomId} 連接完成 (玩家: ${playerName})`);
        return { roomId, playerId };
    }
    
    // 加入模擬房間
    async joinMockRoom(roomId, playerName, playerRole) {
        if (!roomId) {
            roomId = this.generateRoomId();
        }
        
        const playerId = this.generatePlayerId();
        
        // 初始化房間
        if (!this.mockData.rooms[roomId]) {
            this.mockData.rooms[roomId] = {
                id: roomId,
                created: Date.now(),
                phase: 'waiting',
                players: {},
                votes: {},
                settings: {
                    maxPlayers: 12,
                    autoReveal: false
                }
            };
        }
        
        // 加入玩家
        const playerData = {
            id: playerId,
            name: playerName,
            role: playerRole,
            joined: Date.now(),
            connected: true,
            hasVoted: false,
            vote: null
        };
        
        this.mockData.rooms[roomId].players[playerId] = playerData;
        
        this.currentRoom = roomId;
        this.currentPlayer = playerData;
        
        // 觸發玩家加入事件
        if (this.onPlayerJoined) {
            this.onPlayerJoined(playerData);
        }
        
        console.log(`✅ 成功加入模擬房間 ${roomId} (玩家: ${playerName})`);
        return { roomId, playerId };
    }
    
    // 設定房間監聽器
    setupRoomListener(roomId) {
        if (!this.useFirebase) return;
        
        const roomRef = this.db.ref(`rooms/${roomId}`);
        roomRef.on('value', (snapshot) => {
            const roomData = snapshot.val();
            if (roomData && this.onGameStateChanged) {
                this.onGameStateChanged(roomData);
            }
        });
    }
    
    // 設定玩家監聽器
    setupPlayersListener(roomId) {
        if (!this.useFirebase) return;
        
        const playersRef = this.db.ref(`rooms/${roomId}/players`);
        
        // 玩家加入
        playersRef.on('child_added', (snapshot) => {
            const playerData = snapshot.val();
            if (playerData && this.onPlayerJoined) {
                this.onPlayerJoined(playerData);
            }
        });
        
        // 玩家離開
        playersRef.on('child_removed', (snapshot) => {
            const playerData = snapshot.val();
            if (playerData && this.onPlayerLeft) {
                this.onPlayerLeft(playerData);
            }
        });
        
        // 玩家更新
        playersRef.on('child_changed', (snapshot) => {
            const playerData = snapshot.val();
            if (playerData && this.onVoteUpdated) {
                this.onVoteUpdated(playerData);
            }
        });
    }
    
    // 設定投票監聽器
    setupVotesListener(roomId) {
        if (!this.useFirebase) return;
        
        const votesRef = this.db.ref(`rooms/${roomId}/votes`);
        votesRef.on('value', (snapshot) => {
            const votes = snapshot.val() || {};
            // 處理投票更新
            console.log('投票更新:', votes);
        }); 
    }
    
    // 投票
    async vote(value) {
        if (!this.currentRoom || !this.currentPlayer) {
            console.error('未加入房間或玩家資訊不存在');
            return false;
        }
        
        try {
            if (this.useFirebase) {
                const playerRef = this.db.ref(`rooms/${this.currentRoom}/players/${this.currentPlayer.id}`);
                await playerRef.update({
                    hasVoted: true,
                    vote: value,
                    votedAt: firebase.database.ServerValue.TIMESTAMP
                });
                
                // 同時更新投票記錄
                const voteRef = this.db.ref(`rooms/${this.currentRoom}/votes/${this.currentPlayer.id}`);
                await voteRef.set({
                    playerId: this.currentPlayer.id,
                    playerName: this.currentPlayer.name,
                    playerRole: this.currentPlayer.role,
                    value: value,
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                });
            } else {
                // 模擬模式
                if (this.mockData.rooms[this.currentRoom]) {
                    this.mockData.rooms[this.currentRoom].players[this.currentPlayer.id].hasVoted = true;
                    this.mockData.rooms[this.currentRoom].players[this.currentPlayer.id].vote = value;
                    
                    if (this.onVoteUpdated) {
                        this.onVoteUpdated(this.mockData.rooms[this.currentRoom].players[this.currentPlayer.id]);
                    }
                }
            }
            
            console.log(`✅ 投票成功: ${value}`);
            return true;
            
        } catch (error) {
            console.error('投票失敗:', error);
            if (this.onError) {
                this.onError('投票失敗: ' + error.message);
            }
            return false;
        }
    }
    
    // 開牌
    async revealCards() {
        if (!this.currentRoom) {
            console.error('未加入房間');
            return false;
        }
        
        try {
            if (this.useFirebase) {
                const roomRef = this.db.ref(`rooms/${this.currentRoom}`);
                await roomRef.update({
                    phase: 'revealing',
                    revealedAt: firebase.database.ServerValue.TIMESTAMP
                });
            } else {
                // 模擬模式
                if (this.mockData.rooms[this.currentRoom]) {
                    this.mockData.rooms[this.currentRoom].phase = 'revealing';
                    
                    if (this.onGameStateChanged) {
                        this.onGameStateChanged(this.mockData.rooms[this.currentRoom]);
                    }
                }
            }
            
            console.log('✅ 開牌成功');
            return true;
            
        } catch (error) {
            console.error('開牌失敗:', error);
            if (this.onError) {
                this.onError('開牌失敗: ' + error.message);
            }
            return false;
        }
    }
    
    // 更新遊戲階段
    async updateGamePhase(phase) {
        if (!this.currentRoom) {
            console.error('未加入房間');
            return false;
        }
        
        try {
            if (this.useFirebase) {
                const roomRef = this.db.ref(`rooms/${this.currentRoom}`);
                await roomRef.update({
                    phase: phase,
                    updatedAt: firebase.database.ServerValue.TIMESTAMP
                });
            } else {
                // 模擬模式
                if (this.mockData.rooms[this.currentRoom]) {
                    this.mockData.rooms[this.currentRoom].phase = phase;
                    
                    if (this.onGameStateChanged) {
                        this.onGameStateChanged(this.mockData.rooms[this.currentRoom]);
                    }
                }
            }
            
            console.log(`✅ 遊戲階段更新為: ${phase}`);
            return true;
            
        } catch (error) {
            console.error('更新遊戲階段失敗:', error);
            return false;
        }
    }
    
    // 清除投票
    async clearVotes() {
        if (!this.currentRoom) {
            console.error('未加入房間');
            return false;
        }
        
        try {
            if (this.useFirebase) {
                const roomRef = this.db.ref(`rooms/${this.currentRoom}`);
                await roomRef.update({
                    phase: 'voting',
                    votes: null
                });
                
                // 清除所有玩家的投票狀態
                const playersRef = roomRef.child('players');
                const playersSnapshot = await playersRef.once('value');
                const players = playersSnapshot.val() || {};
                
                const updates = {};
                Object.keys(players).forEach(playerId => {
                    updates[`players/${playerId}/hasVoted`] = false;
                    updates[`players/${playerId}/vote`] = null;
                });
                
                await roomRef.update(updates);
            } else {
                // 模擬模式
                if (this.mockData.rooms[this.currentRoom]) {
                    this.mockData.rooms[this.currentRoom].phase = 'voting';
                    this.mockData.rooms[this.currentRoom].votes = {};
                    
                    Object.keys(this.mockData.rooms[this.currentRoom].players).forEach(playerId => {
                        this.mockData.rooms[this.currentRoom].players[playerId].hasVoted = false;
                        this.mockData.rooms[this.currentRoom].players[playerId].vote = null;
                    });
                    
                    if (this.onGameStateChanged) {
                        this.onGameStateChanged(this.mockData.rooms[this.currentRoom]);
                    }
                }
            }
            
            console.log('✅ 清除投票成功');
            return true;
            
        } catch (error) {
            console.error('清除投票失敗:', error);
            if (this.onError) {
                this.onError('清除投票失敗: ' + error.message);
            }
            return false;
        }
    }
    
    // 移除玩家 (由其他玩家觸發)
    async removePlayer(playerId) {
        if (!this.currentRoom) {
            console.error('未加入房間');
            return false;
        }
        
        try {
            if (this.useFirebase) {
                const playerRef = this.db.ref(`rooms/${this.currentRoom}/players/${playerId}`);
                const voteRef = this.db.ref(`rooms/${this.currentRoom}/votes/${playerId}`);
                
                // 移除玩家和投票記錄
                await playerRef.remove();
                await voteRef.remove();
                
                console.log(`✅ 成功移除玩家: ${playerId}`);
            } else {
                // 模擬模式
                if (this.mockData.rooms[this.currentRoom]) {
                    const playerData = this.mockData.rooms[this.currentRoom].players[playerId];
                    
                    if (playerData) {
                        delete this.mockData.rooms[this.currentRoom].players[playerId];
                        delete this.mockData.rooms[this.currentRoom].votes[playerId];
                        
                        // 觸發玩家離開事件
                        if (this.onPlayerLeft) {
                            this.onPlayerLeft(playerData);
                        }
                        
                        console.log(`✅ 成功移除玩家: ${playerId} (${playerData.name})`);
                    }
                }
            }
            
            return true;
            
        } catch (error) {
            console.error('移除玩家失敗:', error);
            if (this.onError) {
                this.onError('移除玩家失敗: ' + error.message);
            }
            return false;
        }
    }
    
    // 離開房間
    async leaveRoom() {
        if (!this.currentRoom || !this.currentPlayer) {
            return;
        }
        
        try {
            if (this.useFirebase) {
                const playerRef = this.db.ref(`rooms/${this.currentRoom}/players/${this.currentPlayer.id}`);
                await playerRef.remove();
                
                // 移除監聽器
                const roomRef = this.db.ref(`rooms/${this.currentRoom}`);
                roomRef.off();
            } else {
                // 模擬模式
                if (this.mockData.rooms[this.currentRoom]) {
                    delete this.mockData.rooms[this.currentRoom].players[this.currentPlayer.id];
                    
                    if (this.onPlayerLeft) {
                        this.onPlayerLeft(this.currentPlayer);
                    }
                }
            }
            
            console.log('✅ 成功離開房間');
            
        } catch (error) {
            console.error('離開房間失敗:', error);
        } finally {
            this.currentRoom = null;
            this.currentPlayer = null;
        }
    }
    
    // 更新投票進度
    updateVotingProgress(votedCount, totalPlayers) {
        // 計算投票完成百分比
        const percentage = totalPlayers > 0 ? Math.round((votedCount / totalPlayers) * 100) : 0;
        
        // 產生更有意義的狀態訊息
        let statusMessage = `📊 投票進度: ${votedCount}/${totalPlayers} (${percentage}%)`;
        
        if (votedCount === 0) {
            statusMessage += ' - 等待玩家投票';
        } else if (votedCount === totalPlayers) {
            statusMessage += ' - 所有玩家已完成投票 ✅';
        } else {
            const remaining = totalPlayers - votedCount;
            statusMessage += ` - 還有 ${remaining} 位玩家未投票`;
        }
        
        console.log(statusMessage);
        
        // 這裡可以更新 UI 顯示投票進度
        // 註：實際的 UI 更新已由 game.js 中的回調處理
    }
    
    // 取得房間狀態
    async getRoomState() {
        if (!this.currentRoom) return null;
        
        if (this.useFirebase) {
            const roomRef = this.db.ref(`rooms/${this.currentRoom}`);
            const snapshot = await roomRef.once('value');
            return snapshot.val();
        } else {
            return this.mockData.rooms[this.currentRoom] || null;
        }
    }
    
    // 生成房間 ID
    generateRoomId() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }
    
    // 生成玩家 ID
    generatePlayerId() {
        return 'player_' + Math.random().toString(36).substring(2, 9);
    }
    
    // 取得連線狀態
    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            useFirebase: this.useFirebase,
            isAuthenticated: false, // 已停用身份驗證
            currentRoom: this.currentRoom,
            currentPlayer: this.currentPlayer,
            userUid: null // 無身份驗證
        };
    }
    
    // 設定回調函數
    setCallbacks(callbacks) {
        this.onPlayerJoined = callbacks.onPlayerJoined || null;
        this.onPlayerLeft = callbacks.onPlayerLeft || null;
        this.onVoteUpdated = callbacks.onVoteUpdated || null;
        this.onGameStateChanged = callbacks.onGameStateChanged || null;
        this.onError = callbacks.onError || null;
    }
}

console.log('🔥 FirebaseManager 類別已載入');