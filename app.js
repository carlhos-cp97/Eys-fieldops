const K = 8.98755e9;
const SCALE = 100;

const canvas = document.getElementById('simCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;

// Elementos de la UI
const cargasContainer = document.getElementById('cargas-container');
const btnAdd = document.getElementById('btn-add');
const btnRemove = document.getElementById('btn-remove');

const rDisp = document.getElementById('r-disp');
const fDisp = document.getElementById('f-disp');
const fType = document.getElementById('f-type');

const vRead = document.getElementById('v-read');
const eRead = document.getElementById('e-read');
const angRead = document.getElementById('ang-read');

const chkField = document.getElementById('chk-field') || { checked: true };
const chkEqui = document.getElementById('chk-equi') || { checked: true };
const chkQuantum = document.getElementById('chk-quantum') || { checked: true };

// Partículas de fondo
let quantumParticles = [];

// Cargas iniciales
let cargas = [
    { id: 1, x: 250, y: 250, q: 20e-9, radius: 22, isDragging: false },
    { id: 2, x: 550, y: 250, q: -20e-9, radius: 22, isDragging: false }
];

let probe = { x: 400, y: 150, radius: 14, isDragging: false };
let draggedObj = null;

function initCanvasSize() {
    if (!canvas) return;
    const parent = canvas.parentElement;
    const w = parent ? parent.clientWidth : 800;
    const h = parent ? parent.clientHeight : 500;
    canvas.width = w > 0 ? w : 800;
    canvas.height = h > 0 ? h : 500;

    quantumParticles = [];
    for (let i = 0; i < 80; i++) {
        quantumParticles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2.5 + 0.8,
            alpha: Math.random(),
            speed: Math.random() * 0.02 + 0.008,
            color: Math.random() > 0.5 ? '#a855f7' : '#38bdf8'
        });
    }
}

// Renderizado seguro de UI
function renderCargasUI() {
    if (!cargasContainer) return;
    cargasContainer.innerHTML = '';
    cargas.forEach((c, index) => {
        const div = document.createElement('div');
        div.style.marginBottom = '12px';
        div.style.background = 'rgba(255, 255, 255, 0.05)';
        div.style.padding = '8px';
        div.style.borderRadius = '6px';
        
        const qVal = Math.round(c.q * 1e9);
        div.innerHTML = `
            <div style="color:#e2e8f0; font-weight:bold; font-size:13px; margin-bottom:4px;">
                Carga ${index + 1} (${qVal > 0 ? '+' : (qVal < 0 ? '-' : '0')})
            </div>
            <div style="color:#94a3b8; font-size:12px; margin-bottom:4px;">
                Valor: <span style="color:#f8fafc; font-weight:bold;">${qVal}</span> nC
            </div>
            <input type="range" min="-100" max="100" value="${qVal}" step="5" data-index="${index}" style="width:100%; cursor:pointer;">
        `;
        cargasContainer.appendChild(div);
    });

    const inputs = cargasContainer.querySelectorAll('input[type="range"]');
    inputs.forEach(input => {
        input.addEventListener('input', (e) => {
            const idx = parseInt(e.target.dataset.index);
            if (cargas[idx]) {
                const val = parseFloat(e.target.value);
                cargas[idx].q = val * 1e-9;
                renderCargasUI();
            }
        });
    });
}

if (btnAdd) {
    btnAdd.addEventListener('click', () => {
        if (cargas.length >= 4) return;
        const id = cargas.length + 1;
        const offset = cargas.length * 60;
        cargas.push({
            id,
            x: Math.min(180 + offset, canvas.width - 100),
            y: Math.min(180 + offset, canvas.height - 100),
            q: 30e-9,
            radius: 22,
            isDragging: false
        });
        renderCargasUI();
    });
}

if (btnRemove) {
    btnRemove.addEventListener('click', () => {
        if (cargas.length <= 1) return;
        cargas.pop();
        renderCargasUI();
    });
}

