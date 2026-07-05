const taskNameInput = document.getElementById('task-name');
const taskMinutesInput = document.getElementById('task-minutes');
const breakNameInput = document.getElementById('break-name');
const breakMinutesInput = document.getElementById('break-minutes');
const queueEl = document.getElementById('queue');
const currentStepEl = document.getElementById('current-step');
const timeDisplayEl = document.getElementById('time-display');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');
const startSessionBtn = document.getElementById('start-session-btn');
const addTaskBtn = document.getElementById('add-task-btn');
const addBreakBtn = document.getElementById('add-break-btn');

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
  if (!state.steps.length) {
    queueEl.innerHTML = '<p class="empty-state">Add your first task or break block to build your flow.</p>';
    return;
  }

  queueEl.innerHTML = '';

  state.steps.forEach((step, index) => {
    const item = document.createElement('article');
    item.className = `queue-item ${step.type}`;
    item.draggable = true;
    item.dataset.id = step.id;

    item.innerHTML = `
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

function reorderSteps(draggedId, targetId) {
  const draggedIndex = state.steps.findIndex((step) => step.id === draggedId);
  const targetIndex = state.steps.findIndex((step) => step.id === targetId);

  if (draggedIndex < 0 || targetIndex < 0) {
    return;
  }

  const [movedStep] = state.steps.splice(draggedIndex, 1);
  state.steps.splice(targetIndex, 0, movedStep);
}

function updateTimerView() {
  if (!state.steps.length) {
    currentStepEl.textContent = 'No session started yet.';
    timeDisplayEl.textContent = '00:00';
    return;
  }

  const currentStep = state.steps[state.activeIndex];
  currentStepEl.textContent = `${currentStep.type === 'task' ? 'Focus' : 'Recharge'} • ${currentStep.label}`;
  timeDisplayEl.textContent = formatTime(state.remainingSeconds);
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

  state.timerId = setInterval(() => {
    if (state.isPaused) {
      return;
    }

    state.remainingSeconds -= 1;

    if (state.remainingSeconds <= 0) {
      advanceSession();
      return;
    }

    updateTimerView();
  }, 1000);
}

function advanceSession() {
  clearInterval(state.timerId);
  state.activeIndex = (state.activeIndex + 1) % state.steps.length;
  state.remainingSeconds = state.steps[state.activeIndex].duration * 60;
  updateTimerView();

  state.timerId = setInterval(() => {
    if (state.isPaused) {
      return;
    }

    state.remainingSeconds -= 1;

    if (state.remainingSeconds <= 0) {
      advanceSession();
      return;
    }

    updateTimerView();
  }, 1000);
}

function togglePause() {
  if (!state.steps.length) {
    return;
  }

  state.isPaused = !state.isPaused;
  pauseBtn.textContent = state.isPaused ? 'Resume' : 'Pause';
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

addTaskBtn.addEventListener('click', () => {
  const label = taskNameInput.value.trim() || 'New task';
  const duration = taskMinutesInput.value;
  state.steps.push(createStep('task', label, duration));
  renderQueue();
  taskNameInput.value = '';
  taskMinutesInput.value = '25';
});

addBreakBtn.addEventListener('click', () => {
  const label = breakNameInput.value.trim() || 'Break';
  const duration = breakMinutesInput.value;
  state.steps.push(createStep('break', label, duration));
  renderQueue();
  breakNameInput.value = '';
  breakMinutesInput.value = '5';
});

startSessionBtn.addEventListener('click', startSession);
pauseBtn.addEventListener('click', togglePause);
resetBtn.addEventListener('click', resetSession);

renderQueue();
updateTimerView();
