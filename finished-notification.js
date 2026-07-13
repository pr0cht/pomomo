const finishedLabel = document.getElementById('finished-label');
const finishedMessage = document.getElementById('finished-message');
const okBtn = document.getElementById('ok-action-btn');

window.electronAPI.onNotificationData((step) => {
  finishedLabel.textContent = `${step.type === 'task' ? 'Task complete' : 'Break complete'}`;
  finishedMessage.textContent = `"${step.label}" has finished.`;
});

okBtn.addEventListener('click', () => {
  window.close();
});
