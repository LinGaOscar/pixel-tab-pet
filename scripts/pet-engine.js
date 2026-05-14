class PetEngine {
    constructor(container, data) {
        this.container = container;
        this.id = data.id;
        this.type = data.type;
        
        this.el = document.createElement('div');
        this.el.id = `pet-${this.id}`;
        this.el.className = `pet pet-${this.type} state-idle`;
        this.container.appendChild(this.el);

        this.posX = data.x * window.innerWidth;
        this.posY = data.y * window.innerHeight;
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
            this.posX = e.clientX - 64;
            this.posY = e.clientY - 64;
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
            this.direction = e.clientX > this.posX + 64 ? 1 : -1;
        };
        window.addEventListener('mousemove', this._onMouseMove);

        this._onResize = () => {
            const sx = window.innerWidth / this._lastWidth;
            const sy = window.innerHeight / this._lastHeight;
            this.posX *= sx;
            this.posY *= sy;
            this.targetX *= sx;
            this.targetY *= sy;
            this._lastWidth = window.innerWidth;
            this._lastHeight = window.innerHeight;
        };
        window.addEventListener('resize', this._onResize);

        this.startBrain();
        this.physicsLoop();
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
            if (this.currentState === 'idle') {
                if (Math.random() < 0.4) {
                    this.setState('walk');
                    const margin = 100;
                    this.targetX = margin + Math.random() * (window.innerWidth - margin * 2 - 128);
                    this.targetY = margin + Math.random() * (window.innerHeight - margin * 2 - 128);
                    this.direction = this.targetX > this.posX ? 1 : -1;
                } else if (Math.random() < 0.1) {
                    this.setState('sleep');
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
                this.posX = Math.max(margin, Math.min(window.innerWidth - 128 - margin, this.posX));
                this.posY = Math.max(margin, Math.min(window.innerHeight - 128 - margin, this.posY));
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
