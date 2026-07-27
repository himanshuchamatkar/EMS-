# Smart Ambulance Tracking & Dispatch System - User & Deployment Guide

This document acts as the master **User Guide** and contains all the access links, hosting details, API keys, credentials, and testing procedures for the tracking and dispatch system.

---

## 1. Live Deployment Links

### 1.1 Web Dashboards (Production)
* **Control Room Operator Dashboard**: [https://frontend-coral-rho-69.vercel.app/](https://frontend-coral-rho-69.vercel.app/)
  * *Purpose*: Real-time Indian map fleet monitor, live tracking, and dispatch manual override control station.
* **Hospital capabilities Dashboard**: [https://hospital-dashboard-azure.vercel.app/](https://hospital-dashboard-azure.vercel.app/)
  * *Purpose*: Manage bed counts, ER staffing, accept incoming transports, and view routing navigation.
* **Police Incident Dashboard**: [https://police-dashboard-eight.vercel.app/](https://police-dashboard-eight.vercel.app/)
  * *Purpose*: Law enforcement audit, mark incident as seen, and real-time command terminal updates.

### 1.2 Mobile Applications (EAS Builds)
* **Ambulance Driver Mobile App**: [EAS Build Details & APK Download Page](https://expo.dev/accounts/himanshuchamatkar123456/projects/driver-app/builds/2b26c02a-48bc-4ff0-b10d-60e8c04cda4c)
  * *Installation*: Open the link on your Android phone to download the installable **`.apk`** file or scan the QR code listed on the build page.
* **Citizen SOS Mobile App**: [EAS Build Details & APK Download Page](https://expo.dev/accounts/himanshuchamatkar123456/projects/citizen-app/builds/f55908d2-785e-4693-a2a5-3ed77b44f85a)
  * *Installation*: Open the link on your Android phone to download the installable **`.apk`** file or scan the QR code listed on the build page.

---

## 2. Infrastructure Keys & Environment Configurations

### 2.1 Backend hosting (Render)
* **API Server Base URL**: `https://smart-ambulance-api-5ui6.onrender.com`
* **WebSocket URL**: `https://smart-ambulance-api-5ui6.onrender.com`

### 2.2 Database Credentials (Supabase)
* **Supabase Project URL**: `https://lgrfsqhrtwewdswhuwrq.supabase.co`
* **Service Role Secret Key (Bypasses Row Level Security)**:
  `eyJhbGciOiJIUz...[SUPABASE SERVICE ROLE KEY]`

### 2.3 Web Deployment Credentials (Vercel)
* **Vercel Auth Token**: `vcp_0HeLD...[YOUR VERCEL DEPLOY TOKEN]`
* **Target Account Profile**: `cosmosdigital44-5127's projects`

### 2.4 Cloud Media Storage (Cloudinary)
* **Cloud Name**: `himanshuchamatkar123456`
* **Image Upload Preset**: `sos_attachments`
* **Audio/Video Upload Preset**: `sos_media`

---

## 3. End-to-End Test Procedure

Follow these steps to demonstrate the entire real-time dispatch and coordination flow:

### Step 1: Drivers & Fleet Setup
1. Log into the **Control Room Operator Dashboard**. Click **Add Ambulance** at the bottom, select a position in India on the map, and fill in the details. Add at least two ambulances (e.g. "Ambulance 1" and "Ambulance 2").
2. Install the **Ambulance Driver App** on two phones. Launch the apps, input the matching ambulance IDs, and toggle status to **ONLINE**. Verify that they appear on the Control Room map.

### Step 2: Report an Emergency
1. Open the **Citizen SOS App** on a separate phone.
2. Select an incident category, record a voice SOS message or attach a photo, and tap the red **Tap to Report SOS** button.
3. The app uploads the media to Cloudinary and sends the SOS report with GPS coordinates.

### Step 3: Dual-Driver Dispatch Offer
1. The **Backend API** receives the incident, identifies the two closest available ambulances to the incident coordinates, and sends a WebSocket offer.
2. Both driver phones ring and display the incident details (with description and photo attachment).

### Step 4: Acceptance Lock
1. **Driver 1** taps **ACCEPT** on their phone.
2. Instantly:
   * **Driver 1**'s app transitions to navigation route guide.
   * **Driver 2**'s offer popup is automatically dismissed (displaying: "Offer Accepted by another driver").
   * **Control Room**, **Hospital**, and **Police** dashboards update in real-time, showing "Ambulance 1" en route to the scene.

### Step 5: Police Scene Acknowledgment
1. A police officer opens the **Police Incident Dashboard** and finds the active incident under unresolved tickets.
2. They click the blue **Mark as Seen** button.
3. Instantly:
   * A warning badge `👮 Police Alerted` appears in the Control Room sidebar.
   * An overlay tag `👮 Police Active` flashes on the Hospital alert screen.
   * A blue banner appears on the en-route **Driver 1** map: `👮 Police Alert: Police are informed and in action at the scene.`

### Step 6: ER Preparedness
1. The ER Coordinator opens the **Hospital Dashboard**. They see the incoming patient transport details.
2. They verify ICU beds and ventilators, and click **Accept Patient**.

### Step 7: Patient Pickup & Resolution
1. **Driver 1** arrives at the scene. They click **Mark Patient Picked Up**. The app reroutes the navigator map to the hospital ER coordinates.
2. **Driver 1** arrives at the Hospital ER, delivers the patient, and clicks **Mark Delivery Complete**.
3. The incident is resolved. The ambulance status resets to `Available` on the Control Room map.
