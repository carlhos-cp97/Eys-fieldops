function drawFieldLinesWithArrows() {
    if (!chkField.checked) return;

    const numLines = 16;        // Número de líneas por carga
    const stepSize = 2.5;       // Paso corto para máxima precisión y curvas suaves
    const maxSteps = 600;       // Permite que las líneas rodeen las cargas por completo

    // Algoritmo Runge-Kutta 4 (RK4) para el campo eléctrico
    function getRK4NextPoint(x, y, sign) {
        let E1 = getVectorCampo(x, y);
        if (E1.Mag === 0) return null;

        let k1x = sign * (E1.Ex / E1.Mag);
        let k1y = sign * (E1.Ey / E1.Mag);

        let E2 = getVectorCampo(x + 0.5 * stepSize * k1x, y + 0.5 * stepSize * k1y);
        if (E2.Mag === 0) return null;
        let k2x = sign * (E2.Ex / E2.Mag);
        let k2y = sign * (E2.Ey / E2.Mag);

        let E3 = getVectorCampo(x + 0.5 * stepSize * k2x, y + 0.5 * stepSize * k2y);
        if (E3.Mag === 0) return null;
        let k3x = sign * (E3.Ex / E3.Mag);
        let k3y = sign * (E3.Ey / E3.Mag);

        let E4 = getVectorCampo(x + stepSize * k3x, y + stepSize * k3y);
        if (E4.Mag === 0) return null;
        let k4x = sign * (E4.Ex / E4.Mag);
        let k4y = sign * (E4.Ey / E4.Mag);

        let dx = (stepSize / 6) * (k1x + 2 * k2x + 2 * k3x + k4x);
        let dy = (stepSize / 6) * (k1y + 2 * k2y + 2 * k3y + k4y);

        return {
            x: x + dx,
            y: y + dy,
            angle: Math.atan2(k1y, k1x)
        };
    }

    // Trazar desde cargas positivas (dirección normal) y negativas (dirección inversa)
    cargas.forEach(c => {
        let sign = c.q > 0 ? 1 : -1;

        for (let i = 0; i < numLines; i++) {
            let angle = (i / numLines) * Math.PI * 2;
            let currX = c.x + Math.cos(angle) * (c.radius + 3);
            let currY = c.y + Math.sin(angle) * (c.radius + 3);

            let points = [{ x: currX, y: currY }];
            let arrowPoints = [];

            for (let step = 0; step < maxSteps; step++) {
                let next = getRK4NextPoint(currX, currY, sign);
                if (!next) break;

                points.push({ x: next.x, y: next.y });

                // Registrar ubicación para flechas de sentido (cada 35 pasos)
                if (step > 0 && step % 35 === 0) {
                    let dirAngle = (sign > 0) ? next.angle : next.angle + Math.PI;
                    arrowPoints.push({ x: next.x, y: next.y, angle: dirAngle });
                }

                currX = next.x;
                currY = next.y;

                // Límite de lienzo ampliado
                if (currX < -100 || currX > canvas.width + 100 || currY < -100 || currY > canvas.height + 100) {
                    break;
                }

                // Detección de llegada a otra carga (centro a centro)
                let reachedTarget = false;
                for (let target of cargas) {
                    if (target !== c) {
                        let dist = Math.hypot(currX - target.x, currY - target.y);
                        if (dist <= target.radius + 2) {
                            reachedTarget = true;
                            points.push({ x: target.x, y: target.y }); // Conectar exactamente al borde
                            break;
                        }
                    }
                }
                if (reachedTarget) break;
            }

            // 1. DIBUJAR LÍNEA DE CAMPO CONTINUA Y FLUIDA
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

            // 2. DIBUJAR FLECHAS DE DIRECCIÓN CORRECTA
            arrowPoints.forEach(ap => {
                ctx.save();
                ctx.translate(ap.x, ap.y);
                ctx.rotate(ap.angle);
                ctx.fillStyle = '#38bdf8';
                ctx.beginPath();
                ctx.moveTo(5, 0);
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