// Eventos de Arrastre
if (canvas) {
    canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        if (Math.hypot(mx - probe.x, my - probe.y) < probe.radius + 12) {
            probe.isDragging = true;
            draggedObj = probe;
            return;
        }

        cargas.forEach(c => {
            if (Math.hypot(mx - c.x, my - c.y) < c.radius + 12) {
                c.isDragging = true;
                draggedObj = c;
            }
        });
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!draggedObj) return;
        const rect = canvas.getBoundingClientRect();
        draggedObj.x = Math.max(20, Math.min(canvas.width - 20, e.clientX - rect.left));
        draggedObj.y = Math.max(20, Math.min(canvas.height - 20, e.clientY - rect.top));
    });

    window.addEventListener('mouseup', () => {
        if (draggedObj) {
            draggedObj.isDragging = false;
            draggedObj = null;
        }
    });
}

// Física
function getVectorCampo(px, py) {
    let Ex = 0, Ey = 0;
    cargas.forEach(c => {
        if (c.q === 0) return;
        let dx = (px - c.x) / SCALE;
        let dy = (py - c.y) / SCALE;
        let r2 = dx * dx + dy * dy;
        let r = Math.sqrt(r2);
        if (r > 0.02) {
            let E = (K * c.q) / r2;
            Ex += E * (dx / r);
            Ey += E * (dy / r);
        }
    });
    return { Ex, Ey, Mag: Math.hypot(Ex, Ey) };
}

function getPotencial(px, py) {
    let V = 0;
    cargas.forEach(c => {
        if (c.q === 0) return;
        let r = Math.hypot((px - c.x) / SCALE, (py - c.y) / SCALE);
        if (r > 0.015) V += (K * c.q) / r;
    });
    return V;
}

// 1. Fondo Cuántico Iluminado
function drawQuantumBackground() {
    if (!chkQuantum.checked || !ctx) return;

    let bgGlow = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 40,
        canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height)
    );
    bgGlow.addColorStop(0, '#2d1b4e');
    bgGlow.addColorStop(0.5, '#0f172a');
    bgGlow.addColorStop(1, '#020617');

    ctx.fillStyle = bgGlow;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(168, 85, 247, 0.12)';
    ctx.lineWidth = 1;
    const gridStep = 32;

    for (let x = 0; x < canvas.width; x += gridStep) {
        ctx.beginPath();
        for (let y = 0; y < canvas.height; y += 12) {
            let V = getPotencial(x, y);
            let deformX = x + Math.sin(V * 0.002) * 3;
            if (y === 0) ctx.moveTo(deformX, y);
            else ctx.lineTo(deformX, y);
        }
        ctx.stroke();
    }

    quantumParticles.forEach(p => {
        p.alpha += p.speed;
        if (p.alpha > 1 || p.alpha < 0) p.speed = -p.speed;

        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.abs(p.alpha) * 0.8 + 0.2;
        ctx.fill();
        ctx.restore();
    });
}

// 2. Líneas Equipotenciales Exactas (Marching Squares a 90 grados)
function drawEquipotentialsMarchingSquares() {
    if (!chkEqui.checked || !ctx) return;

    const gridStep = 10;
    const cols = Math.floor(canvas.width / gridStep);
    const rows = Math.floor(canvas.height / gridStep);

    let grid = [];
    for (let i = 0; i <= cols; i++) {
        grid[i] = [];
        for (let j = 0; j <= rows; j++) {
            grid[i][j] = getPotencial(i * gridStep, j * gridStep);
        }
    }

    const niveles = [-600, -350, -200, -100, -50, 50, 100, 200, 350, 600];

    niveles.forEach(vTarget => {
        ctx.beginPath();
        ctx.strokeStyle = vTarget > 0 ? 'rgba(239, 68, 68, 0.7)' : 'rgba(59, 130, 246, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);

        for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
                let x = i * gridStep;
                let y = j * gridStep;

                let v0 = grid[i][j] - vTarget;
                let v1 = grid[i + 1][j] - vTarget;
                let v2 = grid[i + 1][j + 1] - vTarget;
                let v3 = grid[i][j + 1] - vTarget;

                let cellCase = 0;
                if (v0 > 0) cellCase |= 1;
                if (v1 > 0) cellCase |= 2;
                if (v2 > 0) cellCase |= 4;
                if (v3 > 0) cellCase |= 8;

                if (cellCase === 0 || cellCase === 15) continue;

                let top = { x: x + (gridStep * (-v0)) / (v1 - v0), y: y };
                let right = { x: x + gridStep, y: y + (gridStep * (-v1)) / (v2 - v1) };
                let bottom = { x: x + (gridStep * (-v3)) / (v2 - v3), y: y + gridStep };
                let left = { x: x, y: y + (gridStep * (-v0)) / (v3 - v0) };

                switch (cellCase) {
                    case 1: case 14: drawSegment(left, top); break;
                    case 2: case 13: drawSegment(top, right); break;
                    case 3: case 12: drawSegment(left, right); break;
                    case 4: case 11: drawSegment(right, bottom); break;
                    case 5: drawSegment(left, top); drawSegment(right, bottom); break;
                    case 6: case 9: drawSegment(top, bottom); break;
                    case 7: case 8: drawSegment(left, bottom); break;
                    case 10: drawSegment(top, right); drawSegment(left, bottom); break;
                }
            }
        }
        ctx.stroke();
    });
    ctx.setLineDash([]);
}

