const K = 8.98755e9;
const SCALE = 100; // 100px = 1m

const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');

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

const chkField = document.getElementById('chk-field');
const chkEqui = document.getElementById('chk-equi');

let cargas = [
    { id: 1, x: 250, y: 250, q: 20e-9, radius: 20, isDragging: false },
    { id: 2, x: 550, y: 250, q: -20e-9, radius: 20, isDragging: false }
];

let probe = { x: 400, y: 150, radius: 12, isDragging: false };
let draggedObj = null;

// Inicialización de Chart.js
const chartCtx = document.getElementById('fuerzaChart').getContext('2d');
let fuerzaChart = new Chart(chartCtx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Fuerza (N) vs Distancia (m)',
            data: [],
            borderColor: '#00e5ff',
            backgroundColor: 'rgba(0, 229, 255, 0.1)',
            borderWidth: 2,
            fill: true
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        scales: {
            x: { title: { display: true, text: 'Distancia (m)', color: '#aaa' }, ticks: { color: '#aaa' } },
            y: { title: { display: true, text: 'Fuerza (N)', color: '#aaa' }, ticks: { color: '#aaa' } }
        },
        plugins: { legend: { labels: { color: '#fff' } } }
    }
});

function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

q1Input.addEventListener('input', (e) => {
    cargas[0].q = parseFloat(e.target.value) * 1e-9;
    q1Disp.textContent = e.target.value;
});

q2Input.addEventListener('input', (e) => {
    cargas[1].q = parseFloat(e.target.value) * 1e-9;
    q2Disp.textContent = e.target.value;
});

// Arrastre con el mouse
canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (Math.hypot(mx - probe.x, my - probe.y) < probe.radius + 8) {
        probe.isDragging = true;
        draggedObj = probe;
        return;
    }

    cargas.forEach(c => {
        if (Math.hypot(mx - c.x, my - c.y) < c.radius + 5) {
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

// Funciones Físicas Matemáticas
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
        if (r > 0.02) {
            V += (K * c.q) / r;
        }
    });
    return V;
}

// Dibujar Superficies Equipotenciales
function drawEquipotentials() {
    if (!chkEqui.checked) return;

    const resolution = 8;
    ctx.lineWidth = 1;

    for (let x = 0; x < canvas.width; x += resolution) {
        for (let y = 0; y < canvas.height; y += resolution) {
            let V = getPotencial(x, y);
            if (Math.abs(V) > 50 && Math.abs(V) % 150 < 15) {
                ctx.fillStyle = V > 0 ? 'rgba(255, 82, 82, 0.15)' : 'rgba(68, 138, 255, 0.15)';
                ctx.fillRect(x, y, resolution, resolution);
            }
        }
    }
}

// Dibujar Líneas de Campo Continuas
function drawFieldLines() {
    if (!chkField.checked) return;

    const numLines = 16;
    const stepSize = 5;

    cargas.forEach(c => {
        if (c.q <= 0) return; // Iniciar trazado desde cargas positivas

        for (let i = 0; i < numLines; i++) {
            let angle = (i / numLines) * Math.PI * 2;
            let currX = c.x + Math.cos(angle) * (c.radius + 2);
            let currY = c.y + Math.sin(angle) * (c.radius + 2);

            ctx.beginPath();
            ctx.moveTo(currX, currY);

            for (let step = 0; step < 120; step++) {
                let E = getVectorCampo(currX, currY);
                if (E.Mag === 0) break;

                currX += (E.Ex / E.Mag) * stepSize;
                currY += (E.Ey / E.Mag) * stepSize;

                ctx.lineTo(currX, currY);

                // Romper bucle si sale del canvas o toca una carga negativa
                if (currX < 0 || currX > canvas.width || currY < 0 || currY > canvas.height) break;

                let hitTarget = false;
                cargas.forEach(target => {
                    if (target.q < 0 && Math.hypot(currX - target.x, currY - target.y) < target.radius) {
                        hitTarget = true;
                    }
                });
                if (hitTarget) break;
            }

            ctx.strokeStyle = 'rgba(0, 229, 255, 0.6)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
    });
}

// Bucle Principal
function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Renderizar capas visuales
    drawEquipotentials();
    drawFieldLines();

    const c1 = cargas[0];
    const c2 = cargas[1];

    // Distancia e interacción
    ctx.beginPath();
    ctx.moveTo(c1.x, c1.y);
    ctx.lineTo(c2.x, c2.y);
    ctx.strokeStyle = '#555';
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    let dx = (c2.x - c1.x) / SCALE;
    let dy = (c2.y - c1.y) / SCALE;
    let r = Math.hypot(dx, dy);
    if (r < 0.05) r = 0.05;

    let F = (K * Math.abs(c1.q * c2.q)) / (r * r);

    rDisp.textContent = r.toFixed(2);
    fDisp.textContent = F.toExponential(2);
    fType.textContent = (c1.q * c2.q > 0) ? "Repulsión" : "Atracción";
    fType.style.color = (c1.q * c2.q > 0) ? "#ff5252" : "#69f0ae";

    // Dibujar Cargas
    cargas.forEach(c => {
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
        ctx.fillStyle = c.q > 0 ? '#ff5252' : (c.q < 0 ? '#448aff' : '#777');
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#fff';
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(c.q > 0 ? '+' : (c.q < 0 ? '-' : '0'), c.x, c.y);
    });

    // Medición en la Sonda (Multímetro)
    let V_probe = getPotencial(probe.x, probe.y);
    let E_probe = getVectorCampo(probe.x, probe.y);
    let ang_deg = Math.atan2(E_probe.Ey, E_probe.Ex) * (180 / Math.PI);

    vRead.textContent = V_probe.toFixed(2);
    eRead.textContent = E_probe.Mag.toExponential(2);
    angRead.textContent = ang_deg.toFixed(1);

    // Vector de Campo sobre la Sonda
    if (E_probe.Mag > 0) {
        let vecLen = 30;
        let vx = probe.x + (E_probe.Ex / E_probe.Mag) * vecLen;
        let vy = probe.y + (E_probe.Ey / E_probe.Mag) * vecLen;

        ctx.beginPath();
        ctx.moveTo(probe.x, probe.y);
        ctx.lineTo(vx, vy);
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // Dibujar Sonda
    ctx.beginPath();
    ctx.arc(probe.x, probe.y, probe.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd700';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#000';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('V|E', probe.x, probe.y);

    // Actualización de la Gráfica
    if (fuerzaChart.data.labels.length > 25) {
        fuerzaChart.data.labels.shift();
        fuerzaChart.data.datasets[0].data.shift();
    }
    fuerzaChart.data.labels.push(r.toFixed(2));
    fuerzaChart.data.datasets[0].data.push(F);
    fuerzaChart.update();

    requestAnimationFrame(loop);
}

loop();