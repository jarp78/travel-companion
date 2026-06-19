import { 
  state, 
  THEME_STORAGE_KEY,
  decodeShareData,
  clearUrlParams,
  fetchExchangeRate,
  USD_TO_JPY_RATE
} from './js/helpers.js';
import { 
  applyItineraryMutations, 
  renderDayNavigator, 
  selectDayTab,
  getItineraryMutations,
  saveItineraryMutations
} from './js/itinerary.js';
import { renderChecklist } from './js/checklist.js';
import { 
  renderBudget,
  loadBudgetEntries,
  saveBudgetEntries
} from './js/budget.js';
import { renderInfo } from './js/info.js';
import { renderFood } from './js/food.js';

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  setupNavigation();
  fetchExchangeRate();
  loadTripData();
  setupPWA();

  // Live updating dual-timezone clocks (runs every 10 seconds if clocks exist on screen)
  setInterval(() => {
    if (typeof window.updateItineraryClocks === 'function') {
      window.updateItineraryClocks();
    }
  }, 10000);
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
    selectDayTab(state.autoDetectedDay, true);
  });

  // Close modals hooks
  document.getElementById('event-modal-close').addEventListener('click', () => {
    document.getElementById('event-modal').classList.remove('active');
  });
  document.getElementById('budget-edit-modal-close').addEventListener('click', () => {
    document.getElementById('budget-edit-modal').classList.remove('active');
  });
  document.getElementById('converter-modal-close').addEventListener('click', () => {
    document.getElementById('converter-modal').classList.remove('active');
  });
  document.getElementById('import-event-modal-close').addEventListener('click', () => {
    document.getElementById('import-event-modal').classList.remove('active');
    clearUrlParams();
  });
  document.getElementById('import-spend-modal-close').addEventListener('click', () => {
    document.getElementById('import-spend-modal').classList.remove('active');
    clearUrlParams();
  });

  // Itinerary Search Event listeners
  const itinerarySearch = document.getElementById('itinerary-search-input');
  if (itinerarySearch) {
    itinerarySearch.addEventListener('input', (e) => {
      if (window.handleItinerarySearch) {
        window.handleItinerarySearch(e);
      }
    });
  }
  const clearItinerarySearchBtn = document.getElementById('clear-itinerary-search');
  if (clearItinerarySearchBtn) {
    clearItinerarySearchBtn.addEventListener('click', () => {
      if (window.clearItinerarySearch) {
        window.clearItinerarySearch();
      }
    });
  }
}

export function switchTab(tabName) {
  state.activeTab = tabName;
  
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
    state.rawTripData = await response.json();
    applyItineraryMutations();
    
    // Auto-detect current day & render initial view
    detectCurrentDay();
    renderDayNavigator();
    selectDayTab(state.selectedDay, true);

    // Check for shared event or expense imports from URL
    checkForImports();
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
  if (!state.tripData || !state.tripData.trip) return;

  const today = new Date();
  
  // FOR TESTING: Override date or use standard system date
  // const today = new Date('2026-06-20'); // Uncomment to test active trip dates

  const startDate = new Date(state.tripData.trip.startDate + 'T00:00:00');
  const endDate = new Date(state.tripData.trip.endDate + 'T23:59:59');

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
    state.selectedDay = 0;
    state.autoDetectedDay = 0;
    state.dateBannerMessage = `✈️ Trip starts in ${daysToStart} day${daysToStart > 1 ? 's' : ''}! Current Day: Day 0.`;
  } else if (todayOnly > endOnly) {
    // After trip
    state.selectedDay = state.tripData.days.length - 1; // Last day
    state.autoDetectedDay = state.selectedDay;
    state.dateBannerMessage = `🌸 Trip completed! Viewing final day itinerary.`;
  } else {
    // During trip
    state.selectedDay = daysDiff;
    state.autoDetectedDay = daysDiff;
    state.dateBannerMessage = `🎌 Day ${daysDiff} of 12 — Enjoying Japan!`;
  }

  showStatusBanner();
}

function showStatusBanner() {
  const banner = document.getElementById('status-banner');
  if (state.dateBannerMessage) {
    banner.style.display = 'flex';
    document.getElementById('banner-message').innerText = state.dateBannerMessage;
  } else {
    banner.style.display = 'none';
  }
}

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
    state.deferredPrompt = e;
    
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
      if (!state.deferredPrompt) return;
      
      // Trigger native browser install prompt
      state.deferredPrompt.prompt();
      
      const { outcome } = await state.deferredPrompt.userChoice;
      console.log(`[PWA] Install choice outcome: ${outcome}`);
      
      state.deferredPrompt = null;
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

