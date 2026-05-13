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
        
        this.init();
    }

    init() {
        this.el.addEventListener('click', () => this.handleInteraction());
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
            if (this.currentState === 'idle' || this.currentState === 'sleep') {
                if (Math.random() < 0.4) {
                    this.setState('walk');
                    // Pick a random target within window bounds
                    const margin = 100;
                    this.targetX = margin + Math.random() * (window.innerWidth - margin * 2 - 128);
                    this.targetY = margin + Math.random() * (window.innerHeight - margin * 2 - 128);
                    this.direction = this.targetX > this.posX ? 1 : -1;
                } else if (Math.random() < 0.1) {
                    this.setState(this.currentState === 'sleep' ? 'idle' : 'sleep');
                }
            }
            setTimeout(tick, 3000 + Math.random() * 5000);
        };
        tick();
    }

    physicsLoop() {
        const update = () => {
            if (this.currentState === 'walk') {
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
            
            // Keep within bounds if window resized
            const margin = 20;
            this.posX = Math.max(margin, Math.min(window.innerWidth - 128 - margin, this.posX));
            this.posY = Math.max(margin, Math.min(window.innerHeight - 128 - margin, this.posY));

            this.updateDOM();
            requestAnimationFrame(update);
        };
        update();
    }

    updateDOM() {
        this.el.style.transform = `translate(${this.posX}px, ${this.posY}px) scaleX(${this.direction})`;
    }

    destroy() {
        this.el.remove();
    }
}
