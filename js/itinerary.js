import { 
  state, 
  ITINERARY_MUTATIONS_KEY, 
  showCustomConfirm, 
  timeStringToMinutes,
  encodeShareData,
  copyTextToClipboard
} from './helpers.js';

// Get itinerary mutations from localStorage
export function getItineraryMutations() {
  const dataStr = localStorage.getItem(ITINERARY_MUTATIONS_KEY);
  return dataStr ? JSON.parse(dataStr) : { added: [], edited: {}, deleted: [] };
}

// Save itinerary mutations to localStorage
export function saveItineraryMutations(mutations) {
  localStorage.setItem(ITINERARY_MUTATIONS_KEY, JSON.stringify(mutations));
}

// Apply local storage mutations on top of raw itinerary.json
export function applyItineraryMutations() {
  if (!state.rawTripData) return;
  state.tripData = JSON.parse(JSON.stringify(state.rawTripData));
  const mutations = getItineraryMutations();

  state.tripData.days.forEach((day, index) => {
    let activities = day.activities.map(act => {
      if (mutations.deleted.includes(act.id)) return null;
      if (mutations.edited[act.id]) {
        return { ...act, ...mutations.edited[act.id] };
      }
      return act;
    }).filter(act => act !== null);

    const additions = mutations.added.filter(item => item.dayIndex === index);
    additions.forEach(item => {
      activities.push(item.event);
    });

    activities.sort((a, b) => timeStringToMinutes(a.time) - timeStringToMinutes(b.time));
    day.activities = activities;
  });
}

