const express = require('express');
const router = express.Router();
const simulationController = require('../controllers/simulationController');

router.post('/start', simulationController.start);
router.post('/pause', simulationController.pause);
router.post('/reset', simulationController.reset);
router.get('/status', simulationController.status);

module.exports = router;
