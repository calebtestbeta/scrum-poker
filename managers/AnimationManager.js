// 動畫管理器 - 處理所有動畫效果和粒子系統
class AnimationManager {
    constructor() {
        // 粒子系統
        this.particles = [];
        this.maxParticles = 200;
        
        // 螢幕效果
        this.screenEffects = {
            flash: {
                active: false,
                color: null,
                intensity: 0,
                duration: 300,
                startTime: 0
            },
            shake: {
                active: false,
                intensity: 10,
                duration: 500,
                startTime: 0,
                offsetX: 0,
                offsetY: 0
            },
            fade: {
                active: false,
                opacity: 0,
                targetOpacity: 0,
                speed: 0.05,
                color: null
            },
            zoom: {
                active: false,
                scale: 1,
                targetScale: 1,
                speed: 0.05,
                centerX: 0,
                centerY: 0
            }
        };
        
        // 背景動画
        this.backgroundAnimation = {
            stars: [],
            floatingElements: [],
            meteors: []
        };
        
        // 轉場動畫
        this.transitions = {
            active: false,
            type: 'fade', // 'fade', 'slide', 'wipe', 'zoom'
            progress: 0,
            duration: 1000,
            startTime: 0,
            onComplete: null
        };
        
        // 性能設定
        this.performanceMode = 'high'; // 'low', 'medium', 'high'
        this.frameSkip = 0;
        this.targetFPS = 60;
        
        // 初始化背景元素
        this.initializeBackgroundElements();
        
        console.log('✨ AnimationManager 已初始化');
    }
    
    // 初始化背景元素
    initializeBackgroundElements() {
        // 如果 width/height 未定義，延遲初始化
        if (typeof width === 'undefined' || typeof height === 'undefined') {
            console.log('⏱️ 延遲背景元素初始化，等候畫布');
            return;
        }
        
        // 清除現有元素
        this.backgroundAnimation.stars = [];
        this.backgroundAnimation.floatingElements = [];
        
        // 初始化星星
        for (let i = 0; i < 50; i++) {
            this.backgroundAnimation.stars.push({
                x: random(width),
                y: random(height),
                size: random(1, 3),
                opacity: random(50, 255),
                twinkleSpeed: random(0.01, 0.05),
                twinklePhase: random(TWO_PI)
            });
        }
        
        // 初始化浮動元素
        for (let i = 0; i < 20; i++) {
            this.backgroundAnimation.floatingElements.push({
                x: random(width),
                y: random(height),
                size: random(10, 30),
                speed: random(0.1, 0.5),
                angle: random(TWO_PI),
                rotationSpeed: random(-0.02, 0.02),
                opacity: random(10, 50),
                type: random(['circle', 'triangle', 'diamond'])
            });
        }
        
        console.log(`⭐ 背景元素初始化完成 (${this.backgroundAnimation.stars.length} 星星, ${this.backgroundAnimation.floatingElements.length} 浮動元素)`);
    }
    
    // 更新動畫
    update() {
        // 性能控制
        if (this.performanceMode === 'low' && this.frameSkip++ % 2 !== 0) {
            return;
        }
        
        // 更新粒子
        this.updateParticles();
        
        // 更新螢幕效果
        this.updateScreenEffects();
        
        // 更新背景動畫
        this.updateBackgroundAnimation();
        
        // 更新轉場動畫
        this.updateTransitions();
        
        // 繪製效果
        this.draw();
    }
    
    // 更新粒子系統
    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            // 更新位置
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // 重力
            if (particle.gravity) {
                particle.vy += particle.gravity;
            }
            
            // 阻力
            if (particle.drag) {
                particle.vx *= particle.drag;
                particle.vy *= particle.drag;
            }
            
            // 更新屬性
            particle.life -= particle.decay;
            particle.size *= particle.sizeDecay || 1;
            particle.opacity = particle.life * particle.maxOpacity;
            
