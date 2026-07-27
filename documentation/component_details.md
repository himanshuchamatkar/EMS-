# Smart Ambulance Tracking & Dispatch System - Component Details & Schema Guide

This document provides a detailed breakdown of the features, screens/views, data models, and specifications for each component of the tracking and dispatch ecosystem.

---

## 1. Mobile Applications

### 1.1 Citizen SOS App (`/citizen-app`)
* **Objective**: Enable citizens to report medical emergencies in real-time, upload on-scene media attachments, and track the dispatched responder.
* **Key Features**:
  * **Zero-Input Incident Reporting**: Automatic device geolocation coordinates retrieval.
  * **SOS Priority Grading**: Select from Low, Medium, High, or Critical.
  * **Multilingual SOS Audio Recording**: Record 10-second vocal statements of the incident.
  * **Camera Capture integration**: Snap on-scene pictures or record videos to assist triage.
  * **Real-time Responder ETA Tracker**: Follow the assigned ambulance's route on a Leaflet map.
* **Screens / Views**:
  1. **SOS Emergency Panel (Landing Screen)**: Renders a large red **"TAP TO REPORT SOS"** button overlaying a map centering on the user's location.
  2. **Incident Details Form (Overlay)**: Input fields for description, emergency priority dropdown, and media upload hooks.
  3. **Media Capture Mode**: Standard native camera viewport for snapping photos/videos and microphone recorder interface.
  4. **Active Dispatch ETA Tracker**: Live routing navigation map showing the ambulance symbol moving in real-time towards the citizen's location.

---

### 1.2 Ambulance Driver App (`/driver-app`)
* **Objective**: Allow ambulance drivers to toggle availability, receive concurrent dispatch offers, and navigate to the incident scene and hospital.
* **Key Features**:
  * **Availability Toggle**: Switches driver status between `Available` and `Offline` in the database.
  * **Background GPS Streaming**: Continuously streams device latitude/longitude coordinates to the WebSocket server.
  * **First-Come, First-Served Dispatch Locks**: Instantaneous response matching nearest offers.
  * **Route Navigation Maps**: Integrates Leaflet Routing Machine / OpenStreetMap API for directions.
  * **Police Action Alert Banner**: Shows notification when police are active on site.
* **Screens / Views**:
  1. **Driver Terminal Dashboard**: Displays current status (ONLINE/OFFLINE), assigned vehicle number, driver details, and current GPS coordinate readings.
  2. **Incoming Dispatch Offer Popup**: Fullscreen alert panel showing proximity distance (in km), priority, incident description, and Citizen SOS attachments (e.g. photo preview) with big **ACCEPT** / **REJECT** buttons (includes a 30s countdown timer).
  3. **Route Navigation Map Screen**:
     * **Phase 1 (En Route to Scene)**: Renders route from driver's GPS location to the incident scene. Displays **"MARK PATIENT PICKED UP"** button.
     * **Phase 2 (En Route to Hospital)**: Renders route from scene to the assigned hospital. Displays **"MARK DELIVERY COMPLETE / RESOLVED"** button.
  4. **Alert Banners**: Blue alert ribbon at the top of the map view rendering: `👮 Police Alert: Police are informed and in action at the scene.` when `police_seen` is true.

---

## 2. Web Dashboards

### 2.1 Control Room Operator Dashboard (`/frontend`)
* **Objective**: Serve as the central command dashboard for dispatchers to monitor the fleet, review incidents, and override allocations.
* **Key Features**:
  * **Fleet Live Tracking Map**: Displays all ambulances, incidents, and hospitals on an interactive Leaflet map of India.
  * **Auto-Allocation Engine Monitor**: Shows proximity sorting queues and offer statuses.
  * **Manual Dispatch Overrides**: Force-assign a specific ambulance to an incident or cancel active dispatches.
  * **Ambulance & Hospital Registry**: Add, edit, or delete records from the system.
  * **System Stats KPI Stripe**: Real-time counter of available ambulances, active emergencies, and hospital beds.