function drawSegment(p1, p2) {
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
}

// 3. Líneas de Campo Continuas con Flechas
function drawFieldLinesWithArrows() {
    if (!chkField.checked || !ctx) return;

    const numLines = 18;
    const stepSize = 2.5;
    const maxSteps = 500;

    const posCharges = cargas.filter(c => c.q > 0);
    const negCharges = cargas.filter(c => c.q < 0);
    let seedCharges = posCharges.length > 0 ? posCharges : negCharges;

    seedCharges.forEach(c => {
        let sign = c.q > 0 ? 1 : -1;

        for (let i = 0; i < numLines; i++) {
            let angle = (i / numLines) * Math.PI * 2;
            let currX = c.x + Math.cos(angle) * (c.radius + 2);
            let currY = c.y + Math.sin(angle) * (c.radius + 2);

            let points = [{ x: currX, y: currY }];
            let arrowPoints = [];

            for (let step = 0; step < maxSteps; step++) {
                let E1 = getVectorCampo(currX, currY);
                if (E1.Mag === 0) break;

                let k1x = sign * (E1.Ex / E1.Mag);
                let k1y = sign * (E1.Ey / E1.Mag);

                let E2 = getVectorCampo(currX + 0.5 * stepSize * k1x, currY + 0.5 * stepSize * k1y);
                if (E2.Mag === 0) break;
                let k2x = sign * (E2.Ex / E2.Mag);
                let k2y = sign * (E2.Ey / E2.Mag);

                let nextX = currX + stepSize * k2x;
                let nextY = currY + stepSize * k2y;

                points.push({ x: nextX, y: nextY });

                if (step > 0 && step % 30 === 0) {
                    let dirAngle = (sign > 0) ? Math.atan2(k2y, k2x) : Math.atan2(k2y, k2x) + Math.PI;
                    arrowPoints.push({ x: nextX, y: nextY, angle: dirAngle });
                }

                currX = nextX;
                currY = nextY;

                if (currX < -50 || currX > canvas.width + 50 || currY < -50 || currY > canvas.height + 50) {
                    break;
                }

                let hitTarget = false;
                for (let target of cargas) {
                    if ((sign > 0 && target.q < 0) || (sign < 0 && target.q > 0)) {
                        if (Math.hypot(currX - target.x, currY - target.y) <= target.radius + 2) {
                            hitTarget = true;
                            points.push({ x: target.x, y: target.y });
                            break;
                        }
                    }
                }
                if (hitTarget) break;
            }

            if (points.length > 1) {
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(points[0].x, points[0].y);
                for (let p = 1; p < points.length; p++) {
                    ctx.lineTo(points[p].x, points[p].y);
                }
                ctx.strokeStyle = '#38bdf8';
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.restore();
            }

            arrowPoints.forEach(ap => {
                ctx.save();
                ctx.translate(ap.x, ap.y);
                ctx.rotate(ap.angle);
                ctx.fillStyle = '#f0f9ff';
                ctx.beginPath();
                ctx.moveTo(6, 0);
                ctx.lineTo(-6, -4);
                ctx.lineTo(-4, 0);
                ctx.lineTo(-6, 4);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            });
        }
    });
}

