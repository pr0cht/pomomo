const queueEl = document.getElementById('queue');
const currentStepEl = document.getElementById('current-step');
const timeDisplayEl = document.getElementById('time-display');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');
const startSessionBtn = document.getElementById('start-session-btn');
const minimizeBtn = document.getElementById('minimize-btn');
const pinBtn = document.getElementById('pin-btn');
const settingsBtn = document.getElementById('settings-btn');
const closeWindowBtn = document.getElementById('close-window-btn');
const toggleQueueBtn = document.getElementById('toggle-queue-btn');

const state = {
  steps: [],
  activeIndex: 0,
  timerId: null,
  isPaused: false,
  remainingSeconds: 0,
};

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createStep(type, label, duration) {
  return {
    id: makeId(),
    type,
    label,
    duration: Math.max(1, Number(duration) || 1),
  };
}

function formatTime(seconds) {
  const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}

function renderQueue() {
  queueEl.innerHTML = '';

  const totalMinutes = state.steps.reduce((sum, step) => sum + step.duration, 0);
  const now = new Date();
  const endTime = new Date(now.getTime() + totalMinutes * 60000);
  const formattedEndTime = totalMinutes > 0
    ? `${endTime.getHours() % 12 || 12}:${String(endTime.getMinutes()).padStart(2, '0')} ${endTime.getHours() >= 12 ? 'PM' : 'AM'}`
    : '--';

  document.getElementById('total-duration').textContent = `Total: ${totalMinutes} min`;
  document.getElementById('end-time').textContent = `Ends at ${formattedEndTime}`;

  if (!state.steps.length) {
    queueEl.innerHTML = '<p class="empty-state">Add your first task or break block to build your flow.</p>';
  } else {
    state.steps.forEach((step, index) => {
      const item = document.createElement('article');
      item.className = `queue-item ${step.type}`;
      item.draggable = true;
      item.dataset.id = step.id;

      item.innerHTML = `
        <img class="drag-handle" src="assets/icons/drag.png" alt="Drag" />
        <div class="queue-badge">${step.type === 'task' ? 'Task' : 'Break'}</div>
        <div>
          <strong>${step.label}</strong>
          <p>${step.duration} min</p>
        </div>
        <span class="queue-order">#${index + 1}</span>
      `;

      item.addEventListener('dragstart', (event) => {
        event.dataTransfer.setData('text/plain', step.id);
        event.dataTransfer.effectAllowed = 'move';
      });

      item.addEventListener('dragover', (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      });

      item.addEventListener('drop', (event) => {
        event.preventDefault();
        const draggedId = event.dataTransfer.getData('text/plain');
        if (draggedId && draggedId !== step.id) {
          reorderSteps(draggedId, step.id);
          renderQueue();
        }
      });

      queueEl.appendChild(item);
    });
  }

  const addBlockItem = document.createElement('article');
  addBlockItem.className = 'queue-item add-block-placeholder';
  addBlockItem.innerHTML = `
    <div class="queue-badge">Add</div>
    <div>
      <strong>Add time block</strong>
      <p>Click to create a new task or break</p>
    </div>
    <span class="queue-order">+</span>
  `;
  addBlockItem.addEventListener('click', () => {
    window.electronAPI.openAddBlockWindow();
  });

  queueEl.appendChild(addBlockItem);
}

function reorderSteps(draggedId, targetId) {
  const draggedIndex = state.steps.findIndex((step) => step.id === draggedId);
  const targetIndex = state.steps.findIndex((step) => step.id === targetId);

  if (draggedIndex < 0 || targetIndex < 0) {
    return;
  }

  const [movedStep] = state.steps.splice(draggedIndex, 1);
  state.steps.splice(targetIndex, 0, movedStep);
}

function startTimer() {
  clearInterval(state.timerId);
  state.timerId = setInterval(() => {
    if (state.isPaused) {
      return;
    }

    state.remainingSeconds -= 1;

    if (state.remainingSeconds <= 0) {
      handleTimerExpired();
      return;
    }

    updateTimerView();
  }, 1000);
}

