/* ==================================================
   p5.js Interactive Sketch - Made In Letter SVG Deformation
   SVG-based mesh deformation with cursor interaction
   ================================================== */

let p5Instance = null;
let sketchStarted = false;
let lastMouseX = 0;
let lastMouseY = 0;
let animationTime = 0;
let captureCountdown = 0;
let shouldHideCursor = false;
let captureFormat = 'png';
let mediaRecorder = null;
let recordedChunks = [];
let isRecording = false;

const config = {
  letter: 'a',
  fontSize: 400, // Tamaño fijo
  color: '#FFFFFF',
  isLight: false,
  mouseTrailRadius: 80,
  stretchIntensity: 1.0,
  shrinkIntensity: 0.0,
  strokeWeight: 10,
  numColors: 1,
  colorAnimationMode: 'radial',
  colorAnimationSpeed: 0.07,
  selectedColors: [0], // Array de índices de colores
  particleIntensity: 0.0, // Intensidad de partículas 0-2
  particleSelectedColors: [3], // Colores de partículas (3 = amarillo por defecto)
  backgroundColor: '#0f0f0f' // Color de fondo
};

const colorPalette = [
  '#0066FF',        // Azul eléctrico
  '#FF0000',        // Rojo
  '#84e0ff',        // Azul turquesa
  '#FFD700',        // Amarillo
  '#FBA8ED'         // Rosa
];

let fontLoaded = false;
let vertices = [];
let originalVertices = [];
let lines = [];
let svgBounds = { x: 0, y: 0, w: 0, h: 0 };
const vertexSampleRate = 5;
let noise2D = [];
let gradientZones = []; // Zonas de gradiente aleatorias
let particles = []; // Array de partículas esféricas
let staticParticles = []; // Array de partículas estáticas colocadas en la letra
let lastParticleRegenerationTime = 0; // Tiempo de regeneración de partículas

