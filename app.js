// Global State
let tripData = null;
let activeTab = 'itinerary'; // itinerary, checklist, budget, info, food
let selectedDay = 0; // Currently viewed day (0-12)
let autoDetectedDay = 0; // Day index matching today's date (if inside range)
let dateBannerMessage = ''; // Banner message for trip status
let activeCityFilter = 'All'; // Food guide city filter
let deferredPrompt = null; // PWA installation prompt reference

// Constants
const USD_TO_JPY_RATE = 155; // Offline-first JPY conversion rate

// Local Storage Keys
const CHECKLIST_STORAGE_KEY = 'japan-trip-checklist-state';
const BUDGET_STORAGE_KEY = 'japan-trip-budget-entries';
const THEME_STORAGE_KEY = 'japan-trip-theme-preference';

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  setupNavigation();
  loadTripData();
  setupPWA();
});

// Setup Dark/Light Theme
function initTheme() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  const body = document.body;
  const toggleBtn = document.getElementById('theme-toggle');
  
  if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    body.classList.add('dark-mode');
    toggleBtn.innerHTML = '☀️';
  } else {
    body.classList.remove('dark-mode');
    toggleBtn.innerHTML = '🌙';
  }

  toggleBtn.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    const isDark = body.classList.contains('dark-mode');
    localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
    toggleBtn.innerHTML = isDark ? '☀️' : '🌙';
  });
}

// Navigation and Tab Routing
function setupNavigation() {
  const navButtons = document.querySelectorAll('.nav-item');
  navButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      const tabName = button.getAttribute('data-tab');
      switchTab(tabName);
    });
  });

  // Logo home button click
  document.getElementById('logo-home').addEventListener('click', (e) => {
    e.preventDefault();
    switchTab('itinerary');
  });

  // "Today" click shortcut
  document.getElementById('today-btn').addEventListener('click', () => {
    switchTab('itinerary');
    selectDayTab(autoDetectedDay, true);
  });
}