            // 移除死亡粒子
            if (particle.life <= 0 || particle.size < 0.1) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    // 更新螢幕效果
    updateScreenEffects() {
        const currentTime = millis();
        
        // 更新閃光效果
        if (this.screenEffects.flash.active) {
            const elapsed = currentTime - this.screenEffects.flash.startTime;
            const progress = elapsed / this.screenEffects.flash.duration;
            
            if (progress >= 1) {
                this.screenEffects.flash.active = false;
                this.screenEffects.flash.intensity = 0;
            } else {
                // 閃光衰減
                this.screenEffects.flash.intensity = (1 - progress) * 255;
            }
        }
        
        // 更新震動效果
        if (this.screenEffects.shake.active) {
            const elapsed = currentTime - this.screenEffects.shake.startTime;
            const progress = elapsed / this.screenEffects.shake.duration;
            
            if (progress >= 1) {
                this.screenEffects.shake.active = false;
                this.screenEffects.shake.offsetX = 0;
                this.screenEffects.shake.offsetY = 0;
            } else {
                const intensity = (1 - progress) * this.screenEffects.shake.intensity;
                this.screenEffects.shake.offsetX = random(-intensity, intensity);
                this.screenEffects.shake.offsetY = random(-intensity, intensity);
            }
        }
        
        // 更新淡入淡出效果
        if (this.screenEffects.fade.active) {
            const diff = this.screenEffects.fade.targetOpacity - this.screenEffects.fade.opacity;
            this.screenEffects.fade.opacity += diff * this.screenEffects.fade.speed;
            
            if (Math.abs(diff) < 0.01) {
                this.screenEffects.fade.opacity = this.screenEffects.fade.targetOpacity;
                if (this.screenEffects.fade.opacity === 0) {
                    this.screenEffects.fade.active = false;
                }
            }
        }
        
        // 更新縮放效果
        if (this.screenEffects.zoom.active) {
            const diff = this.screenEffects.zoom.targetScale - this.screenEffects.zoom.scale;
            this.screenEffects.zoom.scale += diff * this.screenEffects.zoom.speed;
            
            if (Math.abs(diff) < 0.001) {
                this.screenEffects.zoom.scale = this.screenEffects.zoom.targetScale;
                if (this.screenEffects.zoom.scale === 1) {
                    this.screenEffects.zoom.active = false;
                }
            }
        }
    }
    
    // 更新背景動畫
    updateBackgroundAnimation() {
        // 更新星星閃爍
        for (const star of this.backgroundAnimation.stars) {
            star.twinklePhase += star.twinkleSpeed;
            star.opacity = 100 + sin(star.twinklePhase) * 155;
        }
        
        // 更新浮動元素
        for (const element of this.backgroundAnimation.floatingElements) {
            element.x += cos(element.angle) * element.speed;
            element.y += sin(element.angle) * element.speed;
            element.angle += element.rotationSpeed;
            
            // 邊界回繞
            if (element.x < -50) element.x = width + 50;
            if (element.x > width + 50) element.x = -50;
            if (element.y < -50) element.y = height + 50;
            if (element.y > height + 50) element.y = -50;
        }
        
        // 更新流星
        for (let i = this.backgroundAnimation.meteors.length - 1; i >= 0; i--) {
            const meteor = this.backgroundAnimation.meteors[i];
            meteor.x += meteor.vx;
            meteor.y += meteor.vy;
            meteor.life -= meteor.decay;
            
            if (meteor.life <= 0 || meteor.x > width + 100 || meteor.y > height + 100) {
                this.backgroundAnimation.meteors.splice(i, 1);
            }
        }
        
        // 隨機產生流星
        if (random() < 0.001 && this.backgroundAnimation.meteors.length < 3) {
            this.createMeteor();
        }
    }
    
    // 更新轉場動畫
    updateTransitions() {
        if (!this.transitions.active) return;
        
        const currentTime = millis();
        const elapsed = currentTime - this.transitions.startTime;
        this.transitions.progress = Math.min(elapsed / this.transitions.duration, 1);
        
        if (this.transitions.progress >= 1) {
            this.transitions.active = false;
            if (this.transitions.onComplete) {
                this.transitions.onComplete();
            }
        }
    }
    
    // 繪製動畫效果
    draw() {
        push();
        
        // 套用震動效果
        if (this.screenEffects.shake.active) {
            translate(this.screenEffects.shake.offsetX, this.screenEffects.shake.offsetY);
        }
        
        // 套用縮放效果
        if (this.screenEffects.zoom.active) {
            translate(this.screenEffects.zoom.centerX, this.screenEffects.zoom.centerY);
            scale(this.screenEffects.zoom.scale);
            translate(-this.screenEffects.zoom.centerX, -this.screenEffects.zoom.centerY);
        }
        
        // 繪製背景動畫
        this.drawBackgroundAnimation();
        
        // 繪製粒子
        this.drawParticles();
        
        pop();
        
        // 繪製螢幕效果（不受變換影響）
        this.drawScreenEffects();
        
        // 繪製轉場效果
        this.drawTransitions();
    }
    
