const THEME_KEY = 'csc3206-theme';

export function initTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  
  // Default to dark mode if no saved preference
  if (savedTheme === 'light') {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
  } else {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
  }
}

export function toggleTheme() {
  const isDark = document.documentElement.classList.contains('dark');
  if (isDark) {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
    localStorage.setItem(THEME_KEY, 'light');
  } else {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
    localStorage.setItem(THEME_KEY, 'dark');
  }
  
  // Dispatch an event so charts and cytoscape can listen
  window.dispatchEvent(new CustomEvent('theme-changed', { detail: { isDark: !isDark } }));
}
