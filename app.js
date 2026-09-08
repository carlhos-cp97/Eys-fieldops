const K = 8.98755e9;
const SCALE = 100; // 100px = 1m

const canvas = document.getElementById('simCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;

const cargasContainer = document.getElementById('cargas-container');
const btnAdd = document.getElementById('btn-add');
const btnRemove = document.getElementById('btn-remove');

const q1Input = document.getElementById('q1-val');
const q2Input = document.getElementById('q2-val');
const q1Disp = document.getElementById('q1-disp');
const q2Disp = document.getElementById('q2-disp');

const rDisp = document.getElementById('r-disp');
const fDisp = document.getElementById('f-disp');
const fType = document.getElementById('f-type');

const vRead = document.getElementById('v-read');
const eRead = document.getElementById('e-read');
const angRead = document.getElementById('ang-read');

const chkField = document.getElementById('chk-field') || { checked: true };
const chkEqui = document.getElementById('chk-equi') || { checked: true };
const chkGlow = document.getElementById('chk-glow') || { checked: true };

let cargas = [
    { id: 1, x: 260, y: 250, q: 20e-9, radius: 22, isDragging: false },
    { id: 2, x: 560, y: 250, q: -20e-9, radius: 22, isDragging: false }
];

let probe = { x: 410, y: 130, radius: 14, isDragging: false };
let draggedObj = null;

// Configuración Chart.js opcional con manejo seguro de errores
let fuerzaChart = null;
const chartElem = document.getElementById('fuerzaChart');
if (chartElem && typeof Chart !== 'undefined') {
    const chartCtx = chartElem.getContext('2d');
    fuerzaChart = new Chart(chartCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Fuerza (N) vs Distancia (m)',
                data: [],
                borderColor: '#38bdf8',
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
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
                x: { title: { display: true, text: 'Distancia (m)', color: '#94a3b8' }, ticks: { color: '#94a3b8' } },
                y: { title: { display: true, text: 'Fuerza (N)', color: '#94a3b8' }, ticks: { color: '#94a3b8' } }
            },
            plugins: { legend: { labels: { color: '#f8fafc' } } }
        }
    });
}

function resizeCanvas() {
    if (canvas && canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth || 800;
        canvas.height = canvas.parentElement.clientHeight || 500;
    }
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Función centralizada para renderizar las tarjetas con botones + y -
function renderCargasUI() {
    if (!cargasContainer) return;
    cargasContainer.innerHTML = '';
    cargas.forEach((c, index) => {
        const div = document.createElement('div');
        div.className = 'control-group';
        div.style.background = 'rgba(255, 255, 255, 0.05)';
        div.style.padding = '10px';
        div.style.marginBottom = '10px';
        div.style.borderRadius = '8px';

        const qVal = Math.round(c.q * 1e9);
        const signoStr = qVal > 0 ? '+' : (qVal < 0 ? '-' : '0');

        div.innerHTML = `
            <div style="color:#e2e8f0; font-weight:bold; font-size:14px; margin-bottom:4px;">
                Carga ${index + 1} (${signoStr})
            </div>
            <div style="color:#94a3b8; font-size:13px; margin-bottom:8px;">
                Valor: <span style="color:#f8fafc; font-weight:bold;" class="val-display">${qVal}</span> nC
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
                <button class="btn-step btn-minus" data-index="${index}" style="background:#ef4444; color:#fff; border:none; width:32px; height:32px; border-radius:6px; font-weight:bold; font-size:18px; cursor:pointer; flex-shrink:0;">-</button>
                <input type="range" min="-100" max="100" value="${qVal}" step="5" data-index="${index}" style="flex-grow:1; cursor:pointer;">
                <button class="btn-step btn-plus" data-index="${index}" style="background:#10b981; color:#fff; border:none; width:32px; height:32px; border-radius:6px; font-weight:bold; font-size:18px; cursor:pointer; flex-shrink:0;">+</button>
            </div>
        `;
        cargasContainer.appendChild(div);
    });

    // Eventos para el Slider
    cargasContainer.querySelectorAll('input[type="range"]').forEach(input => {
        input.addEventListener('input', (e) => {
            const idx = parseInt(e.target.dataset.index);
            if (cargas[idx]) {
                const val = parseFloat(e.target.value);
                cargas[idx].q = val * 1e-9;
                renderCargasUI();
            }
        });
    });

    // Eventos para el Botón Menos (-)
    cargasContainer.querySelectorAll('.btn-minus').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.dataset.index);
            if (cargas[idx]) {
                let currentVal = Math.round(cargas[idx].q * 1e9);
                currentVal = Math.max(-100, currentVal - 5);
                cargas[idx].q = currentVal * 1e-9;
                renderCargasUI();
            }
        });
    });

    // Eventos para el Botón Más (+)
    cargasContainer.querySelectorAll('.btn-plus').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.dataset.index);
            if (cargas[idx]) {
                let currentVal = Math.round(cargas[idx].q * 1e9);
                currentVal = Math.min(100, currentVal + 5);
                cargas[idx].q = currentVal * 1e-9;
                renderCargasUI();
            }
        });
    });
}

