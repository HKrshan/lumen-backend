const THEMES = ['dark','light','green-dark','green-light','pink-dark','pink-light'];
const LABELS = {
  'dark': 'Dark', 'light': 'Light',
  'green-dark': 'Forest Dark', 'green-light': 'Forest Light',
  'pink-dark': 'Rose Dark', 'pink-light': 'Rose Light'
};
const ACCENTS = {
  'dark':'#6366f1','light':'#6366f1',
  'green-dark':'#22c55e','green-light':'#16a34a',
  'pink-dark':'#ec4899','pink-light':'#db2777'
};

export function getTheme() {
  return localStorage.getItem('lumen-theme') || 'dark';
}
export function setTheme(theme) {
  localStorage.setItem('lumen-theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
}
export function initTheme() {
  setTheme(getTheme());
}
export { THEMES, LABELS, ACCENTS };
