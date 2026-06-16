import { state, copyTextToClipboard, showCustomConfirm } from './helpers.js';

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

  // 4. Render DATA MANAGEMENT & BACKUP Section
  const dataHeader = document.createElement('div');
  dataHeader.className = 'info-section-title';
  dataHeader.innerText = '⚙️ Data Management & Backup';
  container.appendChild(dataHeader);

  const dataCard = document.createElement('div');
  dataCard.className = 'hotel-card';
  dataCard.style.padding = '16px';
  dataCard.innerHTML = `
    <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 12px; line-height: 1.4;">
      Export your current checklist, actual budget entries, and custom itinerary edits to a backup file, or import an existing backup.
    </div>
    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
      <button class="btn btn-primary" onclick="window.exportData()" style="flex: 1; font-size: 0.8rem; padding: 10px 12px; white-space: nowrap;">
        📤 Export Data (JSON)
      </button>
      <button class="btn" onclick="document.getElementById('import-backup-file').click()" style="flex: 1; font-size: 0.8rem; padding: 10px 12px; white-space: nowrap; border: 1px solid var(--border-color);">
        📥 Import Data File
      </button>
    </div>
    <input type="file" id="import-backup-file" style="display: none;" onchange="window.importDataFromFile(event)" accept=".json" />
    <div id="github-seed-container"></div>
  `;
  container.appendChild(dataCard);

  // Trigger checking for repo-committed backup seed
  loadGithubSeedData();
}

export function exportData() {
  const exportObject = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    data: {}
  };
  
  const EXPORT_KEYS = [
    'japan-trip-checklist-state',
    'japan-trip-budget-entries',
    'japan-trip-theme-preference',
    'japan-trip-itinerary-mutations',
    'japan-trip-exchange-rate'
  ];

  EXPORT_KEYS.forEach(key => {
    const val = localStorage.getItem(key);
    if (val !== null) {
      exportObject.data[key] = val;
    }
  });

  const jsonString = JSON.stringify(exportObject, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `japan-trip-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importDataFromFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const backup = JSON.parse(e.target.result);
      if (backup && backup.data) {
        const confirmResult = await showCustomConfirm(
          '📥 Import Backup Data?',
          'This will overwrite your local checklist, budget, and itinerary modifications with the selected backup file. Are you sure?'
        );
        if (confirmResult) {
          Object.keys(backup.data).forEach(key => {
            localStorage.setItem(key, backup.data[key]);
          });
          await showCustomConfirm(
            '✅ Success',
            'Data imported successfully! Click Confirm to reload the page.'
          );
          window.location.reload();
        }
      } else {
        await showCustomConfirm('❌ Error', 'Invalid backup file format.');
      }
    } catch (err) {
      await showCustomConfirm('❌ Error', 'Failed to parse backup file: ' + err.message);
    }
  };
  reader.readAsText(file);
}

export async function loadGithubSeedData() {
  try {
    const response = await fetch('./data-seed.json');
    if (!response.ok) return; // Silent if no seed file exists in repo
    
    const seed = await response.json();
    if (seed && seed.data) {
      // We found a valid seed file in the repo! Show the import option.
      const container = document.getElementById('github-seed-container');
      if (container) {
        container.innerHTML = `
          <div style="margin-top: 15px; padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); border-left: 4px solid var(--primary); background-color: var(--bg-base);">
            <div style="font-weight: 700; font-size: 0.9rem; margin-bottom: 4px;">📥 GitHub Data Backup Available</div>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 10px; line-height: 1.4;">
              A data backup is available directly from the repository. You can synchronize your local data with this committed state.
            </div>
            <button class="btn btn-primary" onclick="window.applyGithubSeed()" style="font-size: 0.8rem; padding: 6px 12px;">
              Sync GitHub Backup
            </button>
          </div>
        `;
      }
    }
  } catch (err) {
    console.log('[Seed Loader] No data-seed.json found in repository root or failed to parse:', err);
  }
}

export async function applyGithubSeed() {
  const confirmResult = await showCustomConfirm(
    '🔄 Sync GitHub Backup?',
    'This will overwrite your local checklist, budget, and itinerary modifications with the backup pushed to GitHub. Are you sure?'
  );
  if (confirmResult) {
    try {
      const response = await fetch('./data-seed.json');
      const seed = await response.json();
      if (seed && seed.data) {
        Object.keys(seed.data).forEach(key => {
          localStorage.setItem(key, seed.data[key]);
        });
        await showCustomConfirm(
          '✅ Success',
          'Successfully synchronized with GitHub backup! Click Confirm to reload the page.'
        );
        window.location.reload();
      }
    } catch (err) {
      await showCustomConfirm('❌ Error', 'Failed to apply GitHub seed data: ' + err.message);
    }
  }
}

// Bind functions to window object for compatibility
window.exportData = exportData;
window.importDataFromFile = importDataFromFile;
window.applyGithubSeed = applyGithubSeed;
