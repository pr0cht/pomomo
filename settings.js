const closeBtn = document.getElementById('close-window-btn');
const autoStartInput = document.getElementById('auto-start-task');
const soundEnabledInput = document.getElementById('sound-enabled');
const soundVolumeInput = document.getElementById('sound-volume');
const volumeValEl = document.getElementById('volume-val');
const nativeNotificationInput = document.getElementById('native-notification');

// Theme Elements
const themeBgInput = document.getElementById('theme-bg');
const themeCardInput = document.getElementById('theme-card');
const themeAccentInput = document.getElementById('theme-accent');
const themeTaskInput = document.getElementById('theme-task');
const themeBreakInput = document.getElementById('theme-break');

const themeBgVal = document.getElementById('theme-bg-val');
const themeCardVal = document.getElementById('theme-card-val');
const themeAccentVal = document.getElementById('theme-accent-val');
const themeTaskVal = document.getElementById('theme-task-val');
const themeBreakVal = document.getElementById('theme-break-val');

const resetThemeBtn = document.getElementById('reset-theme-btn');
const themePresetBtns = document.querySelectorAll('.theme-preset-chip');

// Curated Theme Presets
const THEME_PRESETS = {
  rose: {
    name: 'Pastel Rose',
    bgMain: '#FCF8F8',
    cardBg: '#FFFFFF',
    accentColor: '#E87A7A',
    taskColor: '#FFF5F5',
    breakColor: '#48A87C',
    textColor: '#382A2A',
  },
  lavender: {
    name: 'Lavender Mist',
    bgMain: '#F8F7FD',
    cardBg: '#FFFFFF',
    accentColor: '#8474E8',
    taskColor: '#F3F0FE',
    breakColor: '#3EAF92',
    textColor: '#2D274A',
  },
  matcha: {
    name: 'Matcha Sage',
    bgMain: '#F5F9F6',
    cardBg: '#FFFFFF',
    accentColor: '#4CA47A',
    taskColor: '#EDF7F1',
    breakColor: '#E28E4A',
    textColor: '#24382C',
  },
  sunset: {
    name: 'Sunset Warm',
    bgMain: '#FFF7F2',
    cardBg: '#FFFFFF',
    accentColor: '#E2764B',
    taskColor: '#FFF1E8',
    breakColor: '#469FA4',
    textColor: '#3E2B22',
  },
  midnight: {
    name: 'Midnight Slate',
    bgMain: '#1A1820',
    cardBg: '#24202C',
    accentColor: '#B085F5',
    taskColor: '#2D273A',
    breakColor: '#4CD9B0',
    textColor: '#F1EEF8',
  },
};

let activeTheme = { ...THEME_PRESETS.rose };

function isColorDark(hex) {
  if (window.isColorDark) return window.isColorDark(hex);
  return false;
}

function applyThemePreview(theme) {
  if (window.applyTheme) {
    window.applyTheme(theme);
  }
}

function updateInputsFromTheme(theme) {
  if (!theme) return;
  themeBgInput.value = theme.bgMain || '#FCF8F8';
  themeBgVal.textContent = (theme.bgMain || '#FCF8F8').toUpperCase();

  themeCardInput.value = theme.cardBg || '#FFFFFF';
  themeCardVal.textContent = (theme.cardBg || '#FFFFFF').toUpperCase();

  themeAccentInput.value = theme.accentColor || '#E87A7A';
  themeAccentVal.textContent = (theme.accentColor || '#E87A7A').toUpperCase();

  themeTaskInput.value = theme.taskColor || '#FFF5F5';
  themeTaskVal.textContent = (theme.taskColor || '#FFF5F5').toUpperCase();

  themeBreakInput.value = theme.breakColor || '#48A87C';
  themeBreakVal.textContent = (theme.breakColor || '#48A87C').toUpperCase();
}

function dispatchThemeUpdate() {
  window.electronAPI.updateSetting('theme', activeTheme);
  applyThemePreview(activeTheme);
}

// Window Close
closeBtn.addEventListener('click', () => {
  window.close();
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    window.close();
  }
});

// General Settings Handlers
autoStartInput.addEventListener('change', () => {
  window.electronAPI.updateSetting('autoStartTask', autoStartInput.checked);
});

soundEnabledInput.addEventListener('change', () => {
  window.electronAPI.updateSetting('soundEnabled', soundEnabledInput.checked);
});

soundVolumeInput.addEventListener('input', () => {
  const val = Number(soundVolumeInput.value);
  volumeValEl.textContent = `${val}%`;
  window.electronAPI.updateSetting('volume', val);
});

nativeNotificationInput.addEventListener('change', () => {
  window.electronAPI.updateSetting('nativeNotification', nativeNotificationInput.checked);
});

// Color Picker Handlers
themeBgInput.addEventListener('input', () => {
  activeTheme.bgMain = themeBgInput.value;
  activeTheme.textColor = isColorDark(themeBgInput.value) ? '#F1EEF8' : '#382A2A';
  themeBgVal.textContent = themeBgInput.value.toUpperCase();
  dispatchThemeUpdate();
});

themeCardInput.addEventListener('input', () => {
  activeTheme.cardBg = themeCardInput.value;
  themeCardVal.textContent = themeCardInput.value.toUpperCase();
  dispatchThemeUpdate();
});

themeAccentInput.addEventListener('input', () => {
  activeTheme.accentColor = themeAccentInput.value;
  themeAccentVal.textContent = themeAccentInput.value.toUpperCase();
  dispatchThemeUpdate();
});

themeTaskInput.addEventListener('input', () => {
  activeTheme.taskColor = themeTaskInput.value;
  themeTaskVal.textContent = themeTaskInput.value.toUpperCase();
  dispatchThemeUpdate();
});

themeBreakInput.addEventListener('input', () => {
  activeTheme.breakColor = themeBreakInput.value;
  themeBreakVal.textContent = themeBreakInput.value.toUpperCase();
  dispatchThemeUpdate();
});

// Preset Buttons
themePresetBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.theme;
    if (THEME_PRESETS[key]) {
      activeTheme = { ...THEME_PRESETS[key] };
      updateInputsFromTheme(activeTheme);
      dispatchThemeUpdate();
    }
  });
});

// Reset Theme
resetThemeBtn.addEventListener('click', () => {
  activeTheme = { ...THEME_PRESETS.rose };
  updateInputsFromTheme(activeTheme);
  dispatchThemeUpdate();
});

// Load Settings on DOM Ready
document.addEventListener('DOMContentLoaded', async () => {
  const settings = (await window.electronAPI.getSettings()) || {};

  autoStartInput.checked = !!settings.autoStartTask;
  soundEnabledInput.checked = settings.soundEnabled !== false;
  const vol = typeof settings.volume === 'number' ? settings.volume : 80;
  soundVolumeInput.value = vol;
  volumeValEl.textContent = `${vol}%`;
  nativeNotificationInput.checked = settings.nativeNotification !== false;

  if (settings.theme) {
    activeTheme = { ...THEME_PRESETS.rose, ...settings.theme };
  }
  updateInputsFromTheme(activeTheme);
  applyThemePreview(activeTheme);
});
