// Firebase 管理器 - 處理資料同步和即時更新
class FirebaseManager {
    constructor() {
        this.db = null;
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
            this.useFirebase = true;
            this.isConnected = true;
            
            // 設定連線監聽
            this.setupConnectionListener();
            
            console.log('✅ Firebase 初始化成功');
            return true;
            
        } catch (error) {
            console.error('❌ Firebase 初始化失敗:', error);
            this.useFirebase = false;
            this.isConnected = true; // 使用本地模式
            
            if (this.onError) {
                this.onError('Firebase 連線失敗，將使用本地模式');
            }
            
            return false;
        }
    }
    
    // 設定連線監聽
    setupConnectionListener() {
        if (!this.useFirebase || !this.db) return;
        
        const connectedRef = this.db.ref('.info/connected');
        connectedRef.on('value', (snapshot) => {
            if (snapshot.val() === true) {
                console.log('🟢 Firebase 已連線');
                this.isConnected = true;
                this.connectionAttempts = 0;
            } else {
                console.log('🔴 Firebase 連線中斷');
                this.isConnected = false;
                this.handleConnectionLoss();
            }
        });
    }
    
    // 處理連線中斷
    handleConnectionLoss() {
        this.connectionAttempts++;
        
        if (this.connectionAttempts <= this.maxConnectionAttempts) {
            console.log(`🔄 嘗試重新連線 (${this.connectionAttempts}/${this.maxConnectionAttempts})`);
            
            setTimeout(() => {
                // 這裡可以加入重連邏輯
            }, 2000 * this.connectionAttempts);
        } else {
            console.log('❌ 達到最大重連次數，切換到本地模式');
            this.useFirebase = false;
            
            if (this.onError) {
                this.onError('網路連線不穩定，已切換到本地模式');
            }
        }
    }
    
    // 建立或加入房間
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
        const roomRef = this.db.ref(`rooms/${roomId}`);
        const playerRef = roomRef.child(`players/${playerId}`);
        
        // 檢查房間是否存在
        const roomSnapshot = await roomRef.once('value');
        if (!roomSnapshot.exists()) {
            // 建立新房間
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
            
            console.log(`🏠 建立新房間: ${roomId}`);
        }
        
        // 加入玩家
        const playerData = {
            id: playerId,
            name: playerName,
            role: playerRole,
            joined: firebase.database.ServerValue.TIMESTAMP,
            connected: true,
            hasVoted: false,
            vote: null
        };
        
        await playerRef.set(playerData);
        
        // 設定玩家離線時自動移除
        playerRef.onDisconnect().remove();
        
        // 設定監聽器
        this.setupRoomListener(roomId);
        this.setupPlayersListener(roomId);
        this.setupVotesListener(roomId);
        
        this.currentRoom = roomId;
        this.currentPlayer = { id: playerId, ...playerData };
        
        console.log(`✅ 成功加入房間 ${roomId} (玩家: ${playerName})`);
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
            this.mockData.rooms[roomId] = {\n                id: roomId,\n                created: Date.now(),\n                phase: 'waiting',\n                players: {},\n                votes: {},\n                settings: {\n                    maxPlayers: 12,\n                    autoReveal: false\n                }\n            };\n        }\n        \n        // 加入玩家\n        const playerData = {\n            id: playerId,\n            name: playerName,\n            role: playerRole,\n            joined: Date.now(),\n            connected: true,\n            hasVoted: false,\n            vote: null\n        };\n        \n        this.mockData.rooms[roomId].players[playerId] = playerData;\n        \n        this.currentRoom = roomId;\n        this.currentPlayer = playerData;\n        \n        // 觸發玩家加入事件\n        if (this.onPlayerJoined) {\n            this.onPlayerJoined(playerData);\n        }\n        \n        console.log(`✅ 成功加入模擬房間 ${roomId} (玩家: ${playerName})`);\n        return { roomId, playerId };\n    }\n    \n    // 設定房間監聽器\n    setupRoomListener(roomId) {\n        if (!this.useFirebase) return;\n        \n        const roomRef = this.db.ref(`rooms/${roomId}`);\n        roomRef.on('value', (snapshot) => {\n            const roomData = snapshot.val();\n            if (roomData && this.onGameStateChanged) {\n                this.onGameStateChanged(roomData);\n            }\n        });\n    }\n    \n    // 設定玩家監聽器\n    setupPlayersListener(roomId) {\n        if (!this.useFirebase) return;\n        \n        const playersRef = this.db.ref(`rooms/${roomId}/players`);\n        \n        // 玩家加入\n        playersRef.on('child_added', (snapshot) => {\n            const playerData = snapshot.val();\n            if (playerData && this.onPlayerJoined) {\n                this.onPlayerJoined(playerData);\n            }\n        });\n        \n        // 玩家離開\n        playersRef.on('child_removed', (snapshot) => {\n            const playerData = snapshot.val();\n            if (playerData && this.onPlayerLeft) {\n                this.onPlayerLeft(playerData);\n            }\n        });\n        \n        // 玩家更新\n        playersRef.on('child_changed', (snapshot) => {\n            const playerData = snapshot.val();\n            if (playerData && this.onVoteUpdated) {\n                this.onVoteUpdated(playerData);\n            }\n        });\n    }\n    \n    // 設定投票監聽器\n    setupVotesListener(roomId) {\n        if (!this.useFirebase) return;\n        \n        const votesRef = this.db.ref(`rooms/${roomId}/votes`);\n        votesRef.on('value', (snapshot) => {\n            const votes = snapshot.val() || {};\n            // 處理投票更新\n            console.log('投票更新:', votes);\n        }); \n    }\n    \n    // 投票\n    async vote(value) {\n        if (!this.currentRoom || !this.currentPlayer) {\n            console.error('未加入房間或玩家資訊不存在');\n            return false;\n        }\n        \n        try {\n            if (this.useFirebase) {\n                const playerRef = this.db.ref(`rooms/${this.currentRoom}/players/${this.currentPlayer.id}`);\n                await playerRef.update({\n                    hasVoted: true,\n                    vote: value,\n                    votedAt: firebase.database.ServerValue.TIMESTAMP\n                });\n                \n                // 同時更新投票記錄\n                const voteRef = this.db.ref(`rooms/${this.currentRoom}/votes/${this.currentPlayer.id}`);\n                await voteRef.set({\n                    playerId: this.currentPlayer.id,\n                    playerName: this.currentPlayer.name,\n                    playerRole: this.currentPlayer.role,\n                    value: value,\n                    timestamp: firebase.database.ServerValue.TIMESTAMP\n                });\n            } else {\n                // 模擬模式\n                if (this.mockData.rooms[this.currentRoom]) {\n                    this.mockData.rooms[this.currentRoom].players[this.currentPlayer.id].hasVoted = true;\n                    this.mockData.rooms[this.currentRoom].players[this.currentPlayer.id].vote = value;\n                    \n                    if (this.onVoteUpdated) {\n                        this.onVoteUpdated(this.mockData.rooms[this.currentRoom].players[this.currentPlayer.id]);\n                    }\n                }\n            }\n            \n            console.log(`✅ 投票成功: ${value}`);\n            return true;\n            \n        } catch (error) {\n            console.error('投票失敗:', error);\n            if (this.onError) {\n                this.onError('投票失敗: ' + error.message);\n            }\n            return false;\n        }\n    }\n    \n    // 開牌\n    async revealCards() {\n        if (!this.currentRoom) {\n            console.error('未加入房間');\n            return false;\n        }\n        \n        try {\n            if (this.useFirebase) {\n                const roomRef = this.db.ref(`rooms/${this.currentRoom}`);\n                await roomRef.update({\n                    phase: 'revealing',\n                    revealedAt: firebase.database.ServerValue.TIMESTAMP\n                });\n            } else {\n                // 模擬模式\n                if (this.mockData.rooms[this.currentRoom]) {\n                    this.mockData.rooms[this.currentRoom].phase = 'revealing';\n                    \n                    if (this.onGameStateChanged) {\n                        this.onGameStateChanged(this.mockData.rooms[this.currentRoom]);\n                    }\n                }\n            }\n            \n            console.log('✅ 開牌成功');\n            return true;\n            \n        } catch (error) {\n            console.error('開牌失敗:', error);\n            if (this.onError) {\n                this.onError('開牌失敗: ' + error.message);\n            }\n            return false;\n        }\n    }\n    \n    // 清除投票\n    async clearVotes() {\n        if (!this.currentRoom) {\n            console.error('未加入房間');\n            return false;\n        }\n        \n        try {\n            if (this.useFirebase) {\n                const roomRef = this.db.ref(`rooms/${this.currentRoom}`);\n                await roomRef.update({\n                    phase: 'voting',\n                    votes: null\n                });\n                \n                // 清除所有玩家的投票狀態\n                const playersRef = roomRef.child('players');\n                const playersSnapshot = await playersRef.once('value');\n                const players = playersSnapshot.val() || {};\n                \n                const updates = {};\n                Object.keys(players).forEach(playerId => {\n                    updates[`players/${playerId}/hasVoted`] = false;\n                    updates[`players/${playerId}/vote`] = null;\n                });\n                \n                await roomRef.update(updates);\n            } else {\n                // 模擬模式\n                if (this.mockData.rooms[this.currentRoom]) {\n                    this.mockData.rooms[this.currentRoom].phase = 'voting';\n                    this.mockData.rooms[this.currentRoom].votes = {};\n                    \n                    Object.keys(this.mockData.rooms[this.currentRoom].players).forEach(playerId => {\n                        this.mockData.rooms[this.currentRoom].players[playerId].hasVoted = false;\n                        this.mockData.rooms[this.currentRoom].players[playerId].vote = null;\n                    });\n                    \n                    if (this.onGameStateChanged) {\n                        this.onGameStateChanged(this.mockData.rooms[this.currentRoom]);\n                    }\n                }\n            }\n            \n            console.log('✅ 清除投票成功');\n            return true;\n            \n        } catch (error) {\n            console.error('清除投票失敗:', error);\n            if (this.onError) {\n                this.onError('清除投票失敗: ' + error.message);\n            }\n            return false;\n        }\n    }\n    \n    // 離開房間\n    async leaveRoom() {\n        if (!this.currentRoom || !this.currentPlayer) {\n            return;\n        }\n        \n        try {\n            if (this.useFirebase) {\n                const playerRef = this.db.ref(`rooms/${this.currentRoom}/players/${this.currentPlayer.id}`);\n                await playerRef.remove();\n                \n                // 移除監聽器\n                const roomRef = this.db.ref(`rooms/${this.currentRoom}`);\n                roomRef.off();\n            } else {\n                // 模擬模式\n                if (this.mockData.rooms[this.currentRoom]) {\n                    delete this.mockData.rooms[this.currentRoom].players[this.currentPlayer.id];\n                    \n                    if (this.onPlayerLeft) {\n                        this.onPlayerLeft(this.currentPlayer);\n                    }\n                }\n            }\n            \n            console.log('✅ 成功離開房間');\n            \n        } catch (error) {\n            console.error('離開房間失敗:', error);\n        } finally {\n            this.currentRoom = null;\n            this.currentPlayer = null;\n        }\n    }\n    \n    // 更新投票進度\n    updateVotingProgress(votedCount, totalPlayers) {\n        // 這裡可以更新 UI 顯示投票進度\n        console.log(`投票進度: ${votedCount}/${totalPlayers}`);\n    }\n    \n    // 取得房間狀態\n    async getRoomState() {\n        if (!this.currentRoom) return null;\n        \n        if (this.useFirebase) {\n            const roomRef = this.db.ref(`rooms/${this.currentRoom}`);\n            const snapshot = await roomRef.once('value');\n            return snapshot.val();\n        } else {\n            return this.mockData.rooms[this.currentRoom] || null;\n        }\n    }\n    \n    // 生成房間 ID\n    generateRoomId() {\n        return Math.random().toString(36).substring(2, 8).toUpperCase();\n    }\n    \n    // 生成玩家 ID\n    generatePlayerId() {\n        return 'player_' + Math.random().toString(36).substring(2, 9);\n    }\n    \n    // 取得連線狀態\n    getConnectionStatus() {\n        return {\n            isConnected: this.isConnected,\n            useFirebase: this.useFirebase,\n            currentRoom: this.currentRoom,\n            currentPlayer: this.currentPlayer\n        };\n    }\n    \n    // 設定回調函數\n    setCallbacks(callbacks) {\n        this.onPlayerJoined = callbacks.onPlayerJoined || null;\n        this.onPlayerLeft = callbacks.onPlayerLeft || null;\n        this.onVoteUpdated = callbacks.onVoteUpdated || null;\n        this.onGameStateChanged = callbacks.onGameStateChanged || null;\n        this.onError = callbacks.onError || null;\n    }\n}\n