const K = 8.98755e9;
const EPSILON_0 = 8.854187e-12;
const MU_0 = 4 * Math.PI * 1e-7;
const C_SPEED = 299792458;
const SCALE = 100; // 100px = 1m

const canvas = document.getElementById('simCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;

// UI Elements
const cargasContainer = document.getElementById('cargas-container');
const btnAdd = document.getElementById('btn-add');
const btnRemove = document.getElementById('btn-remove');
const zoomRange = document.getElementById('zoom-range');
const zoomDisp = document.getElementById('zoom-disp');
const btnResetZoom = document.getElementById('btn-reset-zoom');

const rDisp = document.getElementById('r-disp');
const fDisp = document.getElementById('f-disp');
const fType = document.getElementById('f-type');

const vRead = document.getElementById('v-read');
const eRead = document.getElementById('e-read');
const angRead = document.getElementById('ang-read');
const bRead = document.getElementById('b-read');
const ueRead = document.getElementById('ue-read');

const chkField = document.getElementById('chk-field') || { checked: true };
const chkEqui = document.getElementById('chk-equi') || { checked: true };
const chkQuantum = document.getElementById('chk-quantum') || { checked: true };

// Estado de Transformación Zoom y Cam
let zoomLevel = 1.0;
let panOffset = { x: 0, y: 0 };

let quantumParticles = [];

let cargas = [
    { id: 1, x: 250, y: 250, q: 20e-9, radius: 22, isDragging: false },
    { id: 2, x: 550, y: 250, q: -20e-9, radius: 22, isDragging: false }
];

let probe = { x: 400, y: 150, vx: 0, vy: 0, lastX: 400, lastY: 150, radius: 14, isDragging: false };
let draggedObj = null;

// Inicialización Chart.js
let fuerzaChart = null;
const chartElem = document.getElementById('fuerzaChart');
if (chartElem && typeof Chart !== 'undefined') {
    const chartCtx = chartElem.getContext('2d');
    fuerzaChart = new Chart(chartCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Fuerza de Coulomb (N) vs Distancia (m)',
                data: [],
                borderColor: '#c084fc',
                backgroundColor: 'rgba(192, 132, 252, 0.15)',
                borderWidth: 2,
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            scales: {
                x: { title: { display: true, text: 'Distancia (m)', color: '#9ca3af' }, ticks: { color: '#9ca3af' } },
                y: { title: { display: true, text: 'Fuerza (N)', color: '#9ca3af' }, ticks: { color: '#9ca3af' } }
            },
            plugins: { legend: { labels: { color: '#f3f4f6' } } }
        }
    });
}

function initCanvasSize() {
    if (!canvas) return;
    const parent = canvas.parentElement;
    canvas.width = parent ? parent.clientWidth : 800;
    canvas.height = parent ? parent.clientHeight : 500;

    quantumParticles = [];
    for (let i = 0; i < 90; i++) {
        quantumParticles.push({
            x: Math.random() * canvas.width * 2 - canvas.width / 2,
            y: Math.random() * canvas.height * 2 - canvas.height / 2,
            size: Math.random() * 2.5 + 0.8,
            alpha: Math.random(),
            speed: Math.random() * 0.02 + 0.008,
            color: Math.random() > 0.5 ? '#a855f7' : '#38bdf8'
        });
    }
}

// Transformación Coordenadas Pantalla <-> Mundo Zoom
function screenToWorld(sx, sy) {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    return {
        x: (sx - cx - panOffset.x) / zoomLevel + cx,
        y: (sy - cy - panOffset.y) / zoomLevel + cy
    };
}

function worldToScreen(wx, wy) {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    return {
        x: (wx - cx) * zoomLevel + cx + panOffset.x,
        y: (wy - cy) * zoomLevel + cy + panOffset.y
    };
}

