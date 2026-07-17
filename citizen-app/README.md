# Citizen App

Expo (TypeScript) app for the public-facing side of Smart EMS. Talks to the same `backend/`
API and Socket.IO server as `driver-app/` and the admin panel in `frontend/` (not wired up yet —
see below).

**Status: UI-only build against a Stitch design system, screen by screen.** Home is pixel-matched
to the current reference. History and Profile are placeholder tabs waiting on their own designs —
see `src/screens/ComingSoonScreen.tsx`. No backend integration, no Socket.IO, no real media
capture yet; media slots and Upload use local mock state only.

## Run it

```
cd citizen-app
npm install
npm start
```

## Stack

Expo · React Native · TypeScript · React Navigation (native-stack + bottom-tabs) ·
**React Native Paper** (Material Design 3).

## What's here

- `src/theme/paperTheme.ts` — MD3 color roles hand-derived from the Stitch reference (dark is the
  pixel-accurate target; light is a derived best-effort counterpart pending a light mockup).
- `src/navigation/` — a one-route root Stack (`Tabs`) wrapping a bottom `Tab.Navigator`
  (Home / History / Profile). The Stack exists so a future modal screen (e.g. the "Potential
  Duplicate" dialog from the reference) can be pushed on top of the tabs without restructuring.
- `src/components/` — `AppHeader`, `EmergencyCallCard`, `SectionHeader`, `TrackingBadge`,
  `MediaSlotButton`, `UploadButton`, `GuidelinesCard` — all built on Paper primitives
  (`TouchableRipple`, `Text`) plus the shared theme.
- `src/screens/HomeScreen.tsx` — the pixel-matched screen. "Call 108" and the emergency card open
  the real device dialer (`tel:108`); the three media slots toggle local "prepared" state; Upload
  enables once at least one slot is prepared and shows a "not available yet" message on tap — no
  network call.
- `src/services/api.ts`, `src/socket/socketClient.ts`, `src/hooks/useSocketConnection.ts` — carried
  over from the earlier scaffolding pass, unused by any current screen, ready for when backend
  integration starts.
- `src/services/mockData.ts` — the mock location/tracking data Home renders.

## Not implemented

Splash/Permission screens (the current Stitch batch doesn't include them — flag if they still
belong in the flow), emergency reporting, real camera/mic/location capture, History, Profile,
the duplicate-incident dialog, and all backend/Socket.IO integration.
