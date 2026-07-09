const simulationEngine = require('../services/simulationEngine');

exports.start = (req, res) => {
  try {
    const io = req.app.get('io');
    if (!io) {
      return res.status(500).json({ error: 'Socket server not available' });
    }
    simulationEngine.startSimulation(io);
    res.json({ message: 'Simulation started', running: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.pause = (req, res) => {
  try {
    simulationEngine.pauseSimulation();
    res.json({ message: 'Simulation paused', running: false });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.reset = (req, res) => {
  try {
    const io = req.app.get('io');
    simulationEngine.resetSimulation(io);
    res.json({ message: 'Simulation reset complete', running: false });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.status = (req, res) => {
  try {
    res.json({ running: simulationEngine.isRunning() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
