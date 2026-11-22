// Applique le thème choisi avant le premier rendu (évite un flash). Même clé que ThemeService.
try {
  var theme = localStorage.getItem('theme');
  if (theme === 'light' || theme === 'dark') {
    document.documentElement.setAttribute('data-theme', theme);
  }
} catch (e) {}