function startSession() {
  if (!state.steps.length) {
    return;
  }

  clearInterval(state.timerId);
  state.activeIndex = 0;
  state.isPaused = false;
  state.remainingSeconds = state.steps[0].duration * 60;
  updateTimerView();
  startTimer();
}

async function handleTimerExpired() {
  clearInterval(state.timerId);
  state.timerId = null;

  const finishedStep = state.steps[state.activeIndex];
  window.electronAPI.openTimerNotification({
    type: finishedStep.type,
    label: finishedStep.label,
  });

  const settings = await window.electronAPI.getSettings();
  const autoStart = settings && settings.autoStartTask;

  if (autoStart) {
    advanceToNextBlock(false);
  } else {
    state.isPaused = true;
    pauseBtn.textContent = 'Resume';
    updateTimerView();
  }
}

function advanceToNextBlock(startPaused = false) {
  state.activeIndex = (state.activeIndex + 1) % state.steps.length;
  state.remainingSeconds = state.steps[state.activeIndex].duration * 60;
  state.isPaused = startPaused;
  pauseBtn.textContent = state.isPaused ? 'Resume' : 'Pause';
  updateTimerView();

  if (!state.isPaused) {
    startTimer();
  }
}

function advanceSession() {
  clearInterval(state.timerId);
  advanceToNextBlock(false);
}

function togglePause() {
  if (!state.steps.length) {
    return;
  }

  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
    state.isPaused = true;
    pauseBtn.textContent = 'Resume';
    return;
  }

  state.isPaused = false;
  pauseBtn.textContent = 'Pause';
  startTimer();
}

function resetSession() {
  clearInterval(state.timerId);
  state.timerId = null;
  state.isPaused = false;
  pauseBtn.textContent = 'Pause';

  if (state.steps.length) {
    state.activeIndex = 0;
    state.remainingSeconds = state.steps[0].duration * 60;
  } else {
    state.remainingSeconds = 0;
  }

  updateTimerView();
}

window.electronAPI.onBlockAdded((block) => {
  state.steps.push(createStep(block.type, block.label, block.duration));
  renderQueue();
  updateTimerView();
});

minimizeBtn.addEventListener('click', () => {
  window.electronAPI.minimizeWindow();
});

pinBtn.addEventListener('click', () => {
  pinBtn.classList.toggle('active');
  window.electronAPI.pinWindow();
});

settingsBtn.addEventListener('click', () => {
  window.electronAPI.openSettingsWindow();
});

closeWindowBtn.addEventListener('click', () => {
  window.close();
});

toggleQueueBtn.addEventListener('click', () => {
  const queueCard = document.querySelector('.queue-card');
  queueCard.classList.toggle('collapsed');
  toggleQueueBtn.textContent = queueCard.classList.contains('collapsed') ? 'Show queue' : 'Hide queue';
});

function getCurrentBlockSeconds() {
  return state.steps.length ? state.steps[state.activeIndex].duration * 60 : 0;
}

function updateTimerView() {
  if (!state.steps.length) {
    currentStepEl.textContent = 'No session started yet.';
    timeDisplayEl.textContent = '00:00';
    return;
  }

  const currentStep = state.steps[state.activeIndex];
  currentStepEl.textContent = `${currentStep.type === 'task' ? 'Focus' : 'Recharge'} • ${currentStep.label}`;
  timeDisplayEl.textContent = formatTime(state.remainingSeconds || getCurrentBlockSeconds());
}

window.electronAPI.onTimerAction((action) => {
  if (action === 'continue') {
    advanceToNextBlock(false);
  } else if (action === 'pause') {
    advanceToNextBlock(true);
  }
});

startSessionBtn.addEventListener('click', startSession);
pauseBtn.addEventListener('click', togglePause);
resetBtn.addEventListener('click', resetSession);

renderQueue();
updateTimerView();
