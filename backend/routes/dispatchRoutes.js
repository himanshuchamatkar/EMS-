const express = require('express');
const router = express.Router();
const dispatchController = require('../controllers/dispatchController');

router.post('/find-nearest', dispatchController.findNearest);
router.post('/assign', dispatchController.assign);
router.post('/cancel', dispatchController.cancelAssignment);
router.post('/accept', dispatchController.acceptOffer);
router.post('/reject', dispatchController.rejectOffer);
router.post('/pickup', dispatchController.pickupVictim);
router.get('/history', dispatchController.getHistory);

module.exports = router;
