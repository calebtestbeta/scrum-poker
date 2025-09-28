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
            if (!config || !config.projectId || !config.apiKey) {
                console.log('使用本地模式（無 Firebase 設定）');
                this.useFirebase = false;
                this.isConnected = true;
                return true;
            }
            
            // Firebase 設定
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
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            
            this.db = firebase.database();
            this.auth = firebase.auth();
            
            // 進行匿名身份驗證
            await this.authenticateAnonymously();
            
            this.useFirebase = true;
            this.isConnected = true;
            
            console.log('🔥 Firebase 初始化成功');
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
    
    // 匿名身份驗證
    async authenticateAnonymously() {
        try {
            // 檢查是否已經登入
            if (this.auth.currentUser) {
                console.log('🔑 用戶已驗證:', this.auth.currentUser.uid);
                return this.auth.currentUser;
            }
            
            // 進行匿名登入
            const userCredential = await this.auth.signInAnonymously();
            const user = userCredential.user;
            
            console.log('🔑 匿名身份驗證成功:', user.uid);
            
            // 監聽身份驗證狀態變化
            this.auth.onAuthStateChanged((user) => {
                if (user) {
                    console.log('👤 用戶已登入:', user.uid);
                } else {
                    console.log('👤 用戶已登出');
                }
            });
            
            return user;
            
        } catch (error) {
            console.error('匿名身份驗證失敗:', error);
            
            // 如果匿名驗證失敗，嘗試重新登入
            if (error.code === 'auth/operation-not-allowed') {
                throw new Error('Firebase 匿名驗證未啟用。請在 Firebase Console 中啟用匿名驗證。');
            }
            
            throw error;
        }
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
        // 確保用戶已驗證
        if (!this.auth.currentUser) {
            await this.authenticateAnonymously();
        }
        
        if (!roomId) {
            roomId = this.generateRoomId();
        }
        
        const playerId = this.generatePlayerId();
        const currentUser = this.auth.currentUser;
        
        // 建立玩家資料
        const playerData = {
            id: playerId,
            name: playerName,
            role: playerRole,
            uid: currentUser.uid, // 添加 Firebase UID
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
                createdBy: currentUser.uid, // 添加創建者 UID
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
        
        console.log(`✅ Firebase 房間 ${roomId} 連接完成 (玩家: ${playerName}, UID: ${currentUser.uid})`);
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
                // 確保用戶已驗證
                if (!this.auth.currentUser) {
                    console.error('用戶未驗證，無法投票');
                    return false;
                }
                
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
                // 確保用戶已驗證
                if (!this.auth.currentUser) {
                    console.error('用戶未驗證，無法開牌');
                    return false;
                }
                
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
        // 這裡可以更新 UI 顯示投票進度
        console.log(`投票進度: ${votedCount}/${totalPlayers}`);
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
            isAuthenticated: this.auth && this.auth.currentUser != null,
            currentRoom: this.currentRoom,
            currentPlayer: this.currentPlayer,
            userUid: this.auth && this.auth.currentUser ? this.auth.currentUser.uid : null
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