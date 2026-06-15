// Constants
export const USD_TO_JPY_RATE = 155; // Offline-first JPY conversion rate

// Local Storage Keys
export const CHECKLIST_STORAGE_KEY = 'japan-trip-checklist-state';
export const BUDGET_STORAGE_KEY = 'japan-trip-budget-entries';
export const THEME_STORAGE_KEY = 'japan-trip-theme-preference';
export const ITINERARY_MUTATIONS_KEY = 'japan-trip-itinerary-mutations';

// Global State object to allow sharing mutable state between ES6 modules
export const state = {
  tripData: null,
  rawTripData: null,
  activeTab: 'itinerary',
  selectedDay: 0,
  autoDetectedDay: 0,
  dateBannerMessage: '',
  activeCityFilter: 'All',
  deferredPrompt: null
};

// Custom Confirmation Dialog Helper (Returns a Promise)
export function showCustomConfirm(title, message) {
  return new Promise((resolve) => {
    const modal = document.getElementById('confirm-modal');
    const titleEl = document.getElementById('confirm-modal-title');
    const bodyEl = document.getElementById('confirm-modal-body');
    const cancelBtn = document.getElementById('confirm-modal-cancel');
    const okBtn = document.getElementById('confirm-modal-ok');

    titleEl.innerText = title;
    bodyEl.innerText = message;
    
    modal.classList.add('active');

    function cleanUp() {
      modal.classList.remove('active');
      cancelBtn.removeEventListener('click', onCancel);
      okBtn.removeEventListener('click', onConfirm);
    }

    function onCancel() {
      cleanUp();
      resolve(false);
    }

    function onConfirm() {
      cleanUp();
      resolve(true);
    }

    cancelBtn.addEventListener('click', onCancel);
    okBtn.addEventListener('click', onConfirm);
  });
}

// Parse time strings into total minutes from midnight for sorting
export function timeStringToMinutes(timeStr) {
  if (!timeStr) return 1440;
  const cleanStr = timeStr.replace(/[~]/g, '').trim().toLowerCase();
  
  if (cleanStr.includes('evening') || cleanStr.includes('night') || cleanStr.includes('dinner')) return 1200;
  if (cleanStr.includes('afternoon') || cleanStr.includes('lunch') || cleanStr.includes('midday')) return 720;
  if (cleanStr.includes('morning') || cleanStr.includes('breakfast')) return 480;
  if (cleanStr.includes('pre-flight') || cleanStr.includes('pre-load') || cleanStr.includes('pre-trip')) return -10;
  if (cleanStr.includes('overnight')) return 1400;

  const match = cleanStr.match(/^(\d+):(\d+)\s*(am|pm)/);
  if (match) {
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const ampm = match[3];
    if (ampm === 'pm' && hours < 12) hours += 12;
    if (ampm === 'am' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }
  
  const matchHour = cleanStr.match(/^(\d+)\s*(am|pm)/);
  if (matchHour) {
    let hours = parseInt(matchHour[1]);
    const ampm = matchHour[2];
    if (ampm === 'pm' && hours < 12) hours += 12;
    if (ampm === 'am' && hours === 12) hours = 0;
    return hours * 60;
  }

  return 1440;
}

// Safely encodes an object into a URL-friendly Base64 UTF-8 string
export function encodeShareData(obj) {
  const jsonStr = JSON.stringify(obj);
  const utf8Bytes = new TextEncoder().encode(jsonStr);
  let binary = '';
  const len = utf8Bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  const b64 = btoa(binary);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Decodes a URL-friendly Base64 UTF-8 string back into an object
export function decodeShareData(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const jsonStr = new TextDecoder().decode(bytes);
  return JSON.parse(jsonStr);
}

// Clears URL query parameters without triggering a page reload
export function clearUrlParams() {
  const cleanUrl = window.location.origin + window.location.pathname;
  window.history.replaceState({}, document.title, cleanUrl);
}