function sketch(p) {
  let canvas;

  p.setup = function() {
    const container = document.getElementById('p5-container');
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    canvas = p.createCanvas(width, height);
    canvas.parent('p5-container');

    loadSVGLetter(p, config.letter);
    sketchStarted = true;
  };

  p.draw = function() {
    config.isLight = document.body.classList.contains('light');
    
    // Usar color de fondo personalizado si está configurado, de lo contrario usar el basado en tema
    let bgColor;
    if (config.backgroundColor !== '#0f0f0f' && config.backgroundColor !== '#fafafa') {
      // Color personalizado - convertir hex a RGB
      const hexColor = config.backgroundColor.replace('#', '');
      const r = parseInt(hexColor.substring(0, 2), 16);
      const g = parseInt(hexColor.substring(2, 4), 16);
      const b = parseInt(hexColor.substring(4, 6), 16);
      p.background(r, g, b);
    } else {
      // Basado en tema
      bgColor = config.isLight ? 250 : 15;
      p.background(bgColor);
    }

    const prevMouseX = lastMouseX;
    const prevMouseY = lastMouseY;
    
    // Siempre actualizar posición del mouse, incluso durante captura
    lastMouseX = p.mouseX;
    lastMouseY = p.mouseY;

    updateVertices(p, prevMouseX, prevMouseY);
    drawDeformedLetter(p);
    
    // Actualizar y dibujar partículas
    if (config.particleIntensity > 0) {
      updateParticles(p);
      drawParticles(p);
    }
    
    animationTime += 0.05 * config.colorAnimationSpeed;

    // Manejar cuenta atrás de captura
    if (captureCountdown > 0) {
      captureCountdown--;
      if (captureCountdown === 0) {
        executeCapture();
      }
    }
  };

  p.windowResized = function() {
    if (document.getElementById('p5-container') && sketchStarted) {
      const container = document.getElementById('p5-container');
      const width = container.clientWidth;
      const height = container.clientHeight;
      p.resizeCanvas(width, height);
    }
  };

  function loadSVGLetter(p, letter) {
    const svgPath = `assets/img/SVG/${letter}.svg`;
    
    fetch(svgPath)
      .then(response => response.text())
      .then(svgText => {
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
        const lineElements = svgDoc.querySelectorAll('line');
        
        lines = [];
        lineElements.forEach(line => {
          lines.push({
            x1: parseFloat(line.getAttribute('x1')),
            y1: parseFloat(line.getAttribute('y1')),
            x2: parseFloat(line.getAttribute('x2')),
            y2: parseFloat(line.getAttribute('y2'))
          });
        });
        
        // Encontrar límites
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        lines.forEach(line => {
          minX = Math.min(minX, line.x1, line.x2);
          maxX = Math.max(maxX, line.x1, line.x2);
          minY = Math.min(minY, line.y1, line.y2);
          maxY = Math.max(maxY, line.y1, line.y2);
        });
        
        svgBounds = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
        createVerticesFromLines(p);
        generateNoise();
      })
      .catch(err => console.error('Error loading SVG:', err));
  }

  function createVerticesFromLines(p) {
    vertices = [];
    originalVertices = [];
    
    lines.forEach(line => {
      const dx = line.x2 - line.x1;
      const dy = line.y2 - line.y1;
      const length = Math.sqrt(dx * dx + dy * dy);
      const steps = Math.ceil(length / vertexSampleRate);
      
      for (let i = 0; i <= steps; i++) {
        const t = steps > 0 ? i / steps : 0;
        const vx = line.x1 + dx * t;
        const vy = line.y1 + dy * t;
        
        const canvasX = p.width / 2 + (vx - svgBounds.x - svgBounds.w / 2) * (config.fontSize / svgBounds.h);
        const canvasY = p.height / 2 + (vy - svgBounds.y - svgBounds.h / 2) * (config.fontSize / svgBounds.h);
        
        vertices.push({ x: canvasX, y: canvasY });
        originalVertices.push({ x: canvasX, y: canvasY });
      }
    });
  }

  function generateNoise() {
    noise2D = [];
    for (let i = 0; i < vertices.length; i++) {
      noise2D.push({
        x: Math.random() * 2 - 1,
        y: Math.random() * 2 - 1
      });
    }
  }

  function updateVertices(p, prevX, prevY) {
    const mouseX = p.mouseX;
    const mouseY = p.mouseY;
    const mouseDeltaX = mouseX - prevX;
    const mouseDeltaY = mouseY - prevY;
    const mouseSpeed = Math.sqrt(mouseDeltaX * mouseDeltaX + mouseDeltaY * mouseDeltaY);

    vertices.forEach((v, i) => {
      const orig = originalVertices[i];
      
      // Distancia del vértice al cursor
      const dx = v.x - mouseX;
      const dy = v.y - mouseY;
      const distToMouse = Math.sqrt(dx * dx + dy * dy);
      const influence = Math.max(0, 1 - distToMouse / config.mouseTrailRadius);
      
      if (influence > 0) {
        // Dirección del movimiento del cursor
        let moveDir = { x: mouseDeltaX, y: mouseDeltaY };
        const moveLength = Math.sqrt(moveDir.x * moveDir.x + moveDir.y * moveDir.y);
        
        if (moveLength > 0) {
          moveDir.x /= moveLength;
          moveDir.y /= moveLength;
        }
        
        // Estirar en la dirección del movimiento
        const stretchAmount = influence * config.stretchIntensity * mouseSpeed;
        v.x += moveDir.x * stretchAmount;
        v.y += moveDir.y * stretchAmount;
        
        // Encoger hacia el cursor (efecto opuesto)
        if (config.shrinkIntensity > 0) {
          const towardsCursor = { x: -dx, y: -dy };
          const towardLength = Math.sqrt(towardsCursor.x * towardsCursor.x + towardsCursor.y * towardsCursor.y);
          if (towardLength > 0) {
            towardsCursor.x /= towardLength;
            towardsCursor.y /= towardLength;
          }
          const shrinkAmount = influence * config.shrinkIntensity * mouseSpeed;
          v.x += towardsCursor.x * shrinkAmount;
          v.y += towardsCursor.y * shrinkAmount;
        }
      }
      
      // Volver gradualmente a la posición original
      const returnForce = 0.12;
      v.x += (orig.x - v.x) * returnForce;
      v.y += (orig.y - v.y) * returnForce;
    });
  }

  function drawDeformedLetter(p) {
    const centerX = p.width / 2;
    const centerY = p.height / 2;
    
    p.strokeWeight(config.strokeWeight);
    p.strokeCap(p.ROUND);
    p.strokeJoin(p.ROUND);
    p.noFill();
    
    let vertexIndex = 0;
    lines.forEach((line, lineIdx) => {
      const dx = line.x2 - line.x1;
      const dy = line.y2 - line.y1;
      const length = Math.sqrt(dx * dx + dy * dy);
      const steps = Math.ceil(length / vertexSampleRate);
      
      p.beginShape();
      for (let i = 0; i <= steps; i++) {
        if (vertexIndex < vertices.length) {
          const v = vertices[vertexIndex];
          
          // Obtener color basado en modo de animación y número de colores
          const color = getVertexColor(v.x, v.y, centerX, centerY, lineIdx, i, steps);
          p.stroke(color);
          
          p.vertex(v.x, v.y);
          vertexIndex++;
        }
      }
      p.endShape();
    });
  }

  function getVertexColor(x, y, centerX, centerY, lineIdx, step, totalSteps) {
    if (config.numColors <= 0) return '#FFFFFF';
    
    const availableColors = config.selectedColors.slice(0, config.numColors);
    if (availableColors.length === 0) return '#FFFFFF';
    
    let colorIndex = 0;
    
    // Animación radial basada en distancia desde el centro
    const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
    colorIndex = Math.floor((dist + animationTime * 100) / 50) % availableColors.length;
    
    const selectedColorIndex = availableColors[colorIndex];
    return colorPalette[selectedColorIndex];
  }

  function updateParticles(p) {
    const mouseX = p.mouseX;
    const mouseY = p.mouseY;
    const detectionRadius = 35; // Distancia para detectar colisión con partícula
    
    // Verificar si la intensidad cambió
    if (config.particleIntensity > 0) {
      // Generar partículas estáticas iniciales si es necesario
      if (staticParticles.length === 0 && particles.length === 0) {
        const currentTime = Date.now();
        // Verificar si han pasado 2 segundos desde la última vez que se removieron todas las partículas
        if (currentTime - lastParticleRegenerationTime >= 2000) {
          generateStaticParticles();
        }
      }
      
      // Verificar si el mouse toca alguna partícula
      for (let i = staticParticles.length - 1; i >= 0; i--) {
        const particle = staticParticles[i];
        const dist = Math.sqrt((particle.x - mouseX) ** 2 + (particle.y - mouseY) ** 2);
        if (dist < detectionRadius) {
          // Crear partícula temporal de desvanecimiento
          particles.push({
            x: particle.x,
            y: particle.y,
            vx: 0,
            vy: 0,
            size: particle.size,
            color: particle.color,
            life: 1.0,
            maxLife: 0.5
          });
          staticParticles.splice(i, 1);
        }
      }
    } else {
      // Limpiar partículas si la intensidad es 0
      staticParticles = [];
      particles = [];
    }
    
    // Actualizar partículas temporales que se desvanecen
    particles = particles.filter(p => p.life > 0);
    particles.forEach(particle => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.life -= 1 / (60 * particle.maxLife);
    });
  }

  function drawParticles(p) {
    // Dibujar partículas estáticas en la letra
    staticParticles.forEach(particle => {
      p.push();
      
      // Convertir color hex a RGB
      const hexColor = particle.color.replace('#', '');
      const r = parseInt(hexColor.substring(0, 2), 16);
      const g = parseInt(hexColor.substring(2, 4), 16);
      const b = parseInt(hexColor.substring(4, 6), 16);
      
      // Dibujar sombra
      p.fill(0, 0, 0, 40); // Sombra oscura con transparencia
      p.noStroke();
      p.ellipse(particle.x + 2, particle.y + 2, particle.size * 2, particle.size * 2);
      
      // Dibujar partícula principal
      p.fill(r, g, b, 255);
      p.noStroke();
      p.ellipse(particle.x, particle.y, particle.size * 2, particle.size * 2);
      
      p.pop();
    });
    
    // Dibujar partículas temporales que se desvanecen (después de colisión)
    particles.forEach(particle => {
      p.push();
      
      // Convertir color hex a RGB y agregar alfa
      const hexColor = particle.color.replace('#', '');
      const r = parseInt(hexColor.substring(0, 2), 16);
      const g = parseInt(hexColor.substring(2, 4), 16);
      const b = parseInt(hexColor.substring(4, 6), 16);
      const alpha = Math.floor(particle.life * 255);
      
      // Dibujar sombra (se desvanece con la partícula)
      const shadowAlpha = Math.floor((particle.life * 40));
      p.fill(0, 0, 0, shadowAlpha);
      p.noStroke();
      p.ellipse(particle.x + 2, particle.y + 2, particle.size * 2, particle.size * 2);
      
      // Dibujar partícula principal
      p.fill(r, g, b, alpha);
      p.noStroke();
      p.ellipse(particle.x, particle.y, particle.size * 2, particle.size * 2);
      
      p.pop();
    });
  }
}

