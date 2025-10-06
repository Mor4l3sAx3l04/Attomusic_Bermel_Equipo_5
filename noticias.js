
let cantidadNoticias = 5;
let pageFinal = cantidadNoticias;
let pageInicial = 0;
let temaActual = "Music";


let noticias = {
    fetchNoticias: function() {
        fetch('/music-news')
            .then(response => response.json())
            .then(data => this.displayNoticias(data));
    },
    displayNoticias: function(data) {
        // Limpia el contenedor si es la primera página
        if (pageInicial === 0) {
            document.querySelector('.container-noticias').textContent = '';
        }
        // La API devuelve las noticias en data.data (array)
        const noticiasArr = data.data || [];
        for (let i = pageInicial; i <= pageFinal && i < noticiasArr.length; i++) {
            const noticia = noticiasArr[i];
            let h2 = document.createElement('h2');
            h2.textContent = noticia.title;

            let img = document.createElement('img');
            img.setAttribute('src', noticia.image_url || '');

            let info_item = document.createElement('div');
            info_item.className = 'info_item';
            let fecha = document.createElement('span');
            let date = noticia.published_at ? noticia.published_at.split('T')[0].split('-').reverse().join('-') : '';
            fecha.className = 'fecha';
            fecha.textContent = date;

            let fuente = document.createElement('span');
            fuente.className = 'fuente';
            fuente.textContent = noticia.source || '';

            info_item.appendChild(fecha);
            info_item.appendChild(fuente);

            let item = document.createElement('div');
            item.className = 'item';
            item.appendChild(h2);
            if (noticia.image_url) item.appendChild(img);
            item.appendChild(info_item);
            item.setAttribute('onclick', `location.href='${noticia.url}'`);
            document.querySelector('.container-noticias').appendChild(item);
        }
        // Botón siguiente solo si hay más noticias
        if (pageFinal < noticiasArr.length - 1) {
            let btnSiguiente = document.createElement('span');
            btnSiguiente.id = 'btnSiguiente';
            btnSiguiente.textContent = 'Ver más';
            btnSiguiente.setAttribute('onclick', 'siguiente()');
            document.querySelector('.container-noticias').appendChild(btnSiguiente);
        }
    }
}

function siguiente(){
    pageInicial = pageFinal + 1;
    pageFinal = pageFinal + cantidadNoticias + 1;
    //eliminamos el botón siguiente
    document.querySelector("#btnSiguiente").remove();
    noticias.fetchNoticias(temaActual);

}

window.mainNoticias = function() {
    pageFinal = cantidadNoticias;
    pageInicial = 0;
    temaActual = "Music";
    noticias.fetchNoticias(temaActual);
};

if (document.querySelector('.container-noticias')) {
    window.mainNoticias();
}