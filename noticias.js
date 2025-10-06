
let cantidadNoticias = 5;
let pageFinal = cantidadNoticias;
let pageInicial = 0;
let temaActual = "Music";


let noticias = {
    fetchNoticias: function() {
        fetch('/music-news')
            .then(response => response.json())
            .then(data => this.displayNoticias(data))
            .catch(() => this.displayError('No se pudieron cargar las noticias.'));
    },
    displayNoticias: function(data){
        //elimino todo si ha seleccionado un nuevo tema
        if(pageInicial==0){
            document.querySelector(".container-noticias").textContent ="";
        }


        for(i=pageInicial;i<=pageFinal;i++){
            const {title} = data.articles[i];
            let h2 = document.createElement("h2");
            h2.textContent = title;
    
            const {urlToImage} = data.articles[i];
            let img = document.createElement("img");
            img.setAttribute("src", urlToImage);

            let info_item = document.createElement("div");
            info_item.className = "info_item";
            const {publishedAt} = data.articles[i];
            let fecha = document.createElement("span");
            let date = publishedAt;
            date=date.split("T")[0].split("-").reverse().join("-");
            fecha.className = "fecha";
            fecha.textContent = date;

            const {name} = data.articles[i].source;
            let fuente = document.createElement("span");
            fuente.className = "fuente";
            fuente.textContent = name;

            info_item.appendChild(fecha);
            info_item.appendChild(fuente);

            const {url} = data.articles[i];

            let item = document.createElement("div");
            item.className = "item";
            item.appendChild(h2);
            item.appendChild(img);
            item.appendChild(info_item);
            item.setAttribute("onclick", "location.href='"+url+"'");
            document.querySelector(".container-noticias").appendChild(item);
        }

        let btnSiguiente = document.createElement("span");
        btnSiguiente.id = "btnSiguiente";
        btnSiguiente.textContent = "Ver más";
        btnSiguiente.setAttribute("onclick","siguiente()");
        document.querySelector(".container-noticias").appendChild(btnSiguiente);
    }
}


function siguiente(){
    pageInicial = pageFinal + 1;
    pageFinal = pageFinal + cantidadNoticias + 1;
    //eliminamos el botón siguiente
    const btn = document.querySelector("#btnSiguiente");
    if (btn) btn.remove();
    noticias.fetchNoticias();
}


window.mainNoticias = function() {
    pageFinal = cantidadNoticias;
    pageInicial = 0;
    temaActual = "Music";
    noticias.fetchNoticias();
};

if (document.querySelector('.container-noticias')) {
    window.mainNoticias();
}
    
    fetch('/music-news')
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                noticias.displayError('Error: ' + (data.details || data.error));
            } else {
                noticias.displayNoticias(data);
            }
        })
        .catch((err) => noticias.displayError('No se pudieron cargar las noticias. ' + (err?.message || '')));