import { state } from './helpers.js';

// FOOD GUIDE & PRACTICAL TIPS TAB LOGIC
export function renderFood() {
  const container = document.getElementById('food-content');
  container.innerHTML = '';

  if (!state.tripData) return;

  // Render City Filters buttons
  const filtersDiv = document.createElement('div');
  filtersDiv.className = 'filter-tabs';
  
  const cities = ['All', 'Tokyo', 'Kyoto', 'Osaka'];
  let filterBtnsHtml = '';
  cities.forEach(city => {
    filterBtnsHtml += `
      <button class="filter-tab-btn ${state.activeCityFilter === city ? 'active' : ''}" onclick="setCityFilter('${city}')">
        ${city === 'All' ? '🌐 All Cities' : city === 'Tokyo' ? '🗼 Tokyo' : city === 'Kyoto' ? '⛩️ Kyoto' : '🐙 Osaka'}
      </button>
    `;
  });
  filtersDiv.innerHTML = filterBtnsHtml;
  container.appendChild(filtersDiv);

  // 1. Render RESTAURANT PICKS based on activeCityFilter
  const picksHeader = document.createElement('div');
  picksHeader.className = 'info-section-title';
  picksHeader.innerText = `🍴 Local Restaurant Selections (${state.activeCityFilter})`;
  container.appendChild(picksHeader);

  const filteredPicks = state.activeCityFilter === 'All' 
    ? state.tripData.restaurantPicks 
    : state.tripData.restaurantPicks.filter(p => p.city === state.activeCityFilter);

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
  if (state.activeCityFilter === 'All') {
    const foodHeader = document.createElement('div');
    foodHeader.className = 'info-section-title';
    foodHeader.style.marginTop = '24px';
    foodHeader.innerText = '🍜 Must-Try Japanese Foods';
    container.appendChild(foodHeader);

    if (state.tripData.foodGuide && state.tripData.foodGuide.length > 0) {
      state.tripData.foodGuide.forEach((food, index) => {
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

  if (state.tripData.practicalTips && state.tripData.practicalTips.length > 0) {
    state.tripData.practicalTips.forEach((tipGroup, index) => {
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

export function setCityFilter(city) {
  state.activeCityFilter = city;
  renderFood();
}

export function toggleGuideCollapse(guideId) {
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
}

// Bind interactive functions to window object
window.setCityFilter = setCityFilter;
window.toggleGuideCollapse = toggleGuideCollapse;
