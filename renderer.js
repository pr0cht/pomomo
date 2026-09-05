// DOM Element References
const queueEl = document.getElementById('queue');
const currentStepEl = document.getElementById('current-step');
const timeDisplayEl = document.getElementById('time-display');
const stepBadgeEl = document.getElementById('step-badge');
const progressRingBar = document.getElementById('progress-ring-bar');
const queueCountBadge = document.getElementById('queue-count-badge');
const totalDurationEl = document.getElementById('total-duration');
const endTimeEl = document.getElementById('end-time');

// Buttons
const startSessionBtn = document.getElementById('start-session-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');
const skipBtn = document.getElementById('skip-btn');
const minimizeBtn = document.getElementById('minimize-btn');
const pinBtn = document.getElementById('pin-btn');
const settingsBtn = document.getElementById('settings-btn');
const closeWindowBtn = document.getElementById('close-window-btn');
const toggleQueueBtn = document.getElementById('toggle-queue-btn');
const openAddBlockBtn = document.getElementById('open-add-block-btn');
const clearQueueBtn = document.getElementById('clear-queue-btn');
const presetsToggleBtn = document.getElementById('presets-toggle-btn');
const presetsPanel = document.getElementById('presets-panel');
const savePresetBtn = document.getElementById('save-preset-btn');
const savePresetForm = document.getElementById('save-preset-form');
const presetNameInput = document.getElementById('preset-name-input');
const cancelPresetSaveBtn = document.getElementById('cancel-preset-save-btn');
const confirmPresetSaveBtn = document.getElementById('confirm-preset-save-btn');
const presetsChipsEl = document.getElementById('presets-chips');

// Completion Banner
const sessionCompletedBanner = document.getElementById('session-completed-banner');
const completedStatsText = document.getElementById('completed-stats-text');
const repeatSessionBtn = document.getElementById('repeat-session-btn');
const dismissCompletedBtn = document.getElementById('dismiss-completed-btn');

// Inline Edit Modal
const editBlockModal = document.getElementById('edit-block-modal');
const editBlockName = document.getElementById('edit-block-name');
const editBlockMinutes = document.getElementById('edit-block-minutes');
const saveEditBtn = document.getElementById('save-edit-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const closeEditBtn = document.getElementById('close-edit-btn');

// Constants
const STORAGE_KEY = 'pomomo_state_v1';
const PRESETS_STORAGE_KEY = 'pomomo_custom_presets_v1';
const CIRCUMFERENCE = 465; // 2 * PI * 74 approx
const finishSound = new Audio('assets/audio/finish.mp3');

// Application State
const state = {
  steps: [],
  activeId: null,
  timerId: null,
  isPaused: false,
  remainingSeconds: 0,
  targetEndTime: null,
  finishedIds: new Set(),
  editingBlockId: null,
};

// Play audio with volume and preference check
async function playFinishSound() {
  try {
    const settings = (await window.electronAPI.getSettings()) || {};
    if (settings.soundEnabled === false) {
      return;
    }
    const vol = typeof settings.volume === 'number' ? settings.volume / 100 : 0.8;
    finishSound.volume = Math.max(0, Math.min(1, vol));
    finishSound.currentTime = 0;
    await finishSound.play().catch(() => {});
  } catch (err) {
    console.error('Failed to play finish sound:', err);
  }
}

// Local Storage Persistence
function saveState() {
  try {
    const dataToSave = {
      steps: state.steps,
      activeId: state.activeId,
      finishedIds: Array.from(state.finishedIds),
      remainingSeconds: state.remainingSeconds,
      isPaused: state.isPaused,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  } catch (e) {
    console.error('Failed to save state to localStorage', e);
  }
}

function loadSavedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      state.steps = [];
      state.activeId = null;
      state.remainingSeconds = 0;
      state.finishedIds = new Set();
      state.isPaused = true;
      saveState();
      return;
    }

    const parsed = JSON.parse(raw);
    const isOldSample = Array.isArray(parsed.steps) &&
      parsed.steps.length === 3 &&
      parsed.steps[0]?.label === 'Deep Focus Sprint';

    if (isOldSample) {
      state.steps = [];
      state.activeId = null;
      state.remainingSeconds = 0;
      state.finishedIds = new Set();
      state.isPaused = true;
      saveState();
      return;
    }
    state.steps = Array.isArray(parsed.steps) ? parsed.steps : [];
    state.activeId = parsed.activeId || (state.steps[0] ? state.steps[0].id : null);
    state.finishedIds = new Set(Array.isArray(parsed.finishedIds) ? parsed.finishedIds : []);

    const activeStep = getActiveStep();
    if (activeStep) {
      state.remainingSeconds = parsed.remainingSeconds || (activeStep.duration * 60);
    } else if (state.steps.length > 0) {
      state.activeId = state.steps[0].id;
      state.remainingSeconds = state.steps[0].duration * 60;
    } else {
      state.remainingSeconds = 0;
    }
    state.isPaused = true;
  } catch (e) {
    console.error('Failed to load state from localStorage', e);
    state.steps = [];
  }
}

