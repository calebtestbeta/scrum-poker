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
        let isNewRoom = false;
        
        // 生成房間 ID（如果未提供）
        if (!roomId) {
            roomId = await this.generateUniqueRoomId();
            isNewRoom = true;
            console.log(`🎲 自動生成唯一房間 ID: ${roomId}`);
        }
        
        const playerId = this.generatePlayerId();
        console.log(`👤 生成玩家 ID: ${playerId} (${playerName})`);
        
        try {
            // 加入房間
            const roomRef = this.db.ref(`rooms/${roomId}`);
            
            // 檢查房間是否存在，如果不存在則創建
            const roomSnapshot = await roomRef.once('value');
            if (!roomSnapshot.exists()) {
                console.log(`🏠 房間不存在，開始創建新房間: ${roomId}`);
                isNewRoom = true;
                
                // 創建符合 Firebase 規則的房間資料結構
                const newRoomData = {
                    id: roomId,
                    created: firebase.database.ServerValue.TIMESTAMP,
                    lastUpdated: firebase.database.ServerValue.TIMESTAMP,
                    // 符合資料庫規則：必須包含 gameState 且值為 'voting' 或 'revealed'
                    gameState: 'voting', // 使用 'voting' 而不是 'waiting'
                    phase: 'waiting', // 保留內部使用的 phase 欄位
                    members: {}, // 符合資料庫規則：使用 members 而不是 players
                    players: {}, // 保留相容性 
                    votes: {},
                    settings: {
                        maxPlayers: 12,
                        autoReveal: false
                    }
                };
                
                console.log(`📋 準備創建房間資料:`, newRoomData);
                
                // 驗證房間資料是否符合 Firebase 規則
                if (!newRoomData.gameState || !['voting', 'revealed'].includes(newRoomData.gameState)) {
                    throw new Error(`房間 gameState 必須為 'voting' 或 'revealed'，目前為: ${newRoomData.gameState}`);
                }
                
                console.log(`🔍 房間資料驗證通過，開始寫入 Firebase...`);
                await roomRef.set(newRoomData);
                console.log(`✅ 房間 ${roomId} 創建成功`);
            } else {
                console.log(`🏠 加入現有房間: ${roomId}`);
                const existingData = roomSnapshot.val();
                console.log(`📊 現有房間資料結構:`, Object.keys(existingData));
            }
            
            // 建立玩家資料（符合 Firebase 規則）
            const playerData = {
                id: playerId,
                name: playerName,
                role: playerRole,
                joined: firebase.database.ServerValue.TIMESTAMP,
                connected: true,
                voted: false, // 符合資料庫規則：使用 'voted' 欄位
                hasVoted: false, // 保留相容性
                vote: null
            };
            
            // 同時添加到 players 和 members 節點以確保相容性
            const playerRef = roomRef.child(`players/${playerId}`);
            const memberRef = roomRef.child(`members/${playerId}`);
            
            console.log(`👤 準備添加玩家到房間: ${playerName} -> ${roomId}`);
            console.log(`👤 玩家資料:`, playerData);
            
            // 驗證玩家資料是否符合 Firebase 規則
            const requiredFields = ['name', 'role', 'voted', 'connected'];
            const missingFields = requiredFields.filter(field => !(field in playerData));
            if (missingFields.length > 0) {
                throw new Error(`玩家資料缺少必要欄位: ${missingFields.join(', ')}`);
            }
            
            console.log(`🔍 玩家資料驗證通過，開始寫入 Firebase...`);
            
            // 並行寫入玩家資料到兩個節點
            await Promise.all([
                playerRef.set(playerData),
                memberRef.set(playerData)
            ]);
            
            console.log(`✅ 玩家 ${playerName} 成功加入房間 ${roomId}`);
            
            // 更新本地狀態
            this.currentRoom = roomId;
            this.currentPlayer = playerData;
            
            // 設定監聽器
            this.setupRoomListener(roomId);
            this.setupPlayersListener(roomId);
            this.setupVotesListener(roomId);
            
            console.log(`✅ Firebase 房間 ${roomId} 連接完成 (玩家: ${playerName})`);
            
            return { 
                roomId, 
                playerId,
                isNewRoom,
                roomData: {
                    id: roomId,
                    gameState: 'voting',
                    phase: 'waiting'
                }
            };
            
        } catch (error) {
            console.error(`❌ 加入 Firebase 房間失敗:`, error);
            console.error(`🔍 錯誤詳情:`, {
                roomId,
                playerName,
                playerRole,
                errorCode: error.code,
                errorMessage: error.message,
                isNewRoom
            });
            
            // 如果是權限錯誤，提供更詳細的診斷資訊
            if (error.code === 'PERMISSION_DENIED') {
                console.error(`🚫 權限被拒絕 - 可能的原因:`);
                console.error(`   1. Firebase 資料庫規則不允許此操作`);
                console.error(`   2. 資料格式不符合 .validate 規則要求`);
                console.error(`   3. 房間 ID 格式問題: ${roomId}`);
                console.error(`   4. 缺少必要的欄位: gameState, members 等`);
            }
            
            throw error;
        }
    }
    
    // 加入模擬房間
    async joinMockRoom(roomId, playerName, playerRole) {
        let isNewRoom = false;
        
        // 生成房間 ID（如果未提供）
        if (!roomId) {
            roomId = await this.generateUniqueRoomId();
            isNewRoom = true;
            console.log(`🎲 模擬模式：自動生成唯一房間 ID: ${roomId}`);
        }
        
        const playerId = this.generatePlayerId();
        console.log(`👤 模擬模式：生成玩家 ID: ${playerId} (${playerName})`);
        
        // 初始化房間（符合 Firebase 規則格式）
        if (!this.mockData.rooms[roomId]) {
            console.log(`🏠 模擬模式：創建新房間: ${roomId}`);
            isNewRoom = true;
            
            this.mockData.rooms[roomId] = {
                id: roomId,
                created: Date.now(),
                lastUpdated: Date.now(),
                gameState: 'voting', // 符合資料庫規則
                phase: 'waiting', // 內部使用
                members: {}, // 符合資料庫規則
                players: {}, // 保留相容性
                votes: {},
                settings: {
                    maxPlayers: 12,
                    autoReveal: false
                }
            };
            console.log(`✅ 模擬模式：房間 ${roomId} 創建成功`);
        } else {
            console.log(`🏠 模擬模式：加入現有房間: ${roomId}`);
        }
        
        // 建立玩家資料（符合 Firebase 規則）
        const playerData = {
            id: playerId,
            name: playerName,
            role: playerRole,
            joined: Date.now(),
            connected: true,
            voted: false, // 符合資料庫規則
            hasVoted: false, // 保留相容性
            vote: null
        };
        
        console.log(`👤 模擬模式：準備添加玩家: ${playerName} -> ${roomId}`);
        console.log(`👤 模擬模式：玩家資料:`, playerData);
        
        // 同時添加到 players 和 members 節點以確保相容性
        this.mockData.rooms[roomId].players[playerId] = playerData;
        this.mockData.rooms[roomId].members[playerId] = playerData;
        
        // 更新本地狀態
        this.currentRoom = roomId;
        this.currentPlayer = playerData;
        
        // 觸發玩家加入事件
        if (this.onPlayerJoined) {
            this.onPlayerJoined(playerData);
        }
        
        console.log(`✅ 模擬模式：玩家 ${playerName} 成功加入房間 ${roomId}`);
        return { 
            roomId, 
            playerId,
            isNewRoom,
            roomData: {
                id: roomId,
                gameState: 'voting',
                phase: 'waiting'
            }
        };
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
            console.log(`🗳️ 開始投票程序: 玩家 ${this.currentPlayer.name}, 票數 ${value}`);
            
            if (this.useFirebase) {
                console.log(`📡 Firebase 模式投票: 房間 ${this.currentRoom}`);
                
                // 更新玩家投票狀態
                const playerRef = this.db.ref(`rooms/${this.currentRoom}/players/${this.currentPlayer.id}`);
                console.log(`📝 更新玩家投票狀態...`);
                await playerRef.update({
                    hasVoted: true,
                    vote: value,
                    votedAt: firebase.database.ServerValue.TIMESTAMP
                });
                
                // 同時更新投票記錄（符合 Firebase 規則：必須包含 points 和 submittedAt）
                const voteRef = this.db.ref(`rooms/${this.currentRoom}/votes/${this.currentPlayer.id}`);
                const voteData = {
                    playerId: this.currentPlayer.id,
                    playerName: this.currentPlayer.name,
                    playerRole: this.currentPlayer.role,
                    points: value, // 使用 'points' 而不是 'value' 以符合 Firebase 規則
                    submittedAt: firebase.database.ServerValue.TIMESTAMP // 使用 'submittedAt' 而不是 'timestamp'
                };
                
                console.log(`📊 準備寫入投票記錄:`, voteData);
                await voteRef.set(voteData);
                console.log(`✅ 投票記錄寫入成功`);
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
            console.error('❌ 投票失敗:', error);
            console.error('📊 錯誤詳情:', {
                errorCode: error.code,
                errorMessage: error.message,
                currentRoom: this.currentRoom,
                playerId: this.currentPlayer?.id,
                playerName: this.currentPlayer?.name,
                voteValue: value
            });
            
            // 特定錯誤處理
            if (error.code === 'PERMISSION_DENIED') {
                console.error('🚫 投票權限被拒絕 - 可能原因:');
                console.error('   1. 投票資料格式不符合 Firebase 規則');
                console.error('   2. 缺少必要欄位: points, submittedAt');
                console.error('   3. 資料庫規則設定問題');
                
                if (this.onError) {
                    this.onError('投票權限被拒絕，請檢查 Firebase 規則設定');
                }
            } else if (error.code === 'NETWORK_ERROR') {
                console.error('🌐 網路連線問題');
                if (this.onError) {
                    this.onError('網路連線問題，請稍後再試');
                }
            } else {
                if (this.onError) {
                    this.onError('投票失敗: ' + error.message);
                }
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
        // 生成更可靠的房間 ID
        const timestamp = Date.now().toString(36).substring(-4); // 時間戳後4位
        const random = Math.random().toString(36).substring(2, 6); // 隨機4位
        const roomId = (timestamp + random).toUpperCase();
        
        console.log(`🎲 生成房間 ID: ${roomId} (時間戳: ${timestamp}, 隨機: ${random})`);
        return roomId;
    }
    
    // 生成唯一房間 ID（檢查是否衝突）
    async generateUniqueRoomId(maxAttempts = 5) {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            const roomId = this.generateRoomId();
            
            try {
                if (this.useFirebase) {
                    // 檢查 Firebase 中是否已存在此房間 ID
                    const roomRef = this.db.ref(`rooms/${roomId}`);
                    const snapshot = await roomRef.once('value');
                    
                    if (!snapshot.exists()) {
                        console.log(`✅ 房間 ID ${roomId} 可用 (嘗試 ${attempt}/${maxAttempts})`);
                        return roomId;
                    } else {
                        console.log(`⚠️ 房間 ID ${roomId} 已存在，重新生成 (嘗試 ${attempt}/${maxAttempts})`);
                    }
                } else {
                    // 檢查模擬模式中是否已存在此房間 ID
                    if (!this.mockData.rooms[roomId]) {
                        console.log(`✅ 房間 ID ${roomId} 可用 (本地模式, 嘗試 ${attempt}/${maxAttempts})`);
                        return roomId;
                    } else {
                        console.log(`⚠️ 房間 ID ${roomId} 已存在，重新生成 (本地模式, 嘗試 ${attempt}/${maxAttempts})`);
                    }
                }
            } catch (error) {
                console.warn(`⚠️ 檢查房間 ID ${roomId} 時發生錯誤:`, error);
                // 如果檢查失敗，仍然使用這個 ID
                return roomId;
            }
        }
        
        // 如果所有嘗試都失敗，使用最後生成的 ID
        const fallbackId = this.generateRoomId();
        console.warn(`⚠️ 無法生成唯一房間 ID，使用後備 ID: ${fallbackId}`);
        return fallbackId;
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
    
    // 診斷房間創建功能
    async diagnoseRoomCreation(testPlayerName = 'TestPlayer', testPlayerRole = 'dev') {
        console.log('🔍 === 房間創建診斷開始 ===');
        
        const diagnosticResult = {
            timestamp: new Date().toISOString(),
            useFirebase: this.useFirebase,
            isConnected: this.isConnected,
            tests: {},
            errors: [],
            recommendations: []
        };
        
        try {
            // 測試 1: 房間 ID 生成
            console.log('🧪 測試 1: 房間 ID 生成');
            const roomId1 = this.generateRoomId();
            const roomId2 = this.generateRoomId();
            
            diagnosticResult.tests.roomIdGeneration = {
                success: true,
                roomId1,
                roomId2,
                areUnique: roomId1 !== roomId2,
                format: /^[A-Z0-9]{8}$/.test(roomId1)
            };
            
            if (roomId1 === roomId2) {
                diagnosticResult.errors.push('房間 ID 生成器產生重複 ID');
            }
            
            // 測試 2: 唯一房間 ID 生成
            console.log('🧪 測試 2: 唯一房間 ID 生成');
            const uniqueRoomId = await this.generateUniqueRoomId();
            
            diagnosticResult.tests.uniqueRoomIdGeneration = {
                success: true,
                uniqueRoomId,
                format: /^[A-Z0-9]{8}$/.test(uniqueRoomId)
            };
            
            // 測試 3: 房間創建資料格式
            console.log('🧪 測試 3: 房間創建資料格式驗證');
            const mockRoomData = {
                id: uniqueRoomId,
                created: this.useFirebase ? firebase.database.ServerValue.TIMESTAMP : Date.now(),
                lastUpdated: this.useFirebase ? firebase.database.ServerValue.TIMESTAMP : Date.now(),
                gameState: 'voting',
                phase: 'waiting',
                members: {},
                players: {},
                votes: {},
                settings: {
                    maxPlayers: 12,
                    autoReveal: false
                }
            };
            
            diagnosticResult.tests.roomDataFormat = {
                success: true,
                hasGameState: 'gameState' in mockRoomData,
                hasMembers: 'members' in mockRoomData,
                gameStateValue: mockRoomData.gameState,
                isValidGameState: ['voting', 'revealed'].includes(mockRoomData.gameState)
            };
            
            if (!['voting', 'revealed'].includes(mockRoomData.gameState)) {
                diagnosticResult.errors.push(`gameState 值 '${mockRoomData.gameState}' 不符合 Firebase 規則要求`);
            }
            
            // 測試 4: 玩家資料格式
            console.log('🧪 測試 4: 玩家資料格式驗證');
            const mockPlayerData = {
                id: this.generatePlayerId(),
                name: testPlayerName,
                role: testPlayerRole,
                joined: this.useFirebase ? firebase.database.ServerValue.TIMESTAMP : Date.now(),
                connected: true,
                voted: false,
                hasVoted: false,
                vote: null
            };
            
            diagnosticResult.tests.playerDataFormat = {
                success: true,
                hasRequiredFields: ['name', 'role', 'voted', 'connected'].every(field => field in mockPlayerData),
                playerData: mockPlayerData
            };
            
            // 測試 5: 實際房間創建測試（僅在模擬模式下）
            if (!this.useFirebase) {
                console.log('🧪 測試 5: 實際房間創建測試 (模擬模式)');
                
                try {
                    const result = await this.joinMockRoom('', `診斷-${testPlayerName}`, testPlayerRole);
                    
                    diagnosticResult.tests.actualRoomCreation = {
                        success: true,
                        result,
                        roomCreated: result.isNewRoom,
                        roomId: result.roomId,
                        playerId: result.playerId
                    };
                    
                    // 清除測試房間
                    if (this.mockData.rooms[result.roomId]) {
                        delete this.mockData.rooms[result.roomId];
                        console.log(`🧹 清除測試房間: ${result.roomId}`);
                    }
                    
                } catch (error) {
                    diagnosticResult.tests.actualRoomCreation = {
                        success: false,
                        error: error.message,
                        errorCode: error.code
                    };
                    diagnosticResult.errors.push(`實際房間創建失敗: ${error.message}`);
                }
            } else {
                diagnosticResult.tests.actualRoomCreation = {
                    success: null,
                    reason: 'Firebase 模式下跳過實際創建測試以避免產生測試資料'
                };
            }
            
        } catch (error) {
            console.error('🚨 診斷過程中發生錯誤:', error);
            diagnosticResult.errors.push(`診斷錯誤: ${error.message}`);
        }
        
        // 生成建議
        if (diagnosticResult.errors.length === 0) {
            diagnosticResult.recommendations.push('✅ 所有測試通過，房間創建功能正常');
        } else {
            diagnosticResult.recommendations.push('⚠️ 發現問題，需要修正');
            
            if (diagnosticResult.errors.some(e => e.includes('gameState'))) {
                diagnosticResult.recommendations.push('🔧 確保房間資料包含正確的 gameState 欄位');
            }
            
            if (diagnosticResult.errors.some(e => e.includes('重複'))) {
                diagnosticResult.recommendations.push('🔧 檢查房間 ID 生成器的隨機性');
            }
        }
        
        console.log('🔍 === 房間創建診斷完成 ===');
        console.log('📊 診斷結果:', diagnosticResult);
        
        return diagnosticResult;
    }
    
    // 診斷 Firebase 連線和權限
    async diagnoseFirebasePermissions() {
        console.log('🔍 === Firebase 權限診斷開始 ===');
        
        const diagnosticResult = {
            timestamp: new Date().toISOString(),
            useFirebase: this.useFirebase,
            isConnected: this.isConnected,
            tests: {},
            errors: [],
            recommendations: []
        };
        
        if (!this.useFirebase) {
            diagnosticResult.recommendations.push('⚠️ 目前使用本地模式，無需檢查 Firebase 權限');
            return diagnosticResult;
        }
        
        try {
            // 測試 1: 讀取權限
            console.log('🧪 測試 1: 讀取權限');
            try {
                const roomsRef = this.db.ref('rooms');
                const snapshot = await roomsRef.limitToFirst(1).once('value');
                diagnosticResult.tests.readPermission = {
                    success: true,
                    message: '讀取權限正常'
                };
                console.log('✅ 讀取權限測試通過');
            } catch (readError) {
                diagnosticResult.tests.readPermission = {
                    success: false,
                    error: readError.message,
                    code: readError.code
                };
                diagnosticResult.errors.push(`讀取權限失敗: ${readError.message}`);
                console.error('❌ 讀取權限測試失敗:', readError);
            }
            
            // 測試 2: 寫入權限
            console.log('🧪 測試 2: 寫入權限');
            try {
                const testRef = this.db.ref('rooms/permission_test');
                const testData = {
                    gameState: 'voting',
                    created: firebase.database.ServerValue.TIMESTAMP,
                    test: true
                };
                
                await testRef.set(testData);
                await testRef.remove(); // 清除測試資料
                
                diagnosticResult.tests.writePermission = {
                    success: true,
                    message: '寫入權限正常'
                };
                console.log('✅ 寫入權限測試通過');
            } catch (writeError) {
                diagnosticResult.tests.writePermission = {
                    success: false,
                    error: writeError.message,
                    code: writeError.code
                };
                diagnosticResult.errors.push(`寫入權限失敗: ${writeError.message}`);
                console.error('❌ 寫入權限測試失敗:', writeError);
            }
            
            // 測試 3: 資料格式驗證
            console.log('🧪 測試 3: 資料格式驗證');
            try {
                const testRef = this.db.ref('rooms/format_test');
                const invalidData = {
                    gameState: 'invalid_state', // 故意使用無效狀態
                    created: firebase.database.ServerValue.TIMESTAMP
                };
                
                await testRef.set(invalidData);
                // 如果成功，表示驗證沒有工作
                diagnosticResult.tests.dataValidation = {
                    success: false,
                    message: 'Firebase 規則驗證可能沒有正確設定'
                };
                await testRef.remove();
            } catch (validationError) {
                // 預期的錯誤，表示驗證正常工作
                diagnosticResult.tests.dataValidation = {
                    success: true,
                    message: 'Firebase 規則驗證正常工作',
                    expectedError: validationError.message
                };
                console.log('✅ 資料格式驗證正常');
            }
            
        } catch (error) {
            console.error('🚨 診斷過程中發生錯誤:', error);
            diagnosticResult.errors.push(`診斷錯誤: ${error.message}`);
        }
        
        // 生成建議
        if (diagnosticResult.errors.length === 0) {
            diagnosticResult.recommendations.push('✅ Firebase 權限設定正常');
        } else {
            diagnosticResult.recommendations.push('⚠️ 發現 Firebase 權限問題，需要檢查：');
            diagnosticResult.recommendations.push('1. 確認 Firebase 規則正確設定');
            diagnosticResult.recommendations.push('2. 檢查專案 ID 和 API Key 是否正確');
            diagnosticResult.recommendations.push('3. 確認資料格式符合 .validate 規則');
        }
        
        console.log('🔍 === Firebase 權限診斷完成 ===');
        console.log('📊 診斷結果:', diagnosticResult);
        
        return diagnosticResult;
    }
}

console.log('🔥 FirebaseManager 類別已載入');