// 本機測試專用 Firebase 設定
// 這個文件用於本機開發環境，連接到 Firebase 模擬器

const FIREBASE_CONFIG_LOCAL = {
    apiKey: "demo-api-key",
    authDomain: "demo-scrum-poker.firebaseapp.com",
    databaseURL: "http://localhost:9000?ns=demo-scrum-poker",
    projectId: "demo-scrum-poker",
    storageBucket: "demo-scrum-poker.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:demo-app-id"
};

// 自動檢測本機環境
const isLocalEnvironment = () => {
    const hostname = window.location.hostname;
    return hostname === 'localhost' || 
           hostname === '127.0.0.1' || 
           hostname.startsWith('192.168.') ||
           hostname.startsWith('10.') ||
           hostname.startsWith('172.');
};

// 匯出設定
if (typeof window !== 'undefined') {
    window.FIREBASE_CONFIG_LOCAL = FIREBASE_CONFIG_LOCAL;
    window.isLocalEnvironment = isLocalEnvironment;
    
    if (isLocalEnvironment()) {
        console.log('🏠 本機開發環境檢測完成');
        console.log('🔥 Firebase 模擬器設定已載入');
        console.log('📍 Database URL:', FIREBASE_CONFIG_LOCAL.databaseURL);
    }
}

// Node.js 環境支援
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        FIREBASE_CONFIG_LOCAL,
        isLocalEnvironment
    };
}