// Check if query parameters contain shared event or expense data
function checkForImports() {
  const urlParams = new URLSearchParams(window.location.search);
  const action = urlParams.get('action');
  const data = urlParams.get('data');
  if (!action || !data) return;

  try {
    const payload = decodeShareData(data);
    if (action === 'import-event' && payload.event) {
      const modal = document.getElementById('import-event-modal');
      document.getElementById('import-event-id').value = payload.event.id;
      document.getElementById('import-event-time').innerText = payload.event.time || 'No time';
      document.getElementById('import-event-title').innerText = payload.event.title || 'Untitled Event';
      document.getElementById('import-event-desc').innerText = payload.event.description || '';

      // Populate day selection drop-down list
      const daySelect = document.getElementById('import-event-day');
      daySelect.innerHTML = '';
      state.tripData.days.forEach((d, idx) => {
        daySelect.innerHTML += `<option value="${idx}">Day ${d.dayNumber} · ${d.title}</option>`;
      });
      daySelect.value = payload.dayIndex !== undefined ? payload.dayIndex : 0;

      // Duplicate Check (Checking local database for duplicate unique ID)
      const mutations = getItineraryMutations();
      const isDuplicate = mutations.added.some(item => item.event.id === payload.event.id) ||
                          state.tripData.days.some(day => day.activities.some(act => act.id === payload.event.id && !mutations.deleted.includes(act.id)));

      document.getElementById('import-event-duplicate-warning').style.display = isDuplicate ? 'block' : 'none';

      // Save event payload on modal element as JSON string attribute for confirm hook
      modal.setAttribute('data-payload', JSON.stringify(payload.event));
      modal.classList.add('active');

    } else if (action === 'import-spend' && payload.spend) {
      const modal = document.getElementById('import-spend-modal');
      document.getElementById('import-spend-id').value = payload.spend.id;
      document.getElementById('import-spend-category').innerText = payload.spend.category || 'Other';
      document.getElementById('import-spend-note').innerText = payload.spend.note || '';
      
      const amount = payload.spend.amount;
      const currency = payload.spend.currency || 'JPY';
      document.getElementById('import-spend-amount').innerText = currency === 'USD' ? `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `¥${amount.toLocaleString()}`;

      const rate = payload.spend.exchangeRate || USD_TO_JPY_RATE;
      document.getElementById('import-spend-rate-info').innerText = `💱 Exchange Rate: 1 USD = ${rate.toFixed(2)} JPY`;

      // Populate day selection drop-down list
      const daySelect = document.getElementById('import-spend-day');
      daySelect.innerHTML = '';
      state.tripData.days.forEach((d, idx) => {
        daySelect.innerHTML += `<option value="${idx}">Day ${d.dayNumber} · ${d.title}</option>`;
      });
      daySelect.value = payload.dayIndex !== undefined ? payload.dayIndex : 0;

      // Duplicate Check
      const entries = loadBudgetEntries();
      const isDuplicate = entries.some(e => e.id === payload.spend.id);
      document.getElementById('import-spend-duplicate-warning').style.display = isDuplicate ? 'block' : 'none';

      modal.setAttribute('data-payload', JSON.stringify(payload.spend));
      modal.classList.add('active');
    }
  } catch (err) {
    console.error('[Import] Failed to parse shared import link data:', err);
    clearUrlParams();
  }
}

// Confirm event import action
export function handleConfirmImportEvent(event) {
  event.preventDefault();
  const modal = document.getElementById('import-event-modal');
  const eventData = JSON.parse(modal.getAttribute('data-payload'));
  const dayIndex = parseInt(document.getElementById('import-event-day').value);

  const mutations = getItineraryMutations();

  // If deleted, undo deletion
  mutations.deleted = mutations.deleted.filter(id => id !== eventData.id);

  // If already locally added, overwrite it
  const addedIdx = mutations.added.findIndex(item => item.event.id === eventData.id);
  if (addedIdx !== -1) {
    mutations.added[addedIdx] = { dayIndex, event: eventData };
  } else {
    // If it was a base itinerary item edited, overwrite edited
    const existsInBase = state.rawTripData.days.some(day => day.activities.some(act => act.id === eventData.id));
    if (existsInBase) {
      mutations.edited[eventData.id] = {
        time: eventData.time,
        title: eventData.title,
        description: eventData.description,
        location: eventData.location,
        travelMode: eventData.travelMode,
        variant: eventData.variant,
        notes: eventData.notes,
        bookingRef: eventData.bookingRef
      };
    } else {
      // Add as a new custom event
      mutations.added.push({ dayIndex, event: eventData });
    }
  }

  saveItineraryMutations(mutations);
  applyItineraryMutations();

  modal.classList.remove('active');
  clearUrlParams();

  // Redirect to active itinerary day
  switchTab('itinerary');
  selectDayTab(dayIndex, true);

  // Show status banner notification
  const banner = document.getElementById('status-banner');
  if (banner) {
    banner.style.display = 'flex';
    document.getElementById('banner-message').innerText = `🌸 Successfully imported event "${eventData.title}"!`;
    setTimeout(() => {
      banner.style.display = 'none';
    }, 4000);
  }
}

// Confirm budget expense import action
export function handleConfirmImportSpend(event) {
  event.preventDefault();
  const modal = document.getElementById('import-spend-modal');
  const spendData = JSON.parse(modal.getAttribute('data-payload'));
  const dayIndex = parseInt(document.getElementById('import-spend-day').value);

  const entries = loadBudgetEntries();
  const existingIdx = entries.findIndex(e => e.id === spendData.id);
  const newEntry = {
    id: spendData.id,
    dayIndex,
    category: spendData.category,
    currency: spendData.currency,
    amount: spendData.amount,
    time: spendData.time || null,
    sortOrder: spendData.sortOrder !== undefined ? spendData.sortOrder : null,
    note: spendData.note,
    exchangeRate: spendData.exchangeRate || USD_TO_JPY_RATE,
    timestamp: Date.now()
  };

  if (existingIdx !== -1) {
    entries[existingIdx] = newEntry;
  } else {
    entries.push(newEntry);
  }

  saveBudgetEntries(entries);

  modal.classList.remove('active');
  clearUrlParams();

  // Redirect to budget page
  switchTab('budget');
  renderBudget();

  // Show status banner notification
  const banner = document.getElementById('status-banner');
  if (banner) {
    banner.style.display = 'flex';
    document.getElementById('banner-message').innerText = `💴 Successfully imported expense "${spendData.category}"!`;
    setTimeout(() => {
      banner.style.display = 'none';
    }, 4000);
  }
}

// Bind handlers to window object for HTML form onsubmit actions compatibility
window.handleConfirmImportEvent = handleConfirmImportEvent;
window.handleConfirmImportSpend = handleConfirmImportSpend;
