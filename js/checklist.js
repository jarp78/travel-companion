import { 
  state, 
  CHECKLIST_STORAGE_KEY, 
  showCustomConfirm 
} from './helpers.js';

export function loadChecklistState() {
  const stateVal = localStorage.getItem(CHECKLIST_STORAGE_KEY);
  return stateVal ? JSON.parse(stateVal) : {};
}

export function saveChecklistState(checklistState) {
  localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(checklistState));
}

export function renderChecklist() {
  const container = document.getElementById('checklist-content');
  container.innerHTML = '';

  if (!state.tripData || !state.tripData.preTripChecklist) return;

  const checklistState = loadChecklistState();
  let totalItemsCount = 0;
  let checkedItemsCount = 0;

  // Pre-calculate progress
  state.tripData.preTripChecklist.forEach(category => {
    category.items.forEach(item => {
      totalItemsCount++;
      if (checklistState[item.id]) {
        checkedItemsCount++;
      }
    });
  });

  const overallPercent = totalItemsCount > 0 ? Math.round((checkedItemsCount / totalItemsCount) * 100) : 0;

  // Render Overall Progress bar
  const progressDiv = document.createElement('div');
  progressDiv.className = 'progress-overall-container';
  progressDiv.innerHTML = `
    <div class="progress-label-row">
      <span style="font-weight: 700; font-size: 0.95rem;">📋 Checklist Progress</span>
      <span style="font-weight: 700; color: var(--primary);">${checkedItemsCount}/${totalItemsCount} Done (${overallPercent}%)</span>
    </div>
    <div class="progress-bar-bg">
      <div class="progress-bar-fill" style="width: ${overallPercent}%"></div>
    </div>
  `;
  container.appendChild(progressDiv);

  // Render grouped checklist sections
  state.tripData.preTripChecklist.forEach((category, catIndex) => {
    let catTotal = 0;
    let catChecked = 0;
    category.items.forEach(item => {
      catTotal++;
      if (checklistState[item.id]) catChecked++;
    });

    const catDiv = document.createElement('div');
    catDiv.className = 'checklist-category';
    
    let itemsHtml = '';
    category.items.forEach(item => {
      const isChecked = !!checklistState[item.id];
      itemsHtml += `
        <div class="checklist-item ${isChecked ? 'checked' : ''}" onclick="toggleChecklistItem('${item.id}')">
          <div class="checklist-checkbox-container">
            <div class="checklist-checkbox"></div>
          </div>
          <div class="checklist-text">${item.text}</div>
        </div>
      `;
    });

    catDiv.innerHTML = `
      <div class="checklist-category-header" onclick="toggleCategoryCollapse('cat-${catIndex}')">
        <div class="category-title-group">
          <span>📅</span>
          <span class="category-title">${category.category}</span>
        </div>
        <span class="category-progress">${catChecked}/${catTotal} Done</span>
      </div>
      <div class="checklist-items" id="cat-${catIndex}">
        ${itemsHtml}
      </div>
    `;

    container.appendChild(catDiv);
  });

  // Reset Button
  const resetBtnDiv = document.createElement('div');
  resetBtnDiv.style.marginTop = '20px';
  resetBtnDiv.innerHTML = `
    <button class="btn btn-danger btn-block" onclick="confirmResetChecklist()">
      🔄 Reset Checklist State
    </button>
  `;
  container.appendChild(resetBtnDiv);
}

export function toggleChecklistItem(itemId) {
  const checklistState = loadChecklistState();
  checklistState[itemId] = !checklistState[itemId];
  saveChecklistState(checklistState);
  renderChecklist();
}

export function toggleCategoryCollapse(catId) {
  const element = document.getElementById(catId);
  if (element) {
    if (element.style.display === 'none') {
      element.style.display = 'block';
    } else {
      element.style.display = 'none';
    }
  }
}

export function confirmResetChecklist() {
  showCustomConfirm(
    '🔄 Reset Checklist?',
    'Are you sure you want to reset all checklist tasks back to unchecked? This cannot be undone.'
  ).then(confirmResult => {
    if (confirmResult) {
      saveChecklistState({});
      renderChecklist();
    }
  });
}

// Bind to window for inline HTML events
window.toggleChecklistItem = toggleChecklistItem;
window.toggleCategoryCollapse = toggleCategoryCollapse;
window.confirmResetChecklist = confirmResetChecklist;
