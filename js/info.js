import { state, copyTextToClipboard } from './helpers.js';

// INFO VIEW (HOTELS & SHINKANSEN TRAINS) TAB LOGIC
export function renderInfo() {
  const container = document.getElementById('info-content');
  container.innerHTML = '';

  if (!state.tripData) return;

  // 1. Render BOOKED HOTELS List
  const bookedHeader = document.createElement('div');
  bookedHeader.className = 'info-section-title';
  bookedHeader.innerText = '🏨 Booked Accommodations';
  container.appendChild(bookedHeader);

  if (state.tripData.bookedHotels && state.tripData.bookedHotels.length > 0) {
    state.tripData.bookedHotels.forEach(hotel => {
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

  if (state.tripData.trains && state.tripData.trains.length > 0) {
    state.tripData.trains.forEach(train => {
      const card = document.createElement('div');
      card.className = 'train-card';

      // Map passenger rows
      let seatRows = '';
      train.seats.forEach(s => {
        seatRows += `
          <tr>
            <td>${s.passenger}</td>
            <td><span class="copyable" onclick="copyTextToClipboard('${s.seat}', 'Seat')" title="Click to copy" style="cursor: pointer; font-family: 'Outfit', sans-serif; font-weight: 700; color: var(--primary); text-decoration: underline; text-underline-offset: 2px;">${s.seat} 📋</span></td>
            <td><span class="copyable" onclick="copyTextToClipboard('${s.ref}', 'Reference')" title="Click to copy" style="cursor: pointer; font-size: 0.8rem; text-decoration: underline; text-underline-offset: 2px;">${s.ref} 📋</span></td>
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

  if (state.tripData.hotels && state.tripData.hotels.length > 0) {
    state.tripData.hotels.forEach(hotel => {
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
