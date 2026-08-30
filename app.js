// 1. Conexión a la base de datos de Supabase
const SUPABASE_URL = "https://flintkwlzomtvbbggbra.supabase.co";
const SUPABASE_KEY = "sb_publishable_HIgh6bf6RXZ5IRDLkZXl7Q_R55a7WJx";
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let listaCentrales = [];

// 2. Control de Estado de Red (Online / Offline)
window.addEventListener('online', () => cambiarEstadoRed(true));
window.addEventListener('offline', () => cambiarEstadoRed(false));

function cambiarEstadoRed(online) {
    const el = document.getElementById('indicador-red');
    if (online) {
        el.innerText = "En línea";
        el.className = "text-xs bg-green-500 text-white font-semibold px-2.5 py-1 rounded-full shadow";
        sincronizarPendientes();
    } else {
        el.innerText = "Sin señal (Guardando local)";
        el.className = "text-xs bg-amber-500 text-white font-semibold px-2.5 py-1 rounded-full shadow";
    }
}

// 3. Inicialización de Datos
document.addEventListener('DOMContentLoaded', async () => {
    await cargarCentrales();
});

async function cargarCentrales() {
    if (navigator.onLine) {
        const { data } = await supabase.from('centrales').select('*');
        listaCentrales = data || [];
        localStorage.setItem('cache_centrales', JSON.stringify(listaCentrales));
    } else {
        listaCentrales = JSON.parse(localStorage.getItem('cache_centrales') || '[]');
    }

    const selectInst = document.getElementById('inst-central');
    const selectTss = document.getElementById('tss-central');

    let html = '<option value="">-- Seleccionar Central / BTS --</option>';
    listaCentrales.forEach(c => {
        html += `<option value="${c.id}">[${c.operador}] ${c.nombre_sitio}</option>`;
    });

    selectInst.innerHTML = html;
    selectTss.innerHTML = html;
}

// Mostrar información logística al seleccionar central
document.getElementById('inst-central').addEventListener('change', (e) => {
    const id = e.target.value;
    const sitio = listaCentrales.find(c => c.id == id);
    const box = document.getElementById('info-acceso');

    if (sitio) {
        document.getElementById('info-llaves').innerText = sitio.ubicacion_llaves;
        document.getElementById('info-seguridad').innerText = sitio.contacto_seguridad;
        document.getElementById('info-ingeniero').innerText = sitio.contacto_ingeniero;
        box.classList.remove('hidden');
    } else {
        box.classList.add('hidden');
    }
});

// 4. Navegación por Módulos
function cambiarModulo(mod) {
    const modInst = document.getElementById('modulo-instalacion');
    const modTss = document.getElementById('modulo-tss');
    const btnInst = document.getElementById('btn-tab-inst');
    const btnTss = document.getElementById('btn-tab-tss');

    if (mod === 'instalacion') {
        modInst.classList.remove('hidden');
        modTss.classList.add('hidden');
        btnInst.className = "py-3 px-4 rounded-lg font-bold text-sm shadow transition bg-blue-800 text-white";
        btnTss.className = "py-3 px-4 rounded-lg font-bold text-sm shadow transition bg-white text-slate-700 hover:bg-slate-50";
    } else {
        modInst.classList.add('hidden');
        modTss.classList.remove('hidden');
        btnTss.className = "py-3 px-4 rounded-lg font-bold text-sm shadow transition bg-amber-600 text-white";
        btnInst.className = "py-3 px-4 rounded-lg font-bold text-sm shadow transition bg-white text-slate-700 hover:bg-slate-50";
    }
}

