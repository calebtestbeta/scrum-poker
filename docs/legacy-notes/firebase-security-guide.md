---
title: Firebase 安全規則配置指南
original_path: FIREBASE_SECURITY_GUIDE.md
tags: ['legacy', 'firebase', 'security', 'configuration']
summary: 本指南提供 Scrum Poker 專案的生產級 Firebase Realtime Database 安全規則配置，包含基本安全規則（房間、玩家、投票管理）、進階安全配置（速率限制、房間清理機制）、安全最佳實踐（匿名身份驗證、敏感資料保護、網路層防護）以及安全監控機制。確保資料安全與適當的存取控制，並提供完整的安全檢查清單和常見問題解答。
---

# Firebase 安全規則配置指南

## 🔐 安全規則概述

本文件提供 Scrum Poker 專案的生產級 Firebase Realtime Database 安全規則配置，確保資料安全與適當的存取控制。

## 📋 基本安全規則

將以下規則複製到您的 Firebase 控制台 → Realtime Database → 規則：

```json
{
  "rules": {
    ".read": false,
    ".write": false,
    
    "rooms": {
      "$roomId": {
        // 房間 ID 格式驗證：4-20字符，英數字、連字符、底線
        ".validate": "$roomId.matches(/^[a-zA-Z0-9_-]{4,20}$/)",
        
        // 房間基本資訊
        "phase": {
          ".read": "auth != null",
          ".write": "auth != null && (newData.val() == 'voting' || newData.val() == 'revealing' || newData.val() == 'finished')"
        },
        
        "created_at": {
          ".read": "auth != null",
          ".write": "auth != null && !data.exists()"
        },
        
        "last_activity": {
          ".read": "auth != null",
          ".write": "auth != null"
        },
        
        "task_type": {
          ".read": "auth != null",
          ".write": "auth != null"
        },
        
        // 玩家管理
        "players": {
          ".read": "auth != null",
          
          "$playerId": {
            ".write": "auth != null && auth.uid == $playerId",
            ".validate": "newData.hasChildren(['name', 'role', 'joined_at']) && newData.child('name').isString() && newData.child('name').val().length <= 20 && newData.child('role').val().matches(/^(dev|qa|scrum_master|po|other)$/)",
            
            "name": {
              ".validate": "newData.isString() && newData.val().length >= 1 && newData.val().length <= 20"
            },
            
            "role": {
              ".validate": "newData.val().matches(/^(dev|qa|scrum_master|po|other)$/)"
            },
            
            "joined_at": {
              ".validate": "newData.isNumber()"
            },
            
            "last_active": {
              ".validate": "newData.isNumber()"
            }
          }
        },
        
        // 投票管理
        "votes": {
          ".read": "auth != null",
          
          "$playerId": {
            ".write": "auth != null && auth.uid == $playerId",
            ".validate": "newData.hasChildren(['value', 'timestamp']) && (newData.child('value').isNumber() || newData.child('value').val().matches(/^(coffee|question|infinity)$/))",
            
            "value": {
              ".validate": "newData.isNumber() || newData.val().matches(/^(coffee|question|infinity)$/)"
            },
            
            "timestamp": {
              ".validate": "newData.isNumber()"
            },
            
            "player_role": {
              ".validate": "newData.val().matches(/^(dev|qa|scrum_master|po|other)$/)"
            }
          }
        },
        
        // 會話統計資訊
        "session_info": {
          ".read": "auth != null",
          ".write": "auth != null",
          ".validate": "newData.hasChildren(['total_rounds'])",
          
          "total_rounds": {
            ".validate": "newData.isNumber() && newData.val() >= 0"
          },
          
          "average_votes": {
            ".validate": "newData.isString()"
          },
          
          "completion_time": {
            ".validate": "newData.isString()"
          }
        }
      }
    }
  }
}
```

## ⚡ 進階安全配置

### 1. 速率限制

為防止濫用，建議在應用層面實作速率限制：

```javascript
// 在 FirebaseService.js 中添加
class RateLimiter {
    constructor() {
        this.limits = new Map();
        this.VOTE_LIMIT = 30; // 每分鐘最多30次投票
        this.JOIN_LIMIT = 10;  // 每分鐘最多10次加入房間
    }
    
    checkLimit(userId, action) {
        const key = `${userId}_${action}`;
        const now = Date.now();
        const windowStart = now - 60000; // 1分鐘窗口
        
        if (!this.limits.has(key)) {
            this.limits.set(key, []);
        }
        
        const attempts = this.limits.get(key);
        // 清除過期記錄
        const validAttempts = attempts.filter(time => time > windowStart);
        
        const limit = action === 'vote' ? this.VOTE_LIMIT : this.JOIN_LIMIT;
        if (validAttempts.length >= limit) {
            throw new Error(`操作過於頻繁，請稍後再試`);
        }
        
        validAttempts.push(now);
        this.limits.set(key, validAttempts);
        return true;
    }
}
```

