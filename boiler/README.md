# Made In - Tipografía Interactiva Experimental

Inicia el proyecto desde la pagina index.html con live server.

## Descripción del Proyecto

Sitio web interactivo para explorar la tipografía variable **Made In**, una fuente experimental que visualiza la obsolescencia de la moda rápida a través de su eje **Unravel (UNRV)**. Esto es una explicación comprimida de como se lelvó a cabo.

## Estructura del Proyecto

```
boiler/
├── index.html                 # Página principal con marquee y demo
├── interactive-page.html      # Página de tipografía interactiva con p5.js
|
├── app/
│   ├── main.js               # Lógica principal de la página inicial
│   ├── interactive-sketch.js # Sketch p5.js para deformación interactiva
│   ├── theme-toggle.js       # Script compartido de alternancia de tema
│   
├── assets/
│   ├── css/
│   │   └── main.css          # Estilos principales (CSS variables, responsive)
│   ├── fonts/
│   │   ├── MadeIn-Regular-VF.ttf      # Fuente variable
│   │   └── MadeIn-Regular-Regular.ttf # Fuente estática peso regular
│   ├── img/
│   └── sass/
│       ├── main.scss         # SCSS principal (compilable) pero no lo he hecho :D
│       └── partials/
```

## Características Implementadas

###  Página Principal (index.html)

1. **Marquee Animado**
   - Banner de pantalla completa con letras (A, M, F, S, X, L, T)
   - Desplazamiento continuo automático
   - Efecto hover: cambia variación UNRV (0 → 250 → 500) + blur

2. **Demo Interactiva**
   - Input de texto personalizado
   - Slider de tamaño (50-420px)
   - Slider de Unravel (0-500)
   - Control de color (5 colores por tema)
   - Botón Auto-loop para animación automática
   - Botón Reset para restablecer valores

3. **Sección de Variaciones**
   - Grid de alfabeto completo en 3 variaciones UNRV (0, 250, 500)

4. **Sistema de Temas**
   - Toggle día/noche en header
   - CSS variables para fácil personalización
   - Paletas de color adaptadas por tema

###  Página Interactiva (interactive-page.html)

**Nueva página dedicada a tipografía interactiva con p5.js**

1. **Canvas Interactivo**
   - Letra deformable (configurable A-Z)
   - Influencia del ratón sobre la deformación
   - Múltiples capas con efecto 3D simulado
   - Ruido Perlin para naturalidad

2. **Controles Deslizantes**
   - **Diámetro del ratón** (20-300px): Define área de influencia
   - **Movimiento** (0-2): Intensidad de deformación
   - **Tamaño** (80-400px): Tamaño del texto
   - **Color**: Selector de color con ajuste automático por tema

3. **Input de Letra**
   - Cambiar cualquier letra del alfabeto en tiempo real
   - Auto-conversión a mayuscula

4. **Botón tira tu letra**
   - Restaura todos los valores a defaults

###  Sistema de Navegación

- Links en header para ir entre páginas
- Indicador visual (underline) de página activa
- El Tema persiste entre navegaciones

###  Sistema de Temas

- **Modo Oscuro** (default): Fondo oscuro, texto claro
- **Modo Claro**: Fondo claro, texto oscuro
- Colores adaptativos para todos los controles
- LocalStorage para persistencia de preferencia

### Responsive
-Index es completamente responsive
-interactive-page aun no se ajusta del todo al responsive el canvas

## Tecnologías Utilizadas

- **HTML5**: Estructura semántica
- **CSS3**: Variables, Grid, Flexbox, media queries
- **JavaScript**: DOM manipulation, event listeners
- **p5.js**: Canvas rendering, tipografía interactiva
- **Google Fonts**: Poppins para tipografía de interfaz
- **MadeIn Font**: Fuente variable personalizada


## Características del Canvas Interactivo (p5.js)

### Algoritmo de Deformación

1. **Influencia del Ratón**
   - Calcula distancia del ratón al centro
   - Genera falloff suave basado en radio configurable
   - Influencia = max(0, 1 - distancia / radio)

2. **Capas de Renderización**
   - 6 capas de letras desplazadas
   - Cada capa con opacidad decreciente
   - Desplazamiento radial desde el ángulo del ratón

3. **Ruido Perlin**
   - Noise Perlin 3D para deformación natural
   - Baseado en frameCount para animación continua
   - Añade variación orgánica

4. **Capas Finales**
   - Letra principal en topcolor completo

## Archivos CSS

### main.css

**Secciones:**
1. Importación de fuentes (Poppins, MadeIn)
2. Variables CSS globales (colores, temas)
3. Estilos base (body, header, page layout)
4. Banner marquee (animaciones, hover)
5. Interactive demo (sliders, botones, colores)
6. Grid de pesos (alphabet grid)
7. **NUEVO**: Estilos página interactiva
   - Controles avanzados con sliders
   - Canvas container responsivo
   - Header links con estados activos
   - Responsive design (mobile first)

## Responsive Design

- **Breakpoint**: 900px
- **Desktop**: Layout completo, banner 85vh
- **Móvil**: 
  - Banner 36vh
  - Grillas ajustadas
  - Controls en una columna

## Funcionalidades JavaScript Avanzadas

### theme-toggle.js
- Manejo centralizado de tema
- Persistencia en localStorage
- Detect de preferencia del sistema

### interactive-sketch.js
- Sketch de p5.js modularizado
- Config object para estado global
- Event listeners dinámicos
- Fallback a Arial si fuente no carga

### main.js
- Animación de marquee con requestAnimationFrame
- Gestión de paletas de color
- Sliders con actualizaciones en tiempo real
- Ciclo automático de UNRV

## Próximas Mejoras Posibles

- [ ] Nuevas formas de desgaste y efectos
- [ ] Versión móvil con touch events

## Resolución de Problemas

### p5.js no carga la fuente personalizada
- p5.js puede tener limitaciones con fuentes custom y daba error
- Se opto por integrar vector en vez de tipografía p5.js lo lee mejor

### Canvas no responde al ratón
- Revise que el contenedor `#p5-container` tenga dimensiones
- Verifique que p5.js esté cargado correctamente en el DOM

### Fallos con la captura svg

-Al ser vector, la letra y sus deformaciones se rompían al pasarlas a .svg
-Se optó por png de alta calidad para apreciar esas deformaciones

### Fallos al crear deformación granular en la letra vectorizada (en busca del desgaste de pelotillas)
-Rotura de la letra
-Se optó por generar partículas fuera del vector, no en el propio vector.