// Renderizado Tarjetas UI con incrementos de 2 en 2
function renderCargasUI() {
    if (!cargasContainer) return;
    cargasContainer.innerHTML = '';
    cargas.forEach((c, index) => {
        const div = document.createElement('div');
        div.style.marginBottom = '10px';
        div.style.background = 'rgba(255, 255, 255, 0.05)';
        div.style.padding = '8px';
        div.style.borderRadius = '8px';

        const qVal = Math.round(c.q * 1e9);
        const signoStr = qVal > 0 ? '+' : (qVal < 0 ? '-' : '0');

        div.innerHTML = `
            <div style="color:#e2e8f0; font-weight:bold; font-size:12px; margin-bottom:4px;">
                Carga ${index + 1} (${signoStr})
            </div>
            <div style="color:#94a3b8; font-size:11px; margin-bottom:6px;">
                Valor: <span style="color:#f8fafc; font-weight:bold;">${qVal}</span> nC
            </div>
            <div style="display:flex; align-items:center; gap:6px;">
                <button class="btn-step btn-minus" data-index="${index}" style="background:#ef4444; color:#fff; border:none; width:28px; height:28px; border-radius:4px; font-weight:bold; font-size:16px; cursor:pointer;">-</button>
                <input type="range" min="-100" max="100" value="${qVal}" step="2" data-index="${index}" style="flex-grow:1; cursor:pointer;">
                <button class="btn-step btn-plus" data-index="${index}" style="background:#10b981; color:#fff; border:none; width:28px; height:28px; border-radius:4px; font-weight:bold; font-size:16px; cursor:pointer;">+</button>
            </div>
        `;
        cargasContainer.appendChild(div);
    });

    cargasContainer.querySelectorAll('input[type="range"]').forEach(input => {
        input.addEventListener('input', (e) => {
            const idx = parseInt(e.target.dataset.index);
            if (cargas[idx]) {
                cargas[idx].q = parseFloat(e.target.value) * 1e-9;
                renderCargasUI();
            }
        });
    });

    cargasContainer.querySelectorAll('.btn-minus').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.dataset.index);
            if (cargas[idx]) {
                let currentVal = Math.round(cargas[idx].q * 1e9);
                cargas[idx].q = Math.max(-100, currentVal - 2) * 1e-9;
                renderCargasUI();
            }
        });
    });

    cargasContainer.querySelectorAll('.btn-plus').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.dataset.index);
            if (cargas[idx]) {
                let currentVal = Math.round(cargas[idx].q * 1e9);
                cargas[idx].q = Math.min(100, currentVal + 2) * 1e-9;
                renderCargasUI();
            }
        });
    });
}

// Eventos de Zoom y Arrastre
if (zoomRange) {
    zoomRange.addEventListener('input', (e) => {
        zoomLevel = parseFloat(e.target.value);
        if (zoomDisp) zoomDisp.textContent = zoomLevel.toFixed(1);
    });
}

if (btnResetZoom) {
    btnResetZoom.addEventListener('click', () => {
        zoomLevel = 1.0;
        panOffset = { x: 0, y: 0 };
        if (zoomRange) zoomRange.value = 1.0;
        if (zoomDisp) zoomDisp.textContent = "1.0";
    });
}

if (canvas) {
    // Zoom con Rueda del Ratón
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomDelta = e.deltaY < 0 ? 0.1 : -0.1;
        zoomLevel = Math.min(Math.max(0.5, zoomLevel + zoomDelta), 2.5);
        if (zoomRange) zoomRange.value = zoomLevel.toFixed(1);
        if (zoomDisp) zoomDisp.textContent = zoomLevel.toFixed(1);
    }, { passive: false });

    canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mouseWorld = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);

        if (Math.hypot(mouseWorld.x - probe.x, mouseWorld.y - probe.y) < probe.radius + 12) {
            probe.isDragging = true;
            draggedObj = probe;
            return;
        }

        for (let c of cargas) {
            if (Math.hypot(mouseWorld.x - c.x, mouseWorld.y - c.y) < c.radius + 12) {
                c.isDragging = true;
                draggedObj = c;
                return;
            }
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!draggedObj) return;
        const rect = canvas.getBoundingClientRect();
        const mouseWorld = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
        draggedObj.x = mouseWorld.x;
        draggedObj.y = mouseWorld.y;
    });

    window.addEventListener('mouseup', () => {
        if (draggedObj) {
            draggedObj.isDragging = false;
            draggedObj = null;
        }
    });
}

