// 2D 向量類別 - 用於位置和動畫計算
class Vector2D {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    
    // 複製向量
    copy() {
        return new Vector2D(this.x, this.y);
    }
    
    // 向量加法
    add(vector) {
        this.x += vector.x;
        this.y += vector.y;
        return this;
    }
    
    // 向量減法
    sub(vector) {
        this.x -= vector.x;
        this.y -= vector.y;
        return this;
    }
    
    // 向量乘法（標量）
    mult(scalar) {
        this.x *= scalar;
        this.y *= scalar;
        return this;
    }
    
    // 向量除法（標量）
    div(scalar) {
        if (scalar !== 0) {
            this.x /= scalar;
            this.y /= scalar;
        }
        return this;
    }
    
    // 計算向量長度
    mag() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    
    // 正規化向量
    normalize() {
        const m = this.mag();
        if (m !== 0) {
            this.div(m);
        }
        return this;
    }
    
    // 限制向量長度
    limit(max) {
        if (this.mag() > max) {
            this.normalize();
            this.mult(max);
        }
        return this;
    }
    
    // 計算兩向量距離
    dist(vector) {
        const dx = this.x - vector.x;
        const dy = this.y - vector.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    // 線性插值
    lerp(vector, amount) {
        this.x += (vector.x - this.x) * amount;
        this.y += (vector.y - this.y) * amount;
        return this;
    }
    
    // 設定座標
    set(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }
    
    // 轉換為字串
    toString() {
        return `Vector2D(${this.x.toFixed(2)}, ${this.y.toFixed(2)})`;
    }
    
    // 靜態方法：建立隨機向量
    static random() {
        return new Vector2D(Math.random() * 2 - 1, Math.random() * 2 - 1);
    }
    
    // 靜態方法：從角度建立向量
    static fromAngle(angle) {
        return new Vector2D(Math.cos(angle), Math.sin(angle));
    }
    
    // 靜態方法：向量加法
    static add(v1, v2) {
        return new Vector2D(v1.x + v2.x, v1.y + v2.y);
    }
    
    // 靜態方法：向量減法
    static sub(v1, v2) {
        return new Vector2D(v1.x - v2.x, v1.y - v2.y);
    }
    
    // 靜態方法：線性插值
    static lerp(v1, v2, amount) {
        return new Vector2D(
            v1.x + (v2.x - v1.x) * amount,
            v1.y + (v2.y - v1.y) * amount
        );
    }
}