* **Screens / Views**:
  1. **Central Map Workspace**: The main screen displaying color-coded markers (Green = Available, Red = Busy, Orange = Maintenance, Grey = Offline, Blue Circle = Emergency, Hospital Crosses).
  2. **Incident Terminals Sidebar**: Left sidebar listing all active tickets categorized by priority. Shows `👮 Police Alerted` status badges.
  3. **Dispatch Specification Panel (Bottom Slide-out)**: Detailed card showing active dispatch progress timeline, distance metrics, and buttons for re-assigning or canceling ambulances.
  4. **Ambulance / Hospital Registry Modal Forms**: Forms to add new assets by clicking on the map.

---

### 2.2 Police Workstation Dashboard (`/police-dashboard`)
* **Objective**: Provide a real-time monitor log for law enforcement teams to acknowledge emergencies and coordinate on-site presence.
* **Key Features**:
  * **"Mark Incident as Seen" Action**: Notifies the entire network and the driver app that police are active at the scene.
  * **Real-time Incident Log Terminal**: Duplex console printing live system ticks, ambulance assignments, victim pickups, and resolution events.
  * **Citizen Media Zoom Preview**: Fullscreen inspection of citizen-uploaded media attachments.
* **Screens / Views**:
  1. **Incident Inbox Sidebar**: Left-hand sidebar showing unresolved incidents, priority levels, and timestamp ticks.
  2. **Police Command Action Bar**: Top card showing `🚨 ACTION REQUIRED: MONITOR INCIDENT` or `👮 INCIDENT ACKNOWLEDGED BY POLICE` with the **Mark As Seen** button.
  3. **Incident Data Fields Card**: Mid-screen grid displaying descriptions, GPS location links, ambulance details, and allotted hospital.
  4. **Citizen Media Attachments Card**: Visual thumbnail gallery for photos/videos with click-to-zoom overlays.
  5. **Real-time Activity Log Terminal (Bottom Slate Box)**: Scroll-locked terminal console showing time-stamped logs of system activity.

---

### 2.3 Hospital Capabilities Dashboard (`/hospital-dashboard`)
* **Objective**: Allow hospital emergency rooms to manage ICU/ventilator capacity, accept incoming patients, and track ambulance transport ETAs.
* **Key Features**:
  * **Dynamic Resource Tuning**: Live counters to update ICU bed, ventilator, and total bed availability.
  * **Specialist Registry**: Add tags for active on-duty specialists (e.g. Cardiologist, Neurosurgeon).
  * **Patient Acceptance Overlays**: Approve or reject incoming ambulance transport requests.
* **Screens / Views**:
  1. **Hospital Capacity Manager (Main Panel)**: Counters and capability checkboxes to update emergency facilities in real-time.
  2. **Emergency Transfer Request Modal**: Popups showing priority, ETA, patient description, and a `👮 POLICE ACTIVE` warning tag if police are already on site.
  3. **Active Route Navigation Map**: Dedicated map displaying directions from the ambulance's live GPS location to the hospital.
  4. **Patient Intake Log (History Tab)**: Data table showing all previous transport logs, distance metrics, and final resolutions.

---

## 3. Database Schema (Supabase PostgreSQL)

The backend caches these tables in memory on boot, with background write-through syncs.

### 3.1 Table: `emergencies`
Stores data for reported emergency incidents.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, Default: `gen_random_uuid()` | Unique ticket identifier |
| `latitude` | `DOUBLE PRECISION` | `NOT NULL` | Location Latitude |
| `longitude` | `DOUBLE PRECISION` | `NOT NULL` | Location Longitude |
| `priority` | `VARCHAR(50)` | `NOT NULL` | `Low` \| `Medium` \| `High` \| `Critical` |
| `description` | `TEXT` | Default: `'Emergency reported'` | Summary of the crisis |
| `status` | `VARCHAR(50)` | Default: `'Pending'` | `Pending` \| `Assigned` \| `VICTIM_PICKED` \| `Resolved` |
| `assigned_ambulance` | `UUID` | `FOREIGN KEY` references `ambulances(id)` | ID of the responding vehicle |
| `assigned_hospital` | `UUID` | `FOREIGN KEY` references `hospitals(id)` | ID of the destination hospital |
| `police_seen` | `BOOLEAN` | Default: `FALSE` | Acknowledged by Police dashboard |
| `photo_url` | `TEXT` | Nullable | Cloudinary URL for citizen SOS photo |
| `video_url` | `TEXT` | Nullable | Cloudinary URL for citizen SOS video |
| `audio_url` | `TEXT` | Nullable | Cloudinary URL for citizen SOS audio voice report |
| `created_at` | `TIMESTAMPTZ` | Default: `NOW()` | Timestamp of incident creation |

