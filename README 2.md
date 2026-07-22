# Device Tracker

Track where your devices are (phones, laptops, earbuds, etc.), whether they're
online, and get alerted if one goes quiet, runs low on battery, or leaves a
zone you've set up. Built with Vite + React on the frontend and a small
Node/Express + SQLite API on the backend.

## Important limitation, read first

**A device with no power left cannot be tracked by any software, including
this one.** No power means no signal to send. What this app *can* do:

- Track devices that are on and have connectivity (the normal case)
- Show the **last known location** before a device went offline or died
- Alert you when a device stops checking in, so you know something changed

There's no way around the physics here — Apple's Find My and Google's Find My
Device work around it only by having *other people's* devices relay a
Bluetooth signal, which is a closed network you can't build a custom app on
top of.

## How it works

1. **Dashboard** (this Vite/React app) — map + list of your devices, alerts,
   zone management, and view-only sharing via invite links.
2. **Backend API** — stores devices, location pings, geofences, and alerts;
   runs a scheduled sweep every 5 minutes to flag offline/low-battery devices.
3. **Device agent** — each tracked device "checks in" every 5 minutes while
   it's on. For phones, install the frontend as a PWA and open `/pair` on
   that device to start reporting its own location/battery. For laptops, you
   can do the same, or adapt `frontend/src/agent/checkin.js` into a small
   background script.

```
device (phone/laptop) --check-in every 5 min--> backend API --> SQLite
                                                     |
owner's browser <--dashboard reads status/alerts-----+
```

## Project structure

```
device-tracker/
  backend/     Express API + SQLite (auth, devices, pings, geofences, alerts)
  frontend/    Vite + React dashboard, installable as a PWA
```

## Running it locally

### Backend

```bash
cd backend
npm install
cp .env.example .env      # edit JWT_SECRET before deploying anywhere real
npm run dev
```

Runs on `http://localhost:4000` and creates `backend/data/tracker.db`
automatically on first run.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env      # point VITE_API_URL at your backend if not local
npm run dev
```

Runs on `http://localhost:5173`.

### Try the flow

1. Sign up on the dashboard.
2. Add a device — you'll be shown a **device key** once.
3. On the device you want tracked (or the same browser, for testing), open
   `/pair`, paste in the device key, and start check-ins.
4. Watch the dashboard: the pulse indicator on the device card speeds up when
   it's online and shows the last-seen time on hover.
5. Open the device's detail page to draw a zone (geofence) or generate a
   view-only invite link for someone else.

## Pushing to GitHub

```bash
cd device-tracker
git init
git add .
git commit -m "Initial device tracker scaffold"
git branch -M main
git remote add origin https://github.com/<your-username>/device-tracker.git
git push -u origin main
```

## What's stubbed vs. real for v1

- **Real**: auth, device registry, manual + invite-link/QR-ready sharing
  (view-only), location history, geofence alerts, offline/low-battery alerts,
  installable PWA check-in agent.
- **Stretch goal, not built here**: pulling live data from Apple's Find My or
  Google's Find My Device. Neither has a public API — doing this means
  relying on unofficial/reverse-engineered endpoints that can break without
  warning, so it's worth treating as a separate, optional integration rather
  than part of the core app.
