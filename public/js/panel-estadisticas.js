// panel-estadisticas.js — Dashboard de estadísticas para el panel admin
// Requiere Chart.js 4.x cargado antes de este script

'use strict';

// ─── Paletas de colores ────────────────────────────────────────────────────
const PALETTE_VIBRANT = [
    '#ba01ff', '#00dffc', '#ff4d6d', '#ffd166', '#06d6a0',
    '#118ab2', '#f77f00', '#a8dadc', '#e63946', '#52b788',
];
const PALETTE_PURPLE_CYAN = (n) =>
    Array.from({ length: n }, (_, i) => {
        const t = i / Math.max(n - 1, 1);
        const r = Math.round(186 * (1 - t) + 0 * t);
        const g = Math.round(1 * (1 - t) + 223 * t);
        const b = Math.round(255 * (1 - t) + 252 * t);
        return `rgba(${r},${g},${b},0.85)`;
    });

// ─── Chart.js defaults ────────────────────────────────────────────────────
const BASE_FONT = "'Segoe UI', system-ui, sans-serif";

function applyGlobalDefaults() {
    Chart.defaults.font.family = BASE_FONT;
    Chart.defaults.color = '#ccc';
    Chart.defaults.plugins.legend.labels.boxWidth = 14;
    Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(20,0,30,0.92)';
    Chart.defaults.plugins.tooltip.titleColor = '#ba01ff';
    Chart.defaults.plugins.tooltip.bodyColor = '#eee';
    Chart.defaults.plugins.tooltip.borderColor = 'rgba(186,1,255,0.3)';
    Chart.defaults.plugins.tooltip.borderWidth = 1;
}

// ─── Registro + cache de instancias ────────────────────────────────────────
const _charts = {};
function destroyChart(id) {
    if (_charts[id]) { _charts[id].destroy(); delete _charts[id]; }
}
function registerChart(id, instance) {
    _charts[id] = instance;
}

// ─── KPI Cards ────────────────────────────────────────────────────────────
function renderKPIs(datos) {
    const rc = datos.resumenCuentas || {};
    const kpis = [
        { icon: 'bi-people-fill', label: 'Usuarios Activos', value: rc.activas || 0, color: '#00dffc' },
        { icon: 'bi-person-x-fill', label: 'Cuentas Eliminadas', value: rc.eliminadas || 0, color: '#ff4d6d' },
        { icon: 'bi-ban', label: 'Usuarios Baneados', value: rc.baneadas || 0, color: '#ffd166' },
        { icon: 'bi-postcard-fill', label: 'Publicaciones (14d)', value: (datos.publicacionesPorDia || []).reduce((a, b) => a + parseInt(b.total), 0), color: '#ba01ff' },
        { icon: 'bi-music-note-beamed', label: 'Artistas Únicos', value: (datos.artistasTop || []).length, color: '#06d6a0' },
        { icon: 'bi-star-fill', label: 'Canciones Calificadas', value: (datos.cancionesTop || []).length, color: '#f77f00' },
    ];

    const container = document.getElementById('statsKPIs');
    if (!container) return;
    container.innerHTML = kpis.map(k => `
        <div class="stats-kpi-card">
        <i class="bi ${k.icon}" style="font-size:2rem; color:${k.color};"></i>
        <div class="stats-kpi-value" style="color:${k.color};">${k.value}</div>
        <div class="stats-kpi-label">${k.label}</div>
        </div>
    `).join('');
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function shortLabel(str, max = 18) {
    return str && str.length > max ? str.slice(0, max - 1) + '…' : str;
}

// ─── GRÁFICAS ──────────────────────────────────────────────────────────────

// 1) Publicaciones por día — Line chart
function renderPublicacionesDia(rows) {
    destroyChart('pubDia');
    const labels = rows.map(r => {
        const d = new Date(r.dia);
        return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
    });
    const data = rows.map(r => parseInt(r.total));
    const ctx = document.getElementById('chartPublicacionesDia').getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 220);
    grad.addColorStop(0, 'rgba(186,1,255,0.35)');
    grad.addColorStop(1, 'rgba(186,1,255,0)');
    registerChart('pubDia', new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Publicaciones',
                data,
                borderColor: '#ba01ff',
                backgroundColor: grad,
                borderWidth: 2.5,
                pointBackgroundColor: '#ba01ff',
                pointRadius: 4,
                tension: 0.4,
                fill: true,
            }],
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { maxRotation: 45 } },
                y: { grid: { color: 'rgba(255,255,255,0.06)' }, beginAtZero: true, ticks: { precision: 0 } },
            },
        },
    }));
}

