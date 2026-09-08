// Algoritmo Marching Squares para Líneas Equipotenciales exactas y ortogonales
function drawEquipotentialsMarchingSquares() {
    if (!chkEqui.checked) return;

    const gridStep = 8; // Resolución de la malla
    const cols = Math.floor(canvas.width / gridStep);
    const rows = Math.floor(canvas.height / gridStep);

    // Malla de Potencial V(x,y)
    let grid = [];
    for (let i = 0; i <= cols; i++) {
        grid[i] = [];
        for (let j = 0; j <= rows; j++) {
            grid[i][j] = getPotencial(i * gridStep, j * gridStep);
        }
    }

    // Valores de voltaje objetivo para trazar curvas
    const niveles = [-600, -350, -200, -100, -50, 50, 100, 200, 350, 600];

    niveles.forEach(vTarget => {
        ctx.beginPath();
        ctx.strokeStyle = vTarget > 0 ? 'rgba(239, 68, 68, 0.6)' : 'rgba(59, 130, 246, 0.6)';
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

                // Determinar el caso del cuadrado segun los signos de la esquina
                let cellCase = 0;
                if (v0 > 0) cellCase |= 1;
                if (v1 > 0) cellCase |= 2;
                if (v2 > 0) cellCase |= 4;
                if (v3 > 0) cellCase |= 8;

                if (cellCase === 0 || cellCase === 15) continue;

                // Interpolacion lineal para ubicar los cortes exactos en las aristas
                let top = { x: x + (gridStep * (-v0)) / (v1 - v0), y: y };
                let right = { x: x + gridStep, y: y + (gridStep * (-v1)) / (v2 - v1) };
                let bottom = { x: x + (gridStep * (-v3)) / (v2 - v3), y: y + gridStep };
                let left = { x: x, y: y + (gridStep * (-v0)) / (v3 - v0) };

                // Dibujar segmentos dentro de la celda
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

// Líneas de Campo con Flechas Direccionales integradas
function drawFieldLinesWithArrows() {
    if (!chkField.checked) return;

    const numLines = 16;
    const stepSize = 4;

    cargas.forEach(c => {
        if (c.q <= 0) return; // Iniciar integracion solo en cargas positivas

        for (let i = 0; i < numLines; i++) {
            let angle = (i / numLines) * Math.PI * 2;
            let currX = c.x + Math.cos(angle) * (c.radius + 2);
            let currY = c.y + Math.sin(angle) * (c.radius + 2);

            ctx.beginPath();
            ctx.moveTo(currX, currY);

            for (let step = 0; step < 160; step++) {
                let E = getVectorCampo(currX, currY);
                if (E.Mag === 0) break;

                let nextX = currX + (E.Ex / E.Mag) * stepSize;
                let nextY = currY + (E.Ey / E.Mag) * stepSize;

                ctx.lineTo(nextX, nextY);

                // Dibujar flecha indicadora de atraccion/repulsion cada 30 pasos
                if (step > 0 && step % 30 === 0) {
                    let dirAngle = Math.atan2(E.Ey, E.Ex);
                    ctx.save();
                    ctx.translate(nextX, nextY);
                    ctx.rotate(dirAngle);
                    ctx.fillStyle = '#38bdf8';
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(-8, -4);
                    ctx.lineTo(-8, 4);
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();
                }

                currX = nextX;
                currY = nextY;

                if (currX < 0 || currX > canvas.width || currY < 0 || currY > canvas.height) break;

                let hitTarget = false;
                cargas.forEach(target => {
                    if (target.q < 0 && Math.hypot(currX - target.x, currY - target.y) < target.radius) hitTarget = true;
                });
                if (hitTarget) break;
            }

            ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
            ctx.lineWidth = 1.8;
            ctx.stroke();
        }
    });
}

// Reemplaza estas llamadas dentro de tu funcion loop()
function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawQuantumBackground();
    drawEquipotentialsMarchingSquares(); // Nueva funcion ortogonal
    drawFieldLinesWithArrows();          // Nuevas flechas direccionales

    // ... Resto de la animacion y cargas permanece igual ...
    requestAnimationFrame(loop);
}