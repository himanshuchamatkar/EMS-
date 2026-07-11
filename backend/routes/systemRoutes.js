const express = require('express');
const router = express.Router();
const systemController = require('../controllers/systemController');

router.get('/mode', systemController.getMode);
router.post('/mode', systemController.setMode);

module.exports = router;
