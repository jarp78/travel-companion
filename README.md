# Japan Family Trip PWA 🌸

An offline-first, progressive web app (PWA) trip companion for a 12-day family trip to Japan (June 15–27, 2026). It serves as the single source of truth for the daily itinerary, hotel/booking details, Shinkansen seat assignments, packing checklists, and budget tracking.

---

## Features

1. **Offline-First Itinerary**: Entire day-by-day itinerary (Day 0 to Day 12) is stored locally and cached. View timelines, descriptions, and travel modes without cellular data.
2. **"Today" Detection**: Auto-detects the current date (when between June 15–27, 2026), highlights the active day, and scrolls to it automatically. Features a manual selector override for testing and viewing other days.
3. **Google Maps Integration**: Deep-links maps and routing via Universal URLs. E.g., clicking "Navigate" opens Google Maps directly with transit/walking/driving modes preset.
4. **Pre-Trip Checklist**: Interactive, grouped checklists categorized by time frames (6-8 weeks, 2-3 weeks, 1 week before departure) with progress indicators. Checked items persist in `localStorage`.
5. **Interactive Budget Tracker**: Track actual spend entries vs the initial daily estimates in Yen (¥). Converts Yen totals to USD ($) using a hardcoded approximate exchange rate of 1 USD = 155 JPY.
6. **Bookings & Reference Info**: Shinkansen train segment seat allocations, reference numbers, and recommended hotel listings with checkout tracking.
7. **Local Storage Persistence**: Checklists and budget transactions are saved directly to the device storage so your modifications survive app closure and system restarts.

---

## Technical Specifications

- **Tech Stack**: Static HTML5 + Vanilla JS + CSS3 (No build step, no frameworks).
- **Service Worker**: Cache-first asset pre-caching with automatic cache refresh in the background when online (stale-while-revalidate).
- **Icons**: 192x192 and 512x512 maskable PNGs.

---

## Local Setup & Testing

1. Clone or pull the repository to your local drive.
2. Serve the directory using any local web server (e.g., Python's simple HTTP server or Node `http-server`).
   
   Using Python:
   ```bash
   python -m http.server 8000
   ```
   
   Using Node (npx):
   ```bash
   npx http-server . -p 8000
   ```
3. Open `http://localhost:8000` in your browser.
4. Open Chrome Developer Tools → **Application** tab → **Service Workers** to check registration. Toggle the **Offline** checkbox and refresh to test offline performance.

---

## GitHub Pages Deployment

To host the app for your family members' phones:

1. Create a new repository on GitHub (e.g., `travel-companion` or `japan-trip-2026`).
2. Push all project files (`index.html`, `style.css`, `app.js`, `itinerary.json`, `manifest.json`, `service-worker.js`, and the `icons/` folder) to the `main` branch.
3. Navigate to **Settings** → **Pages** in your GitHub repository.
4. Under **Build and deployment**, set Source to **Deploy from a branch**.
5. Select the **main** branch and **/ (root)** folder, then click **Save**.
6. Wait 1–2 minutes. GitHub will deploy your site at `https://<your-github-username>.github.io/travel-companion/`.
7. Access this URL on each mobile device over HTTPS (Service Workers require HTTPS to register).

---

## How to Install (Add to Home Screen)

### Android (Chrome)
1. Open the deployed HTTPS URL in Google Chrome.
2. An **Add to Home Screen** banner should appear at the bottom of the screen.
3. Click **Install App** (or select **Add to Home screen** from the Chrome menu).
4. The app icon will appear on your home screen and run in standalone display mode (no browser address bar).

### iOS (Safari)
1. Open the deployed HTTPS URL in Safari.
2. Tap the **Share** button (box with upward arrow) at the bottom navigation bar.
3. Scroll down and tap **Add to Home Screen**.
4. Tap **Add** in the top-right corner to complete.
5. Launch the app from the home screen icon.
