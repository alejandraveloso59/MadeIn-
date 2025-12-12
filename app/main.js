/* =======================
   Aplicación: página de demostración MadeIn
   ======================= */

/* Elementos */
const body = document.body;
const themeToggle = document.getElementById("themeToggle");

const bannerTrack = document.getElementById("bannerTrack");
const bannerLetters = document.querySelectorAll(".banner-letter");

const textInput = document.getElementById("textInput");
const sample = document.getElementById("sample");
const sizeSlider = document.getElementById("sizeSlider");
const unravelSlider = document.getElementById("unravelSlider");
const playBtn = document.getElementById("playBtn");
const resetBtn = document.getElementById("resetBtn");
const colorControl = document.getElementById("colorControl");

const MAX_UNRV = 500;

/* Paletas de colores para modos día y noche */
const colorPalettes = {
  light: {
    colors: ['#000000', '#0066FF', '#84e0ffff', '#FF0000', 'rgba(251, 168, 237, 1)', '#FFD700'],
    names: ['Negro', 'Azul Eléctrico', 'Azul Turquesa', 'Rojo', 'Amarillo']
  },
  dark: {
    colors: ['#FFFFFF', '#0066FF', '#84e0ffff', '#FF0000', 'rgba(251, 168, 237, 1)', '#FFD700'],
    names: ['Blanco', 'Azul Eléctrico', 'Azul Turquesa', 'Rojo', 'Amarillo']
  }
};

let currentColor = 0;

/* ---------------- CONMUTACIÓN DE TEMA Y CONTROL DE COLOR ---------------- */
function buildColorButtons(){
  const isLight = body.classList.contains("light");
  const palette = isLight ? colorPalettes.light : colorPalettes.dark;
  
  colorControl.innerHTML = '';
  palette.colors.forEach((color, index) => {
    const btn = document.createElement('button');
    btn.className = 'color-button';
    btn.style.backgroundColor = color;
    btn.title = palette.names[index];
    if(index === currentColor) btn.classList.add('active');
    
    btn.addEventListener('click', () => {
      selectColor(index);
    });
    
    colorControl.appendChild(btn);
  });
}

function selectColor(index){
  currentColor = index;
  const isLight = body.classList.contains("light");
  const palette = isLight ? colorPalettes.light : colorPalettes.dark;
  const color = palette.colors[index];
  
  sample.style.color = color;
  
  // Actualizar botón activo
  document.querySelectorAll('.color-button').forEach((btn, i) => {
    btn.classList.toggle('active', i === index);
  });
}

function applyTheme(isLight){
  if(isLight){
    body.classList.add("light");
    body.style.setProperty("--thumb-color", "#000"); // pulgares negros durante el día
    themeToggle.textContent = "☀";
  } else {
    body.classList.remove("light");
    body.style.setProperty("--thumb-color", "#fff"); // pulgares blancos en la noche
    themeToggle.textContent = "☾";
  }
  
  // Reconstruir botones de color para nueva paleta
  buildColorButtons();
  // Reaplicar color actual
  selectColor(currentColor);
}

// configuración inicial
buildColorButtons();

// Escuchar cambios de tema en lugar de gestionar el nuestro
themeToggle.addEventListener("click", () => {
  // Esperar a que theme-toggle.js aplique el tema
  setTimeout(() => {
    buildColorButtons();
    selectColor(currentColor);
  }, 50);
});

/* ---------------- MARQUÉS DE BANNER (desplazamiento izquierdo continuo) ---------------- */
/*
  Crearemos un marqués impulsado por JS para que sea robusto en todos los navegadores y no
  sea interrumpido por otras animaciones. La pista contiene secuencia duplicada para un bucle sin fisuras.
*/

let trackX = 0;
let lastTime = null;
const speedPxPerSec = 120; // ajustar velocidad

