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

  // Render running total display card
  const summaryCard = document.createElement('div');
  summaryCard.className = 'budget-summary-card';
  summaryCard.innerHTML = `
    <div style="font-size: 0.9rem; opacity: 0.9;">Total Actual Spend</div>
    <div class="budget-sum-val">$${Math.round(totalSpentUsd).toLocaleString()} USD</div>
    <div class="budget-sum-usd">≈ ¥${Math.round(totalSpentYen).toLocaleString()} JPY <span style="font-size: 0.75rem; opacity: 0.8;">(total approximates JPY & USD)</span></div>
  `;
  container.appendChild(summaryCard);

  // 1. Currency Converter Widget
  const converterCard = document.createElement('div');
  converterCard.className = 'form-card';
  converterCard.style.marginBottom = '20px';
  converterCard.innerHTML = `
    <h3 class="form-title" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer; margin-bottom: 0;" onclick="window.toggleConverterBody()">
      <span>💱 Quick Currency Converter</span>
      <span id="converter-toggle-icon" style="font-size: 0.9rem; color: var(--text-muted);">▼</span>
    </h3>
    <div id="converter-body" style="display: none; padding-top: 12px; margin-top: 12px; border-top: 1px dashed var(--border-color);">
      <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600; margin-bottom: 8px;">Current Rate: 1 USD = ${USD_TO_JPY_RATE.toFixed(2)} JPY</div>
      <div style="display: flex; gap: 10px; align-items: center;">
        <div style="flex: 1;">
          <label style="display: block; font-size: 0.75rem; font-weight: 600; color: var(--text-muted); margin-bottom: 4px;">USD ($)</label>
          <input type="number" id="converter-usd" class="form-control" placeholder="e.g. 100" oninput="window.convertCurrency('USD')" />
        </div>
        <div style="font-size: 1.2rem; padding-top: 16px; opacity: 0.5;">⇄</div>
        <div style="flex: 1;">
          <label style="display: block; font-size: 0.75rem; font-weight: 600; color: var(--text-muted); margin-bottom: 4px;">JPY (¥)</label>
          <input type="number" id="converter-jpy" class="form-control" placeholder="e.g. 15500" oninput="window.convertCurrency('JPY')" />
        </div>
      </div>
    </div>
  `;
  container.appendChild(converterCard);

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

  // Daily Spend Breakdown Section Header and Search Input
  const breakdownHeader = document.createElement('div');
  breakdownHeader.style.margin = '20px 0 12px 0';
  breakdownHeader.innerHTML = `
    <h3 style="margin-bottom: 10px;">📊 Daily Budget Breakdown</h3>
    <div style="position: relative; width: 100%;">
      <input type="text" id="budget-search-input" class="form-control" placeholder="🔍 Filter budget logs..." style="padding-left: 36px; padding-right: 36px; border-radius: 20px; font-weight: 500;" oninput="window.handleBudgetSearch(event)" />
      <button id="clear-budget-search" onclick="window.clearBudgetSearch()" style="display: none; position: absolute; right: 12px; top: 50%; transform: translateY(-50%); border: none; background: none; font-size: 1.25rem; cursor: pointer; color: var(--text-muted); line-height: 1;">&times;</button>
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
          if (currency === 'USD') {
            const jpyConverted = Math.round(amount * rate);
            displayAmount = `$${amount.toLocaleString()} (~¥${jpyConverted.toLocaleString()} at rate ${rate.toFixed(2)})`;
          } else {
            const usdConverted = Math.round(amount / rate);
            displayAmount = `¥${amount.toLocaleString()} (~$${usdConverted.toLocaleString()} at rate ${rate.toFixed(2)})`;
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
          <div style="font-size: 0.9rem; color: var(--primary);">¥${Math.round(dayActualYen).toLocaleString()} (~$${Math.round(dayActualUsd)})</div>
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
  const amount = parseInt(document.getElementById('spend-amount').value);
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

  modal.classList.add('active');
}

export function handleSaveBudgetEdit(event) {
  event.preventDefault();
  const entryId = document.getElementById('budget-edit-id').value;
  const dayIndex = parseInt(document.getElementById('budget-edit-day').value);
  const category = document.getElementById('budget-edit-category').value;
  const currency = document.getElementById('budget-edit-currency').value;
  const amount = parseInt(document.getElementById('budget-edit-amount').value);
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

// Collapsible Currency Converter Toggles
export function toggleConverterBody() {
  const body = document.getElementById('converter-body');
  const icon = document.getElementById('converter-toggle-icon');
  if (!body) return;
  if (body.style.display === 'none') {
    body.style.display = 'block';
    icon.innerText = '▲';
  } else {
    body.style.display = 'none';
    icon.innerText = '▼';
  }
}

// Convert currency values dynamically in converter card
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

// Bind interactive functions to window object
window.handleAddSpend = handleAddSpend;
window.confirmDeleteSpend = confirmDeleteSpend;
window.openBudgetEditModal = openBudgetEditModal;
window.handleSaveBudgetEdit = handleSaveBudgetEdit;
window.shareSpend = shareSpend;
window.toggleConverterBody = toggleConverterBody;
window.convertCurrency = convertCurrency;
window.handleBudgetSearch = handleBudgetSearch;
window.clearBudgetSearch = clearBudgetSearch;
