import { 
  state, 
  BUDGET_STORAGE_KEY, 
  USD_TO_JPY_RATE, 
  showCustomConfirm,
  encodeShareData
} from './helpers.js';

export function loadBudgetEntries() {
  const entriesStr = localStorage.getItem(BUDGET_STORAGE_KEY);
  return entriesStr ? JSON.parse(entriesStr) : [];
}

export function saveBudgetEntries(entries) {
  localStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(entries));
}

export function renderBudget() {
  const container = document.getElementById('budget-content');
  container.innerHTML = '';

  const entries = loadBudgetEntries();
  
  // Calculate Totals (Dual Currency support with backward compatibility)
  let totalSpentYen = 0;
  entries.forEach(entry => {
    const amount = entry.amount !== undefined ? entry.amount : entry.amountYen;
    const currency = entry.currency || 'JPY';
    if (currency === 'USD') {
      totalSpentYen += amount * USD_TO_JPY_RATE;
    } else {
      totalSpentYen += amount;
    }
  });

  const totalSpentUsd = Math.round(totalSpentYen / USD_TO_JPY_RATE);

  // Render running total display card
  const summaryCard = document.createElement('div');
  summaryCard.className = 'budget-summary-card';
  summaryCard.innerHTML = `
    <div style="font-size: 0.9rem; opacity: 0.9;">Total Actual Spend</div>
    <div class="budget-sum-val">$${totalSpentUsd.toLocaleString()} USD</div>
    <div class="budget-sum-usd">≈ ¥${Math.round(totalSpentYen).toLocaleString()} JPY <span style="font-size: 0.75rem; opacity: 0.8;">(approx. 1$ = ${USD_TO_JPY_RATE}¥)</span></div>
  `;
  container.appendChild(summaryCard);

  // Add Spend Form
  const formCard = document.createElement('div');
  formCard.className = 'form-card';
  
  let daySelectOptions = '';
  if (state.tripData && state.tripData.days) {
    state.tripData.days.forEach((d, idx) => {
      daySelectOptions += `<option value="${idx}" ${idx === state.autoDetectedDay ? 'selected' : ''}>Day ${d.dayNumber} · ${d.title}</option>`;
    });
  }

  formCard.innerHTML = `
    <h3 class="form-title">➕ Add Actual Expense</h3>
    <form id="add-spend-form" onsubmit="handleAddSpend(event)">
      <div class="form-group">
        <label>Trip Day</label>
        <select class="form-control" id="spend-day" required>
          ${daySelectOptions}
        </select>
      </div>
      <div class="form-group">
        <label>Category</label>
        <select class="form-control" id="spend-category" required>
          <option value="Food">🍜 Food</option>
          <option value="Transport">🚅 Transport</option>
          <option value="Shopping">🛍️ Shopping</option>
          <option value="Activities">⚔️ Activities</option>
          <option value="Accommodation">🏨 Hotel</option>
          <option value="Other">🏷️ Other</option>
        </select>
      </div>
      <div style="display: flex; gap: 10px; margin-bottom: 12px;">
        <div style="flex: 1;">
          <label>Currency</label>
          <select class="form-control" id="spend-currency" required>
            <option value="JPY">JPY (¥)</option>
            <option value="USD">USD ($)</option>
          </select>
        </div>
        <div style="flex: 2;">
          <label>Amount</label>
          <input type="number" class="form-control" id="spend-amount" placeholder="e.g. 1500" min="1" required />
        </div>
      </div>
      <div class="form-group">
        <label>Note / Description (Optional)</label>
        <input type="text" class="form-control" id="spend-note" placeholder="e.g. Ichiran Ramen lunch" />
      </div>
      <button type="submit" class="btn btn-primary btn-block">Add Spend Entry</button>
    </form>
  `;
  container.appendChild(formCard);

  // Render Daily Spend Breakdown Rows (Comparing Estimate vs Actual)
  const breakdownTitle = document.createElement('h3');
  breakdownTitle.style.margin = '20px 0 12px 0';
  breakdownTitle.innerText = '📊 Daily Budget Breakdown';
  container.appendChild(breakdownTitle);

  if (state.tripData && state.tripData.days) {
    state.tripData.days.forEach((day, index) => {
      // Sum actual spends for this day
      const dayEntries = entries.filter(e => e.dayIndex === index);
      let dayActualYen = 0;
      dayEntries.forEach(entry => {
        const amount = entry.amount !== undefined ? entry.amount : entry.amountYen;
        const currency = entry.currency || 'JPY';
        if (currency === 'USD') {
          dayActualYen += amount * USD_TO_JPY_RATE;
        } else {
          dayActualYen += amount;
        }
      });

      const dayActualUsd = Math.round(dayActualYen / USD_TO_JPY_RATE);
      const estText = day.dayOverview.budgetEstimate || 'No estimate listed';

      const row = document.createElement('div');
      row.className = 'budget-day-row';

      let itemsHtml = '';
      if (dayEntries.length > 0) {
        dayEntries.forEach(entry => {
          const amount = entry.amount !== undefined ? entry.amount : entry.amountYen;
          const currency = entry.currency || 'JPY';
          
          let displayAmount = '';
          if (currency === 'USD') {
            const jpyConverted = Math.round(amount * USD_TO_JPY_RATE);
            displayAmount = `$${amount.toLocaleString()} (~¥${jpyConverted.toLocaleString()})`;
          } else {
            const usdConverted = Math.round(amount / USD_TO_JPY_RATE);
            displayAmount = `¥${amount.toLocaleString()} (~$${usdConverted.toLocaleString()})`;
          }
          
          itemsHtml += `
            <div class="spend-item">
              <div>
                <strong>[${entry.category}]</strong> ${entry.note || ''}
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 0.85rem; white-space: nowrap;">${displayAmount}</span>
                <button class="spend-delete-btn" onclick="shareSpend('${entry.id}')" title="Share Expense">📤</button>
                <button class="spend-delete-btn" onclick="openBudgetEditModal('${entry.id}')" style="color: var(--primary);">✏️</button>
                <button class="spend-delete-btn" onclick="confirmDeleteSpend('${entry.id}')">❌</button>
              </div>
            </div>
          `;
        });
      } else {
        itemsHtml = `<div style="text-align: center; font-style: italic; font-size: 0.8rem; color: var(--text-muted); padding: 4px 0;">No entries recorded</div>`;
      }

      row.innerHTML = `
        <div class="budget-day-header" onclick="toggleCategoryCollapse('budget-day-${index}')">
          <div>Day ${day.dayNumber} · ${day.title}</div>
          <div style="font-size: 0.9rem; color: var(--primary);">¥${Math.round(dayActualYen).toLocaleString()} (~$${dayActualUsd})</div>
        </div>
        <div class="budget-day-details" id="budget-day-${index}">
          <div style="margin-bottom: 8px; font-size: 0.8rem; border-bottom: 1px solid var(--border-color); padding-bottom: 6px;">
            <strong>Estimate:</strong> ${estText}
          </div>
          <div>${itemsHtml}</div>
        </div>
      `;
      container.appendChild(row);
    });
  }
}

