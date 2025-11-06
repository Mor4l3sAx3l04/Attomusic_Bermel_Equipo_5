const temaOscuro=()=>{
    document.body.setAttribute("data-bs-theme","dark");
    document.querySelector('#dl-icon').setAttribute("class","bi bi-sun-fill");
}
const temaClaro=()=>{
    document.body.setAttribute("data-bs-theme","light");
    document.querySelector('#dl-icon').setAttribute("class","bi bi-moon-stars-fill");
}
const cambiarTema=()=>{
    if(document.body.getAttribute("data-bs-theme")==="dark"){
        temaClaro();
    }else{
        temaOscuro();
    }
}