// medir ancho de pista: nos reiniciaremos cuando se haya desplazado por la mitad de la pista (ya que duplicamos la secuencia)
function tickMarquee(time){
  if(!lastTime) lastTime = time;
  const dt = (time - lastTime) / 1000;
  lastTime = time;

  trackX -= speedPxPerSec * dt;
  // ancho de una sola secuencia es la mitad del ancho total de la pista desplazable (duplicamos)
  const totalW = bannerTrack.scrollWidth;
  const singleW = totalW / 2;

  // bucle de la traducción
  if(Math.abs(trackX) >= singleW){
    trackX += singleW; // saltar hacia adelante para hacer un bucle sin fisuras
  }

  bannerTrack.style.transform = `translateX(${trackX}px)`;
  requestAnimationFrame(tickMarquee);
}
// iniciar marqués
requestAnimationFrame(tickMarquee);

/* Letras de pancarta interactivas: cambiar UNRV al pasar el ratón */
bannerLetters.forEach((el, i) => {
  el.addEventListener('mouseenter', () => {
    const values = [0, 250, 500];
    const currentIndex = i % values.length;
    const nextIndex = (currentIndex + 1) % values.length;
    el.style.fontVariationSettings = `"UNRV" ${values[nextIndex]}`;
    el.style.filter = 'blur(0.5px)';
  });
  el.addEventListener('mouseleave', () => {
    const values = [0, 250, 500];
    const index = i % values.length;
    el.style.fontVariationSettings = `"UNRV" ${values[index]}`;
    el.style.filter = 'blur(0px)';
  });
});

/* ---------------- animar valores UNRV en letras de pancarta y muestra ---------------- */
let unr = 0;
let playing = false;
let direction = 1; // 1 significa aumentar, -1 significa disminuir
let raf = null;

function updateVisuals(){
  // actualizar letras de pancarta con desplazamientos para que cada letra muestre una fase diferente
  bannerLetters.forEach((el, i) => {
    // distribuir desplazamientos para que las letras solo ciclen a través de 0, 250, 500
    const values = [0, 250, 500];
    const index = i % values.length;
    el.style.fontVariationSettings = `"UNRV" ${values[index]}`;
  });
  // actualizar muestra de texto grande
  sample.style.fontVariationSettings = `"UNRV" ${Math.round(unr)}`;
}

/* ---------------- reproducción automática: oscilar 0 -> MAX_UNRV -> 0 infinito ---------------- */
function autoLoopStep(){
  // cambiar unr
  unr += direction * 5; // velocidad de cambio, ajustable

  if(unr >= MAX_UNRV){
    unr = MAX_UNRV;
    direction = -1;
  } else if(unr <= 0){
    unr = 0;
    direction = 1;
  }

  // alimentar slider y visuals
  unravelSlider.value = Math.round(unr);
  updateVisuals();

  if(playing){
    raf = requestAnimationFrame(autoLoopStep);
  }
}

/* REPRODUCIR/DETENER */
playBtn.addEventListener("click", () => {
  playing = !playing;
  playBtn.textContent = playing ? "Detener" : "Reproducción automática";
  if(playing){
    // asegurar que animemos desde el unr actual
    direction = unr < MAX_UNRV ? 1 : -1;
    raf = requestAnimationFrame(autoLoopStep);
  } else {
    cancelAnimationFrame(raf);
  }
});

/* REINICIAR */
resetBtn.addEventListener("click", () => {
  playing = false;
  cancelAnimationFrame(raf);
  playBtn.textContent = "Reproducción automática";
  unr = 0;
  unravelSlider.value = 0;
  updateVisuals();
});

/* CONTROLES DESLIZANTES E ENTRADA */
textInput.addEventListener("input", () => {
  const txt = textInput.value.toUpperCase() || "MADE IN";
  sample.textContent = txt;
});

// control de tamaño
sizeSlider.addEventListener("input", () => {
  const v = Number(sizeSlider.value);
  sample.style.fontSize = v + "px";
});

// control directo del control deslizante de desenvuelto
unravelSlider.addEventListener("input", (e) => {
  unr = Number(e.target.value);
  updateVisuals();
});

/* efectos visuales iniciales */
updateVisuals();

/* accesibilidad: detener marqués cuando el usuario enfoca la muestra o interactúa */
sample.addEventListener("focus", () => { /* noop - para el futuro */ });

/* asegurar que el color de los pulgares iniciales coincida con el tema */
(function initThumbColor(){
  const isLight = body.classList.contains("light");
  body.style.setProperty("--thumb-color", isLight ? "#000" : "#fff");
})();