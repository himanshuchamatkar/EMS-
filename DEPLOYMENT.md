# Smart Ambulance Tracking & Dispatch System: Supabase (PostgreSQL) & Deployment Guide

This guide explains the project structure, how the database behaves, how to migrate the local mock database to **Supabase (PostgreSQL)**, and how to deploy the frontend on Vercel and backend on Render.

---

## 1. Project Architecture Overview

The system consists of three modules:

1. **Frontend (`/frontend`)**: A React + Vite dashboard styled with Tailwind CSS. It uses Leaflet Maps to show live ambulance locations and emergencies. It connects to the backend API and receives real-time updates via WebSockets (Socket.io).
2. **Backend (`/backend`)**: An Express REST API that handles dispatch logic and broadcasts live location/status changes via WebSockets.
3. **Driver App (`/driver-app`)**: An Expo (React Native) app for drivers. It tracks GPS location and updates the server in real-time.
4. **Database (Supabase)**: A hosted cloud PostgreSQL database.

---

## 2. Setting Up Supabase (PostgreSQL)

Supabase provides a hosted Postgres database with a SQL editor and a client SDK (`@supabase/supabase-js`).

### Step 1: Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a free project.
2. Select your closest database region and set a strong database password.

### Step 2: Create Tables in Supabase SQL Editor
Navigate to the **SQL Editor** in Supabase, create a **New Query**, paste the following script, and click **Run**:

```sql
-- Enable UUID extension if not enabled
create extension if not exists "uuid-ossp";

-- 1. Create Ambulances Table
create table ambulances (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  vehicle_number text not null,
  driver_name text not null,
  latitude double precision not null,
  longitude double precision not null,
  status text not null default 'Available',
  speed double precision default 0.0,
  heading double precision default 0.0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create Emergencies Table
create table emergencies (
  id uuid primary key default gen_random_uuid(),
  latitude double precision not null,
  longitude double precision not null,
  description text not null,
  priority text not null default 'Medium',
  assigned_ambulance uuid references ambulances(id) on delete set null,
  status text not null default 'Pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create Dispatch Logs Table
create table dispatch_logs (
  id uuid primary key default gen_random_uuid(),
  emergency_id uuid references emergencies(id) on delete cascade not null,
  ambulance_id uuid references ambulances(id) on delete set null,
  assigned_time timestamp with time zone default timezone('utc'::text, now()) not null,
  response_time timestamp with time zone,
  status text not null default 'Dispatched'
);

-- Seed Initial Data
insert into ambulances (id, name, vehicle_number, driver_name, latitude, longitude, status, speed, heading)
values 
  ('a1111111-1111-1111-1111-111111111111', 'Rescue Alpha', 'AMB-911-A', 'John Doe', 28.6353, 77.2250, 'Available', 0.0, 0.0),
  ('a2222222-2222-2222-2222-222222222222', 'Rescue Bravo', 'AMB-911-B', 'Jane Smith', 28.5833, 77.2289, 'Busy', 45.0, 90.0),
  ('a3333333-3333-3333-3333-333333333333', 'Rescue Charlie', 'AMB-911-C', 'Robert Johnson', 28.6562, 77.2410, 'Offline', 0.0, 0.0);

insert into emergencies (id, latitude, longitude, description, priority, assigned_ambulance, status)
values
  ('e1111111-1111-1111-1111-111111111111', 28.5980, 77.2220, 'Car collision near Lodhi Colony. Two people injured.', 'High', 'a2222222-2222-2222-2222-222222222222', 'Assigned');

insert into dispatch_logs (id, emergency_id, ambulance_id, status)
values
  ('d1111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111111111', 'a2222222-2222-2222-2222-222222222222', 'Dispatched');
```

---

## 3. Integrating Supabase in Backend

1. In the `/backend` directory, install the Supabase client SDK:
   ```bash
   cd backend
   npm install @supabase/supabase-js dotenv
   ```