// 2) Estado de cuentas — Doughnut
function renderCuentas(resumen) {
    destroyChart('cuentas');
    const ctx = document.getElementById('chartCuentas').getContext('2d');
    registerChart('cuentas', new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Activas', 'Eliminadas', 'Baneadas'],
            datasets: [{
                data: [resumen.activas || 0, resumen.eliminadas || 0, resumen.baneadas || 0],
                backgroundColor: ['#00dffc', '#ff4d6d', '#ffd166'],
                borderColor: '#1a0025',
                borderWidth: 3,
                hoverOffset: 8,
            }],
        },
        options: {
            responsive: true,
            cutout: '62%',
            plugins: {
                legend: { position: 'bottom' },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.label}: ${ctx.parsed}`,
                    },
                },
            },
        },
    }));
}

// 3) Géneros — Bar horizontal
function renderGeneros(rows) {
    destroyChart('generos');
    const labels = rows.map(r => shortLabel(r.genero));
    const data = rows.map(r => parseInt(r.total));
    const ctx = document.getElementById('chartGeneros').getContext('2d');
    registerChart('generos', new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Publicaciones',
                data,
                backgroundColor: PALETTE_PURPLE_CYAN(labels.length),
                borderRadius: 6,
                borderSkipped: false,
            }],
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { precision: 0 } },
                y: { grid: { display: false } },
            },
        },
    }));
}

// 4) Artistas — Bar vertical
function renderArtistas(rows) {
    destroyChart('artistas');
    const labels = rows.map(r => shortLabel(r.artista));
    const data = rows.map(r => parseInt(r.menciones));
    const ctx = document.getElementById('chartArtistas').getContext('2d');
    registerChart('artistas', new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Menciones',
                data,
                backgroundColor: PALETTE_VIBRANT.slice(0, labels.length),
                borderRadius: 6,
                borderSkipped: false,
            }],
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { maxRotation: 40, font: { size: 11 } } },
                y: { grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { precision: 0 } },
            },
        },
    }));
}

// 5) Usuarios más activos — Bar stacked
function renderUsuariosActivos(rows) {
    destroyChart('usuariosActivos');
    const labels = rows.map(r => shortLabel(r.usuario));
    const ctx = document.getElementById('chartUsuariosActivos').getContext('2d');
    registerChart('usuariosActivos', new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Publicaciones',
                    data: rows.map(r => parseInt(r.publicaciones)),
                    backgroundColor: 'rgba(186,1,255,0.8)',
                    borderRadius: 4,
                },
                {
                    label: 'Likes dados',
                    data: rows.map(r => parseInt(r.likes_dados)),
                    backgroundColor: 'rgba(0,223,252,0.8)',
                    borderRadius: 4,
                },
                {
                    label: 'Comentarios',
                    data: rows.map(r => parseInt(r.comentarios)),
                    backgroundColor: 'rgba(255,77,109,0.8)',
                    borderRadius: 4,
                },
            ],
        },
        options: {
            responsive: true,
            scales: {
                x: { stacked: true, grid: { display: false }, ticks: { maxRotation: 40, font: { size: 11 } } },
                y: { stacked: true, grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { precision: 0 } },
            },
            plugins: { legend: { position: 'bottom' } },
        },
    }));
}

// 6) Top por seguidores — Bar horizontal
function renderSeguidores(rows) {
    destroyChart('seguidores');
    const labels = rows.map(r => shortLabel(r.usuario));
    const data = rows.map(r => parseInt(r.seguidores));
    const ctx = document.getElementById('chartSeguidores').getContext('2d');
    registerChart('seguidores', new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Seguidores',
                data,
                backgroundColor: PALETTE_PURPLE_CYAN(labels.length),
                borderRadius: 6,
                borderSkipped: false,
            }],
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { precision: 0 } },
                y: { grid: { display: false } },
            },
        },
    }));
}

// 7) Canciones más calificadas — Bar + line promedio
function renderCanciones(rows) {
    destroyChart('canciones');
    const labels = rows.map(r => shortLabel(`${r.nombre} – ${r.artista}`, 22));
    const ctx = document.getElementById('chartCanciones').getContext('2d');
    registerChart('canciones', new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Total calificaciones',
                    data: rows.map(r => parseInt(r.total_calificaciones)),
                    backgroundColor: 'rgba(186,1,255,0.75)',
                    borderRadius: 6,
                    yAxisID: 'y',
                },
                {
                    type: 'line',
                    label: 'Promedio (★)',
                    data: rows.map(r => parseFloat(r.promedio)),
                    borderColor: '#ffd166',
                    backgroundColor: 'rgba(255,209,102,0.2)',
                    pointBackgroundColor: '#ffd166',
                    pointRadius: 5,
                    borderWidth: 2,
                    tension: 0.3,
                    yAxisID: 'y2',
                },
            ],
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom' } },
            scales: {
                x: { grid: { display: false }, ticks: { maxRotation: 40, font: { size: 10 } } },
                y: { grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { precision: 0 }, position: 'left' },
                y2: { min: 0, max: 5, ticks: { stepSize: 1, callback: v => `${v}★` }, grid: { display: false }, position: 'right' },
            },
        },
    }));
}

// 8) Cuentas eliminadas por mes — Area
function renderEliminadas(rows) {
    destroyChart('eliminadas');
    const ctx = document.getElementById('chartEliminadas').getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 260);
    grad.addColorStop(0, 'rgba(255,77,109,0.4)');
    grad.addColorStop(1, 'rgba(255,77,109,0)');
    registerChart('eliminadas', new Chart(ctx, {
        type: 'line',
        data: {
            labels: rows.map(r => r.mes),
            datasets: [{
                label: 'Cuentas eliminadas',
                data: rows.map(r => parseInt(r.total)),
                borderColor: '#ff4d6d',
                backgroundColor: grad,
                borderWidth: 2.5,
                pointBackgroundColor: '#ff4d6d',
                pointRadius: 5,
                tension: 0.4,
                fill: true,
            }],
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.06)' } },
                y: { grid: { color: 'rgba(255,255,255,0.06)' }, beginAtZero: true, ticks: { precision: 0 } },
            },
        },
    }));
}

// 9) Distribución de roles — Pie
function renderRoles(rows) {
    destroyChart('roles');
    const ctx = document.getElementById('chartRoles').getContext('2d');
    registerChart('roles', new Chart(ctx, {
        type: 'pie',
        data: {
            labels: rows.map(r => r.rol),
            datasets: [{
                data: rows.map(r => parseInt(r.total)),
                backgroundColor: ['#ba01ff', '#00dffc', '#ffd166'],
                borderColor: '#1a0025',
                borderWidth: 3,
                hoverOffset: 6,
            }],
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom' } },
        },
    }));
}

// ─── Loader principal ──────────────────────────────────────────────────────
async function cargarEstadisticas() {
    const secciones = [
        'chartPublicacionesDia', 'chartCuentas', 'chartGeneros', 'chartArtistas',
        'chartUsuariosActivos', 'chartSeguidores', 'chartCanciones', 'chartEliminadas', 'chartRoles',
    ];
    // Mostrar spinners en cada canvas
    secciones.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const parent = el.parentElement;
            parent.style.position = 'relative';
            if (!parent.querySelector('.stats-spinner')) {
                const sp = document.createElement('div');
                sp.className = 'stats-spinner text-center py-4';
                sp.innerHTML = '<div class="spinner-border" style="color:#ba01ff;"></div>';
                parent.appendChild(sp);
            }
        }
    });

    try {
        const res = await fetch('/api/admin/estadisticas');
        const datos = await res.json();

        // Limpiar spinners
        document.querySelectorAll('.stats-spinner').forEach(s => s.remove());

        // Aplicar defaults en primera carga
        applyGlobalDefaults();

        // KPIs
        renderKPIs(datos);

        // Gráficas
        if (datos.publicacionesPorDia?.length) renderPublicacionesDia(datos.publicacionesPorDia);
        if (datos.resumenCuentas) renderCuentas(datos.resumenCuentas);
        if (datos.generosTop?.length) renderGeneros(datos.generosTop);
        if (datos.artistasTop?.length) renderArtistas(datos.artistasTop);
        if (datos.usuariosActivos?.length) renderUsuariosActivos(datos.usuariosActivos);
        if (datos.usuariosTop?.length) renderSeguidores(datos.usuariosTop);
        if (datos.cancionesTop?.length) renderCanciones(datos.cancionesTop);
        if (datos.reportesPorMes?.length) renderEliminadas(datos.reportesPorMes);
        if (datos.distribucionRoles?.length) renderRoles(datos.distribucionRoles);

        // Mensaje vacío si no hay datos de géneros/artistas
        if (!datos.generosTop?.length) {
            document.getElementById('chartGeneros').closest('.stats-card').innerHTML +=
                '<p class="text-center text-muted py-3">Sin datos de géneros aún</p>';
        }
        if (!datos.artistasTop?.length) {
            document.getElementById('chartArtistas').closest('.stats-card').innerHTML +=
                '<p class="text-center text-muted py-3">Sin datos de artistas aún</p>';
        }

    } catch (err) {
        console.error('Error cargando estadísticas:', err);
        document.querySelectorAll('.stats-spinner').forEach(s => {
            s.innerHTML = '<p class="text-danger small">Error al cargar</p>';
        });
    }
}

// ─── Activar al mostrar el tab ─────────────────────────────────────────────
document.addEventListener('shown.bs.tab', function (e) {
    if (e.target && e.target.id === 'estadisticas-tab') {
        cargarEstadisticas();
    }
});