// Agregar filas a la tabla dinámica de TSS
function agregarFilaMaterial() {
    const tbody = document.getElementById('tabla-materiales-body');
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td class="border border-slate-200 p-1"><input type="text" class="w-full p-1 mat-desc" placeholder="Descripción del material"></td>
        <td class="border border-slate-200 p-1"><input type="number" class="w-full p-1 mat-cant" value="1"></td>
        <td class="border border-slate-200 p-1">
            <select class="w-full p-1 mat-unidad">
                <option>Metros</option>
                <option>Unidades</option>
                <option>Juegos</option>
            </select>
        </td>
    `;
    tbody.appendChild(tr);
}

// 5. Guardar Reporte de Avance
async function guardarAvance() {
    const datos = {
        central_id: document.getElementById('inst-central').value,
        tecnico_nombre: document.getElementById('inst-tecnico').value,
        descripcion_avance: document.getElementById('inst-avance').value,
        pendientes_bloqueos: document.getElementById('inst-pendientes').value,
        fecha: new Date().toISOString()
    };

    if (!datos.central_id || !datos.tecnico_nombre || !datos.descripcion_avance) {
        alert("Completa todos los campos obligatorios.");
        return;
    }

    if (navigator.onLine) {
        await supabase.from('reportes_avance').insert([datos]);
        alert("Reporte de Avance guardado en la nube.");
    } else {
        let locales = JSON.parse(localStorage.getItem('off_avances') || '[]');
        locales.push(datos);
        localStorage.setItem('off_avances', JSON.stringify(locales));
        alert("Sin señal: Guardado localmente en el dispositivo.");
    }
}

// 6. Guardar TSS
async function guardarTSS() {
    const filas = document.querySelectorAll('#tabla-materiales-body tr');
    let materiales = [];

    filas.forEach(f => {
        const desc = f.querySelector('.mat-desc').value;
        const cant = f.querySelector('.mat-cant').value;
        const unidad = f.querySelector('.mat-unidad').value;
        if (desc) materiales.push({ desc, cant, unidad });
    });

    const datos = {
        central_id: document.getElementById('tss-central').value,
        tecnico_nombre: document.getElementById('tss-tecnico').value,
        materiales_requeridos: materiales,
        fecha: new Date().toISOString()
    };

    if (!datos.central_id || !datos.tecnico_nombre || materiales.length === 0) {
        alert("Completa la información del TSS y agrega al menos 1 material.");
        return;
    }

    if (navigator.onLine) {
        await supabase.from('reportes_tss').insert([datos]);
        alert("Levantamiento TSS guardado en la nube.");
    } else {
        let locales = JSON.parse(localStorage.getItem('off_tss') || '[]');
        locales.push(datos);
        localStorage.setItem('off_tss', JSON.stringify(locales));
        alert("Sin señal: TSS guardado localmente en el dispositivo.");
    }
}

// 7. Sincronización Automática al recuperar señal
async function sincronizarPendientes() {
    let offAvances = JSON.parse(localStorage.getItem('off_avances') || '[]');
    let offTss = JSON.parse(localStorage.getItem('off_tss') || '[]');

    if (offAvances.length > 0) {
        await supabase.from('reportes_avance').insert(offAvances);
        localStorage.removeItem('off_avances');
    }
    if (offTss.length > 0) {
        await supabase.from('reportes_tss').insert(offTss);
        localStorage.removeItem('off_tss');
    }
}

// 8. MOTOR DE EXPORTACIÓN A EXCEL (.XLSX)
async function exportarAvancesExcel() {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Reporte Avances EYS');

    sheet.columns = [
        { header: 'Fecha', key: 'fecha', width: 22 },
        { header: 'Técnico', key: 'tecnico', width: 25 },
        { header: 'Central / Sitio', key: 'sitio', width: 25 },
        { header: 'Descripción del Avance', key: 'avance', width: 45 },
        { header: 'Pendientes / Bloqueos', key: 'pendientes', width: 35 }
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A8A' } };

    let registros = [];
    if (navigator.onLine) {
        const { data } = await supabase.from('reportes_avance').select('*, centrales(nombre_sitio)');
        registros = data || [];
    } else {
        registros = JSON.parse(localStorage.getItem('off_avances') || '[]');
    }

    registros.forEach(r => {
        sheet.addRow({
            fecha: new Date(r.fecha).toLocaleString(),
            tecnico: r.tecnico_nombre,
            sitio: r.centrales ? r.centrales.nombre_sitio : 'Registrado en Offline',
            avance: r.descripcion_avance,
            pendientes: r.pendientes_bloqueos || 'Sin pendientes'
        });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    descargarArchivo(buffer, `Reporte_Avances_EYS_${new Date().toISOString().slice(0,10)}.xlsx`);
}

async function exportarTSSExcel() {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Levantamientos TSS');

    sheet.columns = [
        { header: 'Fecha', key: 'fecha', width: 22 },
        { header: 'Técnico TSS', key: 'tecnico', width: 25 },
        { header: 'Central / Sitio', key: 'sitio', width: 25 },
        { header: 'Materiales Requeridos', key: 'materiales', width: 50 }
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D97706' } };

    let registros = [];
    if (navigator.onLine) {
        const { data } = await supabase.from('reportes_tss').select('*, centrales(nombre_sitio)');
        registros = data || [];
    } else {
        registros = JSON.parse(localStorage.getItem('off_tss') || '[]');
    }

    registros.forEach(r => {
        let listaMat = "";
        if (Array.isArray(r.materiales_requeridos)) {
            listaMat = r.materiales_requeridos.map(m => `${m.desc} (${m.cant} ${m.unidad})`).join(" | ");
        }
        sheet.addRow({
            fecha: new Date(r.fecha).toLocaleString(),
            tecnico: r.tecnico_nombre,
            sitio: r.centrales ? r.centrales.nombre_sitio : 'Registrado en Offline',
            materiales: listaMat
        });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    descargarArchivo(buffer, `Levantamiento_TSS_EYS_${new Date().toISOString().slice(0,10)}.xlsx`);
}

function descargarArchivo(buffer, nombre) {
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = nombre;
    link.click();
}