// Inertial Smooth Scrolling on Queue
let queueScrollVelocity = 0;
let queueScrollAnimationId = null;

function animateQueueScroll() {
  queueScrollVelocity *= 0.84;
  queueEl.scrollTop = Math.max(
    0,
    Math.min(queueEl.scrollHeight - queueEl.clientHeight, queueEl.scrollTop + queueScrollVelocity)
  );

  if (Math.abs(queueScrollVelocity) > 0.5) {
    queueScrollAnimationId = requestAnimationFrame(animateQueueScroll);
  } else {
    queueScrollAnimationId = null;
    queueScrollVelocity = 0;
  }
}

queueEl.addEventListener('wheel', (event) => {
  if (event.ctrlKey || event.shiftKey) {
    return;
  }
  event.preventDefault();
  queueScrollVelocity += event.deltaY * 0.35;
  queueScrollVelocity = Math.max(-120, Math.min(120, queueScrollVelocity));

  if (!queueScrollAnimationId) {
    queueScrollAnimationId = requestAnimationFrame(animateQueueScroll);
  }
}, { passive: false });

// Helper Functions
function getActiveIndex() {
  return state.steps.findIndex((step) => step.id === state.activeId);
}

function getActiveStep() {
  const index = getActiveIndex();
  return index >= 0 ? state.steps[index] : null;
}