// Escuchadores estáticos de respaldo
if (q1Input) {
    q1Input.addEventListener('input', (e) => {
        cargas[0].q = parseFloat(e.target.value) * 1e-9;
        if (q1Disp) q1Disp.textContent = e.target.value;
    });
}

if (q2Input) {
    q2Input.addEventListener('input', (e) => {
        cargas[1].q = parseFloat(e.target.value) * 1e-9;
        if (q2Disp) q2Disp.textContent = e.target.value;
    });
}

// Control de Botones Añadir / Eliminar Carga
if (btnAdd) {
    btnAdd.addEventListener('click', () => {
        if (cargas.length >= 4) return;
        const id = cargas.length + 1;
        const offset = cargas.length * 50;
        cargas.push({
            id,
            x: Math.min(200 + offset, canvas.width - 80),
            y: Math.min(200 + offset, canvas.height - 80),
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

// Arrastre con Ratón
if (canvas) {
    canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        if (Math.hypot(mx - probe.x, my - probe.y) < probe.radius + 10) {
            probe.isDragging = true;
            draggedObj = probe;
            return;
        }

        cargas.forEach(c => {
            if (Math.hypot(mx - c.x, my - c.y) < c.radius + 8) {
                c.isDragging = true;
                draggedObj = c;
            }
        });
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!draggedObj) return;
        const rect = canvas.getBoundingClientRect();
        draggedObj.x = e.clientX - rect.left;
        draggedObj.y = e.clientY - rect.top;
    });

    window.addEventListener('mouseup', () => {
        if (draggedObj) {
            draggedObj.isDragging = false;
            draggedObj = null;
        }
    });
}

// Ecuaciones de Campo y Potencial
function getVectorCampo(px, py) {
    let Ex = 0, Ey = 0;
    cargas.forEach(c => {
        if (c.q === 0) return;
        let dx = (px - c.x) / SCALE;
        let dy = (py - c.y) / SCALE;
        let r2 = dx * dx + dy * dy;
        let r = Math.sqrt(r2);
        if (r > 0.05) {
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
        if (r > 0.02) {
            V += (K * c.q) / r;
        }
    });
    return V;
}

// 1. Trazado de Superficies Equipotenciales
function drawEquipotentials3D() {
    if (!chkEqui.checked || !ctx) return;

    const niveles = [-800, -500, -300, -180, -100, -50, 50, 100, 180, 300, 500, 800];

    niveles.forEach(vTarget => {
        const numRayos = 90;
        ctx.beginPath();
        let isFirst = true;

        cargas.forEach(c => {
            if (c.q === 0) return;
            for (let i = 0; i < numRayos; i++) {
                let angle = (i / numRayos) * Math.PI * 2;
                let rSearch = 10;
                let foundX = c.x;
                let foundY = c.y;

                for (let step = 0; step < 80; step++) {
                    let testX = c.x + Math.cos(angle) * rSearch;
                    let testY = c.y + Math.sin(angle) * rSearch;
                    let vTest = getPotencial(testX, testY);

                    if ((vTarget > 0 && vTest < vTarget) || (vTarget < 0 && vTest > vTarget)) {
                        foundX = testX;
                        foundY = testY;
                        break;
                    }
                    rSearch += 4;
                }

                if (isFirst) {
                    ctx.moveTo(foundX, foundY);
                    isFirst = false;
                } else {
                    ctx.lineTo(foundX, foundY);
                }
            }
        });

        ctx.closePath();
        ctx.strokeStyle = vTarget > 0 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(59, 130, 246, 0.4)';
        ctx.lineWidth = 1.8;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
    });
}

// 2. Trazado de Líneas de Campo Continuas
function drawFieldLines3D() {
    if (!chkField.checked || !ctx) return;

    const numLines = 20;
    const stepSize = 4;

    cargas.forEach(c => {
        if (c.q <= 0) return;

        for (let i = 0; i < numLines; i++) {
            let angle = (i / numLines) * Math.PI * 2;
            let currX = c.x + Math.cos(angle) * (c.radius + 2);
            let currY = c.y + Math.sin(angle) * (c.radius + 2);

            ctx.beginPath();
            ctx.moveTo(currX, currY);

            for (let step = 0; step < 150; step++) {
                let E = getVectorCampo(currX, currY);
                if (E.Mag === 0) break;

                currX += (E.Ex / E.Mag) * stepSize;
                currY += (E.Ey / E.Mag) * stepSize;

                ctx.lineTo(currX, currY);

                if (currX < 0 || currX > canvas.width || currY < 0 || currY > canvas.height) break;

                let hit = false;
                cargas.forEach(target => {
                    if (target.q < 0 && Math.hypot(currX - target.x, currY - target.y) < target.radius) hit = true;
                });
                if (hit) break;
            }

            ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
            ctx.lineWidth = 2;
            ctx.shadowColor = 'rgba(56, 189, 248, 0.5)';
            ctx.shadowBlur = 6;
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
    });
}

// 3. Renderizado 3D de Esferas y Resplandor
function drawEsfera3D(x, y, radius, colorBase, signText) {
    if (!ctx) return;

    if (chkGlow.checked) {
        let glowGrad = ctx.createRadialGradient(x, y, radius * 0.5, x, y, radius * 2.5);
        glowGrad.addColorStop(0, colorBase === 'red' ? 'rgba(239, 68, 68, 0.4)' : (colorBase === 'blue' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(234, 179, 8, 0.4)'));
        glowGrad.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.beginPath();
        ctx.arc(x, y, radius * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = glowGrad;
        ctx.fill();
    }

    let sphereGrad = ctx.createRadialGradient(
        x - radius * 0.3, y - radius * 0.3, radius * 0.1,
        x, y, radius
    );

    if (colorBase === 'red') {
        sphereGrad.addColorStop(0, '#fca5a5');
        sphereGrad.addColorStop(0.5, '#ef4444');
        sphereGrad.addColorStop(1, '#7f1d1d');
    } else if (colorBase === 'blue') {
        sphereGrad.addColorStop(0, '#93c5fd');
        sphereGrad.addColorStop(0.5, '#3b82f6');
        sphereGrad.addColorStop(1, '#1e3a8a');
    } else {
        sphereGrad.addColorStop(0, '#fef08a');
        sphereGrad.addColorStop(0.5, '#eab308');
        sphereGrad.addColorStop(1, '#713f12');
    }

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = sphereGrad;
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    ctx.fill();
    ctx.shadowBlur = 0;

    if (signText) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 4;
        ctx.fillText(signText, x, y);
        ctx.shadowBlur = 0;
    }
}

// Bucle de Animación y Renderizado
function loop() {
    if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        drawEquipotentials3D();
        drawFieldLines3D();

        if (cargas.length >= 2) {
            const c1 = cargas[0];
            const c2 = cargas[1];

            ctx.beginPath();
            ctx.moveTo(c1.x, c1.y);
            ctx.lineTo(c2.x, c2.y);
            ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.stroke();
            ctx.setLineDash([]);

            let dx = (c2.x - c1.x) / SCALE;
            let dy = (c2.y - c1.y) / SCALE;
            let r = Math.hypot(dx, dy);
            if (r < 0.05) r = 0.05;

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

        cargas.forEach(c => {
            let color = c.q > 0 ? 'red' : (c.q < 0 ? 'blue' : 'gray');
            let signo = c.q > 0 ? '+' : (c.q < 0 ? '-' : '0');
            drawEsfera3D(c.x, c.y, c.radius, color, signo);
        });

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

            let headAngle = Math.atan2(E_probe.Ey, E_probe.Ex);
            ctx.beginPath();
            ctx.moveTo(vx, vy);
            ctx.lineTo(vx - 8 * Math.cos(headAngle - Math.PI / 6), vy - 8 * Math.sin(headAngle - Math.PI / 6));
            ctx.lineTo(vx - 8 * Math.cos(headAngle + Math.PI / 6), vy - 8 * Math.sin(headAngle + Math.PI / 6));
            ctx.fillStyle = '#facc15';
            ctx.fill();
        }

        drawEsfera3D(probe.x, probe.y, probe.radius, 'yellow', 'V');
    }

    requestAnimationFrame(loop);
}

// Inicialización diferida para asegurar la carga completa del DOM
window.addEventListener('DOMContentLoaded', () => {
    resizeCanvas();
    renderCargasUI();
});

renderCargasUI();
loop();