export function handleAddSpend(event) {
  event.preventDefault();
  const dayIndex = parseInt(document.getElementById('spend-day').value);
  const category = document.getElementById('spend-category').value;
  const currency = document.getElementById('spend-currency').value;
  const amount = parseInt(document.getElementById('spend-amount').value);
  const note = document.getElementById('spend-note').value;

  const newEntry = {
    id: 'b-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    dayIndex,
    category,
    currency,
    amount,
    note,
    timestamp: Date.now()
  };

  const entries = loadBudgetEntries();
  entries.push(newEntry);
  saveBudgetEntries(entries);
  
  // Rerender budget layout
  renderBudget();
}

export function confirmDeleteSpend(entryId) {
  showCustomConfirm(
    '🗑️ Delete Expense?',
    'Are you sure you want to delete this expense entry?'
  ).then(confirmResult => {
    if (confirmResult) {
      let entries = loadBudgetEntries();
      entries = entries.filter(e => e.id !== entryId);
      saveBudgetEntries(entries);
      renderBudget();
    }
  });
}

// Open Budget Edit Modal
export function openBudgetEditModal(entryId) {
  const entries = loadBudgetEntries();
  const entry = entries.find(e => e.id === entryId);
  if (!entry) return;

  const modal = document.getElementById('budget-edit-modal');
  document.getElementById('budget-edit-id').value = entryId;
  
  const daySelect = document.getElementById('budget-edit-day');
  daySelect.innerHTML = '';
  state.tripData.days.forEach((d, idx) => {
    daySelect.innerHTML += `<option value="${idx}">Day ${d.dayNumber} · ${d.title}</option>`;
  });
  daySelect.value = entry.dayIndex;
  
  document.getElementById('budget-edit-category').value = entry.category;
  document.getElementById('budget-edit-currency').value = entry.currency || 'JPY';
  document.getElementById('budget-edit-amount').value = entry.amount !== undefined ? entry.amount : entry.amountYen;
  document.getElementById('budget-edit-note').value = entry.note || '';

  modal.classList.add('active');
}