---

### 3.2 Table: `ambulances`
Stores vehicle status, driver details, and current coordinates.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, Default: `gen_random_uuid()` | Unique vehicle identifier |
| `name` | `VARCHAR(255)` | `NOT NULL` | Vehicle Name (e.g. "Rescue Alpha") |
| `vehicle_number` | `VARCHAR(100)` | `NOT NULL`, `UNIQUE` | License plate number |
| `driver_name` | `VARCHAR(255)` | Nullable | Name of assigned driver |
| `driver_phone` | `VARCHAR(50)` | Nullable | Phone number of driver |
| `status` | `VARCHAR(50)` | Default: `'Available'` | `Available` \| `Busy` \| `Offline` \| `Maintenance` |
| `latitude` | `DOUBLE PRECISION` | Default: `20.5937` (India Center) | Live GPS Latitude coordinate |
| `longitude` | `DOUBLE PRECISION` | Default: `78.9629` (India Center) | Live GPS Longitude coordinate |
| `created_at` | `TIMESTAMPTZ` | Default: `NOW()` | Timestamp of registration |

---

### 3.3 Table: `hospitals`
Stores hospital coordinates and real-time medical capabilities.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, Default: `gen_random_uuid()` | Unique hospital identifier |
| `hospital_name` | `VARCHAR(255)` | `NOT NULL` | Name of the facility |
| `address` | `TEXT` | `NOT NULL` | Physical address |
| `phone` | `VARCHAR(50)` | `NOT NULL` | Phone number of the ER room |
| `latitude` | `DOUBLE PRECISION` | `NOT NULL` | Location Latitude |
| `longitude` | `DOUBLE PRECISION` | `NOT NULL` | Location Longitude |
| `icu_count` | `INTEGER` | Default: `0` | Available ICU beds |
| `ventilator_count`| `INTEGER` | Default: `0` | Available Ventilator units |
| `total_beds` | `INTEGER` | Default: `0` | Total hospital bed capacity |
| `emergency_beds` | `INTEGER` | Default: `0` | General ER bed availability |
| `specialists` | `TEXT[]` | Default: `'{ }'` | Array of active specialists on duty |

---

### 3.4 Table: `dispatch_logs`
Chronicles all response transactions for auditing.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, Default: `gen_random_uuid()` | Log entry ID |
| `emergency_id` | `UUID` | `FOREIGN KEY` references `emergencies(id)` | Associated incident |
| `ambulance_id` | `UUID` | `FOREIGN KEY` references `ambulances(id)` | Responding vehicle |
| `status` | `VARCHAR(50)` | `NOT NULL` | `Assigned` \| `VictimPicked` \| `Resolved` |
| `created_at` | `TIMESTAMPTZ` | Default: `NOW()` | Audit timestamp |

---

### 3.5 Table: `system_settings`
Manages system-wide flags.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` | Setting ID |
| `mode` | `VARCHAR(50)` | Default: `'simulation'` | `simulation` \| `live` |

---

## 4. Media Storage Architecture (Cloudinary)

* **CDN Bucket Endpoint**: `https://api.cloudinary.com/v1_1/your-cloud-name/`
* **Upload Schema**:
  * Files are posted using standard multipart/form-data.
  * Upload presets are configured to categorize citizen media automatically:
    * `/emergency_photos/`: Images of accidents or patient states. Transformed to compressed WebP format for fast cellular download.
    * `/emergency_videos/`: Video footage from the scene. Transformed to standard MP4 wrapper.
    * `/emergency_audios/`: Voice SOS reports. Transformed to lightweight AAC/MP3 files.
