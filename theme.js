// Appliqué avant le rendu pour éviter un éclair blanc en salle de lecture.
try {
  const preference = localStorage.getItem('radiorads.theme');
  document.documentElement.dataset.theme = preference === 'dark' || (!preference && matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
} catch (_) { document.documentElement.dataset.theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }
