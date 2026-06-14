import { 
  state, 
  THEME_STORAGE_KEY 
} from './js/helpers.js';
import { 
  applyItineraryMutations, 
  renderDayNavigator, 
  selectDayTab 
} from './js/itinerary.js';
import { renderChecklist } from './js/checklist.js';
import { renderBudget } from './js/budget.js';
import { renderInfo } from './js/info.js';
import { renderFood } from './js/food.js';

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
    selectDayTab(state.autoDetectedDay, true);
  });

  // Close modals hooks
  document.getElementById('event-modal-close').addEventListener('click', () => {
    document.getElementById('event-modal').classList.remove('active');
  });
  document.getElementById('budget-edit-modal-close').addEventListener('click', () => {
    document.getElementById('budget-edit-modal').classList.remove('active');
  });
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
    selectDayTab(state.selectedDay, false);
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