// Render Day Tabs Horizontal Scroll List
export function renderDayNavigator() {
  const navContainer = document.getElementById('day-tabs');
  navContainer.innerHTML = '';
  
  if (!state.tripData || !state.tripData.days) return;

  state.tripData.days.forEach((day, index) => {
    const isToday = index === state.autoDetectedDay;
    
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

export function selectDayTab(dayIndex, scroll = false) {
  state.selectedDay = dayIndex;
  
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
export function renderItineraryDay() {
  const container = document.getElementById('itinerary-details');
  container.innerHTML = '';

  if (!state.tripData || !state.tripData.days || !state.tripData.days[state.selectedDay]) return;

  const day = state.tripData.days[state.selectedDay];

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
  state.tripData.days.forEach((d, idx) => {
    selectDayOptions += `<option value="${idx}" ${idx === state.selectedDay ? 'selected' : ''}>Day ${d.dayNumber}: ${d.title}</option>`;
  });

  headerDiv.innerHTML = `
    <div class="day-title-row">
      <div class="day-title-group">
        <h2 class="day-title-text">${day.dayLabel}</h2>
        <div class="day-theme">${day.theme}</div>
      </div>
      <div style="display: flex; gap: 8px; align-items: center; width: 100%;">
        <div class="day-selector-wrapper" style="flex: 1;">
          <select id="day-selector-dropdown" class="form-control" style="width: 100%; padding: 8px 12px; font-size: 0.9rem; font-weight: 600;">
            ${selectDayOptions}
          </select>
        </div>
        <button class="btn btn-primary" onclick="openEventModal('', ${state.selectedDay})" style="font-size: 0.85rem; padding: 8px 14px; flex-shrink: 0; display: flex; align-items: center; gap: 4px; height: 38px;">
          ➕ Add Event
        </button>
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
            <span class="copyable" onclick="copyTextToClipboard('${act.bookingRef.replace(/'/g, "\\'")}', 'Reference')" title="Click to copy" style="cursor: pointer; font-weight: 700; text-decoration: underline; text-underline-offset: 2px;">${act.bookingRef} 📋</span>
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
            <div class="card-edit-actions">
              <button class="btn btn-icon-only" onclick="shareEvent('${act.id}')">📤 Share</button>
              <button class="btn btn-icon-only" onclick="openEventModal('${act.id}', ${state.selectedDay})">✏️ Edit</button>
              <button class="btn btn-icon-only btn-danger" onclick="confirmDeleteEvent('${act.id}')">🗑️ Delete</button>
            </div>
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
export function toggleCardCollapse(cardId) {
  const card = document.getElementById(`card-${cardId}`);
  if (card) {
    card.classList.toggle('collapsed');
  }
}

// Open Modal Form for Itinerary Events
export function openEventModal(eventId = '', dayIndex = 0) {
  const modal = document.getElementById('event-modal');
  const titleEl = document.getElementById('event-modal-title');
  const form = document.getElementById('event-form');
  
  form.reset();
  document.getElementById('event-id').value = eventId;
  
  if (eventId) {
    titleEl.innerText = '✏️ Edit Itinerary Event';
    const day = state.tripData.days[dayIndex];
    const event = day.activities.find(act => act.id === eventId);
    
    if (event) {
      document.getElementById('event-time').value = event.time || '';
      document.getElementById('event-title').value = event.title || '';
      document.getElementById('event-desc').value = event.description || '';
      document.getElementById('event-loc-name').value = (event.location && event.location.name) || '';
      document.getElementById('event-loc-addr').value = (event.location && event.location.address) || '';
      document.getElementById('event-mode').value = event.travelMode || '';
      document.getElementById('event-variant').value = event.variant || '';
      document.getElementById('event-tips').value = (event.notes && event.notes.join('\n')) || '';
      document.getElementById('event-booking').value = event.bookingRef || '';
    }
  } else {
    titleEl.innerText = '➕ Add Itinerary Event';
  }

  modal.classList.add('active');
}

// Handle Event Modal Form Submit
export function handleSaveEvent(event) {
  event.preventDefault();
  
  const eventId = document.getElementById('event-id').value;
  const time = document.getElementById('event-time').value;
  const title = document.getElementById('event-title').value;
  const description = document.getElementById('event-desc').value;
  const locName = document.getElementById('event-loc-name').value;
  const locAddr = document.getElementById('event-loc-addr').value;
  const travelMode = document.getElementById('event-mode').value || null;
  const variant = document.getElementById('event-variant').value || null;
  const tipsText = document.getElementById('event-tips').value;
  const bookingRef = document.getElementById('event-booking').value || null;

  const notes = tipsText ? tipsText.split('\n').map(line => line.trim()).filter(Boolean) : [];
  const location = locName ? { name: locName, address: locAddr || null } : null;

  const mutations = getItineraryMutations();

  if (eventId) {
    // Check if it's a locally added event first
    const localAddedIndex = mutations.added.findIndex(item => item.event.id === eventId);
    if (localAddedIndex !== -1) {
      mutations.added[localAddedIndex].event = {
        ...mutations.added[localAddedIndex].event,
        time, title, description, location, travelMode, variant, notes, bookingRef
      };
    } else {
      mutations.edited[eventId] = {
        time, title, description, location, travelMode, variant, notes, bookingRef
      };
    }
  } else {
    const newId = 'custom-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const newEvent = {
      id: newId,
      time, title, description, location, travelMode, variant, notes, bookingRef
    };
    mutations.added.push({
      dayIndex: state.selectedDay,
      event: newEvent
    });
  }

  saveItineraryMutations(mutations);
  applyItineraryMutations();
  
  document.getElementById('event-modal').classList.remove('active');
  renderItineraryDay();
}

// Confirm and Delete Event
export function confirmDeleteEvent(eventId) {
  showCustomConfirm(
    '🗑️ Delete Event?', 
    'Are you sure you want to delete this event from the itinerary? This cannot be undone.'
  ).then(confirmResult => {
    if (confirmResult) {
      const mutations = getItineraryMutations();
      const localIndex = mutations.added.findIndex(item => item.event.id === eventId);
      
      if (localIndex !== -1) {
        mutations.added.splice(localIndex, 1);
      } else {
        mutations.deleted.push(eventId);
      }
      
      saveItineraryMutations(mutations);
      applyItineraryMutations();
      renderItineraryDay();
    }
  });
}

export function shareEvent(eventId) {
  const day = state.tripData.days[state.selectedDay];
  const event = day.activities.find(act => act.id === eventId);
  if (!event) return;

  const payload = {
    dayIndex: state.selectedDay,
    event: {
      id: event.id,
      time: event.time || '',
      title: event.title || '',
      description: event.description || '',
      location: event.location || null,
      travelMode: event.travelMode || null,
      variant: event.variant || null,
      notes: event.notes || [],
      bookingRef: event.bookingRef || null
    }
  };

  const shareCode = encodeShareData(payload);
  const shareUrl = `${window.location.origin}${window.location.pathname}?action=import-event&data=${shareCode}`;

  if (navigator.share) {
    navigator.share({
      title: `Japan Trip Event: ${event.title}`,
      text: `🌸 Japan Trip Event:\n"${event.title}"\n\nClick the link below to import this event into your travel companion:\n\n\n${shareUrl}`
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

// Bind interactive functions to window object for inline HTML event handlers compatibility
window.toggleCardCollapse = toggleCardCollapse;
window.openEventModal = openEventModal;
window.handleSaveEvent = handleSaveEvent;
window.confirmDeleteEvent = confirmDeleteEvent;
window.shareEvent = shareEvent;
window.copyTextToClipboard = copyTextToClipboard;

// Handle Itinerary Search Event
export function handleItinerarySearch(event) {
  const query = event.target.value.toLowerCase().trim();
  const clearBtn = document.getElementById('clear-itinerary-search');
  
  if (!query) {
    clearBtn.style.display = 'none';
    selectDayTab(state.selectedDay, false);
    return;
  }
  
  clearBtn.style.display = 'block';
  renderSearchResults(query);
}

// Clear search input and restore timeline view
export function clearItinerarySearch() {
  const input = document.getElementById('itinerary-search-input');
  input.value = '';
  const clearBtn = document.getElementById('clear-itinerary-search');
  clearBtn.style.display = 'none';
  selectDayTab(state.selectedDay, false);
}

// Render search results across all 13 days
function renderSearchResults(query) {
  const container = document.getElementById('itinerary-details');
  container.innerHTML = '';

  const resultsHeader = document.createElement('div');
  resultsHeader.className = 'day-header';
  resultsHeader.innerHTML = `
    <div class="day-title-row">
      <h2 class="day-title-text">🔍 Search Results</h2>
      <div class="day-theme">Searching all days for "${query}"</div>
    </div>
  `;
  container.appendChild(resultsHeader);

  const timelineDiv = document.createElement('div');
  timelineDiv.className = 'timeline';

  let totalMatches = 0;

  state.tripData.days.forEach((day, dayIdx) => {
    day.activities.forEach(act => {
      const titleMatch = act.title && act.title.toLowerCase().includes(query);
      const descMatch = act.description && act.description.toLowerCase().includes(query);
      const notesMatch = act.notes && act.notes.some(note => note.toLowerCase().includes(query));
      const locMatch = act.location && (
        (act.location.name && act.location.name.toLowerCase().includes(query)) ||
        (act.location.address && act.location.address.toLowerCase().includes(query))
      );
      const refMatch = act.bookingRef && act.bookingRef.toLowerCase().includes(query);

      if (titleMatch || descMatch || notesMatch || locMatch || refMatch) {
        totalMatches++;
        
        const card = document.createElement('div');
        card.className = 'timeline-item';
        if (act.variant === 'A') card.classList.add('variant-a');
        if (act.variant === 'B') card.classList.add('variant-b');

        const badgeHtml = act.variant 
          ? `<span class="badge ${act.variant === 'A' ? 'badge-a' : 'badge-b'}">${act.variant === 'A' ? 'Original Plan' : 'Suggested Addition'}</span>`
          : '';

        const dayBadgeHtml = `<span class="badge badge-today" style="margin-left: auto;">Day ${day.dayNumber}</span>`;

        let navigateButtonHtml = '';
        if (act.location) {
          const mode = act.travelMode || 'transit';
          const searchDest = act.location.address || act.location.name;
          const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(searchDest)}&travelmode=${mode}`;
          navigateButtonHtml = `
            <button class="btn btn-primary" onclick="window.open('${mapsUrl}', '_blank')">
              🧭 Navigate
            </button>
          `;
        }

        let detailsHtml = '';
        if (act.bookingRef) {
          detailsHtml += `
            <div class="card-detail-item">
              <span class="detail-label">🎟️ Reference:</span>
              <span class="copyable" onclick="copyTextToClipboard('${act.bookingRef.replace(/'/g, "\\'")}', 'Reference')" title="Click to copy" style="cursor: pointer; font-weight: 700; text-decoration: underline; text-underline-offset: 2px;">${act.bookingRef} 📋</span>
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
          <div class="card" id="card-${act.id}">
            <div class="card-header-row" onclick="toggleCardCollapse('${act.id}')">
              <div class="card-title-group" style="display: flex; flex-direction: column; width: 100%;">
                <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                  ${act.time ? `<div class="card-time">${act.time}</div>` : ''}
                  ${dayBadgeHtml}
                </div>
                <div class="card-title" style="margin-top: 4px;">${act.title} ${badgeHtml}</div>
              </div>
            </div>
            <div class="card-body" style="display: block;">
              ${act.description ? `<div class="card-description">${act.description}</div>` : ''}
              ${detailsHtml ? `<div class="card-details-grid">${detailsHtml}</div>` : ''}
              ${tipsHtml}
              ${navigateButtonHtml ? `<div class="card-actions">${navigateButtonHtml}</div>` : ''}
              <div class="card-edit-actions">
                <button class="btn btn-icon-only" onclick="shareEvent('${act.id}')">📤 Share</button>
                <button class="btn btn-icon-only" onclick="openEventModal('${act.id}', ${dayIdx})">✏️ Edit</button>
                <button class="btn btn-icon-only btn-danger" onclick="confirmDeleteEvent('${act.id}')">🗑️ Delete</button>
              </div>
            </div>
          </div>
        `;
        timelineDiv.appendChild(card);
      }
    });
  });

  if (totalMatches === 0) {
    timelineDiv.innerHTML = `
      <div style="padding: 30px; text-align: center; color: var(--text-muted);">
        <p style="font-size: 1.2rem; margin-bottom: 8px;">🔍 No matching events found</p>
        <p style="font-size: 0.85rem;">Try searching for terms like "Hotel", "Shinkansen", "Temple", or "Ramen".</p>
      </div>
    `;
  }

  container.appendChild(timelineDiv);
}

// Bind search handlers to window
window.handleItinerarySearch = handleItinerarySearch;
window.clearItinerarySearch = clearItinerarySearch;