function switchTab(tabName) {
  activeTab = tabName;
  
  // Update nav buttons active classes
  document.querySelectorAll('.nav-item').forEach(btn => {
    if (btn.getAttribute('data-tab') === tabName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Update visible container
  document.querySelectorAll('.tab-content').forEach(container => {
    if (container.id === `${tabName}-tab`) {
      container.classList.add('active');
    } else {
      container.classList.remove('active');
    }
  });

  // Scroll to top of viewport
  window.scrollTo({ top: 0, behavior: 'instant' });

  // Render specific tab content if needed
  if (tabName === 'checklist') {
    renderChecklist();
  } else if (tabName === 'budget') {
    renderBudget();
  } else if (tabName === 'info') {
    renderInfo();
  } else if (tabName === 'food') {
    renderFood();
  }
}

// Load static itinerary data from itinerary.json
async function loadTripData() {
  try {
    const response = await fetch('./itinerary.json');
    if (!response.ok) {
      throw new Error('Could not load itinerary JSON data');
    }
    tripData = await response.json();
    
    // Auto-detect current day & render initial view
    detectCurrentDay();
    renderDayNavigator();
    selectDayTab(selectedDay, false);
  } catch (error) {
    console.error('Error loading trip data:', error);
    document.getElementById('itinerary-tab').innerHTML = `
      <div style="padding: 20px; text-align: center;">
        <h3 style="color: var(--secondary); margin-bottom: 10px;">⚠️ Failed to Load Data</h3>
        <p>There was a problem loading the trip data file. Please ensure itinerary.json exists and refresh.</p>
      </div>
    `;
  }
}

// Today Auto-detection
function detectCurrentDay() {
  if (!tripData || !tripData.trip) return;

  const today = new Date();
  
  // FOR TESTING: Override date or use standard system date
  // const today = new Date('2026-06-20'); // Uncomment to test active trip dates

  const startDate = new Date(tripData.trip.startDate + 'T00:00:00');
  const endDate = new Date(tripData.trip.endDate + 'T23:59:59');

  // Clear timezone offset for date-only comparison
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const endOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

  const diffTime = todayOnly - startOnly;
  const daysDiff = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (todayOnly < startOnly) {
    // Before trip
    const msToStart = startOnly - todayOnly;
    const daysToStart = Math.ceil(msToStart / (1000 * 60 * 60 * 24));
    selectedDay = 0;
    autoDetectedDay = 0;
    dateBannerMessage = `✈️ Trip starts in ${daysToStart} day${daysToStart > 1 ? 's' : ''}! Current Day: Day 0.`;
  } else if (todayOnly > endOnly) {
    // After trip
    selectedDay = tripData.days.length - 1; // Last day
    autoDetectedDay = selectedDay;
    dateBannerMessage = `🌸 Trip completed! Viewing final day itinerary.`;
  } else {
    // During trip
    selectedDay = daysDiff;
    autoDetectedDay = daysDiff;
    dateBannerMessage = `🎌 Day ${daysDiff} of 12 — Enjoying Japan!`;
  }

  showStatusBanner();
}

function showStatusBanner() {
  const banner = document.getElementById('status-banner');
  if (dateBannerMessage) {
    banner.style.display = 'flex';
    document.getElementById('banner-message').innerText = dateBannerMessage;
  } else {
    banner.style.display = 'none';
  }
}

// Render Day Tabs Horizontal Scroll List
function renderDayNavigator() {
  const navContainer = document.getElementById('day-tabs');
  navContainer.innerHTML = '';
  
  if (!tripData || !tripData.days) return;

  tripData.days.forEach((day, index) => {
    const isToday = index === autoDetectedDay;
    
    // Day Label (e.g. "June 15")
    const dateObj = new Date(day.date + 'T00:00:00');
    const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const tab = document.createElement('button');
    tab.className = `day-tab ${isToday ? 'today-indicator' : ''}`;
    tab.setAttribute('data-day', index);
    tab.innerHTML = `
      <span class="day-tab-num">Day ${day.dayNumber}</span>
      <span class="day-tab-lbl">${formattedDate}</span>
    `;

    tab.addEventListener('click', () => {
      selectDayTab(index, true);
    });

    navContainer.appendChild(tab);
  });
}

function selectDayTab(dayIndex, scroll = false) {
  selectedDay = dayIndex;
  
  // Highlight active tab
  document.querySelectorAll('.day-tab').forEach((tab, index) => {
    if (index === dayIndex) {
      tab.classList.add('active');
      if (scroll) {
        tab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    } else {
      tab.classList.remove('active');
    }
  });

  renderItineraryDay();
}

// Render Itinerary Cards & Details
function renderItineraryDay() {
  const container = document.getElementById('itinerary-details');
  container.innerHTML = '';

  if (!tripData || !tripData.days || !tripData.days[selectedDay]) return;

  const day = tripData.days[selectedDay];

  // Render Day Heading Info
  const headerDiv = document.createElement('div');
  headerDiv.className = 'day-header';
  
  // Check if hotel checkout details or notes apply
  let hotelNotesHtml = '';
  if (day.hotelNote) {
    hotelNotesHtml = `
      <div class="day-hotel-banner">
        <span>🏨</span>
        <span>${day.hotelNote}</span>
      </div>
    `;
  }

  // Create Day Selector dropdown for easy override / jumping
  let selectDayOptions = '';
  tripData.days.forEach((d, idx) => {
    selectDayOptions += `<option value="${idx}" ${idx === selectedDay ? 'selected' : ''}>Day ${d.dayNumber}: ${d.title}</option>`;
  });

  headerDiv.innerHTML = `
    <div class="day-title-row">
      <div class="day-title-group">
        <h2 class="day-title-text">${day.dayLabel}</h2>
        <div class="day-theme">${day.theme}</div>
      </div>
      <div class="day-selector-wrapper">
        <select id="day-selector-dropdown" class="form-control" style="width: 100%; padding: 8px 12px; font-size: 0.9rem; font-weight: 600;">
          ${selectDayOptions}
        </select>
      </div>
    </div>
    ${hotelNotesHtml}
  `;
  container.appendChild(headerDiv);

  // Hook dropdown change
  document.getElementById('day-selector-dropdown').addEventListener('change', (e) => {
    selectDayTab(parseInt(e.target.value), true);
  });

  // Render Timeline activities
  const timelineDiv = document.createElement('div');
  timelineDiv.className = 'timeline';

  if (!day.activities || day.activities.length === 0) {
    timelineDiv.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--text-muted);">No activities listed for today.</div>`;
  } else {
    day.activities.forEach((act) => {
      const card = document.createElement('div');
      card.className = 'timeline-item';
      if (act.variant === 'A') card.classList.add('variant-a');
      if (act.variant === 'B') card.classList.add('variant-b');
      
      const badgeHtml = act.variant 
        ? `<span class="badge ${act.variant === 'A' ? 'badge-a' : 'badge-b'}">${act.variant === 'A' ? 'Original Plan' : 'Suggested Addition'}</span>`
        : '';

      // Check if maps navigation is available
      let navigateButtonHtml = '';
      if (act.location) {
        const mode = act.travelMode || 'transit';
        const searchDest = act.location.address || act.location.name;
        const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(searchDest)}&travelmode=${mode}`;
        
        // Check if taxi recommended
        const taxiRecommended = (act.description && act.description.toLowerCase().includes('taxi')) || 
                                (act.notes && act.notes.some(n => n.toLowerCase().includes('taxi')));
        const taxiLabel = taxiRecommended ? '<span style="margin-left: 8px; font-size: 0.8rem;">🚕 Taxi recommended</span>' : '';

        navigateButtonHtml = `
          <button class="btn btn-primary" onclick="window.open('${mapsUrl}', '_blank')">
            🧭 Navigate ${taxiLabel}
          </button>
        `;
      }

      // Check details / booking reference
      let detailsHtml = '';
      if (act.bookingRef) {
        detailsHtml += `
          <div class="card-detail-item">
            <span class="detail-label">🎟️ Reference:</span>
            <span><strong>${act.bookingRef}</strong></span>
          </div>
        `;
      }
      if (act.location) {
        detailsHtml += `
          <div class="card-detail-item">
            <span class="detail-label">📍 Location:</span>
            <span>${act.location.name} ${act.location.address ? `(${act.location.address})` : ''}</span>
          </div>
        `;
      }

      // Tips block
      let tipsHtml = '';
      if (act.notes && act.notes.length > 0) {
        let tipsItems = '';
        act.notes.forEach(tip => {
          tipsItems += `<li>${tip}</li>`;
        });
        tipsHtml = `
          <div class="card-tips">
            <div class="card-tips-title">💡 Notes & Tips</div>
            <ul style="padding-left: 14px; margin: 0;">${tipsItems}</ul>
          </div>
        `;
      }

      card.innerHTML = `
        <div class="timeline-dot"></div>
        <div class="card collapsed" id="card-${act.id}">
          <div class="card-header-row" onclick="toggleCardCollapse('${act.id}')">
            <div class="card-title-group">
              ${act.time ? `<div class="card-time">${act.time}</div>` : ''}
              <div class="card-title">${act.title} ${badgeHtml}</div>
            </div>
            <span class="card-expand-icon">▼</span>
          </div>
          <div class="card-body">
            ${act.description ? `<div class="card-description">${act.description}</div>` : ''}
            ${detailsHtml ? `<div class="card-details-grid">${detailsHtml}</div>` : ''}
            ${tipsHtml}
            ${navigateButtonHtml ? `<div class="card-actions">${navigateButtonHtml}</div>` : ''}
          </div>
        </div>
      `;
      timelineDiv.appendChild(card);
    });
  }
  container.appendChild(timelineDiv);

  // Render Day Overview (Walking, Transit, Budget)
  const overview = day.dayOverview;
  if (overview && (overview.walking || overview.transitRides || overview.budgetEstimate)) {
    const overviewDiv = document.createElement('div');
    overviewDiv.className = 'day-overview';
    overviewDiv.innerHTML = `
      <div class="day-overview-title">📊 Day Summary</div>
      <div class="day-overview-grid">
        <div class="day-overview-item">
          <span class="overview-lbl">🚶 Walking</span>
          <span class="overview-val">${overview.walking || 'N/A'}</span>
        </div>
        <div class="day-overview-item">
          <span class="overview-lbl">🚇 Transit</span>
          <span class="overview-val">${overview.transitRides !== null ? `${overview.transitRides} ride(s)` : 'N/A'}</span>
        </div>
        <div class="day-overview-item">
          <span class="overview-lbl">💴 Est. Budget</span>
          <span class="overview-val" style="font-size: 0.75rem; white-space: normal;">${overview.budgetEstimate || 'N/A'}</span>
        </div>
      </div>
    `;
    container.appendChild(overviewDiv);
  }
}

// Collapsible timeline card action
window.toggleCardCollapse = function(cardId) {
  const card = document.getElementById(`card-${cardId}`);
  if (card) {
    card.classList.toggle('collapsed');
  }
}

// ==========================================
// PRE-TRIP CHECKLIST TAB LOGIC
// ==========================================
function loadChecklistState() {
  const state = localStorage.getItem(CHECKLIST_STORAGE_KEY);
  return state ? JSON.parse(state) : {};
}

function saveChecklistState(state) {
  localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(state));
}

function renderChecklist() {
  const container = document.getElementById('checklist-content');
  container.innerHTML = '';

  if (!tripData || !tripData.preTripChecklist) return;

  const checklistState = loadChecklistState();
  let totalItemsCount = 0;
  let checkedItemsCount = 0;

  // Pre-calculate progress
  tripData.preTripChecklist.forEach(category => {
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
  tripData.preTripChecklist.forEach((category, catIndex) => {
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

window.toggleChecklistItem = function(itemId) {
  const state = loadChecklistState();
  state[itemId] = !state[itemId];
  saveChecklistState(state);
  renderChecklist();
};

window.toggleCategoryCollapse = function(catId) {
  const element = document.getElementById(catId);
  if (element) {
    if (element.style.display === 'none') {
      element.style.display = 'block';
    } else {
      element.style.display = 'none';
    }
  }
};

window.confirmResetChecklist = function() {
  if (confirm('Are you sure you want to reset all checklist tasks back to unchecked?')) {
    saveChecklistState({});
    renderChecklist();
  }
};

// ==========================================
// BUDGET TRACKER TAB LOGIC
// ==========================================
function loadBudgetEntries() {
  const entries = localStorage.getItem(BUDGET_STORAGE_KEY);
  return entries ? JSON.parse(entries) : [];
}

function saveBudgetEntries(entries) {
  localStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(entries));
}

function renderBudget() {
  const container = document.getElementById('budget-content');
  container.innerHTML = '';

  const entries = loadBudgetEntries();
  
  // Calculate Totals
  let totalSpentYen = 0;
  entries.forEach(entry => {
    totalSpentYen += entry.amountYen;
  });

  const totalSpentUsd = Math.round(totalSpentYen / USD_TO_JPY_RATE);

  // Render running total display card
  const summaryCard = document.createElement('div');
  summaryCard.className = 'budget-summary-card';
  summaryCard.innerHTML = `
    <div style="font-size: 0.9rem; opacity: 0.9;">Total Actual Spend</div>
    <div class="budget-sum-val">¥${totalSpentYen.toLocaleString()} JPY</div>
    <div class="budget-sum-usd">≈ $${totalSpentUsd.toLocaleString()} USD <span style="font-size: 0.75rem; opacity: 0.8;">(approx. 1$ = ${USD_TO_JPY_RATE}¥)</span></div>
  `;
  container.appendChild(summaryCard);

  // Add Spend Form
  const formCard = document.createElement('div');
  formCard.className = 'form-card';
  
  let daySelectOptions = '';
  if (tripData && tripData.days) {
    tripData.days.forEach((d, idx) => {
      daySelectOptions += `<option value="${idx}">Day ${d.dayNumber} · ${d.title}</option>`;
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
      <div class="form-group">
        <label>Amount (Yen ¥)</label>
        <input type="number" class="form-control" id="spend-amount" placeholder="e.g. 1500" min="1" required />
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

  if (tripData && tripData.days) {
    tripData.days.forEach((day, index) => {
      // Sum actual spends for this day
      const dayEntries = entries.filter(e => e.dayIndex === index);
      let dayActualYen = 0;
      dayEntries.forEach(e => dayActualYen += e.amountYen);

      const dayActualUsd = Math.round(dayActualYen / USD_TO_JPY_RATE);
      const estText = day.dayOverview.budgetEstimate || 'No estimate listed';

      const row = document.createElement('div');
      row.className = 'budget-day-row';

      let itemsHtml = '';
      if (dayEntries.length > 0) {
        dayEntries.forEach(entry => {
          itemsHtml += `
            <div class="spend-item">
              <div>
                <strong>[${entry.category}]</strong> ${entry.note || ''}
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span>¥${entry.amountYen.toLocaleString()}</span>
                <button class="spend-delete-btn" onclick="deleteSpendEntry('${entry.id}')">❌</button>
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
          <div style="font-size: 0.9rem; color: var(--primary);">¥${dayActualYen.toLocaleString()} (~$${dayActualUsd})</div>
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

window.handleAddSpend = function(event) {
  event.preventDefault();
  const dayIndex = parseInt(document.getElementById('spend-day').value);
  const category = document.getElementById('spend-category').value;
  const amountYen = parseInt(document.getElementById('spend-amount').value);
  const note = document.getElementById('spend-note').value;

  const newEntry = {
    id: 'b-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    dayIndex,
    category,
    amountYen,
    note,
    timestamp: Date.now()
  };

  const entries = loadBudgetEntries();
  entries.push(newEntry);
  saveBudgetEntries(entries);
  
  // Rerender budget layout
  renderBudget();
};

window.deleteSpendEntry = function(entryId) {
  if (confirm('Are you sure you want to delete this expense entry?')) {
    let entries = loadBudgetEntries();
    entries = entries.filter(e => e.id !== entryId);
    saveBudgetEntries(entries);
    renderBudget();
  }
};

// ==========================================
// INFO VIEW (HOTELS & SHINKANSEN TRAINS) TAB LOGIC
// ==========================================
function renderInfo() {
  const container = document.getElementById('info-content');
  container.innerHTML = '';

  if (!tripData) return;

  // 1. Render BOOKED HOTELS List
  const bookedHeader = document.createElement('div');
  bookedHeader.className = 'info-section-title';
  bookedHeader.innerText = '🏨 Booked Accommodations';
  container.appendChild(bookedHeader);

  if (tripData.bookedHotels && tripData.bookedHotels.length > 0) {
    tripData.bookedHotels.forEach(hotel => {
      const card = document.createElement('div');
      card.className = 'hotel-card';

      // Check-in dates formatting
      const dateIn = new Date(hotel.checkIn + 'T00:00:00');
      const dateOut = new Date(hotel.checkOut + 'T00:00:00');
      const formatIn = dateIn.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });
      const formatOut = dateOut.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });

      // Navigate button
      let navBtnHtml = '';
      if (hotel.address) {
        const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(hotel.address)}&travelmode=transit`;
        navBtnHtml = `
          <button class="btn btn-primary btn-block" style="margin-top: 10px; font-size: 0.8rem;" onclick="window.open('${mapsUrl}', '_blank')">
            🧭 Directions to Hotel
          </button>
        `;
      }

      card.innerHTML = `
        <div class="hotel-header">
          <div class="hotel-name">${hotel.name}</div>
          <span class="hotel-city-badge">${hotel.city}</span>
        </div>
        <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 4px;">
          📅 <strong>Check In:</strong> ${formatIn} &nbsp;|&nbsp; <strong>Check Out:</strong> ${formatOut}
        </div>
        <div style="font-size: 0.85rem;">
          📍 <strong>Address:</strong> ${hotel.address || 'Refer to trip confirmation PDF'}
        </div>
        ${navBtnHtml}
      `;
      container.appendChild(card);
    });
  }

  // 2. Render SHINKANSEN TRAINS Reference Table
  const trainsHeader = document.createElement('div');
  trainsHeader.className = 'info-section-title';
  trainsHeader.innerText = '🚅 Train Seat Assignments';
  container.appendChild(trainsHeader);

  if (tripData.trains && tripData.trains.length > 0) {
    tripData.trains.forEach(train => {
      const card = document.createElement('div');
      card.className = 'train-card';

      // Map passenger rows
      let seatRows = '';
      train.seats.forEach(s => {
        seatRows += `
          <tr>
            <td>${s.passenger}</td>
            <td class="seat-code">${s.seat}</td>
            <td style="font-size: 0.75rem; color: var(--text-muted);">${s.ref}</td>
          </tr>
        `;
      });

      card.innerHTML = `
        <div class="train-header">
          <span class="train-title">${train.label} (${train.trainName})</span>
          <span class="train-time">${train.departTime}</span>
        </div>
        <div style="font-size: 0.85rem; margin-bottom: 8px; color: var(--text-muted);">
          📍 <strong>Car Number:</strong> ${train.car} &nbsp;|&nbsp; <strong>Day of Trip:</strong> Day ${train.dayNumber}
        </div>
        <table class="seat-table">
          <thead>
            <tr>
              <th>Traveler</th>
              <th>Seat</th>
              <th>Reference ID</th>
            </tr>
          </thead>
          <tbody>
            ${seatRows}
          </tbody>
        </table>
      `;
      container.appendChild(card);
    });
  }

  // 3. Render OTHER RECOMMENDED HOTELS FOR REFERENCE
  const refHotelsHeader = document.createElement('div');
  refHotelsHeader.className = 'info-section-title';
  refHotelsHeader.innerText = '🗺️ Recommended Reference Hotels';
  container.appendChild(refHotelsHeader);

  if (tripData.hotels && tripData.hotels.length > 0) {
    tripData.hotels.forEach(hotel => {
      const card = document.createElement('div');
      card.className = 'hotel-card';
      card.innerHTML = `
        <div class="hotel-header">
          <div class="hotel-name">${hotel.name}</div>
          <div style="display: flex; gap: 4px; align-items: center;">
            <span class="hotel-city-badge">${hotel.city}</span>
            <span class="badge badge-a">${hotel.tier}</span>
          </div>
        </div>
        <div style="font-size: 0.85rem; margin-bottom: 6px; color: var(--text-muted);">
          🏨 Area: ${hotel.area} &nbsp;|&nbsp; Est. Rate: ${hotel.estRate}
        </div>
        <p style="font-size: 0.85rem; line-height: 1.4;">${hotel.notes}</p>
      `;
      container.appendChild(card);
    });
  }
}

// ==========================================
// FOOD GUIDE & PRACTICAL TIPS TAB LOGIC
// ==========================================
function renderFood() {
  const container = document.getElementById('food-content');
  container.innerHTML = '';

  if (!tripData) return;

  // Render City Filters buttons
  const filtersDiv = document.createElement('div');
  filtersDiv.className = 'filter-tabs';
  
  const cities = ['All', 'Tokyo', 'Kyoto', 'Osaka'];
  let filterBtnsHtml = '';
  cities.forEach(city => {
    filterBtnsHtml += `
      <button class="filter-tab-btn ${activeCityFilter === city ? 'active' : ''}" onclick="setCityFilter('${city}')">
        ${city === 'All' ? '🌐 All Cities' : city === 'Tokyo' ? '🗼 Tokyo' : city === 'Kyoto' ? '⛩️ Kyoto' : '🐙 Osaka'}
      </button>
    `;
  });
  filtersDiv.innerHTML = filterBtnsHtml;
  container.appendChild(filtersDiv);

  // 1. Render RESTAURANT PICKS based on activeCityFilter
  const picksHeader = document.createElement('div');
  picksHeader.className = 'info-section-title';
  picksHeader.innerText = `🍴 Local Restaurant Selections (${activeCityFilter})`;
  container.appendChild(picksHeader);

  const filteredPicks = activeCityFilter === 'All' 
    ? tripData.restaurantPicks 
    : tripData.restaurantPicks.filter(p => p.city === activeCityFilter);

  if (filteredPicks.length > 0) {
    const listCard = document.createElement('div');
    listCard.className = 'card';
    
    let picksHtml = '';
    filteredPicks.forEach(pick => {
      picksHtml += `
        <div class="pick-item">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
            <div class="pick-name">${pick.name}</div>
            <span class="hotel-city-badge" style="font-size: 0.6rem; padding: 1px 6px;">${pick.city} · ${pick.mealType || 'Pick'}</span>
          </div>
          <div class="pick-desc">${pick.description}</div>
        </div>
      `;
    });
    listCard.innerHTML = `<div class="picks-list">${picksHtml}</div>`;
    container.appendChild(listCard);
  } else {
    container.innerHTML += `<div style="text-align: center; font-style: italic; color: var(--text-muted); padding: 10px;">No restaurant picks listed.</div>`;
  }

  // 2. Render MUST-TRY FOODS List (only when filter is 'All' or general guides)
  if (activeCityFilter === 'All') {
    const foodHeader = document.createElement('div');
    foodHeader.className = 'info-section-title';
    foodHeader.style.marginTop = '24px';
    foodHeader.innerText = '🍜 Must-Try Japanese Foods';
    container.appendChild(foodHeader);

    if (tripData.foodGuide && tripData.foodGuide.length > 0) {
      tripData.foodGuide.forEach((food, index) => {
        const card = document.createElement('div');
        card.className = 'collapsible-guide-card';
        card.innerHTML = `
          <div class="guide-card-header" onclick="toggleGuideCollapse('food-guide-${index}')">
            <span class="guide-title">${food.emoji} ${food.category}</span>
            <span class="card-expand-icon">▼</span>
          </div>
          <div class="guide-body" id="food-guide-${index}">
            <p class="guide-description">${food.description}</p>
          </div>
        `;
        container.appendChild(card);
      });
    }
  }

  // 3. Render PRACTICAL FAMILY TIPS
  const tipsHeader = document.createElement('div');
  tipsHeader.className = 'info-section-title';
  tipsHeader.style.marginTop = '24px';
  tipsHeader.innerText = '💡 Practical Travel Tips';
  container.appendChild(tipsHeader);

  if (tripData.practicalTips && tripData.practicalTips.length > 0) {
    tripData.practicalTips.forEach((tipGroup, index) => {
      const card = document.createElement('div');
      card.className = 'collapsible-guide-card';

      let tipsListLines = '';
      tipGroup.tips.forEach(line => {
        tipsListLines += `<li class="tip-item-line">${line}</li>`;
      });

      card.innerHTML = `
        <div class="guide-card-header" onclick="toggleGuideCollapse('tip-group-${index}')">
          <span class="guide-title">ℹ️ ${tipGroup.category}</span>
          <span class="card-expand-icon">▼</span>
        </div>
        <div class="guide-body" id="tip-group-${index}">
          <ul class="tip-list">${tipsListLines}</ul>
        </div>
      `;
      container.appendChild(card);
    });
  }
}

window.setCityFilter = function(city) {
  activeCityFilter = city;
  renderFood();
};

window.toggleGuideCollapse = function(guideId) {
  const element = document.getElementById(guideId);
  const card = element.parentElement;
  const expandIcon = card.querySelector('.card-expand-icon');
  
  if (element.classList.contains('active')) {
    element.classList.remove('active');
    expandIcon.style.transform = 'rotate(0deg)';
  } else {
    element.classList.add('active');
    expandIcon.style.transform = 'rotate(180deg)';
  }
};

// ==========================================
// PWA LIFECYCLE & INSTALLATION LOGIC
// ==========================================
function setupPWA() {
  // Register service worker for offline functionality
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registered successfully:', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker registration failed:', err);
        });
    });
  }

  // Handle Installation trigger banner
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent default Chrome mini-infobar
    e.preventDefault();
    deferredPrompt = e;
    
    // Display custom prompt banner
    const installBanner = document.getElementById('install-banner');
    if (installBanner) {
      installBanner.style.display = 'block';
    }
  });

  // Handle installation button clicks
  const installBtn = document.getElementById('install-btn');
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      
      // Trigger native browser install prompt
      deferredPrompt.prompt();
      
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`[PWA] Install choice outcome: ${outcome}`);
      
      deferredPrompt = null;
      hideInstallBanner();
    });
  }

  const closeInstallBtn = document.getElementById('close-install-banner');
  if (closeInstallBtn) {
    closeInstallBtn.addEventListener('click', () => {
      hideInstallBanner();
    });
  }
}

function hideInstallBanner() {
  const installBanner = document.getElementById('install-banner');
  if (installBanner) {
    installBanner.style.display = 'none';
  }
}
