# 伺服器配置說明

## Content Security Policy (CSP) 配置

為了確保安全性，請在您的 Web 伺服器中設置以下 HTTP 標頭：

### Apache (.htaccess)
```apache
Header always set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.gstatic.com https://fonts.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://fonts.googleapis.com; img-src 'self' data: https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
Header always set X-Content-Type-Options "nosniff"
Header always set X-Frame-Options "DENY"
Header always set X-XSS-Protection "1; mode=block"
Header always set Referrer-Policy "strict-origin-when-cross-origin"
```

### Nginx
```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.gstatic.com https://fonts.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://fonts.googleapis.com; img-src 'self' data: https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self';" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

### Express.js (Node.js)
```javascript
app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.gstatic.com https://fonts.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://fonts.googleapis.com; img-src 'self' data: https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self';");
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});
```

### Python Flask
```python
from flask import Flask, make_response

app = Flask(__name__)

@app.after_request
def after_request(response):
    response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.gstatic.com https://fonts.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://fonts.googleapis.com; img-src 'self' data: https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    return response
```

## CSP 說明

- `default-src 'self'`: 預設只允許同源資源
- `script-src`: 允許本地腳本、內聯腳本和 Google CDN（Firebase SDK）
- `style-src`: 允許本地樣式、內聯樣式和 Google 字體 API
- `font-src`: 允許本地字體和 Google 字體
- `connect-src`: 允許連接到 Firebase 和 Google APIs
- `img-src`: 允許本地、data URI 和 HTTPS 圖片
- `frame-ancestors 'none'`: 防止頁面被嵌入框架中
- `base-uri 'self'`: 限制 base 標籤只能使用同源 URL
- `form-action 'self'`: 限制表單只能提交到同源

## Firebase 連接配置

確保 CSP 規則包含以下 Firebase 相關域名：
- `https://*.firebaseio.com` - Firebase Realtime Database
- `https://*.googleapis.com` - Google APIs（包括身份驗證和其他服務）
- `https://www.gstatic.com` - Firebase SDK 和相關腳本
- `https://fonts.googleapis.com` - Google 字體 API
- `https://fonts.gstatic.com` - Google 字體文件

## 常見問題和解決方案

### 1. Firebase 連接被 CSP 阻止
如果控制台出現 CSP 違規錯誤，請檢查：
- 伺服器是否正確設置了 CSP 標頭
- 是否包含了所有必要的 Firebase 域名
- 本地開發時是否需要添加 `localhost` 到 `connect-src`

### 2. 本地開發配置
對於本地開發，可能需要在 CSP 中添加：
```
connect-src 'self' http://localhost:9000 https://*.firebaseio.com https://*.googleapis.com
```

這些設置確保應用程式能夠安全地連接到 Firebase 服務，同時防止 XSS 攻擊和其他安全威脅。