// 4. Esferas 3D con Aura
function drawEsfera3D(x, y, radius, colorBase, signText) {
    if (!ctx) return;
    let glowGrad = ctx.createRadialGradient(x, y, radius * 0.3, x, y, radius * 2.5);
    let colorGlow = colorBase === 'red' ? 'rgba(239, 68, 68, 0.5)' : (colorBase === 'blue' ? 'rgba(59, 130, 246, 0.5)' : 'rgba(234, 179, 8, 0.5)');
    glowGrad.addColorStop(0, colorGlow);
    glowGrad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.beginPath();
    ctx.arc(x, y, radius * 2.5, 0, Math.PI * 2);
    ctx.fillStyle = glowGrad;
    ctx.fill();

    let sphereGrad = ctx.createRadialGradient(
        x - radius * 0.3, y - radius * 0.3, radius * 0.1,
        x, y, radius
    );

    if (colorBase === 'red') {
        sphereGrad.addColorStop(0, '#fecdd3');
        sphereGrad.addColorStop(0.5, '#ef4444');
        sphereGrad.addColorStop(1, '#991b1b');
    } else if (colorBase === 'blue') {
        sphereGrad.addColorStop(0, '#bfdbfe');
        sphereGrad.addColorStop(0.5, '#3b82f6');
        sphereGrad.addColorStop(1, '#1e40af');
    } else {
        sphereGrad.addColorStop(0, '#fef08a');
        sphereGrad.addColorStop(0.5, '#eab308');
        sphereGrad.addColorStop(1, '#854d0e');
    }

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = sphereGrad;
    ctx.fill();

    if (signText) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(signText, x, y);
    }
}

// Bucle principal continuo
function loop() {
    try {
        if (ctx && canvas) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            drawQuantumBackground();
            drawEquipotentialsMarchingSquares();
            drawFieldLinesWithArrows();

            cargas.forEach(c => {
                let color = c.q > 0 ? 'red' : (c.q < 0 ? 'blue' : 'gray');
                let signo = c.q > 0 ? '+' : (c.q < 0 ? '-' : '0');
                drawEsfera3D(c.x, c.y, c.radius, color, signo);
            });

            if (cargas.length >= 2) {
                const c1 = cargas[0];
                const c2 = cargas[1];
                let dx = (c2.x - c1.x) / SCALE;
                let dy = (c2.y - c1.y) / SCALE;
                let r = Math.hypot(dx, dy);
                if (r < 0.04) r = 0.04;

                let F = (K * Math.abs(c1.q * c2.q)) / (r * r);

                if (rDisp) rDisp.textContent = r.toFixed(2);
                if (fDisp) fDisp.textContent = F.toExponential(2);
                if (fType) {
                    fType.textContent = (c1.q * c2.q > 0) ? "Repulsión" : "Atracción";
                    fType.style.color = (c1.q * c2.q > 0) ? "#f87171" : "#4ade80";
                }
            }

            let V_probe = getPotencial(probe.x, probe.y);
            let E_probe = getVectorCampo(probe.x, probe.y);
            let ang_deg = Math.atan2(E_probe.Ey, E_probe.Ex) * (180 / Math.PI);

            if (vRead) vRead.textContent = V_probe.toFixed(2);
            if (eRead) eRead.textContent = E_probe.Mag.toExponential(2);
            if (angRead) angRead.textContent = ang_deg.toFixed(1);

            if (E_probe.Mag > 0) {
                let len = 35;
                let vx = probe.x + (E_probe.Ex / E_probe.Mag) * len;
                let vy = probe.y + (E_probe.Ey / E_probe.Mag) * len;

                ctx.beginPath();
                ctx.moveTo(probe.x, probe.y);
                ctx.lineTo(vx, vy);
                ctx.strokeStyle = '#facc15';
                ctx.lineWidth = 3;
                ctx.stroke();
            }

            drawEsfera3D(probe.x, probe.y, probe.radius, 'yellow', 'V');
        }
    } catch (err) {
        console.error("Error en loop:", err);
    }

    requestAnimationFrame(loop);
}

// Inicialización diferida garantizada
window.addEventListener('DOMContentLoaded', () => {
    initCanvasSize();
    renderCargasUI();
});

window.addEventListener('resize', initCanvasSize);

// Inicio inmediato por si el DOM ya estaba listo
initCanvasSize();
renderCargasUI();
requestAnimationFrame(loop);