// Handle Budget Edit Save
export function handleSaveBudgetEdit(event) {
  event.preventDefault();
  const entryId = document.getElementById('budget-edit-id').value;
  const dayIndex = parseInt(document.getElementById('budget-edit-day').value);
  const category = document.getElementById('budget-edit-category').value;
  const currency = document.getElementById('budget-edit-currency').value;
  const amount = parseInt(document.getElementById('budget-edit-amount').value);
  const note = document.getElementById('budget-edit-note').value;

  const entries = loadBudgetEntries();
  const index = entries.findIndex(e => e.id === entryId);
  if (index !== -1) {
    entries[index] = {
      ...entries[index],
      dayIndex,
      category,
      currency,
      amount,
      note
    };
    saveBudgetEntries(entries);
    document.getElementById('budget-edit-modal').classList.remove('active');
    renderBudget();
  }
}

export function shareSpend(spendId) {
  const entries = loadBudgetEntries();
  const entry = entries.find(e => e.id === spendId);
  if (!entry) return;

  const payload = {
    dayIndex: entry.dayIndex,
    spend: {
      id: entry.id,
      category: entry.category,
      currency: entry.currency || 'JPY',
      amount: entry.amount !== undefined ? entry.amount : entry.amountYen,
      note: entry.note || ''
    }
  };

  const shareCode = encodeShareData(payload);
  const shareUrl = `${window.location.origin}${window.location.pathname}?action=import-spend&data=${shareCode}`;

  if (navigator.share) {
    navigator.share({
      title: `Japan Trip Expense: ${entry.category}`,
      text: `Import this expense entry for our Japan trip: ${entry.category} - ${entry.note || ''}`,
      url: shareUrl
    }).catch(err => {
      console.warn('[Share] Error sharing via Web Share API:', err);
    });
  } else {
    navigator.clipboard.writeText(shareUrl).then(() => {
      const banner = document.getElementById('status-banner');
      if (banner) {
        banner.style.display = 'flex';
        document.getElementById('banner-message').innerText = '📋 Shareable link copied to clipboard! Send it to your family.';
        setTimeout(() => {
          banner.style.display = 'none';
        }, 4000);
      } else {
        alert('Shareable link copied to clipboard! Send it to your family.');
      }
    }).catch(err => {
      console.error('[Share] Failed to copy link to clipboard:', err);
    });
  }
}

// Bind interactive functions to window object
window.handleAddSpend = handleAddSpend;
window.confirmDeleteSpend = confirmDeleteSpend;
window.openBudgetEditModal = openBudgetEditModal;
window.handleSaveBudgetEdit = handleSaveBudgetEdit;
window.shareSpend = shareSpend;
