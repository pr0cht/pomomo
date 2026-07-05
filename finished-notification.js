const finishedLabel = document.getElementById('finished-label');
const finishedMessage = document.getElementById('finished-message');
const continueBtn = document.getElementById('continue-action-btn');
const pauseBtn = document.getElementById('pause-action-btn');

window.electronAPI.onNotificationData((step) => {
  finishedLabel.textContent = `${step.type === 'task' ? 'Task complete' : 'Break complete'}`;
  finishedMessage.textContent = `"${step.label}" has finished. Choose what to do next.`;
});

continueBtn.addEventListener('click', () => {
  window.electronAPI.submitTimerAction('continue');
});

pauseBtn.addEventListener('click', () => {
  window.electronAPI.submitTimerAction('pause');
});
