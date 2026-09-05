const closeBtn = document.getElementById('close-window-btn');
const autoStartInput = document.getElementById('auto-start-task');
const soundEnabledInput = document.getElementById('sound-enabled');
const soundVolumeInput = document.getElementById('sound-volume');
const volumeValEl = document.getElementById('volume-val');
const nativeNotificationInput = document.getElementById('native-notification');

closeBtn.addEventListener('click', () => {
  window.close();
});

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

document.addEventListener('DOMContentLoaded', async () => {
  const settings = (await window.electronAPI.getSettings()) || {};
  autoStartInput.checked = !!settings.autoStartTask;
  soundEnabledInput.checked = settings.soundEnabled !== false;
  const vol = typeof settings.volume === 'number' ? settings.volume : 80;
  soundVolumeInput.value = vol;
  volumeValEl.textContent = `${vol}%`;
  nativeNotificationInput.checked = settings.nativeNotification !== false;
});
