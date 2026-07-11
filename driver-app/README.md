# Driver App

Expo (TypeScript) app representing a single ambulance driver's phone. Talks to the same
`backend/` API and Socket.IO server as the admin panel in `frontend/`.

## Run it

```
cd driver-app
npm install
npm start
```

Scan the QR code with Expo Go, or press `a`/`i` for an emulator.

## Pointing it at the backend

`app.json` → `expo.extra.apiBaseUrl` / `expo.extra.socketUrl` default to `http://localhost:5000`,
which only works from the iOS simulator or a web preview. Override them for your setup:

- **Android emulator**: `http://10.0.2.2:5000`
- **Physical device**: your dev machine's LAN IP, e.g. `http://192.168.1.20:5000` (phone and
  computer must be on the same network)

## Using it end to end

1. Start the backend (`npm run backend` from the repo root) and the admin panel (`npm run frontend`).
2. In the admin panel header, switch **Simulation Mode → Live GPS Mode**. New emergencies will
   now be *offered* to the nearest driver instead of auto-assigned (see the root `EMS-` plan for
   why — the existing simulation flow is untouched when left in Simulation mode).
3. In the driver app, log in with a Vehicle Number that exists in the admin panel's ambulance
   list (e.g. `AMB-911-A`), then flip **Duty Status** to Online.
4. Create an emergency near that ambulance from the admin panel. The driver app should show the
   full-screen incident card within a couple of seconds.
5. Accept it to open the navigation map; reject it to watch the backend re-offer to the next
   nearest ambulance.

## Notes

- GPS reporting is foreground-only for this MVP (polls every 5s while the app is open) — no
  background/killed-app tracking yet.
- The map is OpenStreetMap via Leaflet in a WebView, matching the admin panel's tile source
  exactly. Swapping to Google Maps later means changing `src/screens/NavigationScreen.tsx` and
  `src/assets/leafletMap.ts`, or moving to `react-native-maps`.