function markCurrentFinished() {
  const currentStep = getActiveStep();
  if (currentStep) {
    state.finishedIds.add(currentStep.id);
    saveState();
  }
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createStep(type, label, duration) {
  return {
    id: makeId(),
    type,
    label: label ? label.trim() : (type === 'task' ? 'Task' : 'Break'),
    duration: Math.max(1, Number(duration) || 1),
  };
}

function formatTime(seconds) {
  const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}

// Queue Rendering
function renderQueue() {
  queueEl.innerHTML = '';
  queueCountBadge.textContent = state.steps.length;

  if (savePresetBtn) {
    savePresetBtn.disabled = state.steps.length === 0;
    savePresetBtn.title = state.steps.length > 0
      ? 'Save current session queue as a preset'
      : 'Add blocks to your queue first to save a preset';
  }

  const totalMinutes = state.steps.reduce((sum, step) => sum + step.duration, 0);
  const now = new Date();
  const endTime = new Date(now.getTime() + totalMinutes * 60000);
  const formattedEndTime = totalMinutes > 0
    ? `${endTime.getHours() % 12 || 12}:${String(endTime.getMinutes()).padStart(2, '0')} ${endTime.getHours() >= 12 ? 'PM' : 'AM'}`
    : '--';

  totalDurationEl.textContent = `Total: ${totalMinutes} min`;
  endTimeEl.textContent = `Ends at ${formattedEndTime}`;

  if (!state.steps.length) {
    queueEl.innerHTML = '<p class="empty-state">No blocks yet. Click "+ Add block" below to start building your flow.</p>';
    return;
  }

  state.steps.forEach((step, index) => {
    const isActive = step.id === state.activeId;
    const isFinished = state.finishedIds.has(step.id) && !isActive;
    const itemClasses = ['queue-item', step.type];
    if (isActive) itemClasses.push('current');
    if (isFinished) itemClasses.push('finished');

    const item = document.createElement('article');
    item.className = itemClasses.join(' ');
    item.draggable = true;
    item.dataset.id = step.id;

    item.innerHTML = `
      <img class="drag-handle" src="assets/icons/drag.png" alt="Drag" title="Drag to reorder" />
      <div class="queue-badge">${step.type === 'task' ? 'Task' : 'Break'}</div>
      <div class="queue-item-info">
        <span class="queue-item-name">${step.label}</span>
        <span class="queue-item-meta">${step.duration} min</span>
      </div>
      <div class="queue-item-actions">
        <button class="item-action-btn edit-btn" data-id="${step.id}" title="Edit block">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
          </svg>
        </button>
        <button class="item-action-btn delete-btn" data-id="${step.id}" title="Delete block">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
      <span class="queue-order">#${index + 1}</span>
    `;

    // Drag-and-drop Events
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
        saveState();
      }
    });

    // Delete Event
    const deleteBtn = item.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteBlock(step.id);
    });

    // Edit Event
    const editBtn = item.querySelector('.edit-btn');
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openEditModal(step.id);
    });

    // Click item to jump active
    item.addEventListener('click', () => {
      if (state.activeId !== step.id) {
        selectActiveBlock(step.id);
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

  if (state.finishedIds.has(movedStep.id)) {
    state.finishedIds.delete(movedStep.id);
  }
}

function selectActiveBlock(id) {
  state.activeId = id;
  const activeStep = getActiveStep();
  if (activeStep) {
    state.remainingSeconds = activeStep.duration * 60;
  }
  if (state.timerId) {
    state.targetEndTime = Date.now() + state.remainingSeconds * 1000;
  }
  sessionCompletedBanner.classList.add('hidden');
  updateTimerView();
  renderQueue();
  saveState();
}

function deleteBlock(id) {
  const index = state.steps.findIndex((s) => s.id === id);
  if (index < 0) return;

  const wasActive = state.activeId === id;
  state.steps.splice(index, 1);
  state.finishedIds.delete(id);

  if (wasActive) {
    if (state.steps.length > 0) {
      const nextIndex = Math.min(index, state.steps.length - 1);
      state.activeId = state.steps[nextIndex].id;
      state.remainingSeconds = state.steps[nextIndex].duration * 60;
    } else {
      state.activeId = null;
      state.remainingSeconds = 0;
      clearInterval(state.timerId);
      state.timerId = null;
      state.isPaused = false;
    }
  }

  updateTimerView();
  renderQueue();
  saveState();
}

// Inline Edit Block Modal Handlers
function openEditModal(id) {
  const step = state.steps.find((s) => s.id === id);
  if (!step) return;

  state.editingBlockId = id;
  editBlockName.value = step.label;
  editBlockMinutes.value = step.duration;
  editBlockModal.classList.remove('hidden');
  editBlockName.focus();
}

function closeEditModal() {
  state.editingBlockId = null;
  editBlockModal.classList.add('hidden');
}

saveEditBtn.addEventListener('click', () => {
  if (!state.editingBlockId) return;
  const step = state.steps.find((s) => s.id === state.editingBlockId);
  if (step) {
    step.label = editBlockName.value.trim() || (step.type === 'task' ? 'Task' : 'Break');
    const newDuration = Math.max(1, Math.min(360, Number(editBlockMinutes.value) || step.duration));
    
    // If we're updating active block and it wasn't running, reset remainingSeconds
    if (state.activeId === step.id && !state.timerId) {
      step.duration = newDuration;
      state.remainingSeconds = newDuration * 60;
    } else {
      step.duration = newDuration;
    }
    
    updateTimerView();
    renderQueue();
    saveState();
  }
  closeEditModal();
});

cancelEditBtn.addEventListener('click', closeEditModal);
closeEditBtn.addEventListener('click', closeEditModal);

// Timer & Countdown Management (Drift-Free Timestamps)
function startTimer() {
  clearInterval(state.timerId);
  state.isPaused = false;
  state.targetEndTime = Date.now() + state.remainingSeconds * 1000;
  pauseBtn.textContent = 'Pause';

  state.timerId = setInterval(() => {
    if (state.isPaused) {
      return;
    }

    const now = Date.now();
    const secondsLeft = Math.max(0, Math.ceil((state.targetEndTime - now) / 1000));
    state.remainingSeconds = secondsLeft;

    if (state.remainingSeconds <= 0) {
      handleTimerExpired();
      return;
    }

    updateTimerView();
  }, 250);
}

function startSession() {
  if (!state.steps.length) {
    return;
  }

  sessionCompletedBanner.classList.add('hidden');
  clearInterval(state.timerId);
  state.finishedIds.clear();
  state.activeId = state.steps[0].id;
  state.isPaused = false;
  state.remainingSeconds = state.steps[0].duration * 60;
  updateTimerView();
  renderQueue();
  startTimer();
  saveState();
}

async function handleTimerExpired() {
  clearInterval(state.timerId);
  state.timerId = null;

  markCurrentFinished();
  const finishedStep = getActiveStep();
  const currentIndex = getActiveIndex();
  const isLastBlock = currentIndex >= state.steps.length - 1;

  if (finishedStep) {
    playFinishSound();

    // Notify user via main process modal or native notification
    const settings = (await window.electronAPI.getSettings()) || {};
    if (settings.nativeNotification !== false) {
      window.electronAPI.showNativeNotification({
        title: finishedStep.type === 'task' ? 'Task Complete!' : 'Break Complete!',
        body: `"${finishedStep.label}" has finished.`,
      });
    }

    window.electronAPI.openTimerNotification({
      type: finishedStep.type,
      label: finishedStep.label,
    });
  }

  // Check if session is fully complete
  if (isLastBlock) {
    handleSessionCompleted();
    return;
  }

  const settings = (await window.electronAPI.getSettings()) || {};
  const autoStart = settings && settings.autoStartTask;

  if (autoStart) {
    advanceToNextBlock(false);
  } else {
    advanceToNextBlock(true);
  }
}

function handleSessionCompleted() {
  state.timerId = null;
  state.isPaused = true;
  pauseBtn.textContent = 'Resume';
  
  // Calculate total focus time achieved
  const focusMinutes = state.steps
    .filter((s) => s.type === 'task')
    .reduce((sum, s) => sum + s.duration, 0);

  completedStatsText.textContent = `All ${state.steps.length} blocks finished (${focusMinutes}m focused). Outstanding work!`;
  sessionCompletedBanner.classList.remove('hidden');

  updateTimerView();
  renderQueue();
  saveState();
}

function advanceToNextBlock(startPaused = false) {
  if (!state.steps.length) {
    return;
  }

  const currentIndex = getActiveIndex();
  const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % state.steps.length;
  state.activeId = state.steps[nextIndex].id;
  state.remainingSeconds = state.steps[nextIndex].duration * 60;
  state.isPaused = startPaused;
  pauseBtn.textContent = state.isPaused ? 'Resume' : 'Pause';

  updateTimerView();
  renderQueue();
  saveState();

  if (!state.isPaused) {
    startTimer();
  }
}

function togglePause() {
  if (!state.steps.length) {
    return;
  }

  if (state.timerId) {
    // Currently running -> pause
    clearInterval(state.timerId);
    state.timerId = null;
    state.isPaused = true;
    pauseBtn.textContent = 'Resume';
    saveState();
  } else {
    // Currently paused -> resume
    if (state.remainingSeconds <= 0) {
      const activeStep = getActiveStep();
      if (activeStep) {
        state.remainingSeconds = activeStep.duration * 60;
      }
    }
    startTimer();
    saveState();
  }
}

function resetSession() {
  clearInterval(state.timerId);
  state.timerId = null;
  state.isPaused = true;
  pauseBtn.textContent = 'Pause';
  sessionCompletedBanner.classList.add('hidden');

  const activeStep = getActiveStep();
  if (activeStep) {
    state.remainingSeconds = activeStep.duration * 60;
  } else if (state.steps.length) {
    state.activeId = state.steps[0].id;
    state.remainingSeconds = state.steps[0].duration * 60;
  } else {
    state.activeId = null;
    state.remainingSeconds = 0;
  }

  updateTimerView();
  renderQueue();
  saveState();
}

function updateTimerView() {
  const activeStep = getActiveStep();

  if (!state.steps.length || !activeStep) {
    currentStepEl.textContent = 'No session active';
    timeDisplayEl.textContent = '00:00';
    stepBadgeEl.textContent = 'Ready';
    stepBadgeEl.className = 'step-badge';
    progressRingBar.style.strokeDashoffset = '0';
    progressRingBar.className.baseVal = 'progress-ring-bar';
    return;
  }

  currentStepEl.textContent = activeStep.label;
  timeDisplayEl.textContent = formatTime(state.remainingSeconds);

  const isBreak = activeStep.type === 'break';
  stepBadgeEl.textContent = isBreak ? 'Break' : 'Focus';
  stepBadgeEl.className = `step-badge ${isBreak ? 'break-mode' : ''}`;
  progressRingBar.className.baseVal = `progress-ring-bar ${isBreak ? 'break-mode' : ''}`;

  // Update SVG circular ring offset
  const totalSeconds = activeStep.duration * 60;
  if (totalSeconds > 0) {
    const fraction = state.remainingSeconds / totalSeconds;
    const offset = CIRCUMFERENCE * (1 - fraction);
    progressRingBar.style.strokeDashoffset = String(Math.max(0, Math.min(CIRCUMFERENCE, offset)));
  } else {
    progressRingBar.style.strokeDashoffset = '0';
  }
}

// Custom User Presets
function getCustomPresets() {
  try {
    const raw = localStorage.getItem(PRESETS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveCustomPresets(presets) {
  try {
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
  } catch (e) {
    console.error('Failed to save custom presets', e);
  }
}

function renderPresets() {
  presetsChipsEl.innerHTML = '';
  const presets = getCustomPresets();
  const hasBlocks = state.steps.length > 0;

  savePresetBtn.disabled = !hasBlocks;
  savePresetBtn.title = hasBlocks
    ? 'Save current session queue as a preset'
    : 'Add blocks to your queue first to save a preset';

  if (!presets.length) {
    presetsChipsEl.innerHTML = '<span class="presets-empty-hint">No saved presets yet. Add blocks to your queue and click "Save Current Session as Preset"!</span>';
    return;
  }

  presets.forEach((preset) => {
    const chip = document.createElement('div');
    chip.className = 'preset-chip';
    chip.title = `Click to load (${preset.steps.length} blocks)`;
    chip.innerHTML = `
      <span class="preset-chip-name">${preset.name}</span>
      <span class="preset-chip-count">(${preset.steps.length})</span>
      <button class="preset-chip-del" title="Delete preset">&times;</button>
    `;

    chip.addEventListener('click', (e) => {
      if (e.target.classList.contains('preset-chip-del')) {
        e.stopPropagation();
        deletePreset(preset.id);
        return;
      }
      applyCustomPreset(preset);
    });

    presetsChipsEl.appendChild(chip);
  });
}

function applyCustomPreset(preset) {
  if (!preset || !preset.steps || !preset.steps.length) return;

  state.steps = preset.steps.map((s) => createStep(s.type, s.label, s.duration));
  state.finishedIds.clear();
  state.activeId = state.steps[0].id;
  state.remainingSeconds = state.steps[0].duration * 60;
  clearInterval(state.timerId);
  state.timerId = null;
  state.isPaused = true;
  pauseBtn.textContent = 'Pause';
  sessionCompletedBanner.classList.add('hidden');
  presetsPanel.classList.add('hidden');

  updateTimerView();
  renderQueue();
  saveState();
}

function deletePreset(presetId) {
  const presets = getCustomPresets().filter((p) => p.id !== presetId);
  saveCustomPresets(presets);
  renderPresets();
}

// Event Listeners for UI Actions
startSessionBtn.addEventListener('click', startSession);
pauseBtn.addEventListener('click', togglePause);
resetBtn.addEventListener('click', resetSession);

skipBtn.addEventListener('click', () => {
  if (!state.steps.length || !state.activeId) {
    return;
  }
  markCurrentFinished();
  advanceToNextBlock(false);
});

clearQueueBtn.addEventListener('click', () => {
  if (state.steps.length && confirm('Are you sure you want to clear the entire queue?')) {
    clearInterval(state.timerId);
    state.timerId = null;
    state.steps = [];
    state.finishedIds.clear();
    state.activeId = null;
    state.remainingSeconds = 0;
    sessionCompletedBanner.classList.add('hidden');
    updateTimerView();
    renderQueue();
    saveState();
  }
});

// Presets Panel Interactions
presetsToggleBtn.addEventListener('click', () => {
  presetsPanel.classList.toggle('hidden');
  savePresetForm.classList.add('hidden');
  renderPresets();
});

savePresetBtn.addEventListener('click', () => {
  if (!state.steps.length) return;
  savePresetForm.classList.remove('hidden');
  presetNameInput.value = `Session (${state.steps.length} blocks)`;
  presetNameInput.focus();
  presetNameInput.select();
});

cancelPresetSaveBtn.addEventListener('click', () => {
  savePresetForm.classList.add('hidden');
});

function handleConfirmSavePreset() {
  if (!state.steps.length) return;
  const name = presetNameInput.value.trim() || `Session (${state.steps.length} blocks)`;
  const newPreset = {
    id: makeId(),
    name,
    steps: state.steps.map((s) => ({
      type: s.type,
      label: s.label,
      duration: s.duration,
    })),
  };

  const presets = getCustomPresets();
  presets.push(newPreset);
  saveCustomPresets(presets);
  savePresetForm.classList.add('hidden');
  renderPresets();
}

confirmPresetSaveBtn.addEventListener('click', handleConfirmSavePreset);

presetNameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    handleConfirmSavePreset();
  } else if (e.key === 'Escape') {
    savePresetForm.classList.add('hidden');
  }
});

toggleQueueBtn.addEventListener('click', () => {
  const queueCard = document.querySelector('.queue-card');
  queueCard.classList.toggle('collapsed');
  toggleQueueBtn.textContent = queueCard.classList.contains('collapsed') ? 'Show' : 'Hide';
});

repeatSessionBtn.addEventListener('click', () => {
  startSession();
});

dismissCompletedBtn.addEventListener('click', () => {
  sessionCompletedBanner.classList.add('hidden');
});

openAddBlockBtn.addEventListener('click', () => {
  window.electronAPI.openAddBlockWindow();
});

// Window Titlebar Controls
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

// IPC Event Listeners from Main Process
window.electronAPI.onBlockAdded((block) => {
  const newStep = createStep(block.type, block.label, block.duration);
  state.steps.push(newStep);
  if (!state.activeId) {
    state.activeId = newStep.id;
    state.remainingSeconds = newStep.duration * 60;
  }
  renderQueue();
  updateTimerView();
  saveState();
});

window.electronAPI.onTimerAction((action) => {
  if (action === 'continue') {
    advanceToNextBlock(false);
  } else if (action === 'pause') {
    advanceToNextBlock(true);
  }
});

// Global Keyboard Shortcuts
window.addEventListener('keydown', (e) => {
  // Ignore keystrokes when editing text inputs
  if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
    if (e.key === 'Escape') {
      closeEditModal();
    }
    return;
  }

  if (e.code === 'Space') {
    e.preventDefault();
    togglePause();
  } else if (e.code === 'KeyS') {
    e.preventDefault();
    if (state.steps.length && state.activeId) {
      markCurrentFinished();
      advanceToNextBlock(false);
    }
  } else if (e.code === 'KeyR') {
    e.preventDefault();
    resetSession();
  } else if (e.key === 'Escape') {
    closeEditModal();
    if (savePresetForm) savePresetForm.classList.add('hidden');
    if (presetsPanel) presetsPanel.classList.add('hidden');
  }
});

// Initialize on Load
loadSavedState();
renderQueue();
updateTimerView();