2. Open your backend environment variables configuration or update your code directly.
3. Replace the content of [backend/database/db.js](file:///d:/cosmo%20internship/ambulance/backend/database/db.js) with:

```javascript
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // service_role key bypasses RLS policies

const supabase = createClient(supabaseUrl, supabaseKey);

const db = {
  async reset() {
    await supabase.from('dispatch_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('emergencies').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('ambulances').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    const seedAmbs = [
      { id: 'a1111111-1111-1111-1111-111111111111', name: 'Rescue Alpha', vehicle_number: 'AMB-911-A', driver_name: 'John Doe', latitude: 28.6353, longitude: 77.2250, status: 'Available', speed: 0, heading: 0 },
      { id: 'a2222222-2222-2222-2222-222222222222', name: 'Rescue Bravo', vehicle_number: 'AMB-911-B', driver_name: 'Jane Smith', latitude: 28.5833, longitude: 77.2289, status: 'Busy', speed: 45, heading: 90 },
      { id: 'a3333333-3333-3333-3333-333333333333', name: 'Rescue Charlie', vehicle_number: 'AMB-911-C', driver_name: 'Robert Johnson', latitude: 28.6562, longitude: 77.2410, status: 'Offline', speed: 0, heading: 0 }
    ];
    await supabase.from('ambulances').insert(seedAmbs);
    
    const seedEmergencies = [
      { id: 'e1111111-1111-1111-1111-111111111111', latitude: 28.5980, longitude: 77.2220, description: 'Car collision near Lodhi Colony. Two people injured.', priority: 'High', assigned_ambulance: 'a2222222-2222-2222-2222-222222222222', status: 'Assigned' }
    ];
    await supabase.from('emergencies').insert(seedEmergencies);

    const seedLogs = [
      { id: 'd1111111-1111-1111-1111-111111111111', emergency_id: 'e1111111-1111-1111-1111-111111111111', ambulance_id: 'a2222222-2222-2222-2222-222222222222', status: 'Dispatched' }
    ];
    await supabase.from('dispatch_logs').insert(seedLogs);
  },

  async getAmbulances() {
    const { data, error } = await supabase.from('ambulances').select('*');
    if (error) throw error;
    return data;
  },

  async getAmbulanceById(id) {
    const { data, error } = await supabase.from('ambulances').select('*').eq('id', id).single();
    if (error) return null;
    return data;
  },

  async addAmbulance(ambulance) {
    const { data, error } = await supabase.from('ambulances').insert([ambulance]).select().single();
    if (error) throw error;
    return data;
  },

  async updateAmbulance(id, updates) {
    const { data, error } = await supabase.from('ambulances').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteAmbulance(id) {
    const { error } = await supabase.from('ambulances').delete().eq('id', id);
    return !error;
  },

  async getEmergencies() {
    const { data, error } = await supabase.from('emergencies').select('*');
    if (error) throw error;
    return data;
  },

  async getEmergencyById(id) {
    const { data, error } = await supabase.from('emergencies').select('*').eq('id', id).single();
    if (error) return null;
    return data;
  },

  async addEmergency(emergency) {
    const { data, error } = await supabase.from('emergencies').insert([emergency]).select().single();
    if (error) throw error;
    return data;
  },

  async updateEmergency(id, updates) {
    const { data, error } = await supabase.from('emergencies').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteEmergency(id) {
    const { error } = await supabase.from('emergencies').delete().eq('id', id);
    return !error;
  },

  async getDispatchLogs() {
    const { data, error } = await supabase.from('dispatch_logs').select('*');
    if (error) throw error;
    return data;
  },

  async addDispatchLog(log) {
    const { data, error } = await supabase.from('dispatch_logs').insert([log]).select().single();
    if (error) throw error;
    return data;
  },

  async updateDispatchLogForEmergency(emergencyId, updates) {
    const { data: logs, error } = await supabase.from('dispatch_logs').select('*').eq('emergency_id', emergencyId);
    if (error || !logs || logs.length === 0) return null;
    
    const latestLog = logs.sort((a, b) => new Date(b.assigned_time) - new Date(a.assigned_time))[0];
    const { data: updatedLog, error: updateError } = await supabase
      .from('dispatch_logs')
      .update(updates)
      .eq('id', latestLog.id)
      .select()
      .single();

    if (updateError) throw updateError;
    return updatedLog;
  }
};

module.exports = db;
```

---

## 4. Deploying Backend on Render

Render will host your persistent Node.js Express server to handle API routing and WebSocket connections.

1. Log in to [render.com](https://render.com).
2. Click **New +** -> **Web Service** and link your Git repository.
3. Configure settings:
   - **Name**: `smart-ambulance-api`
   - **Environment**: `Node`
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. In **Advanced**, add the environment variables:
   - `SUPABASE_URL` = your Supabase Project URL (e.g., `https://xxxx.supabase.co`)
   - `SUPABASE_SERVICE_ROLE_KEY` = your Supabase service_role API Key (found in Supabase Settings -> API)
5. Deploy. Copy your Render backend URL (e.g., `https://smart-ambulance-api.onrender.com`).

---

## 5. Deploying Frontend on Vercel

1. Log in to [vercel.com](https://vercel.com) and click **Add New** -> **Project**.
2. Import your Git repository.
3. Configure build settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
4. Expand **Environment Variables** and add:
   - `VITE_API_URL` = `https://smart-ambulance-api.onrender.com/api` (Render backend URL with `/api`)
   - `VITE_SOCKET_URL` = `https://smart-ambulance-api.onrender.com` (Render backend base URL)
5. Click **Deploy**. Copy your website URL.

---

## 6. Configuring the Mobile Driver App

1. Open [driver-app/app.json](file:///d:/cosmo%20internship/ambulance/driver-app/app.json).
2. In the `extra` object, update the API and Socket URLs to point to your live Render backend:
   ```json
   "extra": {
     "apiBaseUrl": "https://smart-ambulance-api.onrender.com/api",
     "socketUrl": "https://smart-ambulance-api.onrender.com"
   }
   ```
3. Boot up the mobile project locally:
   ```bash
   cd driver-app
   npm install
   npx expo start
   ```