if (btnAdd) {
    btnAdd.addEventListener('click', () => {
        if (cargas.length >= 4) return;
        const id = cargas.length + 1;
        const offset = cargas.length * 60;
        cargas.push({
            id,
            x: 200 + offset,
            y: 200 + offset,
            q: 20e-9,
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

// 1. Fondo Cuántico Brillante
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

    for (let x = -canvas.width; x < canvas.width * 2; x += gridStep) {
        ctx.beginPath();
        for (let y = -canvas.height; y < canvas.height * 2; y += 12) {
            let V = getPotencial(x, y);
            let deformX = x + Math.sin(V * 0.002) * 3;
            if (y === -canvas.height) ctx.moveTo(deformX, y);
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

// 2. Líneas Equipotenciales Simétricas (Marching Squares a 90°)
function drawEquipotentialsMarchingSquares() {
    if (!chkEqui.checked || !ctx) return;

    const gridStep = 10;
    const cols = Math.floor(canvas.width / gridStep);
    const rows = Math.floor(canvas.height / gridStep);

    let grid = [];
    for (let i = 0; i <= cols; i++) {
        grid[i] = [];
        for (let j = 0; j <= rows; j++) {
            let worldP = screenToWorld(i * gridStep, j * gridStep);
            grid[i][j] = getPotencial(worldP.x, worldP.y);
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

// 3. Líneas de Campo Continuas (RK4)
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
                let p0 = worldToScreen(points[0].x, points[0].y);
                ctx.moveTo(p0.x, p0.y);
                for (let p = 1; p < points.length; p++) {
                    let pt = worldToScreen(points[p].x, points[p].y);
                    ctx.lineTo(pt.x, pt.y);
                }
                ctx.strokeStyle = '#38bdf8';
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.restore();
            }

            arrowPoints.forEach(ap => {
                let pt = worldToScreen(ap.x, ap.y);
                ctx.save();
                ctx.translate(pt.x, pt.y);
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
function drawEsfera3DWorld(wx, wy, radius, colorBase, signText) {
    if (!ctx) return;
    let pos = worldToScreen(wx, wy);
    let rScaled = radius * zoomLevel;

    let glowGrad = ctx.createRadialGradient(pos.x, pos.y, rScaled * 0.3, pos.x, pos.y, rScaled * 2.5);
    let colorGlow = colorBase === 'red' ? 'rgba(239, 68, 68, 0.5)' : (colorBase === 'blue' ? 'rgba(59, 130, 246, 0.5)' : 'rgba(234, 179, 8, 0.5)');
    glowGrad.addColorStop(0, colorGlow);
    glowGrad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, rScaled * 2.5, 0, Math.PI * 2);
    ctx.fillStyle = glowGrad;
    ctx.fill();

    let sphereGrad = ctx.createRadialGradient(
        pos.x - rScaled * 0.3, pos.y - rScaled * 0.3, rScaled * 0.1,
        pos.x, pos.y, rScaled
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
    ctx.arc(pos.x, pos.y, rScaled, 0, Math.PI * 2);
    ctx.fillStyle = sphereGrad;
    ctx.fill();

    if (signText) {
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.max(10, 15 * zoomLevel)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(signText, pos.x, pos.y);
    }
}

// Bucle principal de renderizado
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
                drawEsfera3DWorld(c.x, c.y, c.radius, color, signo);
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

                if (fuerzaChart) {
                    if (fuerzaChart.data.labels.length > 25) {
                        fuerzaChart.data.labels.shift();
                        fuerzaChart.data.datasets[0].data.shift();
                    }
                    fuerzaChart.data.labels.push(r.toFixed(2));
                    fuerzaChart.data.datasets[0].data.push(F);
                    fuerzaChart.update();
                }
            }

            // Cálculo de Velocidad y Campo Magnético Inducido en la Sonda (Biot-Savart / Relatividad)
            probe.vx = (probe.x - probe.lastX) * 60; // px/s
            probe.vy = (probe.y - probe.lastY) * 60;
            probe.lastX = probe.x;
            probe.lastY = probe.y;

            let V_probe = getPotencial(probe.x, probe.y);
            let E_probe = getVectorCampo(probe.x, probe.y);
            let ang_deg = Math.atan2(E_probe.Ey, E_probe.Ex) * (180 / Math.PI);

            // B_inducido = (v x E) / c^2
            let vMag = Math.hypot(probe.vx, probe.vy) / SCALE; // m/s
            let B_mag = (vMag * E_probe.Mag) / (C_SPEED * C_SPEED);
            let uE = 0.5 * EPSILON_0 * (E_probe.Mag * E_probe.Mag);

            if (vRead) vRead.textContent = V_probe.toFixed(2);
            if (eRead) eRead.textContent = E_probe.Mag.toExponential(2);
            if (angRead) angRead.textContent = ang_deg.toFixed(1);
            if (bRead) bRead.textContent = B_mag.toExponential(2);
            if (ueRead) ueRead.textContent = uE.toExponential(2);

            if (E_probe.Mag > 0) {
                let pScreen = worldToScreen(probe.x, probe.y);
                let len = 35 * zoomLevel;
                let vx = pScreen.x + (E_probe.Ex / E_probe.Mag) * len;
                let vy = pScreen.y + (E_probe.Ey / E_probe.Mag) * len;

                ctx.beginPath();
                ctx.moveTo(pScreen.x, pScreen.y);
                ctx.lineTo(vx, vy);
                ctx.strokeStyle = '#facc15';
                ctx.lineWidth = 3;
                ctx.stroke();
            }

            drawEsfera3DWorld(probe.x, probe.y, probe.radius, 'yellow', 'V');
        }
    } catch (err) {
        console.error("Error en loop:", err);
    }

    requestAnimationFrame(loop);
}

// Inicialización
window.addEventListener('DOMContentLoaded', () => {
    initCanvasSize();
    renderCargasUI();
});

window.addEventListener('resize', initCanvasSize);

initCanvasSize();
renderCargasUI();
requestAnimationFrame(loop);
