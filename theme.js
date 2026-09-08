(function () {
  const THEME_CACHE_KEY = 'pomomo_theme_cache_v1';

  function isColorDark(hex) {
    if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return false;
    const c = hex.replace('#', '');
    const r = parseInt(c.substring(0, 2), 16) || 0;
    const g = parseInt(c.substring(2, 4), 16) || 0;
    const b = parseInt(c.substring(4, 6), 16) || 0;
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 135;
  }

  function applyTheme(theme) {
    if (!theme) return;
    const root = document.documentElement;

    if (theme.bgMain) root.style.setProperty('--bg-main', theme.bgMain);
    if (theme.cardBg) root.style.setProperty('--card-bg', theme.cardBg);
    if (theme.accentColor) {
      root.style.setProperty('--primary-accent', theme.accentColor);
      root.style.setProperty('--border-focus', theme.accentColor);
    }
    if (theme.taskColor) root.style.setProperty('--task-bg', theme.taskColor);
    if (theme.breakColor) {
      root.style.setProperty('--break-accent', theme.breakColor);
      root.style.setProperty('--break-border', theme.breakColor + '40');
    }
    if (theme.textColor) {
      root.style.setProperty('--text-primary', theme.textColor);
    }

    const isDark = isColorDark(theme.bgMain);
    if (isDark) {
      root.classList.add('dark-theme');
      root.style.setProperty('--border-color', 'rgba(255, 255, 255, 0.12)');
      root.style.setProperty('--secondary-bg', 'rgba(255, 255, 255, 0.08)');
      root.style.setProperty('--secondary-hover', 'rgba(255, 255, 255, 0.14)');
      root.style.setProperty('--text-secondary', '#A49AB8');
      root.style.setProperty('--text-primary', theme.textColor || '#F1EEF8');
    } else {
      root.classList.remove('dark-theme');
      root.style.setProperty('--border-color', '#F6DFDF');
      root.style.setProperty('--secondary-bg', '#FBEFEF');
      root.style.setProperty('--secondary-hover', '#F7DFDF');
      root.style.setProperty('--text-secondary', '#7A6666');
      root.style.setProperty('--text-primary', theme.textColor || '#382A2A');
    }

    try {
      localStorage.setItem(THEME_CACHE_KEY, JSON.stringify(theme));
    } catch (e) {}
  }

  window.applyTheme = applyTheme;
  window.isColorDark = isColorDark;

  // Auto-initialize theme across all windows
  try {
    const cached = localStorage.getItem(THEME_CACHE_KEY);
    if (cached) {
      applyTheme(JSON.parse(cached));
    }
  } catch (e) {}

  if (window.electronAPI && window.electronAPI.getSettings) {
    window.electronAPI.getSettings().then((settings) => {
      if (settings && settings.theme) {
        applyTheme(settings.theme);
      }
    });
  }

  if (window.electronAPI && window.electronAPI.onSettingUpdated) {
    window.electronAPI.onSettingUpdated((key, value) => {
      if (key === 'theme') {
        applyTheme(value);
      }
    });
  }
})();