function generateStaticParticles() {
  staticParticles = [];
  const particleCount = Math.floor(config.particleIntensity * 35); // Más partículas - escala bien hasta 2
  
  // Seleccionar vértices aleatorios para colocar partículas
  for (let i = 0; i < particleCount; i++) {
    const randomVertex = vertices[Math.floor(Math.random() * vertices.length)];
    
    if (randomVertex) {
      const size = 5 + Math.random() * 10; // Partículas más grandes
      // Usar colores de partículas, retroceder a colores normales si está vacío
      const colorIndices = config.particleSelectedColors.length > 0 ? config.particleSelectedColors : config.selectedColors;
      const selectedColorIndex = colorIndices[Math.floor(Math.random() * colorIndices.length)];
      const color = colorPalette[selectedColorIndex];
      
      // Desplazarse ligeramente del vértice exacto
      const offsetAngle = Math.random() * Math.PI * 2;
      const offsetDist = 3 + Math.random() * 20;
      
      staticParticles.push({
        x: randomVertex.x + Math.cos(offsetAngle) * offsetDist,
        y: randomVertex.y + Math.sin(offsetAngle) * offsetDist,
        size: size,
        color: color,
        active: true
      });
    }
  }
  
  lastParticleRegenerationTime = Date.now();
}

function executeCapture() {
  const canvas = document.querySelector('canvas');
  
  if (captureFormat === 'png') {
    // Descargar como PNG de alta resolución (3000px a 300 DPI)
    const scale = 3;
    const offscreenCanvas = document.createElement('canvas');
    const ctx = offscreenCanvas.getContext('2d');
    
    offscreenCanvas.width = canvas.width * scale;
    offscreenCanvas.height = canvas.height * scale;
    
    ctx.scale(scale, scale);
    ctx.drawImage(canvas, 0, 0);
    
    // Agregar metadata de DPI (300 ppp)
    const link = document.createElement('a');
    link.href = offscreenCanvas.toDataURL('image/png');
    link.download = `made-in-${config.letter}-${Date.now()}.png`;
    link.click();
  } else if (captureFormat === 'svg') {
    // Descargar como SVG
    const width = canvas.width;
    const height = canvas.height;
    const bgColor = config.isLight ? '#fafafa' : '#0f0f0f';
    
    let svgContent = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="${bgColor}"/>
`;

    // Agregar líneas del vector deformado
    const centerX = width / 2;
    const centerY = height / 2;
    
    let vertexIndex = 0;
    lines.forEach((line, lineIdx) => {
      const dx = line.x2 - line.x1;
      const dy = line.y2 - line.y1;
      const length = Math.sqrt(dx * dx + dy * dy);
      const steps = Math.ceil(length / vertexSampleRate);
      
      for (let i = 0; i <= steps; i++) {
        if (vertexIndex < vertices.length) {
          const v = vertices[vertexIndex];
          const color = getVertexColorSVG(v.x, v.y, centerX, centerY, lineIdx, i, steps);
          
          if (i === 0 && vertexIndex > 0) {
            // Conectar con el punto anterior
            const prevV = vertices[vertexIndex - 1];
            svgContent += `  <line x1="${prevV.x.toFixed(2)}" y1="${prevV.y.toFixed(2)}" x2="${v.x.toFixed(2)}" y2="${v.y.toFixed(2)}" stroke="${color}" stroke-width="${config.strokeWeight}" stroke-linecap="round" stroke-linejoin="round"/>\n`;
          } else if (i > 0) {
            // Conectar con el punto anterior de la misma línea
            const prevV = vertices[vertexIndex - 1];
            svgContent += `  <line x1="${prevV.x.toFixed(2)}" y1="${prevV.y.toFixed(2)}" x2="${v.x.toFixed(2)}" y2="${v.y.toFixed(2)}" stroke="${color}" stroke-width="${config.strokeWeight}" stroke-linecap="round" stroke-linejoin="round"/>\n`;
          }
          vertexIndex++;
        }
      }
    });

    svgContent += '</svg>';

    // Descargar como SVG
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `made-in-${config.letter}-${Date.now()}.svg`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  // Restaurar cursor y estado
  shouldHideCursor = false;
  captureCountdown = 0;
}

function startRecording() {
  const canvas = document.querySelector('canvas');
  recordedChunks = [];
  
  // Obtener el stream del canvas con buena calidad
  const stream = canvas.captureStream(60); // 60 FPS
  
  // Configurar MediaRecorder con codec de buena calidad
  const options = {
    mimeType: 'video/mp4;codecs=avc1',
    videoBitsPerSecond: 5000000 // 5 Mbps para buena calidad
  };
  
  // Fallback si el navegador no soporta MP4
  if (!MediaRecorder.isTypeSupported(options.mimeType)) {
    options.mimeType = 'video/webm;codecs=vp9';
  }
  
  mediaRecorder = new MediaRecorder(stream, options);
  
  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };
  
  mediaRecorder.onstop = () => {
    const blob = new Blob(recordedChunks, { type: 'video/mp4' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `made-in-${config.letter}-${Date.now()}.mp4`;
    a.click();
    URL.revokeObjectURL(url);
    
    isRecording = false;
    updateRecordButtonState();
  };
  
  mediaRecorder.start();
  isRecording = true;
  updateRecordButtonState();
}

function stopRecording() {
  if (mediaRecorder && isRecording) {
    mediaRecorder.stop();
  }
}

function updateRecordButtonState() {
  const recordBtn = document.getElementById('recordVideoBtn');
  if (recordBtn) {
    if (isRecording) {
      recordBtn.textContent = 'Detener Grabación';
      recordBtn.style.background = 'rgba(255, 77, 109, 0.2)';
      recordBtn.style.borderColor = 'rgba(255, 77, 109, 0.5)';
    } else {
      recordBtn.textContent = 'Grabar Video';
      recordBtn.style.background = 'rgba(255, 255, 255, 0.05)';
      recordBtn.style.borderColor = 'rgba(255, 255, 255, 0.2)';
    }
  }
}

function getVertexColorSVG(x, y, centerX, centerY, lineIdx, step, totalSteps) {
  if (config.numColors <= 0) return '#FFFFFF';
  
  const availableColors = config.selectedColors.slice(0, config.numColors);
  if (availableColors.length === 0) return '#FFFFFF';
  
  let colorIndex = 0;
  
  // Animación radial basada en distancia desde el centro
  const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
  colorIndex = Math.floor((dist + animationTime * 100) / 50) % availableColors.length;
  
  const selectedColorIndex = availableColors[colorIndex];
  return colorPalette[selectedColorIndex];
}

function initializeSketch() {
  p5Instance = new p5(sketch);
  setupControlListeners();
  config.isLight = document.body.classList.contains('light');
}

function setupControlListeners() {
  const letterInput = document.getElementById('letterInput');
  if (letterInput) {
    letterInput.addEventListener('input', (e) => {
      const letter = e.target.value.toLowerCase() || 'a';
      config.letter = letter;
      
      if (p5Instance) {
        p5Instance.remove();
      }
      p5Instance = new p5(sketch);
    });
  }

  const stretchIntensitySlider = document.getElementById('stretchIntensitySlider');
  const stretchIntensityValue = document.getElementById('stretchIntensityValue');
  if (stretchIntensitySlider) {
    stretchIntensitySlider.addEventListener('input', (e) => {
      config.stretchIntensity = Number(e.target.value);
      if (stretchIntensityValue) stretchIntensityValue.textContent = config.stretchIntensity.toFixed(1);
    });
  }

  const shrinkIntensitySlider = document.getElementById('shrinkIntensitySlider');
  const shrinkIntensityValue = document.getElementById('shrinkIntensityValue');
  if (shrinkIntensitySlider) {
    shrinkIntensitySlider.addEventListener('input', (e) => {
      config.shrinkIntensity = Number(e.target.value);
      if (shrinkIntensityValue) shrinkIntensityValue.textContent = config.shrinkIntensity.toFixed(1);
    });
  }

  const strokeWeightSlider = document.getElementById('strokeWeightSlider');
  const strokeWeightValue = document.getElementById('strokeWeightValue');
  if (strokeWeightSlider) {
    strokeWeightSlider.addEventListener('input', (e) => {
      config.strokeWeight = Number(e.target.value);
      if (strokeWeightValue) strokeWeightValue.textContent = config.strokeWeight.toFixed(1);
    });
  }

  const colorModeSelect = document.getElementById('colorModeSelect');
  if (colorModeSelect) {
    colorModeSelect.addEventListener('change', (e) => {
      config.colorAnimationMode = 'radial';
    });
  }

  const colorAnimationSpeedSlider = document.getElementById('colorAnimationSpeedSlider');
  const colorAnimationSpeedValue = document.getElementById('colorAnimationSpeedValue');
  if (colorAnimationSpeedSlider) {
    colorAnimationSpeedSlider.addEventListener('input', (e) => {
      config.colorAnimationSpeed = Number(e.target.value);
      if (colorAnimationSpeedValue) colorAnimationSpeedValue.textContent = config.colorAnimationSpeed.toFixed(2);
    });
  }

  const particleIntensitySlider = document.getElementById('particleIntensitySlider');
  const particleIntensityValue = document.getElementById('particleIntensityValue');
  if (particleIntensitySlider) {
    particleIntensitySlider.addEventListener('input', (e) => {
      config.particleIntensity = Number(e.target.value);
      if (particleIntensityValue) particleIntensityValue.textContent = config.particleIntensity.toFixed(1);
      
      // Regenerar partículas cuando cambia el slider
      staticParticles = [];
      particles = [];
      if (config.particleIntensity > 0) {
        generateStaticParticles();
      }
    });
  }

  // Casillas de selección de color
  const colorSelectionContainer = document.getElementById('colorSelectionContainer');
  if (colorSelectionContainer) {
    colorPalette.forEach((color, index) => {
      const label = document.createElement('label');
      label.className = 'color-checkbox-label';
      label.innerHTML = `
        <input type="checkbox" class="color-checkbox" data-index="${index}" ${index === 0 ? 'checked' : ''} />
        <span class="color-swatch" style="background-color: ${color};"></span>
      `;
      
      const checkbox = label.querySelector('input');
      checkbox.addEventListener('change', () => {
        // Actualizar colores seleccionados
        config.selectedColors = [];
        document.querySelectorAll('.color-checkbox:checked').forEach(cb => {
          config.selectedColors.push(parseInt(cb.dataset.index));
        });
        
        // Actualizar numColors
        config.numColors = config.selectedColors.length;
        if (document.getElementById('numColorsValue')) {
          document.getElementById('numColorsValue').textContent = config.numColors;
        }
        if (document.getElementById('numColorsSlider')) {
          document.getElementById('numColorsSlider').value = config.numColors;
        }
      });
      
      colorSelectionContainer.appendChild(label);
    });
  }

  // Casillas de selección de color de partícula
  const particleColorSelectionContainer = document.getElementById('particleColorSelectionContainer');
  if (particleColorSelectionContainer) {
    colorPalette.forEach((color, index) => {
      const label = document.createElement('label');
      label.className = 'color-checkbox-label';
      label.innerHTML = `
        <input type="checkbox" class="particle-color-checkbox" data-index="${index}" ${index === 3 ? 'checked' : ''} />
        <span class="color-swatch" style="background-color: ${color};"></span>
      `;
      
      const checkbox = label.querySelector('input');
      checkbox.addEventListener('change', () => {
        // Actualizar colores de partículas seleccionadas
        config.particleSelectedColors = [];
        document.querySelectorAll('.particle-color-checkbox:checked').forEach(cb => {
          config.particleSelectedColors.push(parseInt(cb.dataset.index));
        });
        
        // Regenerar partículas con nuevos colores si existen
        if (staticParticles.length > 0) {
          staticParticles = [];
          particles = [];
          lastParticleRegenerationTime = Date.now() - 2000; // Permitir regeneración inmediata
        }
      });
      
      particleColorSelectionContainer.appendChild(label);
    });
  }

  // Entrada de color de fondo
  const backgroundColorInput = document.getElementById('backgroundColorInput');
  if (backgroundColorInput) {
    backgroundColorInput.addEventListener('input', (e) => {
      config.backgroundColor = e.target.value;
    });
  }

  const resetBtn = document.getElementById('resetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      config.letter = 'a';
      config.stretchIntensity = 1.0;
      config.shrinkIntensity = 0.0;
      config.strokeWeight = 10;
      config.numColors = 1;
      config.colorAnimationMode = 'radial';
      config.colorAnimationSpeed = 0.07;
      config.selectedColors = [0];
      config.particleIntensity = 0.0;
      config.particleSelectedColors = [3];
      config.backgroundColor = '#0f0f0f';
      particles = []; // Limpiar partículas
      staticParticles = []; // Limpiar partículas estáticas
      
      if (letterInput) letterInput.value = 'a';
      if (stretchIntensitySlider) stretchIntensitySlider.value = 1.0;
      if (stretchIntensityValue) stretchIntensityValue.textContent = '1.0';
      if (shrinkIntensitySlider) shrinkIntensitySlider.value = 0.0;
      if (shrinkIntensityValue) shrinkIntensityValue.textContent = '0.0';
      if (strokeWeightSlider) strokeWeightSlider.value = 10;
      if (strokeWeightValue) strokeWeightValue.textContent = '10.0';
      if (colorModeSelect) colorModeSelect.value = 'radial';
      if (colorAnimationSpeedSlider) colorAnimationSpeedSlider.value = 0.07;
      if (colorAnimationSpeedValue) colorAnimationSpeedValue.textContent = '0.07';
      if (particleIntensitySlider) particleIntensitySlider.value = 0.0;
      if (particleIntensityValue) particleIntensityValue.textContent = '0.0';
      
      // Reiniciar casillas de color
      document.querySelectorAll('.color-checkbox').forEach((cb, idx) => {
        cb.checked = idx === 0;
      });
      
      // Reiniciar casillas de color de partícula
      document.querySelectorAll('.particle-color-checkbox').forEach((cb, idx) => {
        cb.checked = idx === 3;
      });
      
      // Reiniciar color de fondo
      if (backgroundColorInput) {
        backgroundColorInput.value = '#0f0f0f';
        config.backgroundColor = '#0f0f0f';
      }
      
      staticParticles = []; // Limpiar partículas estáticas
      
      if (p5Instance) {
        p5Instance.remove();
      }
      p5Instance = new p5(sketch);
    });
  }

  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      setTimeout(() => {
        config.isLight = document.body.classList.contains('light');
      }, 50);
    });
  }

  // Botones de captura
  const captureCanvasPngBtn = document.getElementById('captureCanvasPngBtn');
  if (captureCanvasPngBtn) {
    captureCanvasPngBtn.addEventListener('click', () => {
      shouldHideCursor = true;
      captureCountdown = 180; // 3 segundos a 60fps
      captureFormat = 'png';
    });
  }

  // Botón de grabación de video
  const recordVideoBtn = document.getElementById('recordVideoBtn');
  if (recordVideoBtn) {
    recordVideoBtn.addEventListener('click', () => {
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSketch);
} else {
  initializeSketch();
}
