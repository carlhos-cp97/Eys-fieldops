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

// Partículas de fondo para el efecto cuántico
let quantumParticles = [];
for (let i = 0; i < 60; i++) {
    quantumParticles.push({
        x: Math.random() * 1000,
        y: Math.random() * 600,
        size: Math.random() * 2 + 0.5,
        alpha: Math.random(),
        speed: Math.random() * 0.02 + 0.005
    });
}

// Cargas iniciales
let cargas = [
    { id: 1, x: 260, y: 250, q: 20e-9, radius: 22, isDragging: false },
    { id: 2, x: 560, y: 250, q: -20e-9, radius: 22, isDragging: false }
];

let probe = { x: 410, y: 130, radius: 14, isDragging: false };
let draggedObj = null;

// Chart.js
const chartCtx = document.getElementById('fuerzaChart').getContext('2d');
let fuerzaChart = new Chart(chartCtx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Fuerza (N) vs Distancia (m)',
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

function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Renderizar UI de Controles Dinámicos
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

    // Eventos sliders
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
    const offset = cargas.length * 60;
    cargas.push({ id, x: 200 + offset, y: 180 + offset, q: 30e-9, radius: 22, isDragging: false });
    renderCargasUI();
});

btnRemove.addEventListener('click', () => {
    if (cargas.length <= 1) return;
    cargas.pop();
    renderCargasUI();
});

// Drag and drop
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

// Física
function getVectorCampo(px, py) {
    let Ex = 0, Ey = 0;
    cargas.forEach(c => {
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
        let r = Math.hypot((px - c.x) / SCALE, (py - c.y) / SCALE);
        if (r > 0.02) V += (K * c.q) / r;
    });
    return V;
}

// Fondo Cuántico Dinámico (Quantum Grid)
function drawQuantumBackground() {
    if (!chkQuantum.checked) return;

    // Malla espacial deformada
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.07)';
    ctx.lineWidth = 1;
    const gridStep = 40;

    for (let x = 0; x < canvas.width; x += gridStep) {
        ctx.beginPath();
        for (let y = 0; y < canvas.height; y += 10) {
            let V = getPotencial(x, y);
            let deformX = x + Math.sin(V * 0.002) * 3;
            if (y === 0) ctx.moveTo(deformX, y);
            else ctx.lineTo(deformX, y);
        }
        ctx.stroke();
    }

    // Partículas del vacío cuántico
    quantumParticles.forEach(p => {
        p.alpha += p.speed;
        if (p.alpha > 1 || p.alpha < 0) p.speed = -p.speed;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(192, 132, 252, ${Math.abs(p.alpha) * 0.4})`;
        ctx.fill();
    });
}

// Equipotenciales
function drawEquipotentials() {
    if (!chkEqui.checked) return;

    const niveles = [-1000, -600, -350, -180, -90, 90, 180, 350, 600, 1000];

    niveles.forEach(vTarget => {
        const numRayos = 80;
        ctx.beginPath();
        let isFirst = true;

        cargas.forEach(c => {
            for (let i = 0; i < numRayos; i++) {
                let angle = (i / numRayos) * Math.PI * 2;
                let rSearch = 12;
                let foundX = c.x, foundY = c.y;

                for (let step = 0; step < 70; step++) {
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
        ctx.strokeStyle = vTarget > 0 ? 'rgba(239, 68, 68, 0.35)' : 'rgba(59, 130, 246, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
    });
}

// Líneas de Campo con Flechas de Dirección
function drawFieldLinesWithArrows() {
    if (!chkField.checked) return;

    const numLines = 16;
    const stepSize = 5;

    cargas.forEach(c => {
        if (c.q <= 0) return;

        for (let i = 0; i < numLines; i++) {
            let angle = (i / numLines) * Math.PI * 2;
            let currX = c.x + Math.cos(angle) * (c.radius + 2);
            let currY = c.y + Math.sin(angle) * (c.radius + 2);

            ctx.beginPath();
            ctx.moveTo(currX, currY);

            for (let step = 0; step < 140; step++) {
                let E = getVectorCampo(currX, currY);
                if (E.Mag === 0) break;

                let nextX = currX + (E.Ex / E.Mag) * stepSize;
                let nextY = currY + (E.Ey / E.Mag) * stepSize;

                ctx.lineTo(nextX, nextY);

                // Flecha direccional cada 25 pasos
                if (step > 0 && step % 25 === 0) {
                    let dirAngle = Math.atan2(E.Ey, E.Ex);
                    ctx.save();
                    ctx.translate(nextX, nextY);
                    ctx.rotate(dirAngle);
                    ctx.fillStyle = '#38bdf8';
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(-7, -4);
                    ctx.lineTo(-7, 4);
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();
                }

                currX = nextX;
                currY = nextY;

                if (currX < 0 || currX > canvas.width || currY < 0 || currY > canvas.height) break;

                let hit = false;
                cargas.forEach(target => {
                    if (target.q < 0 && Math.hypot(currX - target.x, currY - target.y) < target.radius) hit = true;
                });
                if (hit) break;
            }

            ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
            ctx.lineWidth = 1.8;
            ctx.stroke();
        }
    });
}

// Renderizado de Esferas 3D
function drawEsfera3D(x, y, radius, colorBase, signText) {
    let glowGrad = ctx.createRadialGradient(x, y, radius * 0.5, x, y, radius * 2.5);
    glowGrad.addColorStop(0, colorBase === 'red' ? 'rgba(239, 68, 68, 0.35)' : (colorBase === 'blue' ? 'rgba(59, 130, 246, 0.35)' : 'rgba(234, 179, 8, 0.35)'));
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
    drawEquipotentials();
    drawFieldLinesWithArrows();

    // Renderizar Cargas
    cargas.forEach(c => {
        let color = c.q > 0 ? 'red' : (c.q < 0 ? 'blue' : 'gray');
        let signo = c.q > 0 ? '+' : (c.q < 0 ? '-' : '0');
        drawEsfera3D(c.x, c.y, c.radius, color, signo);
    });

    // Medición entre q1 y q2 si existen
    if (cargas.length >= 2) {
        const c1 = cargas[0];
        const c2 = cargas[1];
        let dx = (c2.x - c1.x) / SCALE;
        let dy = (c2.y - c1.y) / SCALE;
        let r = Math.hypot(dx, dy);
        if (r < 0.05) r = 0.05;

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

    // Multímetro
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