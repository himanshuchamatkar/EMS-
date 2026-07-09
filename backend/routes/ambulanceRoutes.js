const express = require('express');
const router = express.Router();
const ambulanceController = require('../controllers/ambulanceController');

router.get('/', ambulanceController.getAmbulances);
router.get('/:id', ambulanceController.getAmbulanceById);
router.post('/', ambulanceController.createAmbulance);
router.put('/:id', ambulanceController.updateAmbulance);
router.delete('/:id', ambulanceController.deleteAmbulance);

module.exports = router;
