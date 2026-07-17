-- Adds media-attachment fields for citizen-reported incidents (photo/video/
-- audio uploaded to Cloudinary from citizen-app, URLs stored here) and a
-- source flag to distinguish citizen-app reports from admin-panel-created
-- ones. Run once in the Supabase SQL editor. Safe to re-run — IF NOT EXISTS
-- skips columns that already exist. Existing rows get NULL media fields and
-- report_source = 'admin', so nothing about the current admin panel /
-- driver app flow changes.
alter table emergencies
  add column if not exists photo_url text,
  add column if not exists video_url text,
  add column if not exists audio_url text,
  add column if not exists report_source text not null default 'admin';
