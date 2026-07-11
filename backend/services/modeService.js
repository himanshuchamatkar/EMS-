let currentMode = 'simulation'; // 'simulation' | 'live'

function getMode() {
  return currentMode;
}

function setMode(mode) {
  if (mode !== 'simulation' && mode !== 'live') {
    throw new Error("Invalid mode. Must be 'simulation' or 'live'.");
  }

  currentMode = mode;
  return currentMode;
}

module.exports = {
  getMode,
  setMode
};
