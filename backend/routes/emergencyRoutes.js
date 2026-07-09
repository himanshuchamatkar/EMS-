const express = require('express');
const router = express.Router();
const emergencyController = require('../controllers/emergencyController');

router.get('/', emergencyController.getEmergencies);
router.get('/:id', emergencyController.getEmergencyById);
router.post('/', emergencyController.createEmergency);
router.delete('/:id', emergencyController.deleteEmergency);

module.exports = router;
