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

let budgetSearchQuery = '';

export function renderBudget() {
  const container = document.getElementById('budget-content');
  container.innerHTML = '';

  const entries = loadBudgetEntries();
  
  // Calculate Totals (Dual Currency support summing using each transaction's specific exchange rate)
  let totalSpentYen = 0;
  let totalSpentUsd = 0;
  entries.forEach(entry => {
    const amount = entry.amount !== undefined ? entry.amount : entry.amountYen;
    const currency = entry.currency || 'JPY';
    const rate = entry.exchangeRate || USD_TO_JPY_RATE;
    if (currency === 'USD') {
      totalSpentYen += amount * rate;
      totalSpentUsd += amount;
    } else {
      totalSpentYen += amount;
      totalSpentUsd += amount / rate;
    }
  });

  // Render running total display card with converter trigger
  const summaryCard = document.createElement('div');
  summaryCard.className = 'budget-summary-card';
  summaryCard.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
      <div>
        <div style="font-size: 0.9rem; opacity: 0.9;">Total Actual Spend</div>
        <div class="budget-sum-val">$${totalSpentUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</div>
      </div>
      <button class="converter-summary-btn" onclick="window.openConverterModal()" title="Open Currency Converter">
        💱 Converter
      </button>
    </div>
    <div class="budget-sum-usd" style="margin-top: 10px;">≈ ¥${Math.round(totalSpentYen).toLocaleString()} JPY <span style="font-size: 0.75rem; opacity: 0.8;">(total approximates JPY & USD)</span></div>
  `;
  container.appendChild(summaryCard);

  // Add Spend Form (Collapsible and collapsed by default)
  const formCard = document.createElement('div');
  formCard.className = 'form-card';
  
  let daySelectOptions = '';
  if (state.tripData && state.tripData.days) {
    state.tripData.days.forEach((d, idx) => {
      daySelectOptions += `<option value="${idx}" ${idx === state.autoDetectedDay ? 'selected' : ''}>Day ${d.dayNumber} · ${d.title}</option>`;
    });
  }

  formCard.innerHTML = `
    <h3 class="form-title" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer; margin-bottom: 0;" onclick="window.toggleAddSpendForm()">
      <span>➕ Add Actual Expense</span>
      <span id="add-spend-toggle-icon" style="font-size: 0.9rem; color: var(--text-muted);">▼</span>
    </h3>
    <form id="add-spend-form" onsubmit="handleAddSpend(event)" style="display: none; padding-top: 12px; margin-top: 12px; border-top: 1px dashed var(--border-color);">
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
          <select class="form-control" id="spend-currency" required onchange="window.updateSpendAmountValidation()">
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
        <label>Exchange Rate Used (1 USD = JPY)</label>
        <input type="number" class="form-control" id="spend-exchange-rate" step="0.01" value="${USD_TO_JPY_RATE.toFixed(2)}" required />
      </div>
      <div class="form-group">
        <label>Note / Description (Optional)</label>
        <input type="text" class="form-control" id="spend-note" placeholder="e.g. Ichiran Ramen lunch" />
      </div>
      <button type="submit" class="btn btn-primary btn-block">Add Spend Entry</button>
    </form>
  `;
  container.appendChild(formCard);
  updateSpendAmountValidation(); // Initialize dynamic validation on load

  // Daily Spend Breakdown Section Header and Search Input
  const breakdownHeader = document.createElement('div');
  breakdownHeader.style.margin = '20px 0 12px 0';
  breakdownHeader.innerHTML = `
    <h3 style="margin-bottom: 10px;">📊 Daily Budget Breakdown</h3>
    <div style="position: relative; width: 100%; margin-bottom: 10px;">
      <input type="text" id="budget-search-input" class="form-control" placeholder="🔍 Filter budget logs..." style="padding-left: 36px; padding-right: 36px; border-radius: 20px; font-weight: 500;" oninput="window.handleBudgetSearch(event)" />
      <button id="clear-budget-search" onclick="window.clearBudgetSearch()" style="display: none; position: absolute; right: 12px; top: 50%; transform: translateY(-50%); border: none; background: none; font-size: 1.25rem; cursor: pointer; color: var(--text-muted); line-height: 1;">&times;</button>
    </div>
    <div class="budget-controls" style="display: flex; justify-content: flex-end; gap: 8px; margin-bottom: 12px;">
      <button class="btn btn-icon-only" onclick="window.toggleAllBudgetDays(true)" style="font-size: 0.8rem; font-weight: 600; display: flex; align-items: center; gap: 4px;">
        📖 Expand All
      </button>
      <button class="btn btn-icon-only" onclick="window.toggleAllBudgetDays(false)" style="font-size: 0.8rem; font-weight: 600; display: flex; align-items: center; gap: 4px;">
        📕 Collapse All
      </button>
    </div>
  `;
  container.appendChild(breakdownHeader);

  // Budget Logs Breakdown list container
  const breakdownList = document.createElement('div');
  breakdownList.id = 'budget-breakdown-list';
  container.appendChild(breakdownList);

  // Initialize display
  budgetSearchQuery = '';
  renderBudgetBreakdownList();
}

// Render dynamic breakdown entries lists with search filtering
export function renderBudgetBreakdownList() {
  const container = document.getElementById('budget-breakdown-list');
  if (!container) return;
  container.innerHTML = '';

  const entries = loadBudgetEntries();

  if (state.tripData && state.tripData.days) {
    let renderedCount = 0;
    state.tripData.days.forEach((day, index) => {
      let dayEntries = entries.filter(e => e.dayIndex === index);

      // Filter entries if search query is active
      if (budgetSearchQuery) {
        dayEntries = dayEntries.filter(entry => {
          const catMatch = entry.category && entry.category.toLowerCase().includes(budgetSearchQuery);
          const noteMatch = entry.note && entry.note.toLowerCase().includes(budgetSearchQuery);
          const amtMatch = entry.amount !== undefined && entry.amount.toString().includes(budgetSearchQuery);
          return catMatch || noteMatch || amtMatch;
        });
        if (dayEntries.length === 0) return;
      }

      renderedCount++;

      // Day total spend sum using item-specific rate
      const dayEntriesAll = entries.filter(e => e.dayIndex === index);
      let dayActualYen = 0;
      let dayActualUsd = 0;
      dayEntriesAll.forEach(entry => {
        const amount = entry.amount !== undefined ? entry.amount : entry.amountYen;
        const currency = entry.currency || 'JPY';
        const rate = entry.exchangeRate || USD_TO_JPY_RATE;
        if (currency === 'USD') {
          dayActualYen += amount * rate;
          dayActualUsd += amount;
        } else {
          dayActualYen += amount;
          dayActualUsd += amount / rate;
        }
      });

      const estText = day.dayOverview.budgetEstimate || 'No estimate listed';

      const row = document.createElement('div');
      row.className = 'budget-day-row';

      let itemsHtml = '';
      if (dayEntries.length > 0) {
        dayEntries.forEach(entry => {
          const amount = entry.amount !== undefined ? entry.amount : entry.amountYen;
          const currency = entry.currency || 'JPY';
          const rate = entry.exchangeRate || USD_TO_JPY_RATE;
          
          let displayAmount = '';
          let conversionText = '';
          if (currency === 'USD') {
            const jpyConverted = Math.round(amount * rate);
            displayAmount = `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            conversionText = `~¥${jpyConverted.toLocaleString()} (at 1 USD = ${rate.toFixed(2)} JPY)`;
          } else {
            const usdConverted = Math.round(amount / rate);
            displayAmount = `¥${amount.toLocaleString()}`;
            conversionText = `~$${usdConverted.toLocaleString()} (at 1 USD = ${rate.toFixed(2)} JPY)`;
          }
          
          itemsHtml += `
            <div class="spend-item">
              <div class="spend-item-main">
                <div class="spend-item-desc">
                  <span class="spend-category-badge">${entry.category}</span>
                  <span>${entry.note || ''}</span>
                </div>
                <div class="spend-amount">${displayAmount}</div>
              </div>
              <div class="spend-item-meta">
                <div class="spend-conversion">${conversionText}</div>
                <div class="spend-actions">
                  <button class="spend-delete-btn" onclick="shareSpend('${entry.id}')" title="Share Expense">📤</button>
                  <button class="spend-delete-btn" onclick="openBudgetEditModal('${entry.id}')" style="color: var(--primary);" title="Edit Expense">✏️</button>
                  <button class="spend-delete-btn" onclick="confirmDeleteSpend('${entry.id}')" title="Delete Expense">❌</button>
                </div>
              </div>
            </div>
          `;
        });
      } else {
        itemsHtml = `<div style="text-align: center; font-style: italic; font-size: 0.8rem; color: var(--text-muted); padding: 4px 0;">No entries recorded</div>`;
      }

      const isCurrentDay = index === state.autoDetectedDay;
      const displayStyle = isCurrentDay ? 'block' : 'none';

      row.innerHTML = `
        <div class="budget-day-header" onclick="window.toggleBudgetDayCollapse(${index})">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="day-toggle-arrow" style="font-size: 0.8rem; color: var(--text-muted); transition: transform 0.2s;">${isCurrentDay ? '▲' : '▼'}</span>
            <span>Day ${day.dayNumber} · ${day.title}</span>
          </div>
          <div style="font-size: 0.9rem; color: var(--primary);">¥${Math.round(dayActualYen).toLocaleString()} (~$${Math.round(dayActualUsd)})</div>
        </div>
        <div class="budget-day-details" id="budget-day-${index}" style="display: ${displayStyle};">
          <div style="margin-bottom: 8px; font-size: 0.8rem; border-bottom: 1px solid var(--border-color); padding-bottom: 6px;">
            <strong>Estimate:</strong> ${estText}
          </div>
          <div>${itemsHtml}</div>
        </div>
      `;
      container.appendChild(row);
    });

    if (budgetSearchQuery && renderedCount === 0) {
      container.innerHTML = `
        <div style="padding: 25px; text-align: center; color: var(--text-muted);">
          <p style="font-size: 1.1rem; margin-bottom: 4px;">🔍 No matching expenses found</p>
          <p style="font-size: 0.8rem;">Try checking spelling or categories like "Food" or "Shopping".</p>
        </div>
      `;
    }
  }
}

