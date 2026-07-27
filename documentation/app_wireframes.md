# Smart Ambulance Mobile Apps - UI Wireframes

This document details the layout wireframe models for both the **Citizen App** and the **Driver App** screens using structural text-based blueprints.

---

## Part 1: Citizen SOS App Wireframes

### Screen 1.1: SOS Landing Screen
The initial interface displaying the citizen's current location on a map with a prominent distress trigger.

```
┌──────────────────────────────────────────┐
│  [GPS: Lat, Lon]           [Profile Settings] │ <- Status Header
├──────────────────────────────────────────┤
│                                          │
│              MAP CONTAINER               │
│                                          │
│        * [Current Location Marker]       │
│                                          │
│                                          │
│                                          │
│                ┌──────────┐              │
│                │  ( SOS ) │              │ <- Red Pulse SOS Trigger
│                │  Button  │              │
│                └──────────┘              │
│                                          │
│                                          │
├──────────────────────────────────────────┤
│ > Tap to Report Medical Emergency        │ <- Guidance prompt
└──────────────────────────────────────────┘
```

### Screen 1.2: Emergency Incident Form
The overlay modal triggered after clicking SOS, allowing citizens to add incident parameters.

```
┌──────────────────────────────────────────┐
│  < Cancel             SOS DETAILS        │
├──────────────────────────────────────────┤
│                                          │
│  [1] PRIORITY SELECTOR                   │
│  ┌────────────────────────────────────┐  │
│  │ [x] CRITICAL | [ ] High | [ ] Med  │  │
│  └────────────────────────────────────┘  │
│                                          │
│  [2] INCIDENT DESCRIPTION                │
│  ┌────────────────────────────────────┐  │
│  │ Describe emergency (e.g. car crash)│  │
│  └────────────────────────────────────┘  │
│                                          │
│  [3] MEDIA ATTACHMENTS                   │
│  ┌────────────┐ ┌────────────┐           │
│  │  [Camera]  │ │  [Record]  │           │ <- Snap Photo / Video
│  │ Snap Photo │ │ Audio SOS  │           │    Record 10s voice note
│  └────────────┘ └────────────┘           │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │         SUBMIT EMERGENCY           │  │ <- API POST request
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

### Screen 1.3: Live Responder Tracker
Real-time tracking interface display once an ambulance is dispatched.

```
┌──────────────────────────────────────────┐
│  TICKET-235CB           Ambulance En-Route│
├──────────────────────────────────────────┤
│                                          │
│              MAP CONTAINER               │
│                                          │
│        [Scene Marker]  (ETA: 4 Min)      │
│               ^                          │
│               :   <--- Route Path        │
│               :                          │
│        [Ambulance Icon]                  │
│                                          │
├──────────────────────────────────────────┤
│  🚑 Assigned: Rescue Alpha (MH12-3245)   │ <- Live vehicle details
│  📞 Call Driver: +91 98765 43210         │
└──────────────────────────────────────────┘
```

---

## Part 2: Ambulance Driver App Wireframes

### Screen 2.1: Driver Dashboard & Status
The home screen where drivers can toggle their active online/offline status.

```
┌──────────────────────────────────────────┐
│  AMBULANCE HUB            Rescue Alpha   │
├──────────────────────────────────────────┤
│                                          │
│  FLEET STATUS:                           │
│  ┌────────────────────────────────────┐  │
│  │    ● ONLINE (AVAILABLE)            │  │ <- Green indicator badge
│  └────────────────────────────────────┘  │
│                                          │
│  VEHICLE DETAILS:                        │
│  • Plate: MH12-3245                      │
│  • Driver: Ramesh Kumar                  │
│  • Phone: +91 98765 43210                │
│                                          │
│  LIVE GPS POSITION:                      │
│  • 18.5204° N, 73.8567° E                │
│                                          │
├──────────────────────────────────────────┤
│  [ TOGGLE OFFLINE ]                      │ <- Toggle database status
└──────────────────────────────────────────┘
```

### Screen 2.2: Incoming Offer Popup
The fullscreen WebSocket alert display when an incident allocation is offered.

```
┌──────────────────────────────────────────┐
│ 🚨 INCOMING EMERGENCY REQUEST  (0:28s)   │ <- countdown timer
├──────────────────────────────────────────┤
│                                          │
│  PRIORITY: [ CRITICAL ]                  │
│  DISTANCE: 2.4 Kilometers Away           │
│  DESCRIPTION:                            │
│  "Multiple car pile-up near highway."    │
│                                          │
│  CITIZEN PHOTO ATTACHMENT:               │
│  ┌────────────────────────────────────┐  │
│  │ [Photo: Accident Scene Image]       │  │ <- Cloudinary CDN image
│  └────────────────────────────────────┘  │
│                                          │
├──────────────────────────────────────────┤
│      ┌────────────┐   ┌────────────┐     │
│      │   REJECT   │   │   ACCEPT   │     │ <- First-come, first-served
│      └────────────┘   └────────────┘     │    offer lock trigger
└──────────────────────────────────────────┘
```

### Screen 2.3: Route Navigation Map (Active Duty)
The navigation and progression interface for accepted emergencies.

```
┌──────────────────────────────────────────┐
│ 👮 Police Alert: Active at scene         │ <- Active warning banner
├──────────────────────────────────────────┤
│                                          │
│              MAP CONTAINER               │
│                                          │
│        [Ambulance GPS]                   │
│               :                          │
│               v   <--- Route Guidance    │
│        [Incident Scene Location]         │
│                                          │
├──────────────────────────────────────────┤
│  TASK: Proceed to incident site          │
│  Address: Highway Exit 14, Pune          │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │       PATIENT SECURED / PICKUP     │  │ <- Transitions to Phase 2
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```
*Note: Once "PATIENT SECURED / PICKUP" is clicked, the app automatically changes the routing destination on the Map Container from the **Incident Scene** to the **ER Hospital Coordinates**, and changes the button text to **"RESOLVE / DELIVER PATIENT"**.*
