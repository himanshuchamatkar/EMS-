const express = require('express');
const router = express.Router();
const hospitalController = require('../controllers/hospitalController');
const auth = require('../middleware/auth');

router.post('/register', hospitalController.registerHospital);
router.post('/login', hospitalController.loginHospital);
router.get('/profile', auth, hospitalController.getProfile);
router.put('/profile', auth, hospitalController.updateProfile);
router.put('/status', auth, hospitalController.updateStatus);
router.get('/emergencies', auth, hospitalController.getEmergencies);
router.post('/emergencies/accept', auth, hospitalController.acceptEmergency);
router.post('/emergencies/reject', auth, hospitalController.rejectEmergency);
router.get('/list', hospitalController.getHospitalsList);
router.delete('/:id', hospitalController.deleteHospital);

module.exports = router;