export function handleAddSpend(event) {
  event.preventDefault();
  const dayIndex = parseInt(document.getElementById('spend-day').value);
  const category = document.getElementById('spend-category').value;
  const currency = document.getElementById('spend-currency').value;
  const amountVal = document.getElementById('spend-amount').value;
  const amount = currency === 'JPY' ? parseInt(amountVal) : parseFloat(amountVal);
  const note = document.getElementById('spend-note').value;
  
  const rateInput = document.getElementById('spend-exchange-rate');
  const exchangeRate = rateInput ? parseFloat(rateInput.value) : USD_TO_JPY_RATE;

  const newEntry = {
    id: 'b-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    dayIndex,
    category,
    currency,
    amount,
    note,
    exchangeRate,
    timestamp: Date.now()
  };

  const entries = loadBudgetEntries();
  entries.push(newEntry);
  saveBudgetEntries(entries);
  
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
  
  // Set edit modal's exchange rate field
  document.getElementById('budget-edit-exchange-rate').value = entry.exchangeRate !== undefined ? entry.exchangeRate : USD_TO_JPY_RATE;

  // Set the dynamic validation (min, step, placeholder) based on entry currency
  updateBudgetEditAmountValidation();

  modal.classList.add('active');
}

export function handleSaveBudgetEdit(event) {
  event.preventDefault();
  const entryId = document.getElementById('budget-edit-id').value;
  const dayIndex = parseInt(document.getElementById('budget-edit-day').value);
  const category = document.getElementById('budget-edit-category').value;
  const currency = document.getElementById('budget-edit-currency').value;
  const amountVal = document.getElementById('budget-edit-amount').value;
  const amount = currency === 'JPY' ? parseInt(amountVal) : parseFloat(amountVal);
  const note = document.getElementById('budget-edit-note').value;
  
  const rateInput = document.getElementById('budget-edit-exchange-rate');
  const exchangeRate = rateInput ? parseFloat(rateInput.value) : USD_TO_JPY_RATE;

  const entries = loadBudgetEntries();
  const index = entries.findIndex(e => e.id === entryId);
  if (index !== -1) {
    entries[index] = {
      ...entries[index],
      dayIndex,
      category,
      currency,
      amount,
      note,
      exchangeRate
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
      note: entry.note || '',
      exchangeRate: entry.exchangeRate || USD_TO_JPY_RATE
    }
  };

  const shareCode = encodeShareData(payload);
  const shareUrl = `${window.location.origin}${window.location.pathname}?action=import-spend&data=${shareCode}`;

  if (navigator.share) {
    navigator.share({
      title: `Japan Trip Expense: ${entry.category}`,
      text: `💴 Japan Trip Expense:\n"${entry.category}"${entry.note ? ` (${entry.note})` : ''}\n\nClick the link below to import this expense into your budget tracker:\n\n\n${shareUrl}`
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

// Open/close popup converter modal
export function openConverterModal() {
  const modal = document.getElementById('converter-modal');
  const infoEl = document.getElementById('converter-rate-info');
  if (infoEl) {
    infoEl.innerText = `Current Rate: 1 USD = ${USD_TO_JPY_RATE.toFixed(2)} JPY`;
  }
  // Clear fields
  const usdInput = document.getElementById('converter-usd');
  const jpyInput = document.getElementById('converter-jpy');
  if (usdInput) usdInput.value = '';
  if (jpyInput) jpyInput.value = '';

  if (modal) modal.classList.add('active');
}

export function closeConverterModal() {
  const modal = document.getElementById('converter-modal');
  if (modal) modal.classList.remove('active');
}

// Collapsible Add Spend Form
export function toggleAddSpendForm() {
  const form = document.getElementById('add-spend-form');
  const icon = document.getElementById('add-spend-toggle-icon');
  const cardTitle = document.querySelector('#budget-content .form-card h3.form-title');
  if (!form || !icon) return;
  if (form.style.display === 'none') {
    form.style.display = 'block';
    icon.innerText = '▲';
    if (cardTitle) cardTitle.style.marginBottom = '12px';
  } else {
    form.style.display = 'none';
    icon.innerText = '▼';
    if (cardTitle) cardTitle.style.marginBottom = '0';
  }
}

// Collapsible Daily Breakdown Rows
export function toggleBudgetDayCollapse(index) {
  const element = document.getElementById(`budget-day-${index}`);
  const header = element ? element.previousElementSibling : null;
  const arrow = header ? header.querySelector('.day-toggle-arrow') : null;
  
  if (element) {
    if (element.style.display === 'none') {
      element.style.display = 'block';
      if (arrow) arrow.innerText = '▲';
    } else {
      element.style.display = 'none';
      if (arrow) arrow.innerText = '▼';
    }
  }
}

// Bulk expand / collapse breakdown rows
export function toggleAllBudgetDays(expand) {
  if (!state.tripData || !state.tripData.days) return;
  state.tripData.days.forEach((day, index) => {
    const element = document.getElementById(`budget-day-${index}`);
    if (element) {
      const header = element.previousElementSibling;
      const arrow = header ? header.querySelector('.day-toggle-arrow') : null;
      if (expand) {
        element.style.display = 'block';
        if (arrow) arrow.innerText = '▲';
      } else {
        element.style.display = 'none';
        if (arrow) arrow.innerText = '▼';
      }
    }
  });
}

// Convert currency values dynamically in converter modal
export function convertCurrency(source) {
  const usdInput = document.getElementById('converter-usd');
  const jpyInput = document.getElementById('converter-jpy');
  if (!usdInput || !jpyInput) return;
  
  if (source === 'USD') {
    const val = parseFloat(usdInput.value);
    if (!isNaN(val)) {
      jpyInput.value = Math.round(val * USD_TO_JPY_RATE);
    } else {
      jpyInput.value = '';
    }
  } else {
    const val = parseFloat(jpyInput.value);
    if (!isNaN(val)) {
      usdInput.value = (val / USD_TO_JPY_RATE).toFixed(2);
    } else {
      usdInput.value = '';
    }
  }
}

// Handle real-time budget breakdown queries
export function handleBudgetSearch(event) {
  budgetSearchQuery = event.target.value.toLowerCase().trim();
  const clearBtn = document.getElementById('clear-budget-search');
  if (clearBtn) {
    clearBtn.style.display = budgetSearchQuery ? 'block' : 'none';
  }
  renderBudgetBreakdownList();
}

// Clear search filters and restore full list
export function clearBudgetSearch() {
  budgetSearchQuery = '';
  const input = document.getElementById('budget-search-input');
  if (input) input.value = '';
  const clearBtn = document.getElementById('clear-budget-search');
  if (clearBtn) clearBtn.style.display = 'none';
  renderBudgetBreakdownList();
}

// Dynamic validation settings based on currency select field
export function updateSpendAmountValidation() {
  const currencySelect = document.getElementById('spend-currency');
  const amountInput = document.getElementById('spend-amount');
  if (!currencySelect || !amountInput) return;

  if (currencySelect.value === 'USD') {
    amountInput.setAttribute('step', '0.01');
    amountInput.setAttribute('min', '0.01');
    amountInput.placeholder = 'e.g. 10.50';
  } else {
    amountInput.setAttribute('step', '1');
    amountInput.setAttribute('min', '1');
    amountInput.placeholder = 'e.g. 1500';
  }
}

export function updateBudgetEditAmountValidation() {
  const currencySelect = document.getElementById('budget-edit-currency');
  const amountInput = document.getElementById('budget-edit-amount');
  if (!currencySelect || !amountInput) return;

  if (currencySelect.value === 'USD') {
    amountInput.setAttribute('step', '0.01');
    amountInput.setAttribute('min', '0.01');
    amountInput.placeholder = 'e.g. 10.50';
  } else {
    amountInput.setAttribute('step', '1');
    amountInput.setAttribute('min', '1');
    amountInput.placeholder = 'e.g. 1500';
  }
}

// Bind interactive functions to window object
window.handleAddSpend = handleAddSpend;
window.confirmDeleteSpend = confirmDeleteSpend;
window.openBudgetEditModal = openBudgetEditModal;
window.handleSaveBudgetEdit = handleSaveBudgetEdit;
window.shareSpend = shareSpend;
window.openConverterModal = openConverterModal;
window.closeConverterModal = closeConverterModal;
window.toggleAddSpendForm = toggleAddSpendForm;
window.toggleBudgetDayCollapse = toggleBudgetDayCollapse;
window.toggleAllBudgetDays = toggleAllBudgetDays;
window.convertCurrency = convertCurrency;
window.handleBudgetSearch = handleBudgetSearch;
window.clearBudgetSearch = clearBudgetSearch;
window.updateSpendAmountValidation = updateSpendAmountValidation;
window.updateBudgetEditAmountValidation = updateBudgetEditAmountValidation;

