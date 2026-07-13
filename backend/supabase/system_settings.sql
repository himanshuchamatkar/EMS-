-- One-row table that persists the dispatch mode ('simulation' | 'live')
-- across backend restarts/redeploys. Run this once in the Supabase SQL editor.
create table if not exists system_settings (
  id int primary key default 1,
  mode text not null default 'simulation',
  constraint system_settings_single_row check (id = 1),
  constraint system_settings_mode_valid check (mode in ('simulation', 'live'))
);

insert into system_settings (id, mode)
values (1, 'simulation')
on conflict (id) do nothing;
