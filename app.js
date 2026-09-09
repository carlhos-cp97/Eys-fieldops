const K = 8.98755e9;
const SCALE = 100; // 100px = 1m

const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');

const cargasContainer = document.getElementById('cargas-container');
const btnAdd = document.getElementById('btn-add');
const btnRemove = document.getElementById('btn-remove');

const rDisp = document.getElementById('r-disp');
const fDisp = document.getElementById('f-disp');
const fType = document.getElementById('f-type');

const vRead = document.getElementById('v-read');
const eRead = document.getElementById('e-read');
const angRead = document.getElementById('ang-read');

const chkField = document.getElementById('chk-field');
const chkEqui = document.getElementById('chk-equi');
const chkQuantum = document.getElementById('chk-quantum');

// Partículas vibrantes para el vacío cuántico resplandeciente
let quantumParticles = [];
for (let i = 0; i < 90; i++) {
    quantumParticles.push({
        x: Math.random() * 1200,
        y: Math.random() * 800,
        size: Math.random() * 2.5 + 0.8,
        alpha: Math.random(),
        speed: Math.random() * 0.03 + 0.01,
        color: Math.random() > 0.5 ? '#a855f7' : '#38bdf8'
    });
}

// Configuración inicial de cargas
let cargas = [
    { id: 1, x: 280, y: 250, q: 20e-9, radius: 22, isDragging: false },
    { id: 2, x: 580, y: 250, q: -20e-9, radius: 22, isDragging: false }
];

let probe = { x: 430, y: 130, radius: 14, isDragging: false };
let draggedObj = null;

// Configuración de Chart.js
const chartCtx = document.getElementById('fuerzaChart').getContext('2d');
let fuerzaChart = new Chart(chartCtx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Fuerza (N) vs Distancia (m)',
            data: [],
            borderColor: '#c084fc',
            backgroundColor: 'rgba(192, 132, 252, 0.2)',
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

function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Renderizado de la UI de Cargas
function renderCargasUI() {
    cargasContainer.innerHTML = '';
    cargas.forEach((c, index) => {
        const div = document.createElement('div');
        div.className = 'control-group';
        div.innerHTML = `
            <h3>Carga ${index + 1} ($q_${index + 1}$)</h3>
            <label>Valor: <span>${(c.q * 1e9).toFixed(0)}</span> nC</label>
            <input type="range" min="-100" max="100" value="${(c.q * 1e9).toFixed(0)}" step="5" data-index="${index}">
        `;
        cargasContainer.appendChild(div);
    });

    document.querySelectorAll('#cargas-container input').forEach(input => {
        input.addEventListener('input', (e) => {
            const idx = parseInt(e.target.dataset.index);
            cargas[idx].q = parseFloat(e.target.value) * 1e-9;
            e.target.previousElementSibling.querySelector('span').textContent = e.target.value;
        });
    });
}
renderCargasUI();

btnAdd.addEventListener('click', () => {
    if (cargas.length >= 4) return;
    const id = cargas.length + 1;
    const offset = cargas.length * 50;
    cargas.push({ id, x: 200 + offset, y: 180 + offset, q: 30e-9, radius: 22, isDragging: false });
    renderCargasUI();
});

btnRemove.addEventListener('click', () => {
    if (cargas.length <= 1) return;
    cargas.pop();
    renderCargasUI();
});

// Arrastre con ratón
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

// Cálculos del Campo y Potencial
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

// 1. Fondo Cuántico Brillante e Hiper-Luminoso
function drawQuantumBackground() {
    if (!chkQuantum.checked) return;

    // Resplandor cuántico central
    let bgGlow = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 50,
        canvas.width / 2, canvas.height / 2, canvas.width * 0.7
    );
    bgGlow.addColorStop(0, 'rgba(88, 28, 135, 0.25)');
    bgGlow.addColorStop(0.5, 'rgba(15, 23, 42, 0.5)');
    bgGlow.addColorStop(1, 'rgba(3, 7, 18, 0.9)');

    ctx.fillStyle = bgGlow;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Malla cuántica viva de energía
    ctx.strokeStyle = 'rgba(192, 132, 252, 0.12)';
    ctx.lineWidth = 1;
    const gridStep = 32;

    for (let x = 0; x < canvas.width; x += gridStep) {
        ctx.beginPath();
        for (let y = 0; y < canvas.height; y += 8) {
            let V = getPotencial(x, y);
            let deformX = x + Math.sin(V * 0.003) * 4;
            if (y === 0) ctx.moveTo(deformX, y);
            else ctx.lineTo(deformX, y);
        }
        ctx.stroke();
    }

    // Partículas luminosas flotantes
    quantumParticles.forEach(p => {
        p.alpha += p.speed;
        if (p.alpha > 1 || p.alpha < 0) p.speed = -p.speed;

        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.abs(p.alpha) * 0.7 + 0.2;
        ctx.fill();
        ctx.restore();
    });
}

