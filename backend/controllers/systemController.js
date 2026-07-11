const modeService = require('../services/modeService');
const simulationEngine = require('../services/simulationEngine');

exports.getMode = (req, res) => {
  try {
    res.json({ mode: modeService.getMode() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.setMode = (req, res) => {
  try {
    const { mode } = req.body;
    if (!mode) {
      return res.status(400).json({ error: 'Missing required field: mode' });
    }

    const updatedMode = modeService.setMode(mode);

    if (updatedMode === 'live') {
      // Real GPS devices become the source of truth for movement.
      simulationEngine.pauseSimulation();
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('system:mode', { mode: updatedMode });
    }

    res.json({ mode: updatedMode });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
