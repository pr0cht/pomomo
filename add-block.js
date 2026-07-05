const blockTypeInputs = document.querySelectorAll('input[name="block-type"]');
const blockNameEl = document.getElementById('block-name');
const blockMinutesEl = document.getElementById('block-minutes');
const cancelBtn = document.getElementById('cancel-btn');
const saveBtn = document.getElementById('save-block-btn');
const closeBtn = document.getElementById('close-window-btn');

function getSelectedBlockType() {
  const selected = document.querySelector('input[name="block-type"]:checked');
  return selected ? selected.value : 'task';
}

saveBtn.addEventListener('click', () => {
  const type = getSelectedBlockType();
  const block = {
    type,
    label: blockNameEl.value.trim() || (type === 'task' ? 'New task' : 'Break'),
    duration: blockMinutesEl.value,
  };

  window.electronAPI.submitAddBlock(block);
});

cancelBtn.addEventListener('click', () => {
  window.close();
});

closeBtn.addEventListener('click', () => {
  window.close();
});
