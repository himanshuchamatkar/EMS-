-- Migration to add police_seen column to emergencies table
ALTER TABLE emergencies ADD COLUMN IF NOT EXISTS police_seen BOOLEAN DEFAULT FALSE;
