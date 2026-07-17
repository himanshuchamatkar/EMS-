const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// In-memory cache (cache-aside over Supabase, same pattern as database/db.js)
// so getMode() stays a synchronous, zero-latency read on the request path.
let currentMode = 'simulation'; // 'simulation' | 'live'

// Hydrate from Supabase on boot so the admin's last choice survives a
// restart/redeploy instead of silently reverting to 'simulation' — that
// used to make Live-mode dispatch (offer broadcast to all nearby
// ambulances) look "broken" after every deploy, when it was actually just
// running the Simulation-mode auto-assign path again.
async function loadMode() {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('mode')
      .eq('id', 1)
      .single();

    if (error) {
      console.error('Error loading dispatch mode from Supabase (defaulting to simulation):', error.message);
      return;
    }
    if (data?.mode === 'live' || data?.mode === 'simulation') {
      currentMode = data.mode;
      console.log(`Dispatch mode restored from Supabase: ${currentMode}`);
    }
  } catch (err) {
    console.error('Failed to load dispatch mode from Supabase:', err);
  }
}

loadMode();

function getMode() {
  return currentMode;
}

function setMode(mode) {
  if (mode !== 'simulation' && mode !== 'live') {
    throw new Error("Invalid mode. Must be 'simulation' or 'live'.");
  }

  currentMode = mode;

  // Async write-through to Supabase in the background, same fire-and-forget
  // pattern as database/db.js.
  supabase.from('system_settings').update({ mode }).eq('id', 1).then(({ error }) => {
    if (error) console.error('Error persisting dispatch mode to Supabase:', error.message);
  });

  return currentMode;
}

module.exports = {
  getMode,
  setMode
};