### 2. 房間清理機制

建議使用 Firebase Cloud Functions 定期清理過期房間：

```javascript
// Firebase Cloud Functions 範例
const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports.cleanupOldRooms = functions.pubsub
    .schedule('every 24 hours')
    .onRun(async (context) => {
        const db = admin.database();
        const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24小時前
        
        const snapshot = await db.ref('rooms')
            .orderByChild('last_activity')
            .endAt(cutoffTime)
            .once('value');
        
        const deletions = [];
        snapshot.forEach(child => {
            deletions.push(child.ref.remove());
        });
        
        await Promise.all(deletions);
        console.log(`已清理 ${deletions.length} 個過期房間`);
    });
```

## 🛡️ 安全最佳實踐

### 1. 匿名身份驗證配置

```javascript
// 在 FirebaseService.js 中
async initializeAuth() {
    try {
        // 啟用匿名身份驗證
        const userCredential = await firebase.auth().signInAnonymously();
        console.log('✅ Firebase 匿名身份驗證成功');
        return userCredential.user;
    } catch (error) {
        console.error('❌ Firebase 身份驗證失敗:', error);
        throw error;
    }
}
```

### 2. 敏感資料保護

**❌ 絕對不要在客戶端儲存：**
- Firebase Admin SDK 私鑰
- 服務帳戶金鑰
- 資料庫密碼
- API 密鑰

**✅ 可以在客戶端使用：**
- Firebase Web SDK 配置
- Project ID
- Auth Domain
- Database URL

### 3. 網路層防護

建議在 Firebase Hosting 中配置安全標頭：

```json
// firebase.json
{
  "hosting": {
    "headers": [
      {
        "source": "**",
        "headers": [
          {
            "key": "X-Content-Type-Options",
            "value": "nosniff"
          },
          {
            "key": "X-Frame-Options",
            "value": "DENY"
          },
          {
            "key": "X-XSS-Protection",
            "value": "1; mode=block"
          },
          {
            "key": "Strict-Transport-Security",
            "value": "max-age=31536000; includeSubDomains"
          },
          {
            "key": "Content-Security-Policy",
            "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://*.firebaseapp.com https://*.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.firebaseio.com https://*.googleapis.com; img-src 'self' data: https:;"
          }
        ]
      }
    ]
  }
}
```

## 🔍 安全監控

### 1. 異常行為監控

```javascript
// 在 SecurityUtils 中添加
class SecurityMonitor {
    static logSuspiciousActivity(userId, action, details) {
        console.warn('🚨 可疑活動:', {
            userId,
            action,
            details,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
        });
        
        // 可選：發送到監控服務
        // this.sendToMonitoringService(suspiciousActivity);
    }
    
    static validateVotePattern(userId, votes) {
        // 檢查異常投票模式
        if (votes.length > 100) { // 短時間內大量投票
            this.logSuspiciousActivity(userId, 'excessive_voting', {
                voteCount: votes.length
            });
        }
    }
}
```

### 2. 錯誤追蹤

```javascript
// 全域錯誤處理
window.addEventListener('error', (event) => {
    if (event.error && event.error.message.includes('Firebase')) {
        console.error('🔥 Firebase 錯誤:', {
            message: event.error.message,
            stack: event.error.stack,
            filename: event.filename,
            lineno: event.lineno
        });
    }
});
```

## 📊 安全檢查清單

在部署前請確認：

- [ ] **Firebase 規則已正確配置**
- [ ] **匿名身份驗證已啟用**
- [ ] **API 金鑰限制已設定**（在 Google Cloud Console）
- [ ] **CORS 政策已配置**
- [ ] **安全標頭已設置**
- [ ] **輸入驗證已實作**
- [ ] **速率限制已實作**
- [ ] **錯誤處理已完善**
- [ ] **監控和日誌已設置**
- [ ] **定期清理機制已建立**

## 🆘 常見安全問題

### Q: API 金鑰暴露在客戶端是否安全？

**A:** Firebase Web API 金鑰設計為可公開暴露，真正的安全控制在於：
1. Firebase 安全規則
2. API 金鑰的域名限制
3. 身份驗證機制

### Q: 如何防止房間 ID 猜測攻擊？

**A:** 建議使用更強的房間 ID 生成：

```javascript
function generateSecureRoomId() {
    const crypto = window.crypto || window.msCrypto;
    const array = new Uint8Array(8);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(36)).join('');
}
```

### Q: 如何處理大量併發使用者？

**A:** 
1. 實作房間人數限制
2. 使用 Firebase 的自動擴展功能
3. 考慮分區策略（按地區或時間）

---

**⚠️ 重要提醒**：安全是一個持續的過程，請定期檢查和更新安全配置，關注 Firebase 安全公告，並考慮進行滲透測試。