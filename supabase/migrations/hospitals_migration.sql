-- 0. Drop existing hospital tables to clear out any old/mismatched schemas
drop table if exists emergency_hospital_requests cascade;
drop table if exists hospital_facilities cascade;
drop table if exists hospitals cascade;

-- Enable UUID extension if not enabled
create extension if not exists "uuid-ossp";

-- 1. Create Hospitals Table
create table if not exists hospitals (
  hospital_id uuid primary key default gen_random_uuid(),
  hospital_name text not null,
  email text unique not null,
  password_hash text not null,
  phone text not null,
  address text not null,
  latitude double precision not null,
  longitude double precision not null,
  emergency_status text not null default 'CLOSED', -- 'OPEN' or 'CLOSED'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create Hospital Facilities Table
create table if not exists hospital_facilities (
  hospital_id uuid primary key references hospitals(hospital_id) on delete cascade,
  icu_count integer not null default 0,
  ventilator_count integer not null default 0,
  ct_available boolean not null default false,
  mri_available boolean not null default false,
  xray_available boolean not null default false,
  blood_bank boolean not null default false,
  ot_available boolean not null default false,
  emergency_dept_available boolean not null default false,
  emergency_24x7 boolean not null default false,
  trauma_facility boolean not null default false,
  total_beds integer not null default 0,
  emergency_beds integer not null default 0,
  specialists text[] default '{}'::text[] -- Specialists array e.g. ['Cardiologist', 'Neurologist']
);

-- 3. Create Emergency Hospital Requests Table
create table if not exists emergency_hospital_requests (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid references emergencies(id) on delete cascade not null,
  hospital_id uuid references hospitals(hospital_id) on delete cascade not null,
  status text not null default 'Pending', -- 'Pending', 'Accepted', 'Rejected'
  accepted_at timestamp with time zone,
  rejected_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Alter emergencies table to track assigned hospital
alter table emergencies add column if not exists assigned_hospital_id uuid references hospitals(hospital_id) on delete set null;
