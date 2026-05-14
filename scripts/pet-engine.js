class PetEngine {
    static petSizePx() {
        const s = Math.min(window.innerWidth, window.innerHeight) / 8;
        return Math.round(Math.max(48, Math.min(128, s)));
    }

    static applyCSSVar() {
        document.documentElement.style.setProperty('--pet-size', PetEngine.petSizePx() + 'px');
    }

    constructor(container, data) {
        this.container = container;
        this.id = data.id;
        this.type = data.type;

        this._sz = PetEngine.petSizePx();
        PetEngine.applyCSSVar();

        this.el = document.createElement('div');
        this.el.id = `pet-${this.id}`;
        this.el.className = `pet pet-${this.type} state-idle`;
        this.container.appendChild(this.el);

        this.posX = data.x * window.innerWidth;
        this.posY = this._snapZoneY(data.y * window.innerHeight);
        this.targetX = this.posX;
        this.targetY = this.posY;
        
        this.direction = 1;
        this.speed = 1.5;
        this.currentState = 'idle';
        this.alive = true;
        this.dragging = false;
        this._maybeDragging = false;
        this._lastWidth = window.innerWidth;
        this._lastHeight = window.innerHeight;

        this.init();
    }

    init() {
        let _dragStartX = 0, _dragStartY = 0;

        this.el.addEventListener('pointerdown', (e) => {
            if (e.button !== 0) return;
            _dragStartX = e.clientX;
            _dragStartY = e.clientY;
            this._maybeDragging = true;
            e.preventDefault();
        });

        this._onPointerMove = (e) => {
            if (!this._maybeDragging) return;
            if (!this.dragging) {
                if (Math.abs(e.clientX - _dragStartX) < 5 && Math.abs(e.clientY - _dragStartY) < 5) return;
                this.dragging = true;
                this.el.classList.add('dragging');
                this.setState('idle');
            }
            this.posX = e.clientX - this._sz / 2;
            this.posY = e.clientY - this._sz / 2;
        };
        window.addEventListener('pointermove', this._onPointerMove);

        this._onPointerUp = (e) => {
            if (!this._maybeDragging) return;
            this._maybeDragging = false;
            if (this.dragging) {
                this.dragging = false;
                this.el.classList.remove('dragging');
                this.el.dispatchEvent(new CustomEvent('pet-drop', {
                    bubbles: true,
                    detail: { id: this.id, clientX: e.clientX, clientY: e.clientY }
                }));
            } else {
                this.handleInteraction();
            }
        };
        window.addEventListener('pointerup', this._onPointerUp);

        this._onMouseMove = (e) => {
            if (this.dragging || this.currentState === 'walk' || this.currentState === 'jump') return;
            this.direction = e.clientX > this.posX + this._sz / 2 ? 1 : -1;
        };
        window.addEventListener('mousemove', this._onMouseMove);

        this._onResize = () => {
            const sx = window.innerWidth / this._lastWidth;
            const sy = window.innerHeight / this._lastHeight;
            this.posX *= sx;
            this.posY *= sy;
            this.targetX *= sx;
            this.targetY *= sy;
            this._sz = PetEngine.petSizePx();
            PetEngine.applyCSSVar();
            this._lastWidth = window.innerWidth;
            this._lastHeight = window.innerHeight;
        };
        window.addEventListener('resize', this._onResize);

        this.startBrain();
        this.physicsLoop();
    }

    isGroundPet() { return this.type.startsWith('cat') || this.type.startsWith('dog'); }
    isAirPet()    { return this.type.startsWith('bird'); }
    isWaterPet()  { return this.type.startsWith('fish'); }

    _getZone() {
        const h  = window.innerHeight;
        const sz = this._sz;
        const groundLine = h * 0.65;
        const waterMinY  = groundLine + 15;
        const waterMaxY  = h - sz - 20;
        return {
            groundY:   groundLine - sz,
            airMinY:   20,
            airMaxY:   groundLine - sz - 30,
            waterMinY,
            waterMaxY: Math.max(waterMinY + 20, waterMaxY)
        };
    }

    // 依物種把初始 Y 吸附到對應層，避免存檔位置跨層
    _snapZoneY(rawY) {
        const z = this._getZone();
        if (this.isGroundPet()) return z.groundY;
        if (this.isWaterPet())  return Math.max(z.waterMinY, Math.min(z.waterMaxY, rawY));
        if (this.isAirPet())    return Math.max(z.airMinY,   Math.min(z.airMaxY,   rawY));
        return rawY;
    }

    setPetType(type) {
        this.el.classList.remove(`pet-${this.type}`);
        this.type = type;
        this.el.classList.add(`pet-${this.type}`);
    }

    setState(state) {
        if (this.currentState === state) return;
        this.el.classList.remove(`state-${this.currentState}`);
        this.currentState = state;
        this.el.classList.add(`state-${this.currentState}`);
    }

    handleInteraction() {
        this.setState('jump');
        setTimeout(() => this.setState('idle'), 1000);
    }

    startBrain() {
        const tick = () => {
            if (!this.alive) return;
            const margin = 100;
            const z = this._getZone();

            if (this.currentState === 'idle') {
                if (this.isGroundPet()) {
                    // 狗貓：只在地板水平移動
                    if (Math.random() < 0.4) {
                        this.setState('walk');
                        this.targetX = margin + Math.random() * (window.innerWidth - margin * 2 - this._sz);
                        this.targetY = z.groundY;
                        this.direction = this.targetX > this.posX ? 1 : -1;
                    } else if (Math.random() < 0.1) {
                        this.setState('sleep');
                    }

                } else if (this.isAirPet()) {
                    const onGround = this.posY >= z.groundY - 5;
                    if (onGround) {
                        // 落地狀態：高機率起飛，偶爾走一下或休息
                        if (Math.random() < 0.65) {
                            this.setState('walk');
                            this.targetX = margin + Math.random() * (window.innerWidth - margin * 2 - this._sz);
                            this.targetY = z.airMinY + Math.random() * (z.airMaxY - z.airMinY);
                            this.direction = this.targetX > this.posX ? 1 : -1;
                        } else if (Math.random() < 0.5) {
                            this.setState('walk');
                            this.targetX = margin + Math.random() * (window.innerWidth - margin * 2 - this._sz);
                            this.targetY = z.groundY;
                            this.direction = this.targetX > this.posX ? 1 : -1;
                        } else if (Math.random() < 0.2) {
                            this.setState('sleep');
                        }
                    } else {
                        // 飛行狀態：主要留在空中，低機率降落
                        this.setState('walk');
                        if (Math.random() < 0.10) {
                            this.targetX = margin + Math.random() * (window.innerWidth - margin * 2 - this._sz);
                            this.targetY = z.groundY;
                        } else {
                            this.targetX = margin + Math.random() * (window.innerWidth - margin * 2 - this._sz);
                            this.targetY = z.airMinY + Math.random() * (z.airMaxY - z.airMinY);
                        }
                        this.direction = this.targetX > this.posX ? 1 : -1;
                    }

                } else if (this.isWaterPet()) {
                    // 魚類：在水層自由游動
                    if (Math.random() < 0.4) {
                        this.setState('walk');
                        this.targetX = margin + Math.random() * (window.innerWidth - margin * 2 - this._sz);
                        this.targetY = z.waterMinY + Math.random() * (z.waterMaxY - z.waterMinY);
                        this.direction = this.targetX > this.posX ? 1 : -1;
                    }
                }

            } else if (this.currentState === 'sleep') {
                if (Math.random() < 0.1) {
                    this.setState('idle');
                }
            }
            setTimeout(tick, 3000 + Math.random() * 5000);
        };
        tick();
    }

    physicsLoop() {
        const update = () => {
            if (!this.alive) return;
            if (this.currentState === 'walk' && !this.dragging) {
                const dx = this.targetX - this.posX;
                const dy = this.targetY - this.posY;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > 5) {
                    this.posX += (dx / dist) * this.speed;
                    this.posY += (dy / dist) * this.speed;
                    this.direction = dx > 0 ? 1 : -1;
                } else {
                    this.setState('idle');
                }
            }
            
            if (!this.dragging) {
                const margin = 20;
                const sz = this._sz;
                this.posX = Math.max(margin, Math.min(window.innerWidth - sz - margin, this.posX));
                if (this.isGroundPet()) {
                    this.posY = this._getZone().groundY;
                } else {
                    this.posY = Math.max(margin, Math.min(window.innerHeight - sz - margin, this.posY));
                }
            }

            this.updateDOM();
            requestAnimationFrame(update);
        };
        update();
    }

    updateDOM() {
        this.el.style.transform = `translate(${this.posX}px, ${this.posY}px) scaleX(${this.direction})`;
    }

    destroy() {
        this.alive = false;
        window.removeEventListener('pointermove', this._onPointerMove);
        window.removeEventListener('pointerup', this._onPointerUp);
        window.removeEventListener('mousemove', this._onMouseMove);
        window.removeEventListener('resize', this._onResize);
        this.el.remove();
    }
}
