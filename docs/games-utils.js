function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name); // null if not found
}

let didCelebrate = false;

function celebrate() {
    if (didCelebrate) return; // prevent double-firing
    didCelebrate = true;

    // Respect reduced-motion
    const prefersReduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduce) {
        // Gentle pulse on the card instead of confetti
        const card = document.querySelector('.card');
        if (card) {
            card.style.transition = 'transform 300ms ease, box-shadow 300ms ease';
            card.style.transform = 'scale(1.02)';
            card.style.boxShadow = '0 12px 40px rgba(20,63,87,.18)';
            setTimeout(() => {
                card.style.transform = '';
                card.style.boxShadow = '';
            }, 700);
        }
        return;
    }

    // Create overlay canvas
    const canvas = document.createElement('canvas');
    canvas.className = 'confetti';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    // Handle high-DPI
    const dpr = Math.max(1, window.devicePixelRatio || 1);

    function resize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    const onResize = () => resize();
    window.addEventListener('resize', onResize);

    const colors = ['#22c1c3', '#f25c54', '#f0db79', '#6bd3ff', '#9be7a7', '#a0a3ff'];
    const count = Math.min(180, Math.max(100, Math.floor(window.innerWidth * window.innerHeight / 9000)));
    const pieces = Array.from({
        length: count
    }, () => ({
        x: Math.random() * window.innerWidth,
        y: -20 - Math.random() * window.innerHeight * 0.3,
        size: 6 + Math.random() * 10,
        color: colors[(Math.random() * colors.length) | 0],
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() * 0.25) - 0.125,
        vx: -2.5 + Math.random() * 5,
        vy: 3.5 + Math.random() * 4,
        ay: 0.10 + Math.random() * 0.06,
        drag: 0.0015 + Math.random() * 0.004,
        shape: Math.random() < 0.5 ? 'rect' : 'circle'
    }));

    const DURATION = 3000; // ms
    const start = performance.now();

    function draw(t) {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

        for (const p of pieces) {
            // physics
            p.vx *= (1 - p.drag);
            p.vy += p.ay;
            p.x += p.vx;
            p.y += p.vy;
            p.angle += p.spin;

            // wrap a bit on X for nicer spread
            if (p.x < -30) p.x = window.innerWidth + 30;
            if (p.x > window.innerWidth + 30) p.x = -30;

            // draw
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.angle);
            ctx.fillStyle = p.color;
            if (p.shape === 'rect') {
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
            } else {
                ctx.beginPath();
                ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        if (t - start < DURATION) {
            requestAnimationFrame(draw);
        } else {
            // fade out and clean up
            canvas.style.transition = 'opacity 600ms ease';
            canvas.style.opacity = '0';
            canvas.addEventListener('transitionend', () => {
                window.removeEventListener('resize', onResize);
                canvas.remove();
            }, {
                once: true
            });
        }
    }
    requestAnimationFrame(draw);
}