// 2. Líneas Equipotenciales Exactas (Marching Squares)
function drawEquipotentialsMarchingSquares() {
    if (!chkEqui.checked) return;

    const gridStep = 8;
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

// 3. Líneas de Campo Continuas, Ultradetalladas con Flechas (RK4)
function drawFieldLinesWithArrows() {
    if (!chkField.checked) return;

    const numLines = 24;        // Mayor densidad para alto detalle
    const stepSize = 2.0;       // Integración ultranítida
    const maxSteps = 700;

    const posCharges = cargas.filter(c => c.q > 0);
    const negCharges = cargas.filter(c => c.q < 0);

    // Si solo hay cargas negativas, se trazan las semillas en sentido inverso
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
                // Trazado numérico Runge-Kutta 4
                let E1 = getVectorCampo(currX, currY);
                if (E1.Mag === 0) break;

                let k1x = sign * (E1.Ex / E1.Mag);
                let k1y = sign * (E1.Ey / E1.Mag);

                let E2 = getVectorCampo(currX + 0.5 * stepSize * k1x, currY + 0.5 * stepSize * k1y);
                if (E2.Mag === 0) break;
                let k2x = sign * (E2.Ex / E2.Mag);
                let k2y = sign * (E2.Ey / E2.Mag);

                let E3 = getVectorCampo(currX + 0.5 * stepSize * k2x, currY + 0.5 * stepSize * k2y);
                if (E3.Mag === 0) break;
                let k3x = sign * (E3.Ex / E3.Mag);
                let k3y = sign * (E3.Ey / E3.Mag);

                let E4 = getVectorCampo(currX + stepSize * k3x, currY + stepSize * k3y);
                if (E4.Mag === 0) break;
                let k4x = sign * (E4.Ex / E4.Mag);
                let k4y = sign * (E4.Ey / E4.Mag);

                let nextX = currX + (stepSize / 6) * (k1x + 2 * k2x + 2 * k3x + k4x);
                let nextY = currY + (stepSize / 6) * (k1y + 2 * k2y + 2 * k3y + k4y);

                points.push({ x: nextX, y: nextY });

                // Registra puntos para colocar flechas indicadoras cada 35 pasos
                if (step > 0 && step % 35 === 0) {
                    let dirAngle = (sign > 0) ? Math.atan2(k1y, k1x) : Math.atan2(k1y, k1x) + Math.PI;
                    arrowPoints.push({ x: nextX, y: nextY, angle: dirAngle });
                }

                currX = nextX;
                currY = nextY;

                // Salida de bordes
                if (currX < -80 || currX > canvas.width + 80 || currY < -80 || currY > canvas.height + 80) {
                    break;
                }

                // Detección de colisión ÚNICAMENTE en cargas de signo opuesto
                let hitTarget = false;
                for (let target of cargas) {
                    if ((sign > 0 && target.q < 0) || (sign < 0 && target.q > 0)) {
                        if (Math.hypot(currX - target.x, currY - target.y) <= target.radius + 1) {
                            hitTarget = true;
                            points.push({ x: target.x, y: target.y });
                            break;
                        }
                    }
                }
                if (hitTarget) break;
            }

            // DIBUJAR TRAZO CONTINUO LUMINOSO DE CAMPO
            if (points.length > 1) {
                ctx.save();
                ctx.shadowBlur = 8;
                ctx.shadowColor = '#38bdf8';
                ctx.beginPath();
                ctx.moveTo(points[0].x, points[0].y);
                for (let p = 1; p < points.length; p++) {
                    ctx.lineTo(points[p].x, points[p].y);
                }
                ctx.strokeStyle = '#38bdf8';
                ctx.lineWidth = 2.2;
                ctx.stroke();
                ctx.restore();
            }

            // DIBUJAR FLECHAS DE SENTIDO (Cian vibrante con brillo)
            arrowPoints.forEach(ap => {
                ctx.save();
                ctx.translate(ap.x, ap.y);
                ctx.rotate(ap.angle);
                ctx.shadowBlur = 6;
                ctx.shadowColor = '#38bdf8';
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

// 4. Renderizado Esferas 3D Luminosas
function drawEsfera3D(x, y, radius, colorBase, signText) {
    let glowGrad = ctx.createRadialGradient(x, y, radius * 0.4, x, y, radius * 3.5);
    glowGrad.addColorStop(0, colorBase === 'red' ? 'rgba(239, 68, 68, 0.6)' : (colorBase === 'blue' ? 'rgba(59, 130, 246, 0.6)' : 'rgba(234, 179, 8, 0.6)'));
    glowGrad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.beginPath();
    ctx.arc(x, y, radius * 3.5, 0, Math.PI * 2);
    ctx.fillStyle = glowGrad;
    ctx.fill();

    let sphereGrad = ctx.createRadialGradient(
        x - radius * 0.35, y - radius * 0.35, radius * 0.05,
        x, y, radius
    );

    if (colorBase === 'red') {
        sphereGrad.addColorStop(0, '#fecdd3');
        sphereGrad.addColorStop(0.4, '#ef4444');
        sphereGrad.addColorStop(1, '#881337');
    } else if (colorBase === 'blue') {
        sphereGrad.addColorStop(0, '#bfdbfe');
        sphereGrad.addColorStop(0.4, '#3b82f6');
        sphereGrad.addColorStop(1, '#1e3a8a');
    } else {
        sphereGrad.addColorStop(0, '#fef08a');
        sphereGrad.addColorStop(0.4, '#eab308');
        sphereGrad.addColorStop(1, '#713f12');
    }

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = sphereGrad;
    ctx.fill();

    if (signText) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(signText, x, y);
    }
}

// Loop Principal
function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawQuantumBackground();
    drawEquipotentialsMarchingSquares();
    drawFieldLinesWithArrows();

    // Dibujar Cargas
    cargas.forEach(c => {
        let color = c.q > 0 ? 'red' : (c.q < 0 ? 'blue' : 'gray');
        let signo = c.q > 0 ? '+' : (c.q < 0 ? '-' : '0');
        drawEsfera3D(c.x, c.y, c.radius, color, signo);
    });

    // Cálculos de Fuerza entre $q_1$ y $q_2$
    if (cargas.length >= 2) {
        const c1 = cargas[0];
        const c2 = cargas[1];
        let dx = (c2.x - c1.x) / SCALE;
        let dy = (c2.y - c1.y) / SCALE;
        let r = Math.hypot(dx, dy);
        if (r < 0.04) r = 0.04;

        let F = (K * Math.abs(c1.q * c2.q)) / (r * r);

        rDisp.textContent = r.toFixed(2);
        fDisp.textContent = F.toExponential(2);
        fType.textContent = (c1.q * c2.q > 0) ? "Repulsión" : "Atracción";
        fType.style.color = (c1.q * c2.q > 0) ? "#f87171" : "#4ade80";

        if (fuerzaChart.data.labels.length > 25) {
            fuerzaChart.data.labels.shift();
            fuerzaChart.data.datasets[0].data.shift();
        }
        fuerzaChart.data.labels.push(r.toFixed(2));
        fuerzaChart.data.datasets[0].data.push(F);
        fuerzaChart.update();
    }

    // Proba/Multímetro
    let V_probe = getPotencial(probe.x, probe.y);
    let E_probe = getVectorCampo(probe.x, probe.y);
    let ang_deg = Math.atan2(E_probe.Ey, E_probe.Ex) * (180 / Math.PI);

    vRead.textContent = V_probe.toFixed(2);
    eRead.textContent = E_probe.Mag.toExponential(2);
    angRead.textContent = ang_deg.toFixed(1);

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

    requestAnimationFrame(loop);
}

loop();