    // 繪製背景動畫
    drawBackgroundAnimation() {
        if (this.performanceMode === 'low') return;
        
        // 繪製星星
        for (const star of this.backgroundAnimation.stars) {
            fill(255, star.opacity);
            noStroke();
            circle(star.x, star.y, star.size);
        }
        
        // 繪製浮動元素
        if (this.performanceMode === 'high') {
            for (const element of this.backgroundAnimation.floatingElements) {
                push();
                translate(element.x, element.y);
                rotate(element.angle);
                fill(255, element.opacity);
                noStroke();
                
                if (element.type === 'circle') {
                    circle(0, 0, element.size);
                } else if (element.type === 'triangle') {
                    triangle(-element.size/2, element.size/2, 
                            element.size/2, element.size/2, 
                            0, -element.size/2);
                } else if (element.type === 'diamond') {
                    quad(0, -element.size/2, 
                         element.size/2, 0, 
                         0, element.size/2, 
                         -element.size/2, 0);
                }
                
                pop();
            }
        }
        
        // 繪製流星
        for (const meteor of this.backgroundAnimation.meteors) {
            push();
            stroke(255, meteor.life * 255);
            strokeWeight(2);
            const tailLength = 30;
            line(meteor.x, meteor.y, 
                 meteor.x - meteor.vx * tailLength, 
                 meteor.y - meteor.vy * tailLength);
            
            // 流星頭部
            fill(255, meteor.life * 255);
            noStroke();
            circle(meteor.x, meteor.y, 4);
            pop();
        }
    }
    
    // 繪製粒子
    drawParticles() {
        for (const particle of this.particles) {
            push();
            translate(particle.x, particle.y);
            
            if (particle.rotation !== undefined) {
                rotate(particle.rotation);
            }
            
            fill(particle.color.r, particle.color.g, particle.color.b, particle.opacity);
            noStroke();
            
            if (particle.shape === 'circle') {
                circle(0, 0, particle.size);
            } else if (particle.shape === 'square') {
                rectMode(CENTER);
                rect(0, 0, particle.size, particle.size);
            } else if (particle.shape === 'triangle') {
                triangle(-particle.size/2, particle.size/2, 
                        particle.size/2, particle.size/2, 
                        0, -particle.size/2);
            }
            
            pop();
        }
    }
    
    // 繪製螢幕效果
    drawScreenEffects() {
        // 閃光效果
        if (this.screenEffects.flash.active) {
            push();
            if (this.screenEffects.flash.color) {
                fill(red(this.screenEffects.flash.color), 
                     green(this.screenEffects.flash.color), 
                     blue(this.screenEffects.flash.color), 
                     this.screenEffects.flash.intensity);
            } else {
                fill(255, this.screenEffects.flash.intensity);
            }
            noStroke();
            rect(0, 0, width, height);
            pop();
        }
        
        // 淡入淡出效果
        if (this.screenEffects.fade.active && this.screenEffects.fade.opacity > 0) {
            push();
            if (this.screenEffects.fade.color) {
                fill(red(this.screenEffects.fade.color), 
                     green(this.screenEffects.fade.color), 
                     blue(this.screenEffects.fade.color), 
                     this.screenEffects.fade.opacity);
            } else {
                fill(0, this.screenEffects.fade.opacity);
            }
            noStroke();
            rect(0, 0, width, height);
            pop();
        }
    }
    
    // 繪製轉場效果
    drawTransitions() {
        if (!this.transitions.active) return;
        
        push();
        const progress = this.easeInOutCubic(this.transitions.progress);
        
        if (this.transitions.type === 'fade') {
            fill(0, progress * 255);
            noStroke();
            rect(0, 0, width, height);
        } else if (this.transitions.type === 'slide') {
            fill(0);
            noStroke();
            rect(0, 0, width * (1 - progress), height);
        } else if (this.transitions.type === 'wipe') {
            fill(0);
            noStroke();
            rect(0, 0, width, height * progress);
        } else if (this.transitions.type === 'zoom') {
            const scale = 1 + progress * 2;
            const opacity = progress * 255;
            translate(width/2, height/2);
            scale(scale);
            translate(-width/2, -height/2);
            fill(0, opacity);
            noStroke();
            rect(0, 0, width, height);
        }
        
        pop();
    }
    
