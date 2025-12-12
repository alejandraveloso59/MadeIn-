/* ==================================================
   Script compartido de tema
   Utilizado por index.html e interactive-page.html
   ================================================== */

function setupThemeToggle() {
  const body = document.body;
  const themeToggle = document.getElementById('themeToggle');

  if (!themeToggle) {
    console.warn('⚠ Botón de conmutación de tema no encontrado');
    return;
  }

  // Inicializar tema según preferencia guardada o preferencia del sistema
  function initializeTheme() {
    const savedTheme = localStorage.getItem('theme-mode');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeLight = savedTheme ? savedTheme === 'light' : !prefersDark;

    if (shouldBeLight) {
      applyTheme(true);
    } else {
      applyTheme(false);
    }
  }

  // Aplicar tema
  function applyTheme(isLight) {
    if (isLight) {
      body.classList.add('light');
      body.style.setProperty('--thumb-color', '#000');
      themeToggle.textContent = '☀';
      localStorage.setItem('theme-mode', 'light');
    } else {
      body.classList.remove('light');
      body.style.setProperty('--thumb-color', '#fff');
      themeToggle.textContent = '☾';
      localStorage.setItem('theme-mode', 'dark');
    }
  }

  // Conmutar tema al hacer clic en el botón
  themeToggle.addEventListener('click', () => {
    const isCurrentlyLight = body.classList.contains('light');
    applyTheme(!isCurrentlyLight);
  });

  // Inicializar en la primera carga
  initializeTheme();
}

// Llamar configuración cuando el DOM está listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupThemeToggle);
} else {
  setupThemeToggle();
}
