const temaOscuro = () => {
    document.documentElement.setAttribute("data-bs-theme", "dark");
    document.body.setAttribute("data-bs-theme", "dark");
    document.querySelector('#dl-icon').setAttribute("class", "bi bi-sun-fill");
    localStorage.setItem("tema", "dark");
    aplicarColoresIconos();
}

const temaClaro = () => {
    document.documentElement.setAttribute("data-bs-theme", "light");
    document.body.setAttribute("data-bs-theme", "light");
    document.querySelector('#dl-icon').setAttribute("class", "bi bi-moon-stars-fill");
    localStorage.setItem("tema", "light");
    aplicarColoresIconos();
}

const cambiarTema = () => {
    const temaActual = document.documentElement.getAttribute("data-bs-theme");
    if (temaActual === "dark") {
        temaClaro();
    } else {
        temaOscuro();
    }
}

function aplicarColoresIconos() {
    const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
    const colorIconos = isDark ? '#aaa' : '#5a189a';
    
    setTimeout(() => {
        document.querySelectorAll('.btn-icon-action, .pub-btn, .pub-stats i, .perfil-fecha i, .section-title i').forEach(el => {
            if (!el.closest('.pub-btn-like.liked')) {
                el.style.setProperty('color', colorIconos, 'important');
            }
        });
    }, 100);
}

// Cargar tema guardado al iniciar
window.addEventListener('DOMContentLoaded', () => {
    const temaGuardado = localStorage.getItem("tema");
    if (temaGuardado === "dark") {
        temaOscuro();
    } else {
        temaClaro();
    }
});

// Observar cambios en el DOM para aplicar colores a elementos nuevos
const observer = new MutationObserver(() => {
    aplicarColoresIconos();
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

// Al final de temas.js
window.aplicarColoresIconos = aplicarColoresIconos;