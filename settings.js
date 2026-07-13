const closeBtn = document.getElementById('close-window-btn');
const autoStartInput = document.getElementById('auto-start-task');

closeBtn.addEventListener('click', () => {
  window.close();
});

autoStartInput.addEventListener('change', () => {
  window.electronAPI.updateSetting('autoStartTask', autoStartInput.checked);
});

document.addEventListener('DOMContentLoaded', async () => {
  const settings = await window.electronAPI.getSettings();
  autoStartInput.checked = !!settings.autoStartTask;
});