    // 建立粒子爆炸效果
    createExplosion(x, y, count = 20, color = null) {
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * TWO_PI;
            const speed = random(2, 8);
            const size = random(3, 12);
            
            this.particles.push({
                x: x,
                y: y,
                vx: cos(angle) * speed,
                vy: sin(angle) * speed,
                size: size,
                life: 1.0,
                decay: random(0.01, 0.03),
                maxOpacity: 255,
                opacity: 255,
                color: color || {
                    r: random(100, 255),
                    g: random(100, 255),
                    b: random(100, 255)
                },
                shape: random(['circle', 'square', 'triangle']),
                gravity: 0.1,
                drag: 0.98,
                sizeDecay: 0.99
            });
        }
        
        // 限制粒子數量
        while (this.particles.length > this.maxParticles) {
            this.particles.shift();
        }
    }
    
    // 建立慶祝效果
    createCelebration(x, y) {
        this.createExplosion(x, y, 30, color(251, 191, 36)); // 金色
        
        // 額外的彩色粒子
        for (let i = 0; i < 10; i++) {
            const angle = random(TWO_PI);
            const speed = random(1, 4);
            
            this.particles.push({
                x: x,
                y: y,
                vx: cos(angle) * speed,
                vy: sin(angle) * speed - 2, // 向上偏移
                size: random(5, 15),
                life: 1.0,
                decay: random(0.005, 0.015),
                maxOpacity: 200,
                opacity: 200,
                color: {
                    r: random(200, 255),
                    g: random(200, 255),
                    b: random(100, 255)
                },
                shape: 'circle',
                gravity: 0.05,
                drag: 0.99,
                sizeDecay: 0.995
            });
        }
    }
    
    // 建立流星
    createMeteor() {
        this.backgroundAnimation.meteors.push({
            x: random(-50, width/2),
            y: random(-50, height/2),
            vx: random(2, 5),
            vy: random(2, 5),
            life: 1.0,
            decay: 0.01
        });
    }
    
    // 觸發閃光效果
    flash(color = null, duration = 300) {
        this.screenEffects.flash.active = true;
        this.screenEffects.flash.color = color;
        this.screenEffects.flash.duration = duration;
        this.screenEffects.flash.startTime = millis();
        this.screenEffects.flash.intensity = 255;
    }
    
    // 觸發震動效果
    shake(intensity = 10, duration = 500) {
        this.screenEffects.shake.active = true;
        this.screenEffects.shake.intensity = intensity;
        this.screenEffects.shake.duration = duration;
        this.screenEffects.shake.startTime = millis();
    }
    
    // 觸發淡入淡出效果
    fade(targetOpacity, speed = 0.05, color = null) {
        this.screenEffects.fade.active = true;
        this.screenEffects.fade.targetOpacity = targetOpacity;
        this.screenEffects.fade.speed = speed;
        this.screenEffects.fade.color = color;
    }
    
    // 觸發縮放效果
    zoom(targetScale, speed = 0.05, centerX = width/2, centerY = height/2) {
        this.screenEffects.zoom.active = true;
        this.screenEffects.zoom.targetScale = targetScale;
        this.screenEffects.zoom.speed = speed;
        this.screenEffects.zoom.centerX = centerX;
        this.screenEffects.zoom.centerY = centerY;
    }
    
    // 開始轉場動畫
    startTransition(type, duration = 1000, onComplete = null) {
        this.transitions.active = true;
        this.transitions.type = type;
        this.transitions.duration = duration;
        this.transitions.startTime = millis();
        this.transitions.progress = 0;
        this.transitions.onComplete = onComplete;
    }
    
    // 設定性能模式
    setPerformanceMode(mode) {
        this.performanceMode = mode;
        
        if (mode === 'low') {
            this.maxParticles = 50;
        } else if (mode === 'medium') {
            this.maxParticles = 100;
        } else {
            this.maxParticles = 200;
        }
        
        // 清除多餘粒子
        while (this.particles.length > this.maxParticles) {
            this.particles.shift();
        }
    }
    
    // 清除所有效果
    clearAllEffects() {
        this.particles = [];
        this.screenEffects.flash.active = false;
        this.screenEffects.shake.active = false;
        this.screenEffects.fade.active = false;
        this.screenEffects.zoom.active = false;
        this.transitions.active = false;
    }
    
    // 緩動函數
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    
    // 取得性能統計
    getPerformanceStats() {
        return {
            particleCount: this.particles.length,
            maxParticles: this.maxParticles,
            performanceMode: this.performanceMode,
            activeEffects: {
                flash: this.screenEffects.flash.active,
                shake: this.screenEffects.shake.active,
                fade: this.screenEffects.fade.active,
                zoom: this.screenEffects.zoom.active,
                transition: this.transitions.active
            }
        };
    }
}

console.log('✨ AnimationManager 類別已載入');