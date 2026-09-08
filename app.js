function drawFieldLinesWithArrows() {
    if (!chkField.checked) return;

    const numLines = 16;       // Número de líneas por carga
    const stepSize = 3;        // Tamaño de paso para precisión
    const maxSteps = 400;      // Longitud máxima de integración

    const posCharges = cargas.filter(c => c.q > 0);
    const negCharges = cargas.filter(c => c.q < 0);

    // Definir desde qué cargas iniciar el trazado
    let seedCharges = posCharges.length > 0 ? posCharges : negCharges;

    seedCharges.forEach(c => {
        let sign = c.q > 0 ? 1 : -1; // Trazar hacia adelante (+q) o hacia atrás (-q)

        for (let i = 0; i < numLines; i++) {
            let angle = (i / numLines) * Math.PI * 2;
            let currX = c.x + Math.cos(angle) * (c.radius + 2);
            let currY = c.y + Math.sin(angle) * (c.radius + 2);

            let points = [{ x: currX, y: currY }];
            let arrowPoints = [];

            // Integración RK2 para trazar la línea fluida sin cortes
            for (let step = 0; step < maxSteps; step++) {
                let E1 = getVectorCampo(currX, currY);
                if (E1.Mag === 0) break;

                // Paso intermedio (Midpoint)
                let midX = currX + sign * (E1.Ex / E1.Mag) * (stepSize / 2);
                let midY = currY + sign * (E1.Ey / E1.Mag) * (stepSize / 2);

                let E2 = getVectorCampo(midX, midY);
                if (E2.Mag === 0) break;

                let nextX = currX + sign * (E2.Ex / E2.Mag) * stepSize;
                let nextY = currY + sign * (E2.Ey / E2.Mag) * stepSize;

                points.push({ x: nextX, y: nextY });

                // Guardar punto para dibujar la flecha cada 25 pasos
                if (step > 0 && step % 25 === 0) {
                    arrowPoints.push({
                        x: nextX,
                        y: nextY,
                        angle: Math.atan2(E2.Ey, E2.Ex)
                    });
                }

                currX = nextX;
                currY = nextY;

                // Romper bucle si sale del lienzo
                if (currX < -50 || currX > canvas.width + 50 || currY < -50 || currY > canvas.height + 50) {
                    break;
                }

                // Romper bucle si entra a una carga opuesta
                let hitTarget = false;
                cargas.forEach(target => {
                    if (target !== c && Math.hypot(currX - target.x, currY - target.y) < target.radius) {
                        hitTarget = true;
                    }
                });
                if (hitTarget) break;
            }

            // 1. Dibujar la LÍNEA CONTINUA de campo completa
            if (points.length > 1) {
                ctx.beginPath();
                ctx.moveTo(points[0].x, points[0].y);
                for (let p = 1; p < points.length; p++) {
                    ctx.lineTo(points[p].x, points[p].y);
                }
                ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            // 2. Dibujar las FLECHAS sobre la línea ya renderizada
            arrowPoints.forEach(ap => {
                ctx.save();
                ctx.translate(ap.x, ap.y);
                ctx.rotate(ap.angle);
                ctx.fillStyle = '#38bdf8';
                ctx.beginPath();
                ctx.moveTo(4, 0);
                ctx.lineTo(-7, -4);
                ctx.lineTo(-5, 0);
                ctx.lineTo(-7, 4);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